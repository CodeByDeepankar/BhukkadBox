'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { realtimeDb } from '@/lib/firebaseConfig';
import { child, push, ref, runTransaction, update } from 'firebase/database';

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
const ROW_KEYS = ['1', '2', '3', '4'];
const ROW_CAPACITY = 5;

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

      const allocateRows = async (packets: number) => {
        const normalizedPackets = Math.max(1, Math.min(packets, ROW_KEYS.length * ROW_CAPACITY));
        let reservedRows: number[] = [];
        let allocationFailed = false;

        await runTransaction(machineRef, (currentMachine) => {
          const machineState = currentMachine ? { ...currentMachine } : {};
          const now = Date.now();
          const orders = { ...(machineState.orders ?? {}) } as Record<string, unknown>;

          const existingOrder = orders[orderId] as
            | { row?: number; rows?: number[] }
            | undefined;
          if (existingOrder) {
            if (Array.isArray(existingOrder.rows) && existingOrder.rows.length > 0) {
              reservedRows = existingOrder.rows
                .map((row) => Number.parseInt(String(row), 10))
                .filter((rowNumber) => Number.isFinite(rowNumber));
            } else if (typeof existingOrder.row === 'number' && Number.isFinite(existingOrder.row)) {
              reservedRows = [existingOrder.row];
            }
            return machineState;
          }

          const rowWorkingState: Record<string, { remaining: number; dispensedCount: number; lastUpdated?: number }> =
            {};

          ROW_KEYS.forEach((key) => {
            const state = (machineState.rows as Record<string, unknown> | undefined)?.[key] as
              | { remaining?: number; dispensedCount?: number; lastUpdated?: number }
              | undefined;
            rowWorkingState[key] = {
              remaining:
                typeof state?.remaining === 'number' && Number.isFinite(state.remaining)
                  ? state.remaining
                  : ROW_CAPACITY,
              dispensedCount:
                typeof state?.dispensedCount === 'number' && Number.isFinite(state.dispensedCount)
                  ? state.dispensedCount
                  : 0,
              lastUpdated: typeof state?.lastUpdated === 'number' ? state.lastUpdated : undefined,
            };
          });

          const startRowValue = ROW_KEYS.includes(String(machineState.nextRow))
            ? String(machineState.nextRow)
            : ROW_KEYS[0];

          let pointerIndex = ROW_KEYS.indexOf(startRowValue);
          if (pointerIndex < 0) {
            pointerIndex = 0;
          }

          const allocations: string[] = [];

          for (let i = 0; i < normalizedPackets; i += 1) {
            let foundRow: string | null = null;

            for (let attempt = 0; attempt < ROW_KEYS.length; attempt += 1) {
              const rowKey = ROW_KEYS[(pointerIndex + attempt) % ROW_KEYS.length];
              const state = rowWorkingState[rowKey];

              if (state.remaining > 0) {
                foundRow = rowKey;
                state.remaining -= 1;
                state.dispensedCount += 1;
                state.lastUpdated = now;
                pointerIndex = (ROW_KEYS.indexOf(rowKey) + 1) % ROW_KEYS.length;
                break;
              }
            }

            if (!foundRow) {
              allocationFailed = true;
              break;
            }

            allocations.push(foundRow);
          }

          if (allocationFailed || allocations.length !== normalizedPackets) {
            return currentMachine ?? null;
          }

          reservedRows = allocations.map((rowKey) => Number.parseInt(rowKey, 10));

          const baseRows = (machineState.rows as Record<string, unknown> | undefined) ?? {};
          const updatedRows: Record<string, unknown> = { ...baseRows };
          allocations.forEach((rowKey) => {
            const state = rowWorkingState[rowKey];
            updatedRows[rowKey] = {
              ...(updatedRows[rowKey] as Record<string, unknown> | undefined),
              remaining: state.remaining,
              dispensedCount: state.dispensedCount,
              lastUpdated: state.lastUpdated,
            };
          });

          ROW_KEYS.forEach((rowKey) => {
            if (!updatedRows[rowKey]) {
              const state = rowWorkingState[rowKey];
              updatedRows[rowKey] = {
                remaining: state.remaining,
                dispensedCount: state.dispensedCount,
                lastUpdated: state.lastUpdated,
              };
            }
          });

          const baseOrders = (machineState.orders as Record<string, unknown> | undefined) ?? {};
          const updatedOrders: Record<string, unknown> = { ...baseOrders };
          updatedOrders[orderId] = {
            row: reservedRows[0],
            rows: reservedRows,
            quantity: normalizedPackets,
            paid: true,
            dispensed: false,
            createdAt: now,
          };

          machineState.rows = updatedRows;
          machineState.orders = updatedOrders;
          machineState.nextRow = Number.parseInt(ROW_KEYS[pointerIndex], 10) || Number.parseInt(ROW_KEYS[0], 10) || 1;

          return machineState;
        });

        if (reservedRows.length !== normalizedPackets) {
          throw new Error('All rows are empty. Please contact support.');
        }

        return reservedRows;
      };

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
        handler: async () => {
          try {
            const reservedRows = await allocateRows(quantity);
            const now = Date.now();

            update(machineRef, {
              dispense: true,
              status: 'payment_success',
              updated_at: now,
              assigned_rows: reservedRows,
              last_order_quantity: quantity,
              last_error: null,
            }).catch((firebaseError) => {
              console.error('Failed to update success state in Realtime Database', firebaseError);
            });

            push(logsRef, {
              type: 'payment_success',
              payment_id: orderId,
              amount: total,
              quantity,
              rows: reservedRows,
              timestamp: now,
            }).catch((firebaseError) => {
              console.error('Failed to append success log entry', firebaseError);
            });

            onPaymentComplete(orderId);
          } catch (reservationError) {
            const message =
              reservationError instanceof Error
                ? reservationError.message
                : 'Unable to reserve stock. Please contact support.';

            setErrorMessage(message);

            const now = Date.now();

            update(machineRef, {
              status: 'out_of_stock',
              dispense: false,
              updated_at: now,
              last_error: message,
              assigned_rows: null,
            }).catch((firebaseError) => {
              console.error('Failed to update out-of-stock status', firebaseError);
            });

            push(logsRef, {
              type: 'order_reservation_failed',
              payment_id: orderId,
              amount: total,
              quantity,
              timestamp: now,
              reason: message,
            }).catch((firebaseError) => {
              console.error('Failed to append reservation failure log entry', firebaseError);
            });

            onPaymentComplete(orderId);
          }
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
