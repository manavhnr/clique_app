'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

function Spinner() {
  return <div style={{ width: 14, height: 14, border: '2px solid var(--line-2)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />;
}

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

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#14110E', border: '1px solid var(--line-2)', color: 'var(--paper)',
    padding: '14px 16px', borderRadius: 12, fontFamily: 'var(--display)', fontSize: 16,
    outline: 'none', transition: 'border-color .15s ease',
  };

  return (
    <AuthShell step={1}>
      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 38, lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: 10 }}>
        What&apos;s your number?
      </div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 16, color: 'var(--cream)', lineHeight: 1.4, marginBottom: 28 }}>
        We text you a 6-digit code. No password to remember.
      </div>

      <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>MOBILE</span>
          <input type="tel" style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" autoComplete="tel" autoFocus
            onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
          />
        </label>

        {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--hot)' }}>{error}</div>}

        <button type="submit" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '16px 22px', borderRadius: 999, fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading && <Spinner />}
          {loading ? 'Sending…' : 'Text me the code →'}
        </button>

        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.08em', lineHeight: 1.6 }}>
          By continuing you agree to our{' '}
          <a href="#" style={{ color: 'var(--cream)' }}>Terms</a>{' '}and{' '}
          <a href="#" style={{ color: 'var(--cream)' }}>Privacy Policy</a>.
        </div>
      </form>

      <div style={{ textAlign: 'center', fontFamily: 'var(--display)', fontSize: 14, color: 'var(--cream)', marginTop: 22 }}>
        Already in?{' '}
        <Link href="/login" style={{ color: 'var(--lime)' }}>Log in →</Link>
      </div>
    </AuthShell>
  );
}
