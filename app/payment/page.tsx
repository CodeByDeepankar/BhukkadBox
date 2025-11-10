'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Payment } from '@/components/Payment';
import { useAuth } from '@/hooks/useAuth';

function PaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  const quantity = Number.parseInt(searchParams.get('quantity') ?? '0', 10);
  const normalizedQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (!loading && user && normalizedQuantity === 0) {
      router.replace('/dashboard');
    }
  }, [loading, normalizedQuantity, router, user]);

  const handlePaymentComplete = (paymentId: string) => {
    const nextParams = new URLSearchParams({ quantity: String(normalizedQuantity) });
    if (paymentId) {
      nextParams.set('paymentId', paymentId);
    }
    router.replace(`/status?${nextParams.toString()}`);
  };

  if (loading || !user || normalizedQuantity === 0) {
    return null;
  }

  return (
    <Payment
      quantity={normalizedQuantity}
      onPaymentComplete={handlePaymentComplete}
      customerEmail={user.email ?? undefined}
      customerName={user.displayName ?? undefined}
    />
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={null}>
      <PaymentPageContent />
    </Suspense>
  );
}
