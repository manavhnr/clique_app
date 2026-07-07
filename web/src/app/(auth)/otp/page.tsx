'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

function AuthShell({ children, step }: { children: React.ReactNode; step?: number }) {
  const steps = ['PHONE', 'VERIFY', 'PROFILE'];
  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', background: 'var(--ink)' }}>
      <Link href="/" style={{ position: 'absolute', top: 24, left: 24, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--dim)' }}>
        ← Back to clique
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}>
        <span style={{ width: 9, height: 9, background: 'var(--lime)', borderRadius: '50%', marginRight: 10, boxShadow: '0 0 18px var(--lime)', display: 'inline-block' }} />
        <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.04em' }}>CLIQUE</span>
      </div>
      {step && (
        <div style={{ display: 'flex', gap: 18, marginBottom: 28 }}>
          {steps.map((s, i) => {
            const active = i + 1 === step;
            const done   = i + 1 < step;
            return (
              <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: active ? 'var(--paper)' : 'var(--dim)' }}>
                <span style={{ padding: '3px 6px', border: `1px solid ${active ? 'var(--lime)' : done ? 'var(--line)' : 'var(--line-2)'}`, borderRadius: 4, background: active ? 'var(--lime)' : done ? 'var(--line)' : 'transparent', color: active ? 'var(--ink)' : done ? 'var(--cream)' : 'var(--dim)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {s}
              </span>
            );
          })}
        </div>
      )}
      <div style={{ width: '100%', maxWidth: 460, background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 18, padding: 36, boxShadow: '0 30px 60px -20px rgba(0,0,0,0.6)', animation: 'riseIn .35s ease-out both' }}>
        {children}
      </div>
    </div>
  );
}

function Spinner({ size = 14 }: { size?: number }) {
  return <div style={{ width: size, height: size, border: '2px solid var(--line-2)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />;
}

function OtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') ?? '';
  const { login } = useAuth();

  const [digits, setDigits]     = useState(['', '', '', '', '', '']);
  const [loading, setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError]       = useState('');
  const [countdown, setCountdown] = useState(30);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  useEffect(() => { refs.current[0]?.focus(); }, []);

  const setDigit = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    setError('');
    const next = digits.slice();
    next[i] = v;
    setDigits(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
    if (next.every((d) => d) && next.join('').length === 6) verifyOtp(next.join(''));
  };

  const onKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const verifyOtp = async (code: string) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { phone, otp: code });
      const { token, user, needsSetup, refreshToken } = data.data;
      login(token, user, refreshToken);
      if (needsSetup) router.push('/setup');
      else router.push('/events');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Invalid OTP. Try again.');
      setDigits(['', '', '', '', '', '']);
      refs.current[0]?.focus();
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

  const digitStyle: React.CSSProperties = {
    flex: 1, minWidth: 0, height: 60,
    background: '#0B0907', border: '1px solid var(--line-2)',
    color: 'var(--paper)', textAlign: 'center',
    fontFamily: 'var(--display)', fontSize: 28, fontWeight: 700,
    borderRadius: 12, outline: 'none',
    transition: 'border-color .15s ease, transform .15s ease',
  };

  return (
    <AuthShell step={2}>
      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 38, lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: 10 }}>
        Check your texts.
      </div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 16, color: 'var(--cream)', lineHeight: 1.4, marginBottom: 28 }}>
        We sent a 6-digit code to{' '}
        <b style={{ color: 'var(--paper)' }}>{phone}</b>.
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKey(i, e)}
            style={digitStyle}
            onFocus={(e) => { e.target.style.borderColor = 'var(--lime)'; e.target.style.transform = 'translateY(-1px)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--line-2)'; e.target.style.transform = 'none'; }}
          />
        ))}
      </div>

      {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--hot)', marginTop: 16 }}>{error}</div>}

      {loading && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--lime)', letterSpacing: '.1em', marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Spinner /> VERIFYING…
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', color: 'var(--dim)' }}>
        <Link href="/signup" style={{ color: 'var(--cream)' }}>← Change number</Link>
        {countdown > 0
          ? <span>Resend in {countdown}s</span>
          : <button onClick={handleResend} disabled={resending} style={{ background: 'none', border: 'none', color: 'var(--lime)', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', cursor: 'pointer' }}>
              {resending ? <><Spinner /> Resending…</> : '↻ Resend code'}
            </button>
        }
      </div>
    </AuthShell>
  );
}

export default function OtpPage() {
  return <Suspense><OtpForm /></Suspense>;
}
