'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Lock, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password,
      });
      login(data.data.token, data.data.user);
      if (!data.data.user.hasCompletedSetup) router.push('/setup');
      else router.push('/events');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-dark px-4">
      <Link href="/" className="flex items-center gap-2 mb-10">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-white font-bold text-sm">C</span>
        </div>
        <span className="text-white font-bold text-xl tracking-tight">CLIQUE</span>
      </Link>

      <div className="w-full max-w-sm bg-dark-card border border-dark-border rounded-2xl p-8 animate-slide-up">
        <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
        <p className="text-muted text-sm mb-8">Sign in with your username or phone number</p>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <Input
            label="Username or Phone Number"
            placeholder="Enter your username or phone"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            icon={<User size={16} />}
            autoComplete="username"
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock size={16} />}
            autoComplete="current-password"
            required
          />

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
            Sign In <ArrowRight size={16} />
          </Button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-primary-light hover:underline">
            Get Started
          </Link>
        </p>
      </div>
    </div>
  );
}
