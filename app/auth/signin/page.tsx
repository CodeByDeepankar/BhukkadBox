'use client';

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { SignUp } from '@/components/SignUp';
import { auth } from '@/lib/firebaseConfig';
import { useAuth } from '@/hooks/useAuth';

export default function SignInPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, router, user]);

  const handleSignUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
    router.replace('/dashboard');
  };

  return (
    <SignUp
      onSignUp={handleSignUp}
      onNavigateToLogin={() => router.push('/auth/login')}
    />
  );
}
