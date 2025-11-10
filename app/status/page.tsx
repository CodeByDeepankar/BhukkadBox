'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Status } from '@/components/Status';
import { useAuth } from '@/hooks/useAuth';

function StatusPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  const quantity = Number.parseInt(searchParams.get('quantity') ?? '0', 10);
  const normalizedQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
  const paymentId = searchParams.get('paymentId') ?? undefined;

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

  const handleBackToDashboard = () => {
    router.replace('/dashboard');
  };

  if (loading || !user || normalizedQuantity === 0) {
    return null;
  }

  return (
    <Status
      quantity={normalizedQuantity}
      paymentId={paymentId}
      onBackToDashboard={handleBackToDashboard}
    />
  );
}

export default function StatusPage() {
  return (
    <Suspense fallback={null}>
      <StatusPageContent />
    </Suspense>
  );
}
