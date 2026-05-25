'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Suspense } from 'react';

function OtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') ?? '';
  const { login } = useAuth();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (newOtp.every((d) => d) && newOtp.join('').length === 6) {
      verifyOtp(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyOtp = async (code: string) => {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { phone, otp: code });
      const { token, user, needsSetup } = data.data;
      login(token, user);
      if (needsSetup) router.push('/setup');
      else router.push('/events');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post('/auth/send-otp', { phone });
      setCountdown(30);
      setError('');
    } catch {
      setError('Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length === 6) verifyOtp(code);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-dark px-4">
      <div className="w-full max-w-sm">
        <Link href="/login" className="inline-flex items-center gap-2 text-muted hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft size={16} />
          Back
        </Link>

        <div className="bg-dark-card border border-dark-border rounded-2xl p-8 animate-slide-up">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-6">
            <span className="text-2xl">📱</span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-1">Enter OTP</h1>
          <p className="text-muted text-sm mb-8">
            We sent a 6-digit code to <span className="text-white font-medium">{phone}</span>
          </p>

          <form onSubmit={handleSubmit}>
            <div className="flex gap-2 mb-6">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="flex-1 min-w-0 h-12 bg-dark border border-dark-border rounded-xl text-center text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              ))}
            </div>

            {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
              disabled={otp.join('').length !== 6}
            >
              Verify OTP
            </Button>
          </form>

          <div className="mt-6 text-center">
            {countdown > 0 ? (
              <p className="text-sm text-muted">Resend in {countdown}s</p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-sm text-primary-light hover:underline inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
                {resending ? 'Resending…' : 'Resend OTP'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OtpPage() {
  return (
    <Suspense>
      <OtpForm />
    </Suspense>
  );
}
