'use client';

import { signOut } from 'firebase/auth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Dashboard } from '@/components/Dashboard';
import { auth } from '@/lib/firebaseConfig';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [loading, router, user]);

  const handleDispense = (quantity: number) => {
    if (quantity <= 0) {
      return;
    }

    router.push(`/payment?quantity=${quantity}`);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.replace('/auth/login');
  };

  if (loading) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <Dashboard
      onDispense={handleDispense}
      onLogout={handleLogout}
      userEmail={user.email ?? 'Anonymous'}
    />
  );
}
