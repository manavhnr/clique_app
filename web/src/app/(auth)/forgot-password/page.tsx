'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

function AuthShell({ children }: { children: React.ReactNode }) {
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
          <span className="clique-label" style={{ whiteSpace: 'nowrap' }}>FORM № 02A</span>
          <span aria-hidden style={{ height: 1, flex: 1, background: 'var(--line-2)' }} />
          <span className="clique-label" style={{ whiteSpace: 'nowrap' }}>RESET</span>
        </div>
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return <div style={{ width: 14, height: 14, border: '2px solid var(--line-2)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />;
}

function ForgotPasswordForm() {
  const router = useRouter();
  const { login } = useAuth();

  const [step, setStep]             = useState<'phone' | 'reset'>('phone');
  const [phone, setPhone]           = useState('');
  const [otp, setOtp]               = useState('');
  const [newPassword, setNew]       = useState('');
  const [confirmPassword, setConfirm] = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [resendCooldown, setCooldown] = useState(0);

  const passwordsMatch = newPassword === confirmPassword;

  const canSendOTP = phone.trim().length > 0 && !loading;
  const canReset   = otp.length >= 4 && newPassword.length >= 6 && passwordsMatch && !loading;

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSendOTP) return;
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { phone: phone.trim() });
      setStep('reset');
      startCooldown();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Could not send reset code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canReset) return;
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        phone: phone.trim(),
        otp: otp.trim(),
        newPassword,
      });
      login(data.data.token, data.data.user, data.data.refreshToken);
      router.push('/events');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Reset failed. Check your code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const startCooldown = () => {
    setCooldown(60);
    const interval = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { phone: phone.trim() });
      startCooldown();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Could not resend code.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'phone') {
    return (
      <AuthShell>
        <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 42, lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: 12 }}>
          Locked out?<br />
          <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: 400, color: 'var(--lime)' }}>We&apos;ll fix it.</span>
        </div>
        <div style={{ fontFamily: 'var(--display)', fontSize: 16, color: 'var(--cream)', lineHeight: 1.4, marginBottom: 32 }}>
          Enter your phone number and we&apos;ll send a reset code.
        </div>

        <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>01 — PHONE NUMBER</span>
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

          {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--hot)' }}>{error}</div>}

          <button
            type="submit"
            disabled={!canSendOTP}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: canSendOTP ? 'var(--lime)' : 'var(--line-2)',
              color: canSendOTP ? 'var(--ink)' : 'var(--dim)',
              border: `1px solid ${canSendOTP ? 'var(--lime)' : 'var(--line-2)'}`,
              padding: '16px 22px', borderRadius: 3,
              fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 13,
              letterSpacing: '.1em', textTransform: 'uppercase',
              cursor: canSendOTP ? 'pointer' : 'not-allowed',
              transition: 'background .2s, color .2s, border-color .2s',
              marginTop: 4,
            }}
          >
            {loading && <Spinner />}
            {loading ? 'Sending…' : 'Send reset code →'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 18px' }}>
          <span aria-hidden style={{ height: 1, flex: 1, background: 'var(--line)' }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.16em', color: 'var(--dim)' }}>REMEMBER IT?</span>
          <span aria-hidden style={{ height: 1, flex: 1, background: 'var(--line)' }} />
        </div>
        <div style={{ textAlign: 'center', fontFamily: 'var(--display)', fontSize: 14, color: 'var(--cream)' }}>
          <Link href="/login" style={{ color: 'var(--lime)' }}>Back to sign in →</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 42, lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: 12 }}>
        Check your<br />
        <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: 400, color: 'var(--lime)' }}>messages.</span>
      </div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 16, color: 'var(--cream)', lineHeight: 1.4, marginBottom: 32 }}>
        Code sent to <span style={{ color: 'var(--lime)' }}>{phone}</span>. Enter it below with your new password.
      </div>

      <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>01 — RESET CODE</span>
          <input
            type="text"
            className="clique-input"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="6-digit code"
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            autoFocus
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>02 — NEW PASSWORD</span>
          <input
            type="password"
            className="clique-input"
            value={newPassword}
            onChange={(e) => setNew(e.target.value)}
            placeholder="Min. 6 characters"
            autoComplete="new-password"
          />
        </label>

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

        {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--hot)' }}>{error}</div>}

        <button
          type="submit"
          disabled={!canReset}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: canReset ? 'var(--lime)' : 'var(--line-2)',
            color: canReset ? 'var(--ink)' : 'var(--dim)',
            border: `1px solid ${canReset ? 'var(--lime)' : 'var(--line-2)'}`,
            padding: '16px 22px', borderRadius: 3,
            fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 13,
            letterSpacing: '.1em', textTransform: 'uppercase',
            cursor: canReset ? 'pointer' : 'not-allowed',
            transition: 'background .2s, color .2s, border-color .2s',
            marginTop: 4,
          }}
        >
          {loading && <Spinner />}
          {loading ? 'Resetting…' : 'Reset password →'}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 18px' }}>
        <span aria-hidden style={{ height: 1, flex: 1, background: 'var(--line)' }} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.16em', color: 'var(--dim)' }}>DIDN&apos;T GET IT?</span>
        <span aria-hidden style={{ height: 1, flex: 1, background: 'var(--line)' }} />
      </div>
      <div style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--dim)' }}>
        <button
          onClick={handleResend}
          disabled={resendCooldown > 0 || loading}
          style={{ background: 'none', border: 'none', cursor: resendCooldown > 0 ? 'default' : 'pointer', color: resendCooldown > 0 ? 'var(--dim)' : 'var(--lime)', fontFamily: 'var(--mono)', fontSize: 12, padding: 0 }}
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
        </button>
        <span style={{ margin: '0 10px', color: 'var(--line-2)' }}>·</span>
        <button
          onClick={() => { setStep('phone'); setError(''); setOtp(''); setNew(''); setConfirm(''); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cream)', fontFamily: 'var(--mono)', fontSize: 12, padding: 0 }}
        >
          Change number
        </button>
      </div>
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  return <Suspense><ForgotPasswordForm /></Suspense>;
}
