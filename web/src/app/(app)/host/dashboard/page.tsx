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

      {/* Stats */}
      <div className="mb-9 grid grid-cols-1 gap-3.5 border-b border-line pb-8 sm:grid-cols-3">
        {[
          { label: 'LIVE EVENTS', value: String(liveEvents), accent: liveEvents > 0 },
          { label: 'TOTAL RSVPS', value: String(totalRSVPs), accent: false },
          { label: 'REVENUE', value: `₹${revenue.toLocaleString('en-IN')}`, accent: revenue > 0 },
        ].map(({ label, value, accent }) => (
          <div key={label} className="rounded-xl border border-line-2 bg-card p-4.5 px-5 py-4">
            <div className="clique-label">{label}</div>
            <div className={`mt-1.5 font-display text-4xl font-bold leading-none tracking-[-0.03em] md:text-[44px] ${accent ? 'text-lime' : 'text-paper'}`}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Your events */}
      <div className="mb-10">
        <div className="clique-label mb-4">YOUR EVENTS</div>
        {activeEvents.length === 0 ? (
          <div className="rounded-card border border-line-2 bg-card px-5 py-14 text-center">
            <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-full border border-line-2 font-display text-2xl text-dim">○</div>
            <div className="mb-2 font-display text-2xl font-bold tracking-[-0.02em]">Nothing on the books.</div>
            <div className="mb-6 font-mono text-xs uppercase tracking-[.08em] text-dim">Throw something. The city is listening.</div>
            <Button onClick={() => router.push('/host/events/new')}>+ New event</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
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
        <div className="rounded-card border border-line-2 bg-card p-6">
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
      <div className="flex flex-col gap-4 rounded-card border border-line-2 bg-card p-6">

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
        <div className="flex flex-col gap-2.5">
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
  const isCancelled = event.status === 'cancelled';

  return (
    <Link
      href={`/host/events/${event._id}`}
      className={`grid grid-cols-[64px_1fr] items-center gap-x-4 gap-y-3 rounded-xl border bg-card p-3.5 transition-colors sm:grid-cols-[64px_1fr_auto_auto] sm:gap-4 ${
        isCancelled ? 'border-hot/15 hover:border-hot/30' : 'border-line-2 hover:border-cream'
      } ${dimmed ? 'opacity-55' : ''}`}
    >
      <div className="flex h-16 w-16 shrink-0 flex-col justify-between rounded-lg p-2" style={{ background: color }}>
        <div className="font-mono text-[9px] tracking-[.1em] text-ink/70">
          {(event.category ?? 'other').replace('_', ' ').toUpperCase()}
        </div>
        <div className="font-display text-base font-bold leading-none text-ink">
          {event.startTime ? formatTime(event.startTime).replace(':00', '') : '—'}
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-display text-xl font-bold leading-none tracking-[-0.02em] text-paper">{event.title}</div>
          {event.status === 'cancelled' && <Badge variant="hot">Cancelled</Badge>}
          {event.status === 'draft' && <Badge variant="gold">Draft</Badge>}
          {event.status === 'completed' && <Badge variant="sky">Completed</Badge>}
        </div>
        <div className="mt-1 truncate font-mono text-[11px] tracking-[.06em] text-cream">
          {event.locationName}
          {event.startTime ? ` · ${formatTime(event.startTime)}` : ''}
          {event.endTime ? ` → ${formatTime(event.endTime)}` : ''}
        </div>
      </div>

      <div className="col-start-2 flex min-w-[90px] flex-col sm:col-start-auto">
        <div className="clique-label !text-[10px]">RSVPS</div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="font-display text-2xl font-bold tracking-[-0.02em]">{event.bookedCount}</span>
          <span className="font-mono text-[11px] text-dim">/ {event.capacity}</span>
        </div>
        <div className="mt-1.5 h-[3px] w-20 overflow-hidden rounded-sm bg-line">
          <div className="h-full" style={{ width: `${filled}%`, background: filled > 85 ? 'var(--hot)' : 'var(--lime)' }} />
        </div>
      </div>

      <span className="hidden font-mono text-xs uppercase tracking-[.08em] text-dim sm:block">
        Manage →
      </span>
    </Link>
  );
}
