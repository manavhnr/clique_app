'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

function AuthShell({ children, step }: { children: React.ReactNode; step?: number }) {
  const steps = ['ACCOUNT', 'PROFILE'];
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

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#14110E', border: '1px solid var(--line-2)', color: 'var(--paper)',
  padding: '14px 16px', borderRadius: 12, fontFamily: 'var(--display)', fontSize: 16,
  outline: 'none', transition: 'border-color .15s ease',
};

export default function SignupPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [phone, setPhone]               = useState('');
  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirm]   = useState('');
  const [termsAccepted, setTerms]       = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  const passwordsMatch = password === confirmPassword;
  const canSubmit =
    phone.trim().length > 0 &&
    password.length >= 6 &&
    passwordsMatch &&
    termsAccepted &&
    !loading;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (!passwordsMatch) { setError('Passwords do not match.'); return; }

    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        phone: phone.trim(),
        password,
      });
      const { token, user, needsSetup, refreshToken } = data.data;
      login(token, user, refreshToken);
      router.push(needsSetup ? '/setup' : '/events');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Could not create account. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell step={1}>
      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 38, lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: 10 }}>
        Create your account.
      </div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 16, color: 'var(--cream)', lineHeight: 1.4, marginBottom: 28 }}>
        Takes 30 seconds. No card required.
      </div>

      <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Phone */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>MOBILE</span>
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

        {/* Password */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>PASSWORD</span>
          <input
            type="password"
            style={inputStyle}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 6 characters"
            autoComplete="new-password"
            onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
          />
        </label>

        {/* Confirm password */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>CONFIRM PASSWORD</span>
          <input
            type="password"
            style={{
              ...inputStyle,
              borderColor: confirmPassword && !passwordsMatch ? 'var(--hot)' : 'var(--line-2)',
            }}
            value={confirmPassword}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter password"
            autoComplete="new-password"
            onFocus={(e) => (e.target.style.borderColor = confirmPassword && !passwordsMatch ? 'var(--hot)' : 'var(--lime)')}
            onBlur={(e) => (e.target.style.borderColor = confirmPassword && !passwordsMatch ? 'var(--hot)' : 'var(--line-2)')}
          />
          {confirmPassword && !passwordsMatch && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--hot)', letterSpacing: '.04em' }}>
              Passwords don&apos;t match.
            </span>
          )}
        </label>

        {/* Terms & Conditions */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTerms(e.target.checked)}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
          />
          <span
            style={{
              flexShrink: 0, marginTop: 2,
              width: 18, height: 18,
              border: `1.5px solid ${termsAccepted ? 'var(--lime)' : 'var(--line-2)'}`,
              borderRadius: 5,
              background: termsAccepted ? 'var(--lime)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .15s, border-color .15s',
            }}
          >
            {termsAccepted && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="#0B0907" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '.06em', lineHeight: 1.6 }}>
            I have read and agree to the{' '}
            <Link href="/terms" style={{ color: 'var(--cream)', textDecoration: 'underline', textUnderlineOffset: 3 }}>
              Terms &amp; Conditions
            </Link>
            {' '}and{' '}
            <a href="/privacy" style={{ color: 'var(--cream)', textDecoration: 'underline', textUnderlineOffset: 3 }}>
              Privacy Policy
            </a>
            .
          </span>
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
            padding: '16px 22px', borderRadius: 999,
            fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 13,
            letterSpacing: '.08em', textTransform: 'uppercase',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            transition: 'background .2s, color .2s, border-color .2s',
          }}
        >
          {loading && <Spinner />}
          {loading ? 'Creating account…' : 'Create account →'}
        </button>
      </form>

      <div style={{ textAlign: 'center', fontFamily: 'var(--display)', fontSize: 14, color: 'var(--cream)', marginTop: 22 }}>
        Already in?{' '}
        <Link href="/login" style={{ color: 'var(--lime)' }}>Log in →</Link>
      </div>
    </AuthShell>
  );
}
