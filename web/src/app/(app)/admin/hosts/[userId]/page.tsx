'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageSpinner } from '@/components/ui/Spinner';
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

function Stat({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className={`font-display text-4xl font-bold leading-none tracking-[-0.03em] md:text-[44px] ${accent ? 'text-lime' : 'text-paper'}`}>
        {value}
      </span>
      <span className="clique-label !text-[10px]">{label}</span>
    </div>
  );
}

function EventRow({ event }: { event: Event }) {
  const color  = catColor(event.category);
  const filled = Math.min(100, (event.bookedCount / event.capacity) * 100);
  const statusMap: Record<string, string> = {
    published: 'text-lime', draft: 'text-gold', cancelled: 'text-hot', completed: 'text-sky', blocked: 'text-hot',
  };

  return (
    <Link
      href={`/admin/events/${event._id}`}
      className="ledger-row group grid grid-cols-[72px_1fr] items-center gap-x-4 gap-y-2 px-2 py-4 sm:grid-cols-[88px_1fr_auto] sm:gap-x-6"
      style={{ textDecoration: 'none' }}
    >
      {/* Time + category */}
      <div className="self-start sm:self-center">
        <div className="font-display text-[22px] font-bold leading-none tracking-[-0.02em] text-paper sm:text-[24px]">
          {event.startTime ? formatTime(event.startTime).replace(':00', '').replace(' ', '') : '—'}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-[1px]" style={{ background: color }} />
          <span className="font-mono text-[9px] uppercase tracking-[.12em] text-dim">
            {(event.category ?? 'other').replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Title + location */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="truncate font-display text-xl font-bold leading-tight tracking-[-0.02em] text-paper">{event.title}</div>
          {event.status !== 'published' && (
            <span className={`stamp stamp-flat ${statusMap[event.status] ?? 'text-dim'}`}>
              {event.status}
            </span>
          )}
        </div>
        <div className="mt-1 truncate font-mono text-[11px] tracking-[.06em] text-cream">{event.locationName}</div>
      </div>

      {/* Bookings + fill bar */}
      <div className="col-start-2 flex items-center gap-4 sm:col-start-auto sm:block sm:text-right">
        <div className="flex items-baseline gap-1 sm:justify-end">
          <span className="font-display text-xl font-bold tracking-[-0.02em]">{event.bookedCount}</span>
          <span className="font-mono text-[11px] text-dim">/ {event.capacity}</span>
        </div>
        <div className="flex items-center gap-2 sm:mt-1.5 sm:justify-end">
          <span className="inline-block h-[3px] w-14 overflow-hidden rounded-sm bg-line">
            <span className="block h-full" style={{ width: `${filled}%`, background: filled > 85 ? 'var(--hot)' : 'var(--lime)' }} />
          </span>
          <span className="font-mono text-xs text-dim opacity-0 transition-opacity group-hover:opacity-100">→</span>
        </div>
      </div>
    </Link>
  );
}

export default function AdminHostDashboardPage() {
  const { userId } = useParams<{ userId: string }>();
  const [data, setData]     = useState<HostDashboard | null>(null);
  const [loading, setLoading] = useState(true);

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
  const inactiveEvents = events.filter((e) => !['published', 'draft'].includes(e.status));
  const liveEvents     = events.filter((e) => e.status === 'published').length;
  const totalRSVPs     = activeEvents.reduce((s, e) => s + e.bookedCount, 0);
  const revenue        = events.reduce((s, e) => s + (e.revenue ?? 0), 0);

  const avatar = host.profileImage ? getImageUrl(host.profileImage) : null;

  return (
    <div>
      <Link href="/admin/hosts/all" className="clique-label mb-6 inline-block transition-colors hover:text-paper">
        ← Admin / Hosts
      </Link>

      {/* Host identity */}
      <div className="mb-8 flex items-start gap-4 border-b border-line pb-7">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-line font-display text-2xl font-bold text-cream">
          {avatar
            ? <img src={avatar} alt={host.name} className="h-full w-full object-cover" />
            : (host.name?.[0] ?? '?').toUpperCase()
          }
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="m-0 font-display text-[clamp(24px,4vw,38px)] font-bold leading-[0.95] tracking-[-0.025em] text-paper">
              {host.name}
            </h1>
            <span className="rounded-full border border-lime/30 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[.1em] text-lime">
              Verified Host
            </span>
          </div>
          <p className="m-0 mt-1 font-mono text-[12px] tracking-[.04em] text-dim">
            @{host.username}
            {host.city ? ` · ${host.city}` : ''}
            {host.cliquescore != null ? ` · ★ ${host.cliquescore}` : ''}
          </p>
          {host.bio && (
            <p className="m-0 mt-2 max-w-[52ch] font-display text-sm leading-relaxed text-cream">{host.bio}</p>
          )}

          {/* Social counts */}
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
            {[
              { label: 'Followers', value: host.followerCount ?? 0 },
              { label: 'Following', value: host.followingCount ?? 0 },
              { label: 'Posts', value: host.postCount ?? 0 },
            ].map(({ label, value }) => (
              <span key={label} className="font-mono text-[11px] tracking-[.04em] text-cream">
                <span className="font-bold text-paper">{value}</span> {label}
              </span>
            ))}
          </div>

          {/* Payout */}
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
            <span className="font-mono text-[10px] uppercase tracking-[.08em] text-dim">
              Payout: <span className={host.payoutStatus === 'active' ? 'text-lime' : 'text-gold'}>
                {host.payoutStatus === 'active' ? `Active · ${host.upiId}` : 'Not set up'}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Stats strip — mirrors host dashboard */}
      <div className="mb-9 flex flex-wrap items-baseline gap-x-10 gap-y-4 border-b border-line pb-7">
        <Stat label="LIVE EVENTS" value={String(liveEvents).padStart(2, '0')} accent={liveEvents > 0} />
        <Stat label="TOTAL RSVPS" value={totalRSVPs} />
        <Stat label="REVENUE"     value={formatPrice(revenue)} accent={revenue > 0} />
        <Stat label="TOTAL EVENTS" value={events.length} />
      </div>

      {/* Active events */}
      <div className="mb-10">
        <div className="clique-label mb-2">EVENTS</div>
        {activeEvents.length === 0 ? (
          <div className="ledger px-1 py-10">
            <p className="m-0 font-display text-xl font-bold tracking-[-0.02em] text-paper">No active events.</p>
          </div>
        ) : (
          <div className="ledger">
            {activeEvents.map((e) => <EventRow key={e._id} event={e} />)}
          </div>
        )}
      </div>

      {/* Past / cancelled / blocked */}
      {inactiveEvents.length > 0 && (
        <PastEventsSection events={inactiveEvents} />
      )}
    </div>
  );
}

function PastEventsSection({ events }: { events: Event[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-10">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex items-center gap-2.5 ${open ? 'mb-3.5' : ''}`}
      >
        <span className="clique-label">PAST, CANCELLED &amp; BLOCKED</span>
        <span className={`inline-block font-mono text-[11px] text-dim transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
        <span className="rounded-full bg-line px-2 py-0.5 font-mono text-[10px] text-dim">{events.length}</span>
      </button>
      {open && (
        <div className="ledger">
          {events.map((e) => <EventRow key={e._id} event={e} />)}
        </div>
      )}
    </div>
  );
}
