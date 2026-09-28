'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageSpinner } from '@/components/ui/Spinner';
import PageHead from '@/components/ui/PageHead';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ScannerModal from '@/components/ScannerModal';
import { Event } from '@/types';
import { formatTime, formatPrice, getImageUrl } from '@/lib/utils';
import { catColor } from '@/lib/theme';
import api from '@/lib/api';

interface AdminHost {
  _id: string;
  name: string;
  username: string;
  profileImage?: string;
  bio?: string;
  city?: string;
  cliquescore?: number;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  upiId?: string;
  payoutStatus?: 'not_started' | 'active';
  createdAt: string;
}

interface HostDashboard {
  host: AdminHost;
  events: Event[];
}

export default function AdminHostDashboardPage() {
  const { userId } = useParams<{ userId: string }>();
  const [data, setData]         = useState<HostDashboard | null>(null);
  const [loading, setLoading]   = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    api.get(`/admin/hosts/${userId}/dashboard`)
      .then(({ data: res }) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <PageSpinner />;
  if (!data) {
    return (
      <div className="py-24 text-center">
        <div className="font-display text-[28px] font-bold tracking-[-0.02em]">Host not found.</div>
        <Link href="/admin/hosts/all" className="clique-label mt-4 inline-block hover:text-paper">← Admin / Hosts</Link>
      </div>
    );
  }

  const { host, events } = data;

  const activeEvents   = events.filter((e) => e.status === 'published' || e.status === 'draft');
  const inactiveEvents = events.filter((e) => e.status === 'cancelled' || e.status === 'completed');

  const liveEvents  = events.filter((e) => e.status === 'published').length;
  const totalRSVPs  = activeEvents.reduce((s, e) => s + e.bookedCount, 0);
  const revenue     = activeEvents.reduce((s, e) => s + (e.revenue ?? 0), 0);

  return (
    <div>
      {scannerOpen && <ScannerModal events={events} onClose={() => setScannerOpen(false)} />}

      <Link href="/admin/hosts/all" className="clique-label mb-6 inline-block transition-colors hover:text-paper">
        ← Admin / Hosts
      </Link>

      <PageHead
        kicker="HOST DASHBOARD"
        title={host.name}
        accent="Run the door."
        aside={
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-mono text-[11px] tracking-[.04em] text-dim">@{host.username}</span>
            {host.city && <span className="font-mono text-[11px] tracking-[.04em] text-dim">{host.city}</span>}
          </div>
        }
      />

      {/* Stats strip — matches host dashboard */}
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

      {/* Events */}
      <div className="mb-10">
        <div className="clique-label mb-2">YOUR EVENTS</div>
        {activeEvents.length === 0 ? (
          <div className="ledger px-1 py-14">
            <div className="clique-label mb-3.5 !text-[10px] !tracking-[.16em]">№ 000 — BLANK PAGE</div>
            <div className="mb-2 font-display text-3xl font-bold tracking-[-0.02em]">Nothing on the books.</div>
            <div className="mb-6 max-w-[42ch] font-display text-[15px] leading-relaxed text-cream">
              This host has no active events yet.
            </div>
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
      <AdminPayoutsSection payoutStatus={host.payoutStatus ?? 'not_started'} upiId={host.upiId} />
    </div>
  );
}

// ── Admin payouts (read-only) ─────────────────────────────────────────────────

function AdminPayoutsSection({ payoutStatus, upiId }: { payoutStatus: 'not_started' | 'active'; upiId?: string }) {
  const isActive = payoutStatus === 'active';

  return (
    <div className="mb-10">
      <div className="clique-label mb-4">PAYOUTS</div>
      <div className="flex flex-col gap-4 rounded-md border border-dashed border-line-2 p-6">

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="font-display text-[22px] font-bold tracking-[-0.02em]">
                {isActive ? 'Payouts active' : 'Set up payouts'}
              </div>
              <Badge variant={isActive ? 'lime' : 'neutral'}>{isActive ? 'Active' : 'Not set up'}</Badge>
            </div>
            <p className="m-0 mt-2 max-w-[52ch] font-display text-sm leading-snug text-cream">
              {isActive
                ? 'Ticket revenue from paid events will be transferred to this UPI ID.'
                : 'Host has not set up a payout UPI ID yet.'}
            </p>
          </div>
        </div>

        {isActive && upiId && (
          <div className="flex items-center gap-3 rounded-lg border border-line bg-ink px-4 py-3">
            <span className="clique-label !text-[9px]">UPI ID</span>
            <span className="font-mono text-[13px] text-paper">{upiId}</span>
          </div>
        )}

        {isActive && (
          <div className="flex flex-wrap gap-6 border-t border-line pt-4">
            {[
              { label: 'PAYOUT SPLIT', value: '90 / 10' },
              { label: 'SETTLEMENT', value: 'T+1 days' },
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

// ── Past events ───────────────────────────────────────────────────────────────

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

// ── Event row ─────────────────────────────────────────────────────────────────

function HostEventRow({ event, dimmed = false }: { event: Event; dimmed?: boolean }) {
  const color  = catColor(event.category);
  const filled = Math.min(100, (event.bookedCount / event.capacity) * 100);

  return (
    <Link
      href={`/admin/events/${event._id}`}
      className={`ledger-row group grid grid-cols-[72px_1fr] items-center gap-x-4 gap-y-2 px-2 py-4 sm:grid-cols-[88px_1fr_auto] sm:gap-x-6 ${dimmed ? 'opacity-55' : ''}`}
      style={{ textDecoration: 'none' }}
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
          {event.status === 'cancelled'  && <span className="stamp text-hot">Cancelled</span>}
          {event.status === 'draft'      && <span className="stamp stamp-flat text-gold">Draft</span>}
          {event.status === 'completed'  && <span className="stamp stamp-flat text-sky">Completed</span>}
          {event.status === 'blocked'    && <span className="stamp stamp-flat text-hot">Blocked</span>}
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
