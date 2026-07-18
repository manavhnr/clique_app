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
  const [payoutSuccess, setPayoutSuccess] = useState('');

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

  async function handleSaveUpi(upiId: string) {
    setPayoutLoading(true);
    setPayoutToast('');
    setPayoutSuccess('');
    try {
      const { data } = await api.patch('/users/upi', { upiId });
      if (user) updateUser({ ...user, upiId: data.data.upiId, payoutStatus: data.data.payoutStatus });
      setPayoutSuccess('UPI ID saved successfully.');
    } catch {
      setPayoutToast('Could not save UPI ID. Please try again.');
    } finally {
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
        upiId={user?.upiId}
        loading={payoutLoading}
        toast={payoutToast}
        success={payoutSuccess}
        onSave={handleSaveUpi}
        onDismissToast={() => setPayoutToast('')}
        onDismissSuccess={() => setPayoutSuccess('')}
      />
    </div>
  );
}

// ── Payouts ──────────────────────────────────────────────────────────────────

interface PayoutsSectionProps {
  payoutStatus: 'not_started' | 'active';
  upiId?: string;
  loading: boolean;
  toast: string;
  success: string;
  onSave: (upiId: string) => void;
  onDismissToast: () => void;
  onDismissSuccess: () => void;
}

function PayoutsSection({ payoutStatus, upiId, loading, toast, success, onSave, onDismissToast, onDismissSuccess }: PayoutsSectionProps) {
  const isActive = payoutStatus === 'active';
  const [editing, setEditing] = useState(!isActive);
  const [inputVal, setInputVal] = useState(upiId ?? '');
  const [inputErr, setInputErr] = useState('');

  function validate(v: string) {
    if (!v.trim()) return 'UPI ID is required';
    if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(v.trim())) return 'Enter a valid UPI ID (e.g. yourname@upi)';
    return '';
  }

  function handleSubmit() {
    const err = validate(inputVal);
    if (err) { setInputErr(err); return; }
    setInputErr('');
    onSave(inputVal.trim().toLowerCase());
    setEditing(false);
  }

  return (
    <div className="mb-10">
      <div className="clique-label mb-4">PAYOUTS</div>
      <div className="flex flex-col gap-4 rounded-md border border-dashed border-line-2 p-6">

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="font-display text-[22px] font-bold tracking-[-0.02em]">
                {isActive && !editing ? 'Payouts active' : 'Set up payouts'}
              </div>
              <Badge variant={isActive ? 'lime' : 'neutral'}>{isActive ? 'Active' : 'Not set up'}</Badge>
            </div>
            <p className="m-0 mt-2 max-w-[52ch] font-display text-sm leading-snug text-cream">
              {isActive && !editing
                ? 'Ticket revenue from your paid events will be transferred to this UPI ID.'
                : 'Add your UPI ID to receive payouts from paid events.'}
            </p>
          </div>

          {isActive && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="font-mono text-[11px] tracking-[.06em] text-dim underline underline-offset-2 hover:text-paper"
            >
              Edit
            </button>
          )}
        </div>

        {/* Saved state — show UPI ID */}
        {isActive && !editing && upiId && (
          <div className="flex items-center gap-3 rounded-lg border border-line bg-ink px-4 py-3">
            <span className="clique-label !text-[9px]">UPI ID</span>
            <span className="font-mono text-[13px] text-paper">{upiId}</span>
          </div>
        )}

        {/* Input state */}
        {(!isActive || editing) && (
          <div className="flex flex-col gap-3">
            <div>
              <input
                type="text"
                value={inputVal}
                onChange={(e) => { setInputVal(e.target.value); setInputErr(''); }}
                placeholder="yourname@upi"
                className="w-full rounded-lg border border-line bg-ink px-4 py-2.5 font-mono text-[13px] text-paper placeholder-dim outline-none focus:border-lime"
                style={{ maxWidth: 340 }}
                disabled={loading}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              />
              {inputErr && <div className="mt-1.5 font-mono text-[11px] text-hot">{inputErr}</div>}
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleSubmit} disabled={loading} loading={loading}>
                Save UPI ID →
              </Button>
              {isActive && editing && (
                <button
                  onClick={() => { setEditing(false); setInputVal(upiId ?? ''); setInputErr(''); }}
                  className="font-mono text-[11px] tracking-[.06em] text-dim hover:text-paper"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error toast */}
        {toast && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-hot/20 bg-hot/[.08] px-3.5 py-3">
            <span className="font-mono text-[11px] leading-relaxed tracking-[.06em] text-hot">{toast}</span>
            <button onClick={onDismissToast} aria-label="Dismiss" className="shrink-0 leading-none text-hot">×</button>
          </div>
        )}

        {/* Success toast */}
        {success && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-lime/20 bg-lime/[.08] px-3.5 py-3">
            <span className="font-mono text-[11px] leading-relaxed tracking-[.06em] text-lime">{success}</span>
            <button onClick={onDismissSuccess} aria-label="Dismiss" className="shrink-0 leading-none text-lime">×</button>
          </div>
        )}

        {/* Payout details — only shown when active */}
        {isActive && !editing && (
          <div className="flex flex-wrap gap-6 border-t border-line pt-4">
            {[
              { label: 'PAYOUT SPLIT', value: '80 / 20' },
              { label: 'SETTLEMENT', value: 'T+2 days' },
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
