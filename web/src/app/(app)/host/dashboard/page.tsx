'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Event } from '@/types';
import { formatTime } from '@/lib/utils';
import { catColor } from '@/lib/theme';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import PageHead from '@/components/ui/PageHead';
import ScannerModal from '@/components/ScannerModal';
import api from '@/lib/api';

export default function HostDashboardPage() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutToast, setPayoutToast] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/auth/me'),
      api.get('/events/mine'),
    ])
      .then(([meResp, eventsResp]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fresh = (meResp.data.data as any)?.user ?? meResp.data.data;
        updateUser(fresh);
        if (!fresh.isVerifiedHost) { router.replace('/become-host'); return; }
        setEvents(eventsResp.data.data?.events ?? []);
      })
      .catch(() => {
        if (user && !user.isVerifiedHost) router.replace('/become-host');
        setEvents([]);
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSetupPayouts() {
    setPayoutLoading(true);
    setPayoutToast('');
    try {
      const { data } = await api.post('/payu/generate-onboarding-link');
      const redirectUrl: string = data?.data?.redirect_url;
      if (!redirectUrl) throw new Error('No redirect URL');
      window.location.href = redirectUrl;
    } catch {
      setPayoutToast('Payment setup is currently unavailable. Please try again later.');
      setPayoutLoading(false);
    }
  }

  const activeEvents = events.filter((e) => e.status === 'published' || e.status === 'draft');
  const inactiveEvents = events.filter((e) => e.status === 'cancelled' || e.status === 'completed');

  const liveEvents = events.filter((e) => e.status === 'published').length;
  const totalRSVPs = activeEvents.reduce((s, e) => s + e.bookedCount, 0);
  const revenue = activeEvents.reduce((s, e) => s + e.bookedCount * e.price, 0);

  if (loading) return <PageSpinner />;

  return (
    <div>
      {scannerOpen && <ScannerModal events={events} onClose={() => setScannerOpen(false)} />}

      <PageHead
        kicker="HOST DASHBOARD"
        title="Your nights."
        accent="Run the door."
        aside={<Button onClick={() => router.push('/host/events/new')}>+ Throw something →</Button>}
      />

      {/* The night's figures — one ruled line, not stat tiles */}
      <div className="mb-9 flex flex-wrap items-baseline gap-x-10 gap-y-4 border-b border-line pb-7">
        {[
          { label: 'LIVE EVENTS', value: String(liveEvents).padStart(2, '0'), accent: liveEvents > 0 },
          { label: 'TOTAL RSVPS', value: String(totalRSVPs), accent: false },
          { label: 'REVENUE', value: `₹${revenue.toLocaleString('en-IN')}`, accent: revenue > 0 },
        ].map(({ label, value, accent }) => (
          <div key={label} className="flex items-baseline gap-3">
            <span className={`font-display text-4xl font-bold leading-none tracking-[-0.03em] md:text-[44px] ${accent ? 'text-lime' : 'text-paper'}`}>
              {value}
            </span>
            <span className="clique-label !text-[10px]">{label}</span>
          </div>
        ))}
      </div>

      {/* Your events */}
      <div className="mb-10">
        <div className="clique-label mb-2">YOUR EVENTS</div>
        {activeEvents.length === 0 ? (
          <div className="ledger px-1 py-14">
            <div className="clique-label mb-3.5 !text-[10px] !tracking-[.16em]">№ 000 — BLANK PAGE</div>
            <div className="mb-2 font-display text-3xl font-bold tracking-[-0.02em]">Nothing on the books.</div>
            <div className="mb-6 max-w-[42ch] font-display text-[15px] leading-relaxed text-cream">
              Throw something. The city is listening.
            </div>
            <Button onClick={() => router.push('/host/events/new')}>+ New event</Button>
          </div>
        ) : (
          <div className="ledger">
            {activeEvents.map((e) => <HostEventRow key={e._id} event={e} />)}
          </div>
        )}
      </div>

      {/* Past / cancelled */}
      {inactiveEvents.length > 0 && <PastEventsSection events={inactiveEvents} />}

      {/* Scanner */}
      <div className="mb-10">
        <div className="mb-4">
          <div className="clique-label">DOOR SCANNER</div>
          <div className="mt-1.5 font-mono text-xs tracking-[.04em] text-cream">hand your phone to the bouncer — they scan passes here</div>
        </div>
        <div className="rounded-md border border-dashed border-line-2 p-6">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="min-w-[200px] flex-1">
              <div className="font-display text-[22px] font-bold tracking-[-0.02em]">Open the scanner</div>
              <p className="m-0 mt-2 font-display text-sm leading-snug text-cream">
                Camera-based QR scanner for the door. Shows live entry count and confirms each pass instantly.
              </p>
            </div>
            <Button onClick={() => setScannerOpen(true)}>Launch scanner →</Button>
          </div>
        </div>
      </div>

      {/* Payouts */}
      <PayoutsSection
        payoutStatus={user?.payoutStatus ?? 'not_started'}
        loading={payoutLoading}
        toast={payoutToast}
        onSetup={handleSetupPayouts}
        onDismissToast={() => setPayoutToast('')}
      />
    </div>
  );
}

// ── Payouts ──────────────────────────────────────────────────────────────────

interface PayoutsSectionProps {
  payoutStatus: 'not_started' | 'pending' | 'active' | 'rejected';
  loading: boolean;
  toast: string;
  onSetup: () => void;
  onDismissToast: () => void;
}

function PayoutsSection({ payoutStatus, loading, toast, onSetup, onDismissToast }: PayoutsSectionProps) {
  const STATUS_BADGE: Record<string, { label: string; variant: 'neutral' | 'gold' | 'lime' | 'hot' }> = {
    not_started: { label: 'Not set up', variant: 'neutral' },
    pending: { label: 'KYC pending', variant: 'gold' },
    active: { label: 'Active', variant: 'lime' },
    rejected: { label: 'Rejected', variant: 'hot' },
  };

  const badge = STATUS_BADGE[payoutStatus] ?? STATUS_BADGE.not_started;
  const isActive = payoutStatus === 'active';
  const isPending = payoutStatus === 'pending';
  const isRejected = payoutStatus === 'rejected';

  return (
    <div className="mb-10">
      <div className="clique-label mb-4">PAYOUTS</div>
      <div className="flex flex-col gap-4 rounded-md border border-dashed border-line-2 p-6">

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="font-display text-[22px] font-bold tracking-[-0.02em]">
                {isActive ? 'Payouts ready' : isPending ? 'KYC in progress' : isRejected ? 'Verification failed' : 'Set up payouts'}
              </div>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>
            <p className="m-0 mt-2 max-w-[52ch] font-display text-sm leading-snug text-cream">
              {isActive
                ? 'Your PayU merchant account is verified. Payouts from paid events will settle to your bank.'
                : isPending
                ? 'Your KYC submission is under review by PayU. This usually takes 1–2 business days.'
                : isRejected
                ? 'Your KYC was not approved. Re-submit to try again — check the rejection reason in your email.'
                : 'Complete KYC with PayU to receive payouts from paid events. Takes about 5 minutes.'}
            </p>
          </div>

          {!isActive && (
            <Button onClick={onSetup} disabled={loading || isPending} loading={loading}>
              {isRejected ? 'Retry KYC →' : isPending ? 'Pending review…' : 'Set up payouts →'}
            </Button>
          )}
        </div>

        {toast && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-hot/20 bg-hot/[.08] px-3.5 py-3">
            <span className="font-mono text-[11px] leading-relaxed tracking-[.06em] text-hot">{toast}</span>
            <button onClick={onDismissToast} aria-label="Dismiss" className="shrink-0 leading-none text-hot">×</button>
          </div>
        )}

        {isActive && (
          <div className="flex flex-wrap gap-6 border-t border-line pt-4">
            {[
              { label: 'PAYOUT SPLIT', value: '80 / 20' },
              { label: 'SETTLEMENT', value: 'T+2 days' },
              { label: 'GATEWAY', value: 'PayU India' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="clique-label !text-[9px]">{label}</div>
                <div className="mt-1 font-display text-[15px] font-semibold">{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Past events ──────────────────────────────────────────────────────────────

function PastEventsSection({ events }: { events: Event[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-10">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex items-center gap-2.5 ${open ? 'mb-3.5' : ''}`}
      >
        <span className="clique-label">PAST &amp; CANCELLED</span>
        <span className={`inline-block font-mono text-[11px] text-dim transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
        <span className="rounded-full bg-line px-2 py-0.5 font-mono text-[10px] text-dim">{events.length}</span>
      </button>
      {open && (
        <div className="ledger">
          {events.map((e) => <HostEventRow key={e._id} event={e} dimmed />)}
        </div>
      )}
    </div>
  );
}

// ── Event row ────────────────────────────────────────────────────────────────

function HostEventRow({ event, dimmed = false }: { event: Event; dimmed?: boolean }) {
  const color = catColor(event.category);
  const filled = Math.min(100, (event.bookedCount / event.capacity) * 100);

  return (
    <Link
      href={`/host/events/${event._id}`}
      className={`ledger-row group grid grid-cols-[72px_1fr] items-center gap-x-4 gap-y-2 px-2 py-4 sm:grid-cols-[88px_1fr_auto] sm:gap-x-6 ${dimmed ? 'opacity-55' : ''}`}
    >
      {/* Door time + category tick */}
      <div className="self-start sm:self-center">
        <div className="font-display text-[22px] font-bold leading-none tracking-[-0.02em] text-paper sm:text-[24px]">
          {event.startTime ? formatTime(event.startTime).replace(':00', '').replace(' ', '') : '—'}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2 w-2 rounded-[1px]" style={{ background: color }} />
          <span className="font-mono text-[9px] uppercase tracking-[.12em] text-dim">
            {(event.category ?? 'other').replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="truncate font-display text-xl font-bold leading-tight tracking-[-0.02em] text-paper">{event.title}</div>
          {event.status === 'cancelled' && <span className="stamp text-hot">Cancelled</span>}
          {event.status === 'draft' && <span className="stamp stamp-flat text-gold">Draft</span>}
          {event.status === 'completed' && <span className="stamp stamp-flat text-sky">Completed</span>}
        </div>
        <div className="mt-1 truncate font-mono text-[11px] tracking-[.06em] text-cream">
          {event.locationName}
          {event.endTime ? ` · till ${formatTime(event.endTime)}` : ''}
        </div>
      </div>

      <div className="col-start-2 flex items-center gap-4 sm:col-start-auto sm:block sm:text-right">
        <div className="flex items-baseline gap-1 sm:justify-end">
          <span className="font-display text-xl font-bold tracking-[-0.02em]">{event.bookedCount}</span>
          <span className="font-mono text-[11px] text-dim">/ {event.capacity}</span>
        </div>
        <div className="flex items-center gap-2 sm:mt-1.5 sm:justify-end">
          <span className="inline-block h-[3px] w-14 overflow-hidden rounded-sm bg-line" aria-hidden>
            <span className="block h-full" style={{ width: `${filled}%`, background: filled > 85 ? 'var(--hot)' : 'var(--lime)' }} />
          </span>
          <span aria-hidden className="font-mono text-xs text-dim opacity-0 transition-opacity group-hover:opacity-100">→</span>
        </div>
      </div>
    </Link>
  );
}
