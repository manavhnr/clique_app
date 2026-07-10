'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

function AuthShell({ children, step }: { children: React.ReactNode; step?: number }) {
  const steps = ['ACCOUNT', 'VERIFY', 'PROFILE'];
  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px 64px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', background: 'var(--ink)' }}>
      <Link href="/" style={{ position: 'absolute', top: 24, left: 24, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--dim)' }}>
        ← Back to clique
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', margin: '48px 0 36px' }}>
        <span style={{ width: 9, height: 9, background: 'var(--lime)', borderRadius: '50%', marginRight: 10, boxShadow: '0 0 18px var(--lime)', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
        <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.04em' }}>CLIQUE</span>
      </div>
      <div style={{ width: '100%', maxWidth: 440, animation: 'riseIn .35s ease-out both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26 }}>
          <span className="clique-label" style={{ whiteSpace: 'nowrap' }}>FORM № 01</span>
          <span aria-hidden style={{ height: 1, flex: 1, background: 'var(--line-2)' }} />
          {step && (
            <span style={{ display: 'inline-flex', gap: 14 }}>
              {steps.map((s, i) => {
                const active = i + 1 === step;
                const done   = i + 1 < step;
                return (
                  <span key={s} style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: active ? 'var(--lime)' : done ? 'var(--cream)' : 'var(--dim)' }}>
                    {String(i + 1).padStart(2, '0')} {s}
                  </span>
                );
              })}
            </span>
          )}
        </div>
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
      await api.post('/auth/register', {
        phone: phone.trim(),
        password,
      });
      await api.post('/auth/send-otp', { phone: phone.trim() });
      router.push(`/otp?phone=${encodeURIComponent(phone.trim())}`);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      if (!e.response) {
        setError('Server unreachable — it may be waking up. Wait a moment and try again.');
      } else if (e.response.status === 409) {
        setError('This number is already registered. Try logging in instead.');
      } else {
        setError(e.response.data?.message ?? 'Could not create account. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell step={1}>
      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 42, lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: 12 }}>
        Get on<br />
        <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: 400, color: 'var(--lime)' }}>the list.</span>
      </div>


      <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Phone */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>01 — MOBILE</span>
          <input
            type="tel"
            className="clique-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            autoComplete="tel"
            autoFocus
          />
        </label>

        {/* Password */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>02 — PASSWORD</span>
          <input
            type="password"
            className="clique-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 6 characters"
            autoComplete="new-password"
          />
        </label>

        {/* Confirm password */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>03 — CONFIRM PASSWORD</span>
          <input
            type="password"
            className={`clique-input${confirmPassword && !passwordsMatch ? ' input-error' : ''}`}
            value={confirmPassword}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter password"
            autoComplete="new-password"
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
              borderRadius: 3,
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
            padding: '16px 22px', borderRadius: 3,
            fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 13,
            letterSpacing: '.1em', textTransform: 'uppercase',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            transition: 'background .2s, color .2s, border-color .2s',
            marginTop: 4,
          }}
        >
          {loading && <Spinner />}
          {loading ? 'Creating account…' : 'Create account →'}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 18px' }}>
        <span aria-hidden style={{ height: 1, flex: 1, background: 'var(--line)' }} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.16em', color: 'var(--dim)' }}>ALREADY IN?</span>
        <span aria-hidden style={{ height: 1, flex: 1, background: 'var(--line)' }} />
      </div>
      <div style={{ textAlign: 'center', fontFamily: 'var(--display)', fontSize: 14, color: 'var(--cream)' }}>
        <Link href="/login" style={{ color: 'var(--lime)' }}>Log in →</Link>
      </div>
    </AuthShell>
  );
}
