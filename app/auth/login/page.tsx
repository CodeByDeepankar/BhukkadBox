'use client';

import { signInWithEmailAndPassword } from 'firebase/auth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Login } from '@/components/Login';
import { auth } from '@/lib/firebaseConfig';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, router, user]);

  const handleLogin = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    router.replace('/dashboard');
  };

  return (
    <Login
      onLogin={handleLogin}
      onNavigateToSignUp={() => router.push('/auth/signin')}
    />
  );
}
