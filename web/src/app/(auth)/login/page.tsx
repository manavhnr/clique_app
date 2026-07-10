'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

function AuthShell({ children, formNo, formName }: { children: React.ReactNode; formNo: string; formName: string }) {
  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px 64px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', background: 'var(--ink)' }}>
      <Link href="/" style={{ position: 'absolute', top: 24, left: 24, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--dim)' }}>
        ← Back to clique
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', margin: '48px 0 44px' }}>
        <span style={{ width: 9, height: 9, background: 'var(--lime)', borderRadius: '50%', marginRight: 10, boxShadow: '0 0 18px var(--lime)', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
        <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.04em' }}>CLIQUE</span>
      </div>
      <div style={{ width: '100%', maxWidth: 440, animation: 'riseIn .35s ease-out both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26 }}>
          <span className="clique-label" style={{ whiteSpace: 'nowrap' }}>FORM № {formNo}</span>
          <span aria-hidden style={{ height: 1, flex: 1, background: 'var(--line-2)' }} />
          <span className="clique-label" style={{ whiteSpace: 'nowrap' }}>{formName}</span>
        </div>
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return <div style={{ width: 14, height: 14, border: '2px solid var(--line-2)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />;
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const canSubmit = identifier.trim().length > 0 && password.length > 0 && !loading;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password,
      });
      login(data.data.token, data.data.user, data.data.refreshToken);
      router.push('/confirmed');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Invalid phone/username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell formNo="02" formName="RE-ENTRY">
      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 42, lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: 12 }}>
        Welcome back.<br />
        <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: 400, color: 'var(--lime)' }}>Doors are open.</span>
      </div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 16, color: 'var(--cream)', lineHeight: 1.4, marginBottom: 32 }}>
        Sign in to your account.
      </div>

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>01 — PHONE OR USERNAME</span>
          <input
            className="clique-input"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="+91 98765 43210"
            autoComplete="username"
            autoFocus
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>02 — PASSWORD</span>
          <input
            type="password"
            className="clique-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </label>

        {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--hot)' }}>{error}</div>}

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: canSubmit ? 'var(--lime)' : 'var(--line-2)',
            color: canSubmit ? 'var(--ink)' : 'var(--dim)',
            border: `1px solid ${canSubmit ? 'var(--lime)' : 'var(--line-2)'}`,
            padding: '16px 22px', borderRadius: 3,
            fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 13,
            letterSpacing: '.1em', textTransform: 'uppercase',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            transition: 'background .2s, color .2s, border-color .2s',
            marginTop: 4,
          }}
        >
          {loading && <Spinner />}
          {loading ? 'Signing in…' : 'Sign in →'}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 18px' }}>
        <span aria-hidden style={{ height: 1, flex: 1, background: 'var(--line)' }} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.16em', color: 'var(--dim)' }}>NOT ON THE LIST?</span>
        <span aria-hidden style={{ height: 1, flex: 1, background: 'var(--line)' }} />
      </div>
      <div style={{ textAlign: 'center', fontFamily: 'var(--display)', fontSize: 14, color: 'var(--cream)' }}>
        <Link href="/signup" style={{ color: 'var(--lime)' }}>Sign up in 30s →</Link>
      </div>
    </AuthShell>
  );
}
