'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageSpinner } from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Event, PricingTier, EventMember } from '@/types';
import { formatDate, formatTime, formatPrice, getImageUrl } from '@/lib/utils';
import api from '@/lib/api';

// ─── Local types ──────────────────────────────────────────────────────────────

interface AdminBooking {
  _id: string;
  userId: {
    _id: string;
    name: string;
    username: string;
    profileImage?: string;
    gender?: string;
    age?: number;
    phone?: string;
    city?: string;
    cliquescore?: number;
    connectedSocials?: { instagram?: string };
  };
  status: string;
  amount: number;
  tierLabel?: string;
  groupSize?: number;
  createdAt: string;
}

interface AdminRequest {
  _id: string;
  userId: {
    _id: string;
    name: string;
    username: string;
    profileImage?: string;
    gender?: string;
    age?: number;
    phone?: string;
    city?: string;
    cliquescore?: number;
    connectedSocials?: { instagram?: string };
  };
  status: string;
  message?: string;
  createdAt: string;
}

interface AdminEventDetail {
  event: Event & { hostId: { _id: string; name: string; username: string; profileImage?: string; isVerifiedHost?: boolean } };
  bookings: AdminBooking[];
  requests: AdminRequest[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(s: string) {
  if (s === 'published') return 'var(--lime)';
  if (s === 'blocked')   return 'var(--hot)';
  if (s === 'cancelled') return 'var(--hot)';
  if (s === 'draft')     return 'var(--gold)';
  if (s === 'completed') return 'var(--sky)';
  return 'var(--dim)';
}

function getDisplayPrice(event: Event): string {
  const tiers: PricingTier[] = event.pricingTiers ?? [];
  if (tiers.length === 0) return formatPrice(event.price);
  const prices = tiers.flatMap((t) => [t.commonPrice, t.malePrice, t.femalePrice].filter((p) => p > 0));
  const min = prices.length ? Math.min(...prices) : event.price;
  return `${formatPrice(min)} onwards`;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span className="font-display text-lg font-bold text-paper">{value}</span>
      <span className="clique-label !text-[9px]">{label}</span>
    </div>
  );
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
    confirmed: { label: 'Confirmed', variant: 'lime' },
    checked_in: { label: 'Checked in', variant: 'sky' },
    payment_pending: { label: 'Payment pending', variant: 'gold' },
    utr_submitted: { label: 'UPI submitted', variant: 'gold' },
    cancelled: { label: 'Cancelled', variant: 'hot' },
    refunded: { label: 'Refunded', variant: 'neutral' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={variant}>{label}</Badge>;
}

function RequestStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'lime' | 'gold' | 'sky' | 'hot' | 'neutral' }> = {
    requested: { label: 'Pending', variant: 'gold' },
    approved: { label: 'Approved', variant: 'lime' },
    rejected: { label: 'Rejected', variant: 'hot' },
    expired: { label: 'Expired', variant: 'neutral' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={variant}>{label}</Badge>;
}

function PersonRow({ user, right }: {
  user: AdminBooking['userId'];
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line-2 bg-card p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-line font-display text-sm font-bold text-cream">
        {user.profileImage
          ? <img src={getImageUrl(user.profileImage)} alt={user.name} className="h-full w-full object-cover" />
          : (user.name?.[0] ?? '?').toUpperCase()
        }
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <p className="m-0 font-display text-sm font-bold text-paper">{user.name || 'Unknown'}</p>
          <GenderBadge gender={user.gender} />
          {user.age != null && <Badge>{user.age}y</Badge>}
        </div>
        <p className="m-0 font-mono text-[11px] tracking-[.04em] text-dim">
          @{user.username || '—'}{user.city ? ` · ${user.city}` : ''}{user.cliquescore != null ? ` · ★ ${user.cliquescore}` : ''}
        </p>
        {user.connectedSocials?.instagram && (
          <a
            href={`https://instagram.com/${user.connectedSocials.instagram}`}
            target="_blank" rel="noopener noreferrer"
            className="mt-1 block font-mono text-[11px] tracking-[.04em] text-cream hover:text-paper"
          >
            IG @{user.connectedSocials.instagram} ↗
          </a>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'guests',   label: 'Guests'   },
  { key: 'phases',   label: 'Phases'   },
  { key: 'team',     label: 'Team'     },
] as const;

type TabKey = typeof TABS[number]['key'];

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ detail, onStatusChange }: {
  detail: AdminEventDetail;
  onStatusChange: (status: string) => void;
}) {
  const { event } = detail;
  const [blocking, setBlocking]   = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [toast, setToast]         = useState('');
  const [toastType, setToastType] = useState<'ok' | 'err'>('ok');

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
    } catch {
      showToast('Failed to block event.', 'err');
    } finally { setBlocking(false); setBlockOpen(false); }
  };

  const handleUnblock = async () => {
    setBlocking(true);
    try {
      await api.patch(`/admin/events/${event._id}/unblock`);
      onStatusChange('published');
      showToast('Event unblocked.', 'ok');
    } catch {
      showToast('Failed to unblock event.', 'err');
    } finally { setBlocking(false); }
  };

  return (
    <div className="flex flex-col gap-7">
      {toast && (
        <div style={{
          background: toastType === 'ok' ? 'color-mix(in srgb, var(--lime) 8%, transparent)' : 'color-mix(in srgb, var(--hot) 8%, transparent)',
          border: `1px solid ${toastType === 'ok' ? 'color-mix(in srgb, var(--lime) 25%, transparent)' : 'color-mix(in srgb, var(--hot) 25%, transparent)'}`,
          borderRadius: 6, padding: '10px 14px',
        }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: toastType === 'ok' ? 'var(--lime)' : 'var(--hot)', letterSpacing: '.06em' }}>{toast}</span>
        </div>
      )}

      {/* Description */}
      <div>
        <div className="clique-label mb-3">ABOUT</div>
        <p className="m-0 max-w-[62ch] whitespace-pre-line font-display text-[15px] leading-relaxed text-paper">{event.description}</p>
      </div>

      {/* Location */}
      <div>
        <div className="clique-label mb-3">LOCATION</div>
        <p className="m-0 font-display text-sm text-paper">{event.locationName}</p>
        {event.address && <p className="m-0 mt-1 font-mono text-[11px] tracking-[.04em] text-dim">{event.address}</p>}
        {event.exactAddressHiddenBeforeBooking && (
          <p className="m-0 mt-1 font-mono text-[10px] uppercase tracking-[.08em] text-gold">Exact address hidden before booking</p>
        )}
      </div>

      {/* Event meta */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
        {[
          { label: 'CATEGORY', value: event.category?.replace(/_/g, ' ') ?? '—' },
          { label: 'AGE LIMIT', value: event.ageLimit ? `${event.ageLimit}+` : 'None' },
          { label: 'APPROVAL', value: event.approvalRequired ? 'Required' : 'Not required' },
          { label: 'SOCIALS REQUIRED', value: event.requiresSocials ? (event.requiredSocials?.join(', ') || 'Yes') : 'No' },
          { label: 'EXACT ADDR HIDDEN', value: event.exactAddressHiddenBeforeBooking ? 'Yes' : 'No' },
          { label: 'REVENUE', value: event.revenue != null ? formatPrice(event.revenue) : '—' },
        ].map(({ label, value }) => (
          <div key={label}>
            <div className="clique-label mb-1">{label}</div>
            <p className="m-0 font-display text-sm text-paper capitalize">{value}</p>
          </div>
        ))}
      </div>

      {/* Vibe + music tags */}
      {(event.vibeTags?.length > 0 || event.musicTags?.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {[...(event.vibeTags ?? []), ...(event.musicTags ?? [])].map((tag) => (
            <span key={tag} className="rounded-full border border-line-2 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[.08em] text-cream">{tag}</span>
          ))}
        </div>
      )}

      {/* Rules */}
      {event.rules && (
        <div className="rounded-md border border-dashed border-gold/30 p-5">
          <div className="clique-label mb-3 !text-gold">HOUSE RULES</div>
          <p className="m-0 font-display text-sm leading-relaxed text-cream">{event.rules}</p>
        </div>
      )}

      {/* Refund policy */}
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
          <Button variant="secondary" loading={blocking} onClick={handleUnblock}>
            Unblock event
          </Button>
        ) : event.status === 'published' ? (
          <Button variant="danger" loading={blocking} onClick={() => setBlockOpen(true)}>
            Block event
          </Button>
        ) : (
          <p className="m-0 font-mono text-[11px] tracking-[.06em] text-dim">No admin actions available for {event.status} events.</p>
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

function GuestsTab({ detail, eventId, confirmedSlots, checkedInSlots, pendingSlots }: {
  detail: AdminEventDetail;
  eventId: string;
  confirmedSlots: number;
  checkedInSlots: number;
  pendingSlots: number;
}) {
  const [bookings, setBookings] = useState(detail.bookings);
  const { requests }            = detail;
  const [removingId, setRemovingId]     = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<AdminBooking | null>(null);
  const [toast, setToast]               = useState('');
  const [toastType, setToastType]       = useState<'ok' | 'err'>('ok');

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(''), 3500);
  }

  const handleRemove = async (booking: AdminBooking) => {
    setRemovingId(booking._id);
    try {
      await api.delete(`/admin/events/${eventId}/bookings/${booking._id}`);
      setBookings((prev) => prev.filter((b) => b._id !== booking._id));
      showToast(`@${booking.userId.username} removed from guest list.`, 'ok');
    } catch {
      showToast('Failed to remove guest.', 'err');
    } finally {
      setRemovingId(null);
      setConfirmRemove(null);
    }
  };

  const confirmedCount  = confirmedSlots;
  const checkedInCount  = checkedInSlots;
  const pendingPayCount = pendingSlots;
  const pendingReqs     = requests.filter((r) => r.status === 'requested');
  const otherReqs       = requests.filter((r) => r.status !== 'requested');

  if (bookings.length === 0 && requests.length === 0) {
    return (
      <div className="ledger px-1 py-12">
        <div className="clique-label mb-3.5 !text-[10px] !tracking-[.16em]">№ 000 — EMPTY LIST</div>
        <p className="m-0 font-display text-2xl font-bold tracking-[-0.02em] text-paper">No registrations yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">

      {toast && (
        <div style={{
          background: toastType === 'ok' ? 'color-mix(in srgb, var(--lime) 8%, transparent)' : 'color-mix(in srgb, var(--hot) 8%, transparent)',
          border: `1px solid ${toastType === 'ok' ? 'color-mix(in srgb, var(--lime) 25%, transparent)' : 'color-mix(in srgb, var(--hot) 25%, transparent)'}`,
          borderRadius: 6, padding: '10px 14px',
        }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: toastType === 'ok' ? 'var(--lime)' : 'var(--hot)', letterSpacing: '.06em' }}>{toast}</span>
        </div>
      )}

      {/* Summary strip */}
      <div className="flex flex-wrap gap-x-8 gap-y-3 rounded-xl border border-line-2 bg-card px-5 py-4">
        <Stat label="ON THE LIST" value={confirmedCount} />
        <Stat label="CHECKED IN" value={checkedInCount} />
        <Stat label="PAYMENT PENDING" value={pendingPayCount} />
        <Stat label="ACCESS REQUESTS" value={requests.length} />
      </div>

      {/* Pending requests */}
      {pendingReqs.length > 0 && (
        <div>
          <div className="clique-label mb-3">PENDING REQUESTS <span className="ml-1 font-mono text-[10px] text-gold">{pendingReqs.length}</span></div>
          <div className="flex flex-col gap-2.5">
            {pendingReqs.map((r) => (
              <PersonRow
                key={r._id}
                user={r.userId}
                right={
                  <div className="flex flex-col items-end gap-1.5">
                    <RequestStatusBadge status={r.status} />
                    {r.message && <span className="max-w-[160px] text-right font-mono text-[10px] tracking-[.04em] text-dim">"{r.message}"</span>}
                  </div>
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* All bookings */}
      {bookings.length > 0 && (
        <div>
          <div className="clique-label mb-3">BOOKINGS <span className="ml-1 font-mono text-[10px] text-cream">{bookings.length}</span></div>
          <div className="flex flex-col gap-2.5">
            {bookings.map((b) => (
              <PersonRow
                key={b._id}
                user={b.userId}
                right={
                  <div className="flex flex-col items-end gap-1.5">
                    <BookingStatusBadge status={b.status} />
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
            ))}
          </div>
        </div>
      )}

      {/* Other requests (approved / rejected / expired) */}
      {otherReqs.length > 0 && (
        <div>
          <div className="clique-label mb-3">ALL ACCESS REQUESTS</div>
          <div className="flex flex-col gap-2.5">
            {otherReqs.map((r) => (
              <PersonRow key={r._id} user={r.userId} right={<RequestStatusBadge status={r.status} />} />
            ))}
          </div>
        </div>
      )}

      {/* Confirm remove modal */}
      <Modal open={!!confirmRemove} onClose={() => setConfirmRemove(null)} title="Remove guest?" size="sm">
        {confirmRemove && (
          <div className="flex flex-col gap-4">
            <p className="m-0 rounded-xl border border-hot/25 bg-hot/[.08] p-3.5 font-display text-sm leading-relaxed text-cream">
              Remove <strong>@{confirmRemove.userId.username}</strong> from the guest list? Their pass will be cancelled and the booking count and revenue will be decremented.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmRemove(null)}>Cancel</Button>
              <Button variant="danger" className="flex-1" loading={removingId === confirmRemove._id} onClick={() => handleRemove(confirmRemove)}>Remove guest</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Phases tab ───────────────────────────────────────────────────────────────

function PhasesTab({ event }: { event: Event }) {
  const tiers: PricingTier[] = (event as unknown as { pricingTiers?: PricingTier[] }).pricingTiers ?? [];

  if (tiers.length === 0) {
    return (
      <div className="ledger px-1 py-10">
        <div className="clique-label mb-3 !text-[10px] !tracking-[.16em]">№ 000 — NO PHASES</div>
        <p className="m-0 font-display text-xl font-bold tracking-[-0.02em] text-paper">No ticket phases.</p>
        <p className="m-0 mt-1 font-display text-sm leading-relaxed text-cream">
          This event uses a single price of {formatPrice(event.price)}.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="clique-label">ALL PHASES</div>
      {tiers.map((tier, i) => {
        const soldOut   = tier.capacity != null && tier.soldCount >= tier.capacity;
        const spotsLeft = tier.capacity != null ? tier.capacity - tier.soldCount : null;
        return (
          <div key={tier._id} className={`rounded-card border bg-card p-4 ${tier.isOpen && !soldOut ? 'border-lime/30' : 'border-line-2'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
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
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10px] tracking-[.08em] text-cream">
                  <span>₹{tier.commonPrice.toLocaleString('en-IN')}</span>
                  {tier.malePrice > 0 && <span>M: ₹{tier.malePrice.toLocaleString('en-IN')}</span>}
                  {tier.femalePrice > 0 && <span>F: ₹{tier.femalePrice.toLocaleString('en-IN')}</span>}
                  <span>{tier.soldCount} sold{tier.capacity != null ? ` / ${tier.capacity} capacity` : ''}</span>
                  {spotsLeft != null && !soldOut && (
                    <span className={spotsLeft < 10 ? 'text-hot' : ''}>{spotsLeft} left</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Team tab ─────────────────────────────────────────────────────────────────

function TeamTab({ event }: { event: Event }) {
  const coHosts  = event.coHosts  ?? [];
  const scanners = event.scanners ?? [];

  function MemberList({ title, members }: { title: string; members: EventMember[] }) {
    return (
      <div className="rounded-card border border-line-2 bg-card p-5">
        <div className="clique-label mb-3">{title}</div>
        {members.length === 0 ? (
          <p className="m-0 py-2 font-mono text-[10px] uppercase tracking-[.1em] text-dim">None assigned</p>
        ) : (
          <div className="flex flex-col gap-2">
            {members.map((m) => (
              <div key={m.userId} className="flex items-center gap-2.5 rounded-xl border border-line-2 bg-well px-3.5 py-2.5">
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
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <MemberList title="CO-HOSTS" members={coHosts} />
      <MemberList title="SCANNERS" members={scanners} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail]       = useState<AdminEventDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  useEffect(() => {
    api.get(`/admin/events/${id}`)
      .then(({ data }) => setDetail(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

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
  const host      = event.hostId as AdminEventDetail['event']['hostId'];
  const imageUrl  = event.images?.[0] ? getImageUrl(event.images[0]) : null;

  const slots = (b: AdminBooking) => b.groupSize ?? 1;
  const liveConfirmedSlots  = detail.bookings.filter((b) => ['confirmed', 'checked_in'].includes(b.status)).reduce((s, b) => s + slots(b), 0);
  const liveCheckedInSlots  = detail.bookings.filter((b) => b.status === 'checked_in').reduce((s, b) => s + slots(b), 0);
  const livePendingSlots    = detail.bookings.filter((b) => ['payment_pending', 'utr_submitted'].includes(b.status)).reduce((s, b) => s + slots(b), 0);

  const statusMap: Record<string, { label: string; color: string }> = {
    published: { label: 'Live',      color: 'var(--lime)' },
    draft:     { label: 'Draft',     color: 'var(--gold)' },
    cancelled: { label: 'Cancelled', color: 'var(--hot)'  },
    completed: { label: 'Completed', color: 'var(--sky)'  },
    blocked:   { label: 'Blocked',   color: 'var(--hot)'  },
  };
  const statusBadge = statusMap[event.status] ?? { label: event.status, color: 'var(--dim)' };

  const handleStatusChange = (newStatus: string) => {
    setDetail((prev) => prev ? { ...prev, event: { ...prev.event, status: newStatus as Event['status'] } } : prev);
  };

  return (
    <div className="mx-auto max-w-3xl animate-rise">
      <Link href="/admin/events" className="clique-label mb-6 inline-block transition-colors hover:text-paper">
        ← Admin / Events
      </Link>

      {/* Header */}
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
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase',
                color: statusBadge.color, border: `1px solid ${statusColor(event.status)}`,
                borderRadius: 3, padding: '2px 6px',
              }}>
                {statusBadge.label}
              </span>
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

        {/* Stats strip */}
        <div className="mt-5 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-t border-dashed border-line pt-4">
          <Stat label="ON THE LIST" value={`${liveConfirmedSlots}/${event.capacity}`} />
          <Stat label="CHECKED IN"  value={liveCheckedInSlots} />
          <Stat label="PRICE"       value={getDisplayPrice(event)} />
          <Stat label="PRIVACY"     value={event.privacy === 'private' ? 'Private' : event.privacy === 'secret' ? 'Secret' : 'Public'} />
        </div>
      </div>

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

      {activeTab === 'overview' && <OverviewTab detail={detail} onStatusChange={handleStatusChange} />}
      {activeTab === 'guests'   && <GuestsTab detail={detail} eventId={id} confirmedSlots={liveConfirmedSlots} checkedInSlots={liveCheckedInSlots} pendingSlots={livePendingSlots} />}
      {activeTab === 'phases'   && <PhasesTab event={event} />}
      {activeTab === 'team'     && <TeamTab event={event} />}
    </div>
  );
}
