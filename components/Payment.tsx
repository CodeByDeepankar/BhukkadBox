'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { realtimeDb } from '@/lib/firebaseConfig';
import { child, push, ref, update } from 'firebase/database';

interface PaymentProps {
  quantity: number;
  onPaymentComplete: (paymentId: string) => void;
  customerEmail?: string;
  customerName?: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}

const CHECKOUT_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

export function Payment({ quantity, onPaymentComplete, customerEmail, customerName }: PaymentProps) {
  const [isCheckoutReady, setIsCheckoutReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const total = useMemo(() => quantity * 10, [quantity]);
  const publicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  useEffect(() => {
    if (!publicKey) {
      setErrorMessage('Razorpay public key is missing. Please configure NEXT_PUBLIC_RAZORPAY_KEY_ID.');
    }
  }, [publicKey]);

  useEffect(() => {
    if (window.Razorpay) {
      setIsCheckoutReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = CHECKOUT_SCRIPT_URL;
    script.async = true;
    script.onload = () => setIsCheckoutReady(true);
    script.onerror = () =>
      setErrorMessage('Unable to load Razorpay checkout. Check your network connection and retry.');

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const handlePayment = async () => {
    setErrorMessage(null);

    if (!publicKey) {
      return;
    }

    if (!isCheckoutReady || !window.Razorpay) {
      setErrorMessage('Checkout is still loading. Please wait a moment and try again.');
      return;
    }

    try {
      setIsProcessing(true);

      const orderResponse = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: total * 100,
          currency: 'INR',
          notes: {
            quantity: String(quantity),
          },
        }),
      });

      if (!orderResponse.ok) {
        const { error } = await orderResponse.json();
        throw new Error(error ?? 'Unable to initiate payment.');
      }

      const order = await orderResponse.json();
      const orderId: string = order.id;

      const machinePath = 'vending/machine1';
      const machineRef = ref(realtimeDb, machinePath);
      const logsRef = child(machineRef, 'logs');

      void update(machineRef, {
        payment_id: orderId,
        dispense: false,
        status: 'payment_created',
        last_amount: total,
        last_quantity: quantity,
        updated_at: Date.now(),
      }).catch((firebaseError) => {
        console.error('Failed to sync payment state to Realtime Database', firebaseError);
      });

      void push(logsRef, {
        type: 'payment_created',
        payment_id: orderId,
        amount: total,
        quantity,
        timestamp: Date.now(),
      }).catch((firebaseError) => {
        console.error('Failed to append payment log entry', firebaseError);
      });

      const razorpay = new window.Razorpay({
        key: publicKey,
        amount: order.amount,
        currency: order.currency,
        name: 'BhukkadBox',
        description: `${quantity} packet${quantity > 1 ? 's' : ''} of chips`,
        order_id: order.id,
        prefill: {
          email: customerEmail ?? '',
          name: customerName ?? '',
        },
        theme: {
          color: '#0f172a',
        },
        handler: () => {
          update(machineRef, {
            dispense: true,
            status: 'payment_success',
            updated_at: Date.now(),
          }).catch((firebaseError) => {
            console.error('Failed to update success state in Realtime Database', firebaseError);
          });

          push(logsRef, {
            type: 'payment_success',
            payment_id: orderId,
            amount: total,
            quantity,
            timestamp: Date.now(),
          }).catch((firebaseError) => {
            console.error('Failed to append success log entry', firebaseError);
          });

          onPaymentComplete(orderId);
        },
      });

      razorpay.on('payment.failed', (response: unknown) => {
        const errorDescription =
          typeof response === 'object' && response !== null && 'error' in response
            ? (response as { error?: { description?: string } }).error?.description
            : undefined;

        setErrorMessage(errorDescription ?? 'Payment failed. Please try again.');
        update(machineRef, {
          status: 'payment_failed',
          dispense: false,
          updated_at: Date.now(),
        }).catch(console.error);

        push(logsRef, {
          type: 'payment_failed',
          payment_id: orderId,
          amount: total,
          quantity,
          timestamp: Date.now(),
          reason: errorDescription ?? 'unknown',
        }).catch(console.error);
      });

      razorpay.open();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle>Secure Payment</CardTitle>
          <CardDescription>We use Razorpay to process your transaction safely.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Items:</span>
              <span>{quantity} packets</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Price per packet:</span>
              <span>₹10</span>
            </div>
            <div className="border-t pt-2 mt-2 flex justify-between font-medium">
              <span>Total payable:</span>
              <span>₹{total}</span>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            You will be redirected to Razorpay to complete the payment using UPI, cards, net banking or wallets.
          </p>

          {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

          <Button
            onClick={handlePayment}
            className="w-full"
            disabled={isProcessing || !isCheckoutReady || !publicKey}
          >
            {isProcessing ? 'Processing…' : `Pay ₹${total}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
