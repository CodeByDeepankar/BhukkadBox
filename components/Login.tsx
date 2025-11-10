'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { BrandLogo } from './BrandLogo';
import { DevelopmentNotice } from './DevelopmentNotice';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onNavigateToSignUp: () => void;
}

export function Login({ onLogin, onNavigateToSignUp }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('All fields are required');
      return;
    }

    try {
      setIsSubmitting(true);
      await onLogin(email, password);
    } catch (loginError) {
      const message =
        loginError instanceof Error
          ? loginError.message
          : 'Unable to log in. Please try again.';
      setError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <BrandLogo
            size={90}
            orientation="vertical"
            className="mx-auto"
          />
          <div className="space-y-1">
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Enter your credentials to access the BhukkadBox vending system
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{' '}
            <button
              onClick={onNavigateToSignUp}
              className="text-blue-600 hover:underline disabled:opacity-60"
              disabled={isSubmitting}
            >
              Sign up
            </button>
          </div>
        </CardContent>
      </Card>
      <DevelopmentNotice />
    </div>
  );
}
