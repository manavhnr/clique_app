'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Phone, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import api from '@/lib/api';

export default function SignupPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { phone: phone.trim() });
      router.push(`/otp?phone=${encodeURIComponent(phone.trim())}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Failed to send OTP. Check the number and try again.');
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
        <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center mb-6">
          <Phone size={22} className="text-primary-light" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
        <p className="text-muted text-sm mb-8">
          Enter your phone number — we&apos;ll send a one-time code to verify it.
        </p>

        <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
          <Input
            label="Phone Number"
            type="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            icon={<Phone size={16} />}
            autoComplete="tel"
            required
          />

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
            Send OTP <ArrowRight size={16} />
          </Button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-light hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
