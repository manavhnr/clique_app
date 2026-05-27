'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', background: 'var(--ink)' }}>
      <Link href="/" style={{ position: 'absolute', top: 24, left: 24, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--dim)' }}>
        ← Back to clique
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}>
        <span style={{ width: 9, height: 9, background: 'var(--lime)', borderRadius: '50%', marginRight: 10, boxShadow: '0 0 18px var(--lime)', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
        <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.04em' }}>CLIQUE</span>
      </div>
      <div style={{ width: '100%', maxWidth: 460, background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 18, padding: 36, boxShadow: '0 30px 60px -20px rgba(0,0,0,0.6)', animation: 'riseIn .35s ease-out both' }}>
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return <div style={{ width: 14, height: 14, border: '2px solid var(--line-2)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />;
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#14110E', border: '1px solid var(--line-2)', color: 'var(--paper)',
  padding: '14px 16px', borderRadius: 12, fontFamily: 'var(--display)', fontSize: 16,
  outline: 'none', transition: 'border-color .15s ease',
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [mode, setMode]           = useState<'password' | 'otp'>('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]   = useState('');
  const [phone, setPhone]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  // ── Password login ──────────────────────────────────────────────────────
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim()) { setError('Please enter your phone number or username.'); return; }
    if (!password)           { setError('Please enter your password.'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { identifier: identifier.trim(), password });
      login(data.data.token, data.data.user);
      router.push('/events');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Invalid phone/username or password.');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP login ───────────────────────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!phone.trim()) { setError('Please enter your phone number.'); return; }
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
    <AuthShell>
      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 38, lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: 10 }}>
        Welcome back.<br />
        <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--lime)' }}>Doors are open.</span>
      </div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 16, color: 'var(--cream)', lineHeight: 1.4, marginBottom: 24 }}>
        Sign in to your account.
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', background: '#0B0907', border: '1px solid var(--line-2)', borderRadius: 12, padding: 4, marginBottom: 24 }}>
        {(['password', 'otp'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(''); }}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase',
              background: mode === m ? 'var(--lime)' : 'transparent',
              color: mode === m ? 'var(--ink)' : 'var(--dim)',
              transition: 'all .15s ease',
            }}
          >
            {m === 'password' ? 'Password' : 'One-time code'}
          </button>
        ))}
      </div>

      {/* ── Password form ── */}
      {mode === 'password' && (
        <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>PHONE OR USERNAME</span>
            <input
              style={inputStyle}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="+91 98765 43210"
              autoComplete="username"
              autoFocus
              onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>PASSWORD</span>
            <input
              type="password"
              style={inputStyle}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
            />
          </label>

          {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--hot)' }}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '16px 22px', borderRadius: 999, fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading && <Spinner />}
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>
      )}

      {/* ── OTP form ── */}
      {mode === 'otp' && (
        <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>MOBILE NUMBER</span>
            <input
              type="tel"
              style={inputStyle}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              autoComplete="tel"
              autoFocus
              onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
            />
          </label>

          {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--hot)' }}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '16px 22px', borderRadius: 999, fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading && <Spinner />}
            {loading ? 'Sending code…' : 'Text me the code →'}
          </button>
        </form>
      )}

      <div style={{ textAlign: 'center', fontFamily: 'var(--display)', fontSize: 14, color: 'var(--cream)', marginTop: 22 }}>
        No account?{' '}
        <Link href="/signup" style={{ color: 'var(--lime)' }}>Sign up in 30s →</Link>
      </div>
    </AuthShell>
  );
}
