'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import api from '@/lib/api';

const CLAUSES = [
  {
    num: '01',
    title: 'Event accuracy',
    body: 'All event details you publish — dates, times, venue, price, capacity — must be accurate. Misleading listings may result in suspension.',
  },
  {
    num: '02',
    title: 'Payments & payouts',
    body: 'You receive 90% of ticket revenue. Payouts settle T+1 business days after each event closes. Platform fees are non-refundable.',
  },
  {
    num: '03',
    title: 'Refunds',
    body: 'If you cancel an event, all attendees receive a full refund. Partial cancellations or no-shows are your responsibility to resolve.',
  },
  {
    num: '04',
    title: 'Guest safety',
    body: 'You are responsible for the safety and wellbeing of attendees at your events. Clique reserves the right to remove any host whose events pose a safety risk.',
  },
  {
    num: '05',
    title: 'Content standards',
    body: 'Event content must not promote illegal activity, hate, or discrimination. Clique may remove listings and suspend accounts that violate this.',
  },
  {
    num: '06',
    title: 'Capacity & entry',
    body: 'You must not admit more attendees than your stated capacity. QR passes issued by Clique are the sole valid proof of entry.',
  },
  {
    num: '07',
    title: 'Data & privacy',
    body: 'Guest data — names, contacts, booking details — collected through Clique may only be used for the event they booked. No resale or third-party sharing.',
  },
  {
    num: '08',
    title: 'Platform rules',
    body: 'Circumventing Clique\'s booking or payment system to collect payments directly from attendees will result in immediate suspension.',
  },
];

export default function HostTermsPage() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Already accepted — send straight to dashboard
  if (user?.hasAcceptedHostTnC) {
    router.replace('/host/dashboard');
    return null;
  }

  // Not a verified host — no business being here
  if (user && !user.isVerifiedHost) {
    router.replace('/become-host');
    return null;
  }

  async function handleAccept() {
    if (!checked || loading) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/hosts/accept-tnc');
      if (user) updateUser({ ...user, hasAcceptedHostTnC: true });
      router.replace('/host/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl animate-rise pb-20">
      {/* Header */}
      <div className="mb-10 border-b border-line pb-8">
        <div className="clique-label mb-3">HOST AGREEMENT</div>
        <h1 className="m-0 font-display text-[clamp(34px,7vw,52px)] font-bold leading-[0.95] tracking-[-0.03em]">
          Before you open<br />
          <span className="font-serif italic font-normal text-lime">the door.</span>
        </h1>
        <p className="mt-4 font-display text-[15px] leading-relaxed text-cream max-w-[52ch]">
          Read through the host agreement below. These are the rules that keep Clique safe for everyone — hosts and attendees alike. You need to accept before accessing your dashboard.
        </p>
      </div>

      {/* Clauses */}
      <ol className="m-0 mb-10 list-none p-0">
        {CLAUSES.map(({ num, title, body }) => (
          <li key={num} className="flex gap-6 border-b border-dashed border-line py-5">
            <span className="clique-label w-7 shrink-0 pt-0.5">{num}</span>
            <div>
              <div className="font-display text-[17px] font-bold tracking-[-0.01em] text-paper">{title}</div>
              <div className="mt-1.5 font-display text-sm leading-relaxed text-cream">{body}</div>
            </div>
          </li>
        ))}
      </ol>

      {/* Full T&C reference */}
      <div className="mb-8 rounded-md border border-dashed border-line-2 p-5 font-display text-[13px] leading-relaxed text-cream">
        This agreement is supplementary to the{' '}
        <a
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="text-lime underline underline-offset-2 hover:opacity-80"
        >
          Clique Terms of Service
        </a>
        {' '}and{' '}
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-lime underline underline-offset-2 hover:opacity-80"
        >
          Privacy Policy
        </a>
        . By accepting, you agree to both.
      </div>

      {/* Acceptance */}
      <div className="flex flex-col gap-5">
        <label className="flex cursor-pointer items-start gap-4 rounded-md border border-line p-5 transition-colors hover:border-lime/40">
          <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-line transition-colors" style={{ borderColor: checked ? 'var(--lime)' : undefined, background: checked ? 'var(--lime)' : undefined }}>
            {checked && (
              <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                <path d="M1 4L4 7L10 1" stroke="#0A0806" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </span>
          <span className="font-display text-[15px] leading-relaxed text-paper">
            I have read and agree to the Clique Host Agreement, Terms of Service, and Privacy Policy. I understand these are binding conditions of using Clique as a host.
          </span>
        </label>

        {error && (
          <p className="m-0 font-mono text-xs text-hot">{error}</p>
        )}

        <Button
          size="lg"
          className="w-full"
          disabled={!checked || loading}
          loading={loading}
          onClick={handleAccept}
        >
          Accept &amp; open dashboard →
        </Button>

        <p className="m-0 text-center font-mono text-[10px] uppercase tracking-[.1em] text-dim">
          You must accept to access host features
        </p>
      </div>
    </div>
  );
}
