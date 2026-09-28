'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { PageSpinner } from '@/components/ui/Spinner';
import ScannerModal from '@/components/ScannerModal';
import { Event, EventMember, GroupDeal, PricingTier, Squad } from '@/types';
import { formatDate, formatTime, formatPrice, getImageUrl } from '@/lib/utils';
import api from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Booking {
  _id: string;
  userId: {
    _id: string; name: string; username: string; profileImage?: string;
    gender?: string; age?: number; phone?: string; city?: string;
    cliquescore?: number; connectedSocials?: { instagram?: string };
  };
  status: string;
  amount: number;
  tierLabel?: string;
  groupSize?: number;
  createdAt: string;
}

interface PendingRequest {
  _id: string;
  userId: {
    _id: string; name: string; username: string; profileImage?: string;
    gender?: string; age?: number; phone?: string; city?: string;
    cliquescore?: number; connectedSocials?: { instagram?: string };
  };
  status: string;
  message?: string;
  createdAt: string;
}

interface AdminEventDetail {
  event: Event & { hostId: { _id: string; name: string; username: string; profileImage?: string; isVerifiedHost?: boolean } };
  bookings: Booking[];
  requests: PendingRequest[];
}

interface Discount {
  _id: string;
  userId: { _id: string; name: string; username: string; profileImage?: string };
  discountType: 'percentage' | 'absolute';
  discountValue: number;
  status: 'active' | 'used' | 'revoked';
  createdAt: string;
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'overview',   label: 'Overview'  },
  { key: 'guests',     label: 'Guests'    },
  { key: 'phases',     label: 'Phases'    },
  { key: 'team',       label: 'Team'      },
  { key: 'discounts',  label: 'Discounts' },
  { key: 'scanner',    label: 'Scanner'   },
] as const;

type TabKey = typeof TABS[number]['key'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDisplayPrice(event: Event): string {
  const tiers: PricingTier[] = event.pricingTiers ?? [];
  if (tiers.length === 0) return formatPrice(event.price);
  const min = Math.min(...tiers.flatMap((t) => [t.commonPrice, t.malePrice, t.femalePrice].filter((p) => p > 0)));
  return `${formatPrice(min)} onwards`;
}

function GenderBadge({ gender }: { gender?: string }) {
  if (!gender || gender === 'prefer_not_to_say') return null;
  const map: Record<string, { label: string; variant: 'sky' | 'hot' }> = {
    male: { label: 'M', variant: 'sky' },
    female: { label: 'F', variant: 'hot' },
  };
  const cfg = map[gender];
  if (!cfg) return null;
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function BookingStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'lime' | 'gold' | 'sky' | 'hot' | 'neutral' }> = {
    confirmed:       { label: 'Confirmed',       variant: 'lime'    },
    checked_in:      { label: 'Checked in',      variant: 'sky'     },
    payment_pending: { label: 'Payment pending', variant: 'gold'    },
    utr_submitted:   { label: 'UPI submitted',   variant: 'gold'    },
    cancelled:       { label: 'Cancelled',        variant: 'hot'     },
    refunded:        { label: 'Refunded',         variant: 'neutral' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={variant}>{label}</Badge>;
}

type EntryType = 'stag' | 'solo' | 'group' | 'mixed';

function getEntryType(gender: string | undefined, squadName: string | undefined, squadMembers?: { gender?: string }[], groupSize?: number): EntryType {
  if (squadName && squadMembers) {
    const hasMale   = squadMembers.some((m) => m.gender === 'male');
    const hasFemale = squadMembers.some((m) => m.gender === 'female');
    if (hasMale && hasFemale) return 'mixed';
    return 'group';
  }
  if (groupSize != null && groupSize > 1) return 'group';
  if (gender === 'male') return 'stag';
  return 'solo';
}

function EntryTypeBadge({ type, squadName }: { type: EntryType; squadName?: string }) {
  const map: Record<EntryType, { label: string; variant: 'sky' | 'hot' | 'gold' | 'lime' }> = {
    stag:  { label: 'STAG',                                         variant: 'sky'  },
    solo:  { label: 'SOLO',                                         variant: 'hot'  },
    group: { label: squadName ? `GROUP · ${squadName}` : 'GROUP',  variant: 'gold' },
    mixed: { label: squadName ? `MIXED · ${squadName}` : 'MIXED',  variant: 'lime' },
  };
  const { label, variant } = map[type];
  return <Badge variant={variant}>{label}</Badge>;
}

function InstagramLink({ socials }: { socials?: { instagram?: string } }) {
  if (!socials?.instagram) return null;
  return (
    <a
      href={`https://instagram.com/${socials.instagram}`}
      target="_blank" rel="noopener noreferrer"
      className="font-mono text-[11px] tracking-[.04em] text-cream transition-colors hover:text-paper"
    >
      IG @{socials.instagram} ↗
    </a>
  );
}

function AttendeeCard({
  name, username, profileImage, gender, age, connectedSocials, city, cliquescore,
  right, requestStatus, entryType, squadName, framed = true,
}: {
  name: string; username: string; profileImage?: string; gender?: string; age?: number;
  connectedSocials?: { instagram?: string }; city?: string; cliquescore?: number;
  right?: React.ReactNode; requestStatus?: string | null;
  entryType?: EntryType; squadName?: string; framed?: boolean;
}) {
  return (
    <div className={framed ? 'rounded-xl border border-line-2 bg-card p-4' : ''}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-line font-display text-sm font-bold text-cream">
          {profileImage
            ? <img src={getImageUrl(profileImage)} alt={name} className="h-full w-full object-cover" />
            : (name?.[0] ?? '?').toUpperCase()
          }
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <p className="m-0 font-display text-sm font-bold text-paper">{name || 'Unknown'}</p>
            <GenderBadge gender={gender} />
            {age != null && <Badge>{age}y</Badge>}
            {entryType && <EntryTypeBadge type={entryType} squadName={squadName} />}
            {requestStatus === 'requested' && <Badge variant="gold">Pending</Badge>}
            {requestStatus === 'approved'  && <Badge variant="lime">Approved</Badge>}
          </div>
          <p className="m-0 font-mono text-[11px] tracking-[.04em] text-dim">
            @{username || '—'}{city ? ` · ${city}` : ''}{cliquescore != null ? ` · ★ ${cliquescore}` : ''}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <InstagramLink socials={connectedSocials} />
          </div>
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </div>
  );
}

function SectionHead({ label, count, variant = 'neutral', action }: {
  label: string; count: number; variant?: 'lime' | 'gold' | 'neutral'; action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="clique-label">{label}</span>
        <Badge variant={variant}>{count}</Badge>
      </div>
      {action}
    </div>
  );
}

function Paginated<T>({ items, pageSize = 10, listClassName = 'flex flex-col gap-2.5', renderItem }: {
  items: T[]; pageSize?: number; listClassName?: string; renderItem: (item: T) => React.ReactNode;
}) {
  const [page, setPage] = useState(0);
  const total   = Math.ceil(items.length / pageSize);
  const visible = items.slice(page * pageSize, (page + 1) * pageSize);
  return (
    <div>
      <div className={listClassName}>
        {visible.map((item, i) => <div key={i}>{renderItem(item)}</div>)}
      </div>
      {total > 1 && (
        <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded border border-line-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.08em] text-dim transition-colors hover:border-line-1 hover:text-cream disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="font-mono text-[10px] tracking-[.08em] text-dim">{page + 1} / {total}</span>
          <button
            onClick={() => setPage((p) => Math.min(total - 1, p + 1))}
            disabled={page === total - 1}
            className="rounded border border-line-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.08em] text-dim transition-colors hover:border-line-1 hover:text-cream disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Event header ─────────────────────────────────────────────────────────────

function EventHeader({ event, onRefresh }: { event: Event & { hostId: AdminEventDetail['event']['hostId'] }; onRefresh: () => void }) {
  const [recalculating, setRecalculating] = useState(false);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await api.patch(`/events/${event._id}/recalculate-count`);
      await onRefresh();
    } finally { setRecalculating(false); }
  };

  const statusMap: Record<string, { label: string; variant: 'lime' | 'gold' | 'hot' | 'sky' | 'neutral' }> = {
    published: { label: 'Live',      variant: 'lime'    },
    draft:     { label: 'Draft',     variant: 'gold'    },
    cancelled: { label: 'Cancelled', variant: 'hot'     },
    completed: { label: 'Completed', variant: 'sky'     },
    blocked:   { label: 'Blocked',   variant: 'hot'     },
  };
  const statusBadge = statusMap[event.status] ?? { label: event.status, variant: 'neutral' as const };
  const stampClass: Record<string, string> = {
    lime: 'text-lime', gold: 'text-gold', hot: 'text-hot', sky: 'text-sky', neutral: 'text-cream',
  };
  const imageUrl = event.images?.[0] ? getImageUrl(event.images[0]) : null;
  const host = event.hostId;

  return (
    <div className="border-b border-line pb-6">
      <div className="flex items-start gap-4">
        {imageUrl && (
          <img src={imageUrl} alt="" className="hidden h-20 w-20 shrink-0 rounded-[3px] border border-line-2 object-cover sm:block" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="m-0 font-display text-[clamp(26px,4.5vw,40px)] font-bold leading-[0.95] tracking-[-0.025em] text-paper [overflow-wrap:break-word]">
              {event.title}
            </h2>
            <span className={`stamp ${stampClass[statusBadge.variant]}`}>{statusBadge.label}</span>
          </div>
          <p className="m-0 mt-2 font-mono text-[11px] tracking-[.06em] text-cream">
            {formatDate(event.date)} · {formatTime(event.startTime)} · {event.locationName}
          </p>
          <p className="m-0 mt-1 font-mono text-[11px] tracking-[.04em] text-dim">
            Host: @{host.username}{' '}
            {host.isVerifiedHost && (
              <span className="ml-1 rounded-full border border-lime/30 px-1.5 py-0.5 text-[9px] uppercase tracking-[.1em] text-lime">Verified</span>
            )}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-t border-dashed border-line pt-4">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display text-lg font-bold text-paper">{event.bookedCount}/{event.capacity}</span>
          <span className="clique-label !text-[9px]">ON THE LIST</span>
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            title="Recalculate from live bookings"
            className="ml-0.5 font-mono text-[9px] uppercase tracking-[.08em] text-dim transition-colors hover:text-lime disabled:opacity-40"
          >
            {recalculating ? '…' : '↺'}
          </button>
        </div>
        {[
          { label: 'CHECKED IN', value: event.checkedInCount ?? 0 },
          { label: 'PRICE',      value: getDisplayPrice(event)    },
          { label: 'PRIVACY',    value: event.privacy === 'private' ? 'Private' : event.privacy === 'secret' ? 'Secret' : 'Public' },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-baseline gap-2.5">
            <span className="font-display text-lg font-bold text-paper">{value}</span>
            <span className="clique-label !text-[9px]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ event, onStatusChange }: { event: Event; onStatusChange: (s: string) => void }) {
  const [blocking, setBlocking]   = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [toast, setToast]         = useState('');
  const [toastType, setToastType] = useState<'ok' | 'err'>('ok');

  const revenue = event.revenue ?? 0;

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(''), 3500);
  }

  const handleBlock = async () => {
    setBlocking(true);
    try {
      await api.patch(`/admin/events/${event._id}/block`);
      onStatusChange('blocked');
      showToast('Event blocked — all active passes cancelled.', 'ok');
    } catch { showToast('Failed to block event.', 'err'); }
    finally { setBlocking(false); setBlockOpen(false); }
  };

  const handleUnblock = async () => {
    setBlocking(true);
    try {
      await api.patch(`/admin/events/${event._id}/unblock`);
      onStatusChange('published');
      showToast('Event unblocked.', 'ok');
    } catch { showToast('Failed to unblock event.', 'err'); }
    finally { setBlocking(false); }
  };

  return (
    <div className="flex flex-col gap-7">
      {toast && (
        <div style={{
          background: toastType === 'ok' ? 'color-mix(in srgb, var(--lime) 8%, transparent)' : 'color-mix(in srgb, var(--hot) 8%, transparent)',
          border: `1px solid ${toastType === 'ok' ? 'color-mix(in srgb, var(--lime) 25%, transparent)' : 'color-mix(in srgb, var(--hot) 25%, transparent)'}`,
          borderRadius: 6, padding: '10px 14px',
        }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: toastType === 'ok' ? 'var(--lime)' : 'var(--hot)', letterSpacing: '.06em' }}>
            {toast}
          </span>
        </div>
      )}

      {revenue > 0 && (
        <div className="flex flex-wrap gap-px overflow-hidden rounded-card border border-line-2">
          <div className="flex min-w-[160px] flex-1 flex-col gap-1 bg-card px-5 py-4">
            <span className="clique-label !text-[9px]">TOTAL REVENUE</span>
            <span className="font-display text-2xl font-bold tracking-[-0.02em] text-lime">
              ₹{revenue.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex min-w-[120px] flex-1 flex-col gap-1 bg-card px-5 py-4">
            <span className="clique-label !text-[9px]">BOOKINGS</span>
            <span className="font-display text-2xl font-bold tracking-[-0.02em] text-paper">
              {event.bookedCount}
              <span className="ml-1.5 font-mono text-sm font-normal text-dim">/ {event.capacity}</span>
            </span>
          </div>
          <div className="flex min-w-[120px] flex-1 flex-col gap-1 bg-card px-5 py-4">
            <span className="clique-label !text-[9px]">CHECKED IN</span>
            <span className="font-display text-2xl font-bold tracking-[-0.02em] text-paper">
              {event.checkedInCount ?? 0}
              {event.bookedCount > 0 && (
                <span className="ml-1.5 font-mono text-sm font-normal text-dim">
                  {Math.round(((event.checkedInCount ?? 0) / event.bookedCount) * 100)}%
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      <div>
        <div className="clique-label mb-3">ABOUT</div>
        <p className="m-0 max-w-[62ch] whitespace-pre-line font-display text-[15px] leading-relaxed text-paper">{event.description}</p>
      </div>

      {event.rules && (
        <div className="rounded-md border border-dashed border-gold/30 p-5">
          <div className="clique-label mb-3 !text-gold">HOUSE RULES</div>
          <p className="m-0 font-display text-sm leading-relaxed text-cream">{event.rules}</p>
        </div>
      )}

      {event.refundPolicy && (
        <div>
          <div className="clique-label mb-3">REFUND POLICY</div>
          <p className="m-0 max-w-[62ch] font-display text-sm leading-relaxed text-cream">{event.refundPolicy}</p>
        </div>
      )}

      {/* Admin action */}
      <div className="border-t border-line pt-6">
        <div className="clique-label mb-3 !text-hot">ADMIN ACTION</div>
        {event.status === 'blocked' ? (
          <Button variant="secondary" loading={blocking} onClick={handleUnblock}>Unblock event</Button>
        ) : event.status === 'published' ? (
          <Button variant="danger" loading={blocking} onClick={() => setBlockOpen(true)}>Block event</Button>
        ) : (
          <p className="m-0 font-mono text-[11px] tracking-[.06em] text-dim">
            No admin actions available for {event.status} events.
          </p>
        )}
      </div>

      <Modal open={blockOpen} onClose={() => setBlockOpen(false)} title="Block this event?" size="sm">
        <div className="flex flex-col gap-4">
          <p className="m-0 rounded-xl border border-hot/25 bg-hot/[.08] p-3.5 font-display text-sm leading-relaxed text-cream">
            This blocks the event and cancels all active passes. Guests will no longer be able to enter. It can be unblocked later.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setBlockOpen(false)}>Cancel</Button>
            <Button variant="danger" className="flex-1" loading={blocking} onClick={handleBlock}>Block event</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Guests tab ───────────────────────────────────────────────────────────────

function AddToGuestlistForm({ eventId, onSuccess }: { eventId: string; onSuccess: () => void }) {
  const [username, setUsername] = useState('');
  const [adding, setAdding]     = useState(false);
  const [error, setError]       = useState('');
  const [toast, setToast]       = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setError(''); setAdding(true);
    try {
      await api.post(`/events/${eventId}/guestlist`, { username: username.trim().replace(/^@/, '') });
      setUsername('');
      setToast('Added to guestlist — pass generated.');
      setTimeout(() => setToast(''), 3500);
      onSuccess();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Failed to add to guestlist');
    } finally { setAdding(false); }
  };

  return (
    <div className="rounded-card border border-dashed border-lime/30 bg-card p-5">
      <div className="clique-label mb-1">ADD TO GUESTLIST</div>
      <p className="m-0 mb-4 font-display text-[13px] leading-relaxed text-cream">
        Grant a complimentary pass to someone by their username. A pass is generated instantly — no payment required.
      </p>
      <form onSubmit={handleSubmit} className="flex items-start gap-2">
        <div className="flex-1">
          <input
            className="clique-input w-full"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@username"
          />
          {error && <p className="m-0 mt-1 font-mono text-[11px] text-hot">{error}</p>}
        </div>
        <Button type="submit" loading={adding} className="shrink-0 py-3.5">Add</Button>
      </form>
      {toast && <p className="m-0 mt-3 font-mono text-[11px] tracking-[.06em] text-lime">{toast}</p>}
    </div>
  );
}

function GuestsTab({ eventTitle, eventId, bookings, inProcess, droppedOff, requests, squads, onRefresh }: {
  eventTitle: string;
  eventId: string;
  bookings: Booking[];
  inProcess: Booking[];
  droppedOff: Booking[];
  requests: PendingRequest[];
  squads: Squad[];
  onRefresh: () => void;
}) {
  const [approving, setApproving]       = useState<string | null>(null);
  const [rejecting, setRejecting]       = useState<string | null>(null);
  const [approvingGroup, setApprovingGroup] = useState<string | null>(null);
  const [actionError, setActionError]   = useState('');
  const [confirmRemove, setConfirmRemove] = useState<Booking | null>(null);
  const [removingId, setRemovingId]     = useState<string | null>(null);
  const [activePage, setActivePage]     = useState('add');

  const squadByUserId = new Map<string, Squad>();
  for (const sq of squads) {
    for (const m of sq.members) squadByUserId.set(m.userId, sq);
  }

  const fail = (fallback: string) => (err: unknown) => {
    const e = err as { response?: { data?: { message?: string } } };
    setActionError(e.response?.data?.message ?? fallback);
  };

  const handleApprove = async (requestId: string) => {
    setApproving(requestId); setActionError('');
    try { await api.patch(`/requests/${requestId}/approve`); onRefresh(); }
    catch (err) { fail('Could not approve the request — try again.')(err); }
    finally { setApproving(null); }
  };

  const handleReject = async (requestId: string) => {
    setRejecting(requestId); setActionError('');
    try { await api.patch(`/requests/${requestId}/reject`); onRefresh(); }
    catch (err) { fail('Could not decline the request — try again.')(err); }
    finally { setRejecting(null); }
  };

  const handleApproveGroup = async (squadId: string) => {
    setApprovingGroup(squadId); setActionError('');
    try { await api.patch(`/squads/${squadId}/approve`); onRefresh(); }
    catch (err) { fail('Could not approve the group — try again.')(err); }
    finally { setApprovingGroup(null); }
  };

  const handleRemove = async (booking: Booking) => {
    setRemovingId(booking._id); setActionError('');
    try {
      await api.delete(`/admin/events/${eventId}/bookings/${booking._id}`);
      setConfirmRemove(null);
      onRefresh();
    } catch (err) {
      fail('Could not remove guest — try again.')(err);
      setConfirmRemove(null);
    } finally { setRemovingId(null); }
  };

  const paidBookings      = bookings.filter((b) => b.tierLabel !== 'Guestlist');
  const guestlistBookings = bookings.filter((b) => b.tierLabel === 'Guestlist');
  const paidEnteredCount  = paidBookings.filter((b) => b.status === 'checked_in').length;
  const guestlistEnteredCount = guestlistBookings.filter((b) => b.status === 'checked_in').length;

  const pendingGroups  = squads.filter((sq) => sq.groupStatus === 'pending' || sq.groupStatus === 'mixed');
  const approvedGroups = squads.filter((sq) => sq.groupStatus === 'approved');

  const groupSizeBreakdown = new Map<number, number>();
  for (const sq of approvedGroups) {
    const size = sq.members.length;
    groupSizeBreakdown.set(size, (groupSizeBreakdown.get(size) ?? 0) + 1);
  }
  const sortedGroupSizes = Array.from(groupSizeBreakdown.entries()).sort(([a], [b]) => a - b);

  const allGroupMemberUserIds = new Set(squads.flatMap((sq) => sq.members.map((m) => m.userId)));
  const soloRequests = requests.filter((r) => !allGroupMemberUserIds.has(r.userId._id));

  const isEmpty = soloRequests.length === 0 && paidBookings.length === 0 && guestlistBookings.length === 0 && inProcess.length === 0 && squads.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col gap-6">
        <AddToGuestlistForm eventId={eventId} onSuccess={onRefresh} />
        <div className="ledger px-1 py-12">
          <div className="clique-label mb-3.5 !text-[10px] !tracking-[.16em]">№ 000 — EMPTY LIST</div>
          <p className="m-0 font-display text-2xl font-bold tracking-[-0.02em] text-paper">No registrations yet.</p>
          <p className="m-0 mt-2 max-w-[42ch] font-display text-sm leading-relaxed text-cream">
            Share the event link — pending and confirmed guests land on this list.
          </p>
        </div>
      </div>
    );
  }

  const pendingCount = pendingGroups.length + soloRequests.length;
  const accentClass: Record<string, string> = { lime: 'text-lime', gold: 'text-gold', neutral: 'text-dim' };

  const pages = [
    { key: 'add',       label: 'Add Guest',  count: null as number | null, accent: 'neutral' as const },
    ...(pendingCount > 0             ? [{ key: 'pending',   label: 'Pending',     count: pendingCount,             accent: 'gold' as const }] : []),
    ...(approvedGroups.length > 0    ? [{ key: 'groups',    label: 'Groups',      count: approvedGroups.length,    accent: 'lime' as const }] : []),
    ...(paidBookings.length > 0      ? [{ key: 'paid',      label: 'Paid',        count: paidBookings.length,      accent: 'lime' as const }] : []),
    ...(guestlistBookings.length > 0 ? [{ key: 'guestlist', label: 'Guestlist',   count: guestlistBookings.length, accent: 'lime' as const }] : []),
    ...(inProcess.length > 0         ? [{ key: 'process',   label: 'In Process',  count: inProcess.length,         accent: 'gold' as const }] : []),
    ...(droppedOff.length > 0        ? [{ key: 'dropped',   label: 'Dropped Off', count: droppedOff.length,        accent: 'neutral' as const }] : []),
  ];

  const approveBtn = (busy: boolean, onClick: () => void) => (
    <Button size="sm" onClick={onClick} disabled={busy}>{busy ? '…' : 'Accept'}</Button>
  );
  const rejectBtn = (busy: boolean, onClick: () => void) => (
    <Button size="sm" variant="danger" onClick={onClick} disabled={busy}>{busy ? '…' : 'Decline'}</Button>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Sub-navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
        {pages.map(({ key, label, count, accent }) => {
          const on = activePage === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={on}
              onClick={() => setActivePage(key)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[.1em] transition-colors ${
                on
                  ? 'border-lime/40 bg-lime/10 text-lime'
                  : 'border-line-2 text-dim hover:border-line-1 hover:text-cream'
              }`}
            >
              {label}
              {count != null && (
                <span className={`ml-1.5 font-bold ${on ? 'text-lime' : accentClass[accent]}`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {actionError && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-hot/20 bg-hot/[.08] px-4 py-3">
          <span className="font-mono text-[11px] leading-relaxed tracking-[.06em] text-hot">{actionError}</span>
          <button onClick={() => setActionError('')} aria-label="Dismiss" className="shrink-0 text-hot">×</button>
        </div>
      )}

      {activePage === 'add' && (
        <AddToGuestlistForm eventId={eventId} onSuccess={onRefresh} />
      )}

      {activePage === 'pending' && (
        <div className="flex flex-col gap-6">
          {pendingGroups.length > 0 && (
            <div>
              <SectionHead label="PENDING GROUPS" count={pendingGroups.length} variant="gold" />
              <Paginated items={pendingGroups} listClassName="flex flex-col gap-4" renderItem={(sq) => {
                const pendingMemberCount = sq.members.filter((m) => m.requestStatus === 'requested').length;
                const entryType = getEntryType(undefined, sq.name, sq.members);
                const sqId = sq._id.toString();
                return (
                  <div className="overflow-hidden rounded-card border border-gold/25 bg-card">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-gold/[.05] px-4 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="m-0 font-display text-sm font-bold text-paper">{sq.name}</p>
                          <EntryTypeBadge type={entryType} />
                        </div>
                        <p className="m-0 mt-0.5 font-mono text-[10px] tracking-[.08em] text-dim">
                          {sq.members.length} MEMBERS{pendingMemberCount > 0 && ` · ${pendingMemberCount} PENDING`}
                        </p>
                      </div>
                      {pendingMemberCount > 0 && (
                        <Button size="sm" onClick={() => handleApproveGroup(sqId)} disabled={approvingGroup === sqId}>
                          {approvingGroup === sqId ? 'Approving…' : 'Approve all'}
                        </Button>
                      )}
                    </div>
                    <div className="divide-y divide-line">
                      {sq.members.map((m) => (
                        <div key={m.userId} className="px-4 py-3">
                          <AttendeeCard
                            framed={false}
                            name={m.name} username={m.username} profileImage={m.profileImage}
                            gender={m.gender} age={m.age} connectedSocials={m.connectedSocials}
                            city={m.city} cliquescore={m.cliquescore} requestStatus={m.requestStatus}
                            entryType={getEntryType(m.gender, sq.name, sq.members)} squadName={sq.name}
                            right={
                              m.requestStatus === 'requested' && m.requestId ? (
                                <div className="flex gap-2">
                                  {approveBtn(approving === m.requestId, () => handleApprove(m.requestId!))}
                                  {rejectBtn(rejecting === m.requestId, () => handleReject(m.requestId!))}
                                </div>
                              ) : undefined
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }} />
            </div>
          )}

          {soloRequests.length > 0 && (
            <div>
              <SectionHead label="PENDING REQUESTS" count={soloRequests.length} variant="gold" />
              <Paginated items={soloRequests} renderItem={(r) => (
                <AttendeeCard
                  name={r.userId?.name ?? 'User'}
                  username={r.userId?.username ?? '—'}
                  profileImage={r.userId?.profileImage}
                  gender={r.userId?.gender}
                  age={r.userId?.age}
                  connectedSocials={r.userId?.connectedSocials}
                  city={r.userId?.city}
                  cliquescore={r.userId?.cliquescore}
                  requestStatus="requested"
                  entryType={getEntryType(r.userId?.gender, undefined)}
                  right={
                    <div className="flex gap-2">
                      {approveBtn(approving === r._id, () => handleApprove(r._id))}
                      {rejectBtn(rejecting === r._id, () => handleReject(r._id))}
                    </div>
                  }
                />
              )} />
            </div>
          )}
        </div>
      )}

      {activePage === 'groups' && (
        <div>
          <SectionHead label="GROUPS ON THE LIST" count={approvedGroups.length} variant="lime" />
          {sortedGroupSizes.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {sortedGroupSizes.map(([size, count]) => (
                <span key={size} className="inline-flex items-center gap-1.5 rounded-full border border-line-2 px-3 py-1 font-mono text-[10px] tracking-[.08em] text-cream">
                  <span className="font-bold text-lime">{count}×</span>
                  group of {size}
                </span>
              ))}
            </div>
          )}
          <Paginated items={approvedGroups} listClassName="flex flex-col gap-3" renderItem={(sq) => {
            const entryType = getEntryType(undefined, sq.name, sq.members);
            return (
              <div className="overflow-hidden rounded-card border border-line-2 bg-card">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="m-0 font-display text-sm font-bold text-paper">{sq.name}</p>
                      <EntryTypeBadge type={entryType} />
                    </div>
                    <p className="m-0 mt-0.5 font-mono text-[10px] tracking-[.08em] text-dim">{sq.members.length} MEMBERS</p>
                  </div>
                  <Badge variant={sq.groupPass ? 'lime' : 'neutral'}>
                    {sq.groupPass ? 'Group pass issued' : 'No pass yet'}
                  </Badge>
                </div>
                <div className="divide-y divide-line">
                  {sq.members.map((m) => (
                    <div key={m.userId} className="px-4 py-3">
                      <AttendeeCard
                        framed={false}
                        name={m.name} username={m.username} profileImage={m.profileImage}
                        gender={m.gender} age={m.age} connectedSocials={m.connectedSocials}
                        city={m.city} cliquescore={m.cliquescore} requestStatus={m.requestStatus}
                        entryType={getEntryType(m.gender, sq.name, sq.members)} squadName={sq.name}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          }} />
        </div>
      )}

      {activePage === 'paid' && (
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="clique-label">PAID BOOKINGS</span>
                <Badge variant="lime">{paidBookings.length}</Badge>
              </div>
              <p className="m-0 mt-1 font-mono text-[11px] tracking-[.06em] text-cream">
                <span className="text-lime">{paidEnteredCount}</span> in · {paidBookings.length - paidEnteredCount} awaiting
              </p>
            </div>
          </div>
          <Paginated items={paidBookings} renderItem={(b) => {
            const entered   = b.status === 'checked_in';
            const sq        = squadByUserId.get(b.userId?._id ?? '');
            const entryType = getEntryType(b.userId?.gender, sq?.name, sq?.members, b.groupSize);
            return (
              <AttendeeCard
                name={b.userId?.name ?? 'User'}
                username={b.userId?.username ?? '—'}
                profileImage={b.userId?.profileImage}
                gender={b.userId?.gender}
                age={b.userId?.age}
                connectedSocials={b.userId?.connectedSocials}
                city={b.userId?.city}
                requestStatus={null}
                entryType={entryType} squadName={sq?.name}
                right={
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-2">
                      <BookingStatusBadge status={b.status} />
                      <Badge variant={entered ? 'lime' : 'neutral'}>{entered ? '✓ In' : 'Awaiting'}</Badge>
                    </div>
                    {b.tierLabel && (
                      <span className="font-mono text-[9px] uppercase tracking-[.1em] text-dim">{b.tierLabel}</span>
                    )}
                    {b.amount > 0 && (
                      <span className="font-mono text-[10px] tracking-[.04em] text-cream">{formatPrice(b.amount)}</span>
                    )}
                    <button
                      onClick={() => setConfirmRemove(b)}
                      disabled={removingId === b._id}
                      className="mt-1 rounded border border-hot/30 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[.1em] text-hot transition-colors hover:border-hot/60 hover:bg-hot/10 disabled:opacity-40"
                    >
                      {removingId === b._id ? '…' : 'Remove'}
                    </button>
                  </div>
                }
              />
            );
          }} />

          <Modal open={!!confirmRemove} onClose={() => setConfirmRemove(null)} title="Remove guest?" size="sm">
            {confirmRemove && (
              <div className="flex flex-col gap-4">
                <p className="m-0 rounded-xl border border-hot/25 bg-hot/[.08] p-3.5 font-display text-sm leading-relaxed text-cream">
                  Remove <strong>@{confirmRemove.userId?.username}</strong> from the guest list?
                  Their pass will be cancelled and the booking count will be decremented.
                  {(['confirmed', 'checked_in'].includes(confirmRemove.status) && confirmRemove.amount > 0) && (
                    <> A refund of <strong>{formatPrice(confirmRemove.amount)}</strong> will be automatically issued to them.</>
                  )}
                </p>
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setConfirmRemove(null)}>Cancel</Button>
                  <Button variant="danger" className="flex-1" loading={removingId === confirmRemove._id} onClick={() => handleRemove(confirmRemove)}>Remove guest</Button>
                </div>
              </div>
            )}
          </Modal>
        </div>
      )}

      {activePage === 'guestlist' && (
        <div>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="clique-label">GUESTLIST</span>
            <Badge variant="lime">{guestlistBookings.length}</Badge>
            <span className="font-mono text-[10px] tracking-[.06em] text-dim">
              {guestlistEnteredCount} in · {guestlistBookings.length - guestlistEnteredCount} awaiting
            </span>
          </div>
          <Paginated items={guestlistBookings} renderItem={(b) => {
            const entered   = b.status === 'checked_in';
            const sq        = squadByUserId.get(b.userId?._id ?? '');
            const entryType = getEntryType(b.userId?.gender, sq?.name, sq?.members, b.groupSize);
            return (
              <AttendeeCard
                name={b.userId?.name ?? 'User'}
                username={b.userId?.username ?? '—'}
                profileImage={b.userId?.profileImage}
                gender={b.userId?.gender}
                age={b.userId?.age}
                connectedSocials={b.userId?.connectedSocials}
                city={b.userId?.city}
                requestStatus={null}
                entryType={entryType} squadName={sq?.name}
                right={
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-2">
                      <BookingStatusBadge status={b.status} />
                      <Badge variant={entered ? 'lime' : 'neutral'}>{entered ? '✓ In' : 'Awaiting'}</Badge>
                    </div>
                    <span className="rounded-full border border-lime/30 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[.1em] text-lime">Guestlist</span>
                  </div>
                }
              />
            );
          }} />
        </div>
      )}

      {activePage === 'process' && (
        <div>
          <SectionHead label="IN PROCESS" count={inProcess.length} variant="gold" />
          <p className="mb-4 mt-[-8px] font-mono text-[10px] tracking-[.06em] text-dim">
            Payment pending or under review — not yet confirmed.
          </p>
          <Paginated items={inProcess} renderItem={(b) => {
            const sq        = squadByUserId.get(b.userId?._id ?? '');
            const entryType = getEntryType(b.userId?.gender, sq?.name, sq?.members, b.groupSize);
            return (
              <AttendeeCard
                name={b.userId?.name ?? 'User'}
                username={b.userId?.username ?? '—'}
                profileImage={b.userId?.profileImage}
                gender={b.userId?.gender}
                age={b.userId?.age}
                connectedSocials={b.userId?.connectedSocials}
                city={b.userId?.city}
                requestStatus={null}
                entryType={entryType} squadName={sq?.name}
                right={
                  <div className="flex flex-col items-end gap-1.5">
                    <BookingStatusBadge status={b.status} />
                    {b.tierLabel && b.tierLabel !== 'Guestlist' && (
                      <span className="font-mono text-[9px] uppercase tracking-[.1em] text-dim">{b.tierLabel}</span>
                    )}
                  </div>
                }
              />
            );
          }} />
        </div>
      )}

      {activePage === 'dropped' && (
        <div>
          <SectionHead label="DROPPED OFF" count={droppedOff.length} variant="neutral" />
          <p className="mb-4 mt-[-8px] font-mono text-[10px] tracking-[.06em] text-dim">
            Cancelled, refunded, or rejected.
          </p>
          <Paginated items={droppedOff} renderItem={(b) => (
            <AttendeeCard
              name={b.userId?.name ?? 'User'}
              username={b.userId?.username ?? '—'}
              profileImage={b.userId?.profileImage}
              gender={b.userId?.gender}
              age={b.userId?.age}
              connectedSocials={b.userId?.connectedSocials}
              city={b.userId?.city}
              requestStatus={null}
              right={
                <div className="flex flex-col items-end gap-1.5">
                  <BookingStatusBadge status={b.status} />
                  {b.tierLabel && (
                    <span className="font-mono text-[9px] uppercase tracking-[.1em] text-dim">{b.tierLabel}</span>
                  )}
                </div>
              }
            />
          )} />
        </div>
      )}
    </div>
  );
}

// ─── Phases tab (read-only) ───────────────────────────────────────────────────

function PhasesTab({ event }: { event: Event }) {
  const tiers: PricingTier[]  = event.pricingTiers ?? [];
  const groups: GroupDeal[]   = event.groupPricing  ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        {tiers.length === 0 ? (
          <div className="ledger px-1 py-10">
            <div className="clique-label mb-3 !text-[10px] !tracking-[.16em]">№ 000 — NO PHASES</div>
            <p className="m-0 font-display text-xl font-bold tracking-[-0.02em] text-paper">No ticket phases.</p>
            <p className="m-0 mt-2 font-display text-sm leading-relaxed text-cream">
              This event uses a single price of {formatPrice(event.price)}.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="clique-label">ALL PHASES</div>
            {tiers.map((tier, i) => {
              const isSplit   = tier.malePrice > 0 || tier.femalePrice > 0;
              const soldOut   = tier.capacity != null && tier.soldCount >= tier.capacity;
              const spotsLeft = tier.capacity != null ? tier.capacity - tier.soldCount : null;
              return (
                <div key={tier._id} className={`rounded-card border bg-card p-4 ${tier.isOpen && !soldOut ? 'border-lime/30' : 'border-line-2'}`}>
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[9px] tracking-[.14em] text-dim">{String(i + 1).padStart(2, '0')}</span>
                      <span className="font-display text-base font-bold text-paper">{tier.label}</span>
                      {tier.isOpen && !soldOut && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-lime/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[.1em] text-lime">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-lime" />Live
                        </span>
                      )}
                      {soldOut && (
                        <span className="rounded-full border border-hot/30 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[.1em] text-hot">Sold out</span>
                      )}
                      {!tier.isOpen && !soldOut && (
                        <span className="rounded-full border border-line-2 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[.1em] text-dim">Closed</span>
                      )}
                      {isSplit && (
                        <span className="rounded-full border border-line-2 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[.1em] text-dim">M/F split</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10px] tracking-[.08em] text-cream">
                      {isSplit ? (
                        <>
                          <span>Guys ₹{tier.malePrice.toLocaleString('en-IN')}</span>
                          <span>Girls ₹{tier.femalePrice.toLocaleString('en-IN')}</span>
                        </>
                      ) : (
                        <span>₹{tier.commonPrice.toLocaleString('en-IN')}</span>
                      )}
                      <span>{tier.soldCount} sold{tier.capacity != null ? ` / ${tier.capacity} capacity` : ''}</span>
                      {spotsLeft != null && !soldOut && <span className={spotsLeft < 10 ? 'text-hot' : ''}>{spotsLeft} left</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {groups.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="clique-label">GROUP DEALS</div>
          {groups.map((g, i) => (
            <div key={i} className="flex items-center gap-4 rounded-card border border-line-2 bg-card px-4 py-3">
              <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10px] tracking-[.08em] text-cream">
                <span className="font-display text-sm font-bold text-paper">{g.label}</span>
                <span>Group of {g.size}</span>
                <span>₹{g.price.toLocaleString('en-IN')} total</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Team tab (read-only) ─────────────────────────────────────────────────────

function TeamTab({ event }: { event: Event }) {
  const coHosts  = event.coHosts  ?? [];
  const scanners = event.scanners ?? [];

  function MemberList({ title, members }: { title: string; members: EventMember[] }) {
    return (
      <div className="rounded-card border border-line-2 bg-card p-5">
        <div className="clique-label">{title}</div>
        {members.length === 0 ? (
          <p className="m-0 py-3 text-center font-mono text-[10px] uppercase tracking-[.1em] text-dim">None assigned</p>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {members.map((m) => (
              <div key={m.userId} className="flex items-center rounded-xl border border-line-2 bg-well px-3.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-line font-display text-xs font-bold text-cream">
                    {m.username?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="m-0 font-display text-sm font-medium text-paper">@{m.username}</p>
                    <p className="m-0 font-mono text-[10px] tracking-[.06em] text-dim">
                      ADDED {new Date(m.addedAt).toLocaleDateString('en-IN').toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <MemberList title="CO-HOSTS"  members={coHosts}  />
      <MemberList title="SCANNERS"  members={scanners} />
    </div>
  );
}

// ─── Discounts tab (read-only) ────────────────────────────────────────────────

function DiscountsTab({ discounts }: { discounts: Discount[] }) {
  const activeDiscounts  = discounts.filter((d) => d.status === 'active');
  const usedDiscounts    = discounts.filter((d) => d.status === 'used');
  const revokedDiscounts = discounts.filter((d) => d.status === 'revoked');

  if (discounts.length === 0) {
    return (
      <div className="ledger px-1 py-10">
        <div className="clique-label mb-3 !text-[10px] !tracking-[.16em]">№ 000 — EMPTY</div>
        <p className="m-0 font-display text-xl font-bold tracking-[-0.02em] text-paper">No discounts.</p>
        <p className="m-0 mt-2 font-display text-sm leading-relaxed text-cream">The host has not issued any friend discounts for this event.</p>
      </div>
    );
  }

  function DiscountRow({ discount }: { discount: Discount }) {
    const u = discount.userId;
    const discountLabel = discount.discountType === 'percentage'
      ? `${discount.discountValue}% off`
      : `₹${discount.discountValue.toLocaleString('en-IN')} off`;
    const statusVariants: Record<string, 'lime' | 'sky' | 'neutral'> = {
      active: 'lime', used: 'sky', revoked: 'neutral',
    };
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-line-2 bg-card px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-line font-display text-sm font-bold text-cream">
            {u.profileImage
              ? <img src={getImageUrl(u.profileImage)} alt={u.name} className="h-full w-full object-cover" />
              : (u.name?.[0] ?? '?').toUpperCase()
            }
          </div>
          <div className="min-w-0">
            <p className="m-0 truncate font-display text-sm font-bold text-paper">{u.name}</p>
            <p className="m-0 font-mono text-[11px] tracking-[.04em] text-dim">@{u.username}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className="rounded-full border border-line-2 px-2.5 py-0.5 font-mono text-[11px] tracking-[.04em] text-cream">{discountLabel}</span>
          <Badge variant={statusVariants[discount.status] ?? 'neutral'}>{discount.status}</Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {activeDiscounts.length > 0 && (
        <div>
          <SectionHead label="ACTIVE DISCOUNTS" count={activeDiscounts.length} variant="lime" />
          <div className="flex flex-col gap-2.5">
            {activeDiscounts.map((d) => <DiscountRow key={d._id} discount={d} />)}
          </div>
        </div>
      )}
      {usedDiscounts.length > 0 && (
        <div>
          <SectionHead label="USED" count={usedDiscounts.length} variant="neutral" />
          <p className="mb-3 mt-[-8px] font-mono text-[10px] tracking-[.06em] text-dim">These friends booked with their discount.</p>
          <div className="flex flex-col gap-2.5">
            {usedDiscounts.map((d) => <DiscountRow key={d._id} discount={d} />)}
          </div>
        </div>
      )}
      {revokedDiscounts.length > 0 && (
        <div>
          <SectionHead label="REVOKED" count={revokedDiscounts.length} variant="neutral" />
          <div className="flex flex-col gap-2.5">
            {revokedDiscounts.map((d) => <DiscountRow key={d._id} discount={d} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Scanner tab ──────────────────────────────────────────────────────────────

function ScannerTab({ event }: { event: Event }) {
  const [scannerOpen, setScannerOpen] = useState(false);
  const isLive = event.status === 'published';

  return (
    <div className="flex flex-col gap-4">
      {scannerOpen && <ScannerModal events={[event]} onClose={() => setScannerOpen(false)} />}

      <div className="rounded-card border border-line-2 bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-[200px] flex-1">
            <div className="font-display text-[22px] font-bold tracking-[-0.02em] text-paper">Open the scanner</div>
            <p className="m-0 mt-2 font-display text-sm leading-relaxed text-cream">
              Camera-based QR scanner for the door. Hand your phone to the bouncer — it shows a live entry count and confirms each pass instantly.
            </p>
            {!isLive && (
              <p className="m-0 mt-3 font-mono text-[11px] tracking-[.06em] text-gold">
                Event is not live — passes only scan for published events.
              </p>
            )}
          </div>
          <Button onClick={() => setScannerOpen(true)} disabled={!isLive}>
            Launch scanner →
          </Button>
        </div>
      </div>

      {(event.scanners?.length ?? 0) > 0 && (
        <div className="rounded-card border border-line-2 bg-card p-5">
          <div className="clique-label mb-3">AUTHORISED SCANNERS</div>
          <div className="flex flex-wrap gap-2">
            {event.scanners?.map((s) => (
              <span key={s.userId} className="inline-flex items-center gap-2 rounded-full border border-line-2 px-3 py-1.5 font-mono text-[11px] text-cream">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-lime" />
                @{s.username}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail]         = useState<AdminEventDetail | null>(null);
  const [squads, setSquads]         = useState<Squad[]>([]);
  const [discounts, setDiscounts]   = useState<Discount[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState<TabKey>('overview');

  const refreshDetail = () =>
    api.get(`/admin/events/${id}`)
      .then(({ data }) => setDetail(data.data))
      .catch(() => {});

  useEffect(() => {
    api.get(`/admin/events/${id}`)
      .then(({ data }) => setDetail(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (activeTab === 'guests') {
      api.get(`/squads/event/${id}/all`).then((res) => {
        if (res?.data?.data?.squads) setSquads(res.data.data.squads);
      }).catch(() => {});
    }
    if (activeTab === 'discounts') {
      api.get(`/events/${id}/discounts`).then((res) => {
        if (res?.data?.data?.discounts) setDiscounts(res.data.data.discounts);
      }).catch(() => {});
    }
  }, [activeTab, id]);

  const handleGuestsRefresh = () => {
    refreshDetail();
    api.get(`/squads/event/${id}/all`).then((res) => {
      if (res?.data?.data?.squads) setSquads(res.data.data.squads);
    }).catch(() => {});
  };

  if (loading) return <PageSpinner />;
  if (!detail) {
    return (
      <div className="py-24 text-center">
        <div className="font-display text-[28px] font-bold tracking-[-0.02em]">Event not found.</div>
        <Link href="/admin/events" className="clique-label mt-4 inline-block hover:text-paper">← Admin events</Link>
      </div>
    );
  }

  const { event } = detail;

  // Separate bookings into confirmed/inProcess/droppedOff
  const confirmedBookings = detail.bookings.filter((b) => ['confirmed', 'checked_in'].includes(b.status));
  const inProcessBookings = detail.bookings.filter((b) => ['payment_pending', 'utr_submitted'].includes(b.status));
  const droppedOffBookings = detail.bookings.filter((b) => ['cancelled', 'refunded', 'rejected'].includes(b.status));

  const handleStatusChange = (newStatus: string) => {
    setDetail((prev) => prev ? { ...prev, event: { ...prev.event, status: newStatus as Event['status'] } } : prev);
  };

  return (
    <div className="mx-auto max-w-3xl animate-rise">
      <Link href="/admin/events" className="clique-label mb-6 inline-block transition-colors hover:text-paper">
        ← Admin / Events
      </Link>

      <EventHeader event={event} onRefresh={refreshDetail} />

      {/* Tabs */}
      <div className="mb-6 mt-7 flex overflow-x-auto border-b border-line" role="tablist">
        {TABS.map(({ key, label }, i) => {
          const on = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              role="tab"
              aria-selected={on}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 font-mono text-[11px] uppercase tracking-[.1em] transition-colors ${
                on ? 'border-lime text-paper' : 'border-transparent text-dim hover:text-cream'
              }`}
            >
              <span className={`mr-2 text-[9px] ${on ? 'text-lime' : ''}`}>{String(i + 1).padStart(2, '0')}</span>
              {label}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview'  && <OverviewTab event={event} onStatusChange={handleStatusChange} />}
      {activeTab === 'guests'    && (
        <GuestsTab
          eventTitle={event.title}
          eventId={id}
          bookings={confirmedBookings}
          inProcess={inProcessBookings}
          droppedOff={droppedOffBookings}
          requests={detail.requests}
          squads={squads}
          onRefresh={handleGuestsRefresh}
        />
      )}
      {activeTab === 'phases'    && <PhasesTab event={event} />}
      {activeTab === 'team'      && <TeamTab event={event} />}
      {activeTab === 'discounts' && <DiscountsTab discounts={discounts} />}
      {activeTab === 'scanner'   && <ScannerTab event={event} />}
    </div>
  );
}
