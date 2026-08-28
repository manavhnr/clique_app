'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { PageSpinner } from '@/components/ui/Spinner';
import ScannerModal from '@/components/ScannerModal';
import { Event, EventMember, Squad } from '@/types';
import { formatDate, formatTime, formatPrice, getImageUrl } from '@/lib/utils';
import api from '@/lib/api';

interface Booking {
  _id: string;
  userId: { _id: string; name: string; username: string; profileImage?: string; gender?: string; age?: number; phone?: string; connectedSocials?: { instagram?: string }; city?: string; cliquescore?: number };
  status: string;
  amount: number;
  tierLabel?: string;
  createdAt: string;
}

interface PendingRequest {
  _id: string;
  userId: { _id: string; name: string; username: string; profileImage?: string; gender?: string; age?: number; phone?: string; connectedSocials?: { instagram?: string }; cliquescore?: number; city?: string };
  status: string;
  message?: string;
  createdAt: string;
}

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'guests', label: 'Guests' },
  { key: 'phases', label: 'Phases' },
  { key: 'team', label: 'Team' },
  { key: 'scanner', label: 'Scanner' },
] as const;

export default function HostEventPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'guests' | 'phases' | 'team' | 'scanner'>('overview');

  const fetchGuests = () => {
    Promise.all([
      api.get(`/bookings/event/${id}`).catch(() => null),
      api.get(`/requests/host?eventId=${id}`).catch(() => null),
      api.get(`/squads/event/${id}/all`).catch(() => null),
      api.get(`/events/${id}`).catch(() => null),
    ]).then(([bRes, rRes, sRes, evtRes]) => {
      if (bRes?.data?.data?.bookings) setBookings(bRes.data.data.bookings);
      if (rRes?.data?.data?.requests) setRequests(rRes.data.data.requests);
      if (sRes?.data?.data?.squads) setSquads(sRes.data.data.squads);
      if (evtRes?.data?.data?.event) setEvent(evtRes.data.data.event);
    });
  };

  useEffect(() => {
    api.get(`/events/${id}`)
      .then((evtRes) => setEvent(evtRes.data.data.event))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (activeTab === 'guests') fetchGuests();
  }, [activeTab, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshEvent = async () => {
    const { data } = await api.get(`/events/${id}`);
    setEvent(data.data.event);
  };

  if (loading) return <PageSpinner />;
  if (!event) {
    return (
      <div className="py-24 text-center">
        <div className="font-display text-[28px] font-bold tracking-[-0.02em]">Event not found.</div>
        <Link href="/host/dashboard" className="clique-label mt-4 inline-block hover:text-paper">← Host dashboard</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl animate-rise">
      <Link href="/host/dashboard" className="clique-label mb-6 inline-block transition-colors hover:text-paper">
        ← Host dashboard
      </Link>

      <EventHeader event={event} onRefresh={refreshEvent} />

      {/* Tabs — a ruled index, not pills */}
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

      {activeTab === 'overview' && <OverviewTab event={event} />}
      {activeTab === 'guests' && (
        <GuestsTab eventTitle={event.title} bookings={bookings} requests={requests} squads={squads} onRefresh={fetchGuests} />
      )}
      {activeTab === 'phases' && <PhasesTab event={event} onRefresh={refreshEvent} />}
      {activeTab === 'team' && <TeamTab event={event} onRefresh={refreshEvent} />}
      {activeTab === 'scanner' && <ScannerTab event={event} />}
    </div>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────

function EventHeader({ event, onRefresh }: { event: Event; onRefresh: () => void }) {
  const router = useRouter();
  const [publishError, setPublishError] = useState('');
  const imageUrl = event.images?.[0] ? getImageUrl(event.images[0]) : null;

  const statusMap: Record<string, { label: string; variant: 'lime' | 'gold' | 'hot' | 'sky' | 'neutral' }> = {
    published: { label: 'Live', variant: 'lime' },
    draft: { label: 'Draft', variant: 'gold' },
    cancelled: { label: 'Cancelled', variant: 'hot' },
    completed: { label: 'Completed', variant: 'sky' },
    blocked: { label: 'Blocked', variant: 'hot' },
  };
  const statusBadge = statusMap[event.status] ?? { label: event.status, variant: 'neutral' as const };

  const handlePublish = async () => {
    setPublishError('');
    try {
      await api.patch(`/events/${event._id}/publish`);
      onRefresh();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setPublishError(e.response?.data?.message ?? 'Could not publish — try again.');
    }
  };

  const stampClass: Record<string, string> = {
    lime: 'text-lime', gold: 'text-gold', hot: 'text-hot', sky: 'text-sky', neutral: 'text-cream',
  };

  return (
    <div className="border-b border-line pb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          {imageUrl && (
            <img src={imageUrl} alt="" className="hidden h-20 w-20 shrink-0 rounded-[3px] border border-line-2 object-cover sm:block" />
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="m-0 font-display text-[clamp(26px,4.5vw,40px)] font-bold leading-[0.95] tracking-[-0.025em] text-paper [overflow-wrap:break-word]">
                {event.title}
              </h2>
              <span className={`stamp ${stampClass[statusBadge.variant]}`}>{statusBadge.label}</span>
            </div>
            <p className="m-0 mt-2 font-mono text-[11px] tracking-[.06em] text-cream">
              {formatDate(event.date)} · {formatTime(event.startTime)} · {event.locationName}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {event.status === 'draft' && <Button size="sm" onClick={handlePublish}>Publish</Button>}
          <Button variant="secondary" size="sm" onClick={() => router.push(`/host/events/new?edit=${event._id}`)}>
            Edit
          </Button>
        </div>
      </div>

      {publishError && <p className="mt-3 font-mono text-xs text-hot">{publishError}</p>}

      <div className="mt-5 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-t border-dashed border-line pt-4">
        {[
          { label: 'ON THE LIST', value: `${event.bookedCount}/${event.capacity}` },
          { label: 'CHECKED IN', value: event.checkedInCount ?? 0 },
          { label: 'PRICE', value: formatPrice(event.price) },
          { label: 'PRIVACY', value: event.privacy === 'private' ? 'Private' : event.privacy === 'secret' ? 'Secret' : 'Public' },
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

// ── Overview ─────────────────────────────────────────────────────────────────

function OverviewTab({ event }: { event: Event }) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionError, setActionError] = useState('');

  const handleCancel = async () => {
    setCancelling(true);
    setActionError('');
    try {
      await api.patch(`/events/${event._id}/cancel`);
      router.push('/host/dashboard');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setActionError(e.response?.data?.message ?? 'Could not cancel the event — try again.');
      setCancelling(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setActionError('');
    try {
      await api.delete(`/events/${event._id}`);
      router.push('/host/dashboard');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setActionError(e.response?.data?.message ?? 'Could not delete the draft — try again.');
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-7">
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

      {event.status === 'published' && (
        <Button variant="danger" className="w-full" onClick={() => setCancelOpen(true)}>
          Cancel event
        </Button>
      )}
      {event.status === 'draft' && (
        <Button variant="danger" className="w-full" onClick={() => setDeleteOpen(true)}>
          Delete draft
        </Button>
      )}

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this event?" size="sm">
        <div className="flex flex-col gap-4">
          <p className="m-0 rounded-xl border border-hot/25 bg-hot/[.08] p-3.5 font-display text-sm leading-relaxed text-cream">
            This cancels the event, invalidates every pass, and notifies all guests. It cannot be undone.
          </p>
          {actionError && <p className="m-0 font-mono text-xs text-hot">{actionError}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setCancelOpen(false)}>Keep event</Button>
            <Button variant="danger" className="flex-1" loading={cancelling} onClick={handleCancel}>Yes, cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete this draft?" size="sm">
        <div className="flex flex-col gap-4">
          <p className="m-0 rounded-xl border border-hot/25 bg-hot/[.08] p-3.5 font-display text-sm leading-relaxed text-cream">
            This permanently deletes the draft. It cannot be recovered.
          </p>
          {actionError && <p className="m-0 font-mono text-xs text-hot">{actionError}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteOpen(false)}>Keep draft</Button>
            <Button variant="danger" className="flex-1" loading={deleting} onClick={handleDelete}>Yes, delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Guest metadata chips ─────────────────────────────────────────────────────

function InstagramLink({ socials }: { socials?: { instagram?: string } }) {
  if (!socials?.instagram) return null;
  return (
    <a
      href={`https://instagram.com/${socials.instagram}`}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-[11px] tracking-[.04em] text-cream transition-colors hover:text-paper"
    >
      IG @{socials.instagram} ↗
    </a>
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

type EntryType = 'stag' | 'solo' | 'group' | 'mixed';

function getEntryType(gender: string | undefined, squadName: string | undefined, squadMembers?: { gender?: string }[]): EntryType {
  if (squadName && squadMembers) {
    const hasMale = squadMembers.some((m) => m.gender === 'male');
    const hasFemale = squadMembers.some((m) => m.gender === 'female');
    if (hasMale && hasFemale) return 'mixed';
    return 'group';
  }
  if (gender === 'male') return 'stag';
  return 'solo';
}

function EntryTypeBadge({ type, squadName }: { type: EntryType; squadName?: string }) {
  const map: Record<EntryType, { label: string; variant: 'sky' | 'hot' | 'gold' | 'lime' }> = {
    stag: { label: 'STAG', variant: 'sky' },
    solo: { label: 'SOLO', variant: 'hot' },
    group: { label: squadName ? `GROUP · ${squadName}` : 'GROUP', variant: 'gold' },
    mixed: { label: squadName ? `MIXED · ${squadName}` : 'MIXED', variant: 'lime' },
  };
  const { label, variant } = map[type];
  return <Badge variant={variant}>{label}</Badge>;
}

function BookingStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'lime' | 'gold' | 'sky' | 'hot' | 'neutral' }> = {
    confirmed: { label: 'Confirmed', variant: 'lime' },
    checked_in: { label: 'Checked in', variant: 'sky' },
    payment_pending: { label: 'Payment pending', variant: 'gold' },
    utr_submitted: { label: 'UPI submitted', variant: 'gold' },
    cancelled: { label: 'Cancelled', variant: 'hot' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={variant}>{label}</Badge>;
}

// ── Attendee card ────────────────────────────────────────────────────────────

function AttendeeCard({
  name, username, profileImage, gender, age, connectedSocials, city, cliquescore,
  right, requestStatus, entryType, squadName, framed = true,
}: {
  name: string; username: string; profileImage?: string; gender?: string; age?: number; phone?: string;
  connectedSocials?: { instagram?: string }; city?: string; cliquescore?: number;
  right?: React.ReactNode; requestStatus?: string | null;
  entryType?: EntryType; squadName?: string; framed?: boolean;
}) {
  return (
    <div className={framed ? 'rounded-xl border border-line-2 bg-card p-4' : ''}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-line font-display text-sm font-bold text-cream">
          {profileImage ? (
            <img src={profileImage} alt={name} className="h-full w-full object-cover" />
          ) : (
            (name?.[0] ?? '?').toUpperCase()
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <p className="m-0 font-display text-sm font-bold text-paper">{name || 'Unknown'}</p>
            <GenderBadge gender={gender} />
            {age != null && <Badge>{age}y</Badge>}
            {entryType && <EntryTypeBadge type={entryType} squadName={squadName} />}
            {requestStatus === 'requested' && <Badge variant="gold">Pending</Badge>}
            {requestStatus === 'approved' && <Badge variant="lime">Approved</Badge>}
          </div>

          <p className="m-0 font-mono text-[11px] tracking-[.04em] text-dim">
            @{username || '—'}{city ? ` · ${city}` : ''}
            {cliquescore != null ? ` · ★ ${cliquescore}` : ''}
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

// ── CSV export ───────────────────────────────────────────────────────────────

function exportGuestsCSV(bookings: Booking[], squads: Squad[], eventTitle: string) {
  const squadByUserId = new Map<string, Squad>();
  for (const sq of squads) {
    for (const m of sq.members) squadByUserId.set(m.userId, sq);
  }

  const rows = [
    ['Name', 'Username', 'Phone', 'Gender', 'Age', 'City', 'Instagram', 'Entry Type', 'Status', 'Booked At'],
    ...bookings.map((b) => {
      const u = b.userId;
      const sq = squadByUserId.get(u?._id ?? '');
      const entryType = getEntryType(u?.gender, sq?.name, sq?.members);
      return [
        u?.name ?? '',
        u?.username ?? '',
        u?.phone ?? '',
        u?.gender ?? '',
        u?.age != null ? String(u.age) : '',
        u?.city ?? '',
        u?.connectedSocials?.instagram ?? '',
        entryType.toUpperCase() + (sq ? ` (${sq.name})` : ''),
        b.status,
        new Date(b.createdAt).toLocaleString('en-IN'),
      ];
    }),
  ];

  const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${eventTitle.replace(/[^a-z0-9]/gi, '_')}_guests.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Guests tab ───────────────────────────────────────────────────────────────

function SectionHead({ label, count, variant = 'neutral', action }: { label: string; count: number; variant?: 'lime' | 'gold' | 'neutral'; action?: React.ReactNode }) {
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

function GuestsTab({ eventTitle, bookings, requests, squads, onRefresh }: {
  eventTitle: string;
  bookings: Booking[];
  requests: PendingRequest[];
  squads: Squad[];
  onRefresh: () => void;
}) {
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [approvingGroup, setApprovingGroup] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const squadByUserId = new Map<string, Squad>();
  for (const sq of squads) {
    for (const m of sq.members) squadByUserId.set(m.userId, sq);
  }

  const fail = (fallback: string) => (err: unknown) => {
    const e = err as { response?: { data?: { message?: string } } };
    setActionError(e.response?.data?.message ?? fallback);
  };

  const handleApprove = async (requestId: string) => {
    setApproving(requestId);
    setActionError('');
    try { await api.patch(`/requests/${requestId}/approve`); onRefresh(); }
    catch (err) { fail('Could not approve the request — try again.')(err); }
    finally { setApproving(null); }
  };

  const handleReject = async (requestId: string) => {
    setRejecting(requestId);
    setActionError('');
    try { await api.patch(`/requests/${requestId}/reject`); onRefresh(); }
    catch (err) { fail('Could not decline the request — try again.')(err); }
    finally { setRejecting(null); }
  };

  const handleApproveGroup = async (squadId: string) => {
    setApprovingGroup(squadId);
    setActionError('');
    try { await api.patch(`/squads/${squadId}/approve`); onRefresh(); }
    catch (err) { fail('Could not approve the group — try again.')(err); }
    finally { setApprovingGroup(null); }
  };

  const enteredCount = bookings.filter((b) => b.status === 'checked_in').length;

  const pendingGroups = squads.filter((sq) => sq.groupStatus === 'pending' || sq.groupStatus === 'mixed');
  const approvedGroups = squads.filter((sq) => sq.groupStatus === 'approved');

  const allGroupMemberUserIds = new Set(squads.flatMap((sq) => sq.members.map((m) => m.userId)));
  const soloRequests = requests.filter((r) => !allGroupMemberUserIds.has(r.userId._id));

  const isEmpty = soloRequests.length === 0 && bookings.length === 0 && squads.length === 0;

  if (isEmpty) {
    return (
      <div className="ledger px-1 py-12">
        <div className="clique-label mb-3.5 !text-[10px] !tracking-[.16em]">№ 000 — EMPTY LIST</div>
        <p className="m-0 font-display text-2xl font-bold tracking-[-0.02em] text-paper">No registrations yet.</p>
        <p className="m-0 mt-2 max-w-[42ch] font-display text-sm leading-relaxed text-cream">
          Share the event link — pending and confirmed guests land on this list.
        </p>
      </div>
    );
  }

  const approveBtn = (busy: boolean, onClick: () => void) => (
    <Button size="sm" onClick={onClick} disabled={busy}>{busy ? '…' : 'Accept'}</Button>
  );
  const rejectBtn = (busy: boolean, onClick: () => void) => (
    <Button size="sm" variant="danger" onClick={onClick} disabled={busy}>{busy ? '…' : 'Decline'}</Button>
  );

  return (
    <div className="flex flex-col gap-8">
      {actionError && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-hot/20 bg-hot/[.08] px-4 py-3">
          <span className="font-mono text-[11px] leading-relaxed tracking-[.06em] text-hot">{actionError}</span>
          <button onClick={() => setActionError('')} aria-label="Dismiss" className="shrink-0 text-hot">×</button>
        </div>
      )}

      {/* Pending groups */}
      {pendingGroups.length > 0 && (
        <div>
          <SectionHead label="PENDING GROUPS" count={pendingGroups.length} variant="gold" />
          <div className="flex flex-col gap-4">
            {pendingGroups.map((sq) => {
              const pendingMemberCount = sq.members.filter((m) => m.requestStatus === 'requested').length;
              const entryType = getEntryType(undefined, sq.name, sq.members);
              const sqId = sq._id.toString();
              return (
                <div key={sqId} className="overflow-hidden rounded-card border border-gold/25 bg-card">
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
                          gender={m.gender} age={m.age} phone={m.phone} connectedSocials={m.connectedSocials}
                          city={m.city} cliquescore={m.cliquescore} requestStatus={m.requestStatus}
                          entryType={getEntryType(m.gender, sq.name, sq.members)}
                          squadName={sq.name}
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
            })}
          </div>
        </div>
      )}

      {/* Solo pending requests */}
      {soloRequests.length > 0 && (
        <div>
          <SectionHead label="PENDING REQUESTS" count={soloRequests.length} variant="gold" />
          <div className="flex flex-col gap-2.5">
            {soloRequests.map((r) => (
              <AttendeeCard
                key={r._id}
                name={r.userId?.name ?? 'User'}
                username={r.userId?.username ?? '—'}
                profileImage={r.userId?.profileImage}
                gender={r.userId?.gender}
                age={r.userId?.age}
                phone={r.userId?.phone}
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
            ))}
          </div>
        </div>
      )}

      {/* Approved groups */}
      {approvedGroups.length > 0 && (
        <div>
          <SectionHead label="GROUPS ON THE LIST" count={approvedGroups.length} variant="lime" />
          <div className="flex flex-col gap-3">
            {approvedGroups.map((sq) => {
              const entryType = getEntryType(undefined, sq.name, sq.members);
              return (
                <div key={sq._id.toString()} className="overflow-hidden rounded-card border border-line-2 bg-card">
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
                          gender={m.gender} age={m.age} phone={m.phone} connectedSocials={m.connectedSocials}
                          city={m.city} cliquescore={m.cliquescore} requestStatus={m.requestStatus}
                          entryType={getEntryType(m.gender, sq.name, sq.members)}
                          squadName={sq.name}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirmed individual guests */}
      {bookings.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <span className="clique-label">ON THE LIST</span>
              <p className="m-0 mt-1 font-mono text-[11px] tracking-[.06em] text-cream">
                <span className="text-lime">{enteredCount}</span> in · {bookings.length - enteredCount} awaiting
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => exportGuestsCSV(bookings, squads, eventTitle)}>
              Export CSV ↓
            </Button>
          </div>
          <div className="flex flex-col gap-2.5">
            {bookings.map((b) => {
              const entered = b.status === 'checked_in';
              const sq = squadByUserId.get(b.userId?._id ?? '');
              const entryType = getEntryType(b.userId?.gender, sq?.name, sq?.members);
              return (
                <AttendeeCard
                  key={b._id}
                  name={b.userId?.name ?? 'User'}
                  username={b.userId?.username ?? '—'}
                  profileImage={b.userId?.profileImage}
                  gender={b.userId?.gender}
                  age={b.userId?.age}
                  phone={b.userId?.phone}
                  connectedSocials={b.userId?.connectedSocials}
                  city={b.userId?.city}
                  requestStatus={null}
                  entryType={entryType}
                  squadName={sq?.name}
                  right={
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-2">
                        <BookingStatusBadge status={b.status} />
                        {(b.status === 'confirmed' || b.status === 'checked_in') && (
                          <Badge variant={entered ? 'lime' : 'neutral'}>{entered ? '✓ In' : 'Awaiting'}</Badge>
                        )}
                      </div>
                      {b.tierLabel && (
                        <span className="font-mono text-[9px] tracking-[.1em] text-dim uppercase">{b.tierLabel}</span>
                      )}
                    </div>
                  }
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Phases tab ───────────────────────────────────────────────────────────────

interface PricingTier {
  _id: string;
  label: string;
  commonPrice: number;
  malePrice: number;
  femalePrice: number;
  capacity?: number;
  soldCount: number;
  isOpen: boolean;
}

function PhasesTab({ event, onRefresh }: { event: Event; onRefresh: () => void }) {
  const tiers: PricingTier[] = (event as unknown as { pricingTiers?: PricingTier[] }).pricingTiers ?? [];

  const [label, setLabel]       = useState('');
  const [price, setPrice]       = useState('');
  const [capacity, setCapacity] = useState('');
  const [adding, setAdding]     = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError]       = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !price.trim()) return;
    setError(''); setAdding(true);
    try {
      await api.post(`/events/${event._id}/tiers`, {
        label: label.trim(),
        commonPrice: Number(price),
        capacity: capacity ? Number(capacity) : undefined,
      });
      setLabel(''); setPrice(''); setCapacity('');
      await onRefresh();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Failed to add phase');
    } finally { setAdding(false); }
  };

  const handleToggle = async (tier: PricingTier) => {
    setError(''); setToggling(tier._id);
    try {
      const action = tier.isOpen ? 'close' : 'open';
      await api.patch(`/events/${event._id}/tiers/${tier._id}/${action}`);
      await onRefresh();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Failed to update phase');
    } finally { setToggling(null); }
  };

  const canAdd = !['cancelled', 'completed', 'blocked'].includes(event.status);

  return (
    <div className="flex flex-col gap-6">

      {/* Current phases list */}
      {tiers.length === 0 ? (
        <div className="ledger px-1 py-10">
          <div className="clique-label mb-3 !text-[10px] !tracking-[.16em]">№ 000 — NO PHASES</div>
          <p className="m-0 font-display text-xl font-bold tracking-[-0.02em] text-paper">No ticket phases yet.</p>
          <p className="m-0 mt-2 font-display text-sm leading-relaxed text-cream">
            Add a phase below — it goes live immediately and attendees can book it.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="clique-label">ALL PHASES</div>
          {tiers.map((tier, i) => {
            const soldOut = tier.capacity != null && tier.soldCount >= tier.capacity;
            const spotsLeft = tier.capacity != null ? tier.capacity - tier.soldCount : null;
            const isBusy = toggling === tier._id;
            return (
              <div key={tier._id} className={`rounded-card border bg-card p-4 ${tier.isOpen ? 'border-lime/30' : 'border-line-2'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
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
                      <span>{tier.soldCount} sold{tier.capacity != null ? ` / ${tier.capacity} capacity` : ''}</span>
                      {spotsLeft != null && !soldOut && <span className={spotsLeft < 10 ? 'text-hot' : ''}>{spotsLeft} left</span>}
                    </div>
                  </div>
                  {canAdd && !soldOut && (
                    <button
                      onClick={() => handleToggle(tier)}
                      disabled={isBusy}
                      className={`shrink-0 rounded border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.08em] transition-colors disabled:opacity-50 ${
                        tier.isOpen
                          ? 'border-hot/30 text-hot hover:bg-hot/10'
                          : 'border-lime/30 text-lime hover:bg-lime/10'
                      }`}
                    >
                      {isBusy ? '…' : tier.isOpen ? 'Close' : 'Open'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add phase form */}
      {canAdd && (
        <div className="rounded-card border border-dashed border-line-2 p-5">
          <div className="clique-label mb-4">ADD A PHASE</div>
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[.12em] text-dim">Phase name *</span>
                <input
                  className="clique-input"
                  placeholder="e.g. Early Bird"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[.12em] text-dim">Price (₹) *</span>
                <input
                  className="clique-input"
                  type="number"
                  min="0"
                  placeholder="299"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[.12em] text-dim">Capacity (optional)</span>
                <input
                  className="clique-input"
                  type="number"
                  min="1"
                  placeholder="50"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </label>
            </div>
            {error && <p className="m-0 font-mono text-xs text-hot">{error}</p>}
            <Button type="submit" loading={adding} className="self-start">
              Add phase →
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Team tab ─────────────────────────────────────────────────────────────────

function TeamTab({ event, onRefresh }: { event: Event; onRefresh: () => void }) {
  const [coHostUsername, setCoHostUsername] = useState('');
  const [scannerUsername, setScannerUsername] = useState('');
  const [addingCoHost, setAddingCoHost] = useState(false);
  const [addingScanner, setAddingScanner] = useState(false);
  const [errorCoHost, setErrorCoHost] = useState('');
  const [errorScanner, setErrorScanner] = useState('');

  const handleAddCoHost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coHostUsername.trim()) return;
    setErrorCoHost('');
    setAddingCoHost(true);
    try {
      await api.post(`/events/${event._id}/co-hosts`, { username: coHostUsername.trim() });
      setCoHostUsername('');
      await onRefresh();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setErrorCoHost(e.response?.data?.message ?? 'Failed to add co-host');
    } finally {
      setAddingCoHost(false);
    }
  };

  const handleRemoveCoHost = async (userId: string) => {
    setErrorCoHost('');
    try {
      await api.delete(`/events/${event._id}/co-hosts/${userId}`);
      await onRefresh();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setErrorCoHost(e.response?.data?.message ?? 'Failed to remove co-host');
    }
  };

  const handleAddScanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannerUsername.trim()) return;
    setErrorScanner('');
    setAddingScanner(true);
    try {
      await api.post(`/events/${event._id}/scanners`, { username: scannerUsername.trim() });
      setScannerUsername('');
      await onRefresh();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setErrorScanner(e.response?.data?.message ?? 'Failed to add scanner');
    } finally {
      setAddingScanner(false);
    }
  };

  const handleRemoveScanner = async (userId: string) => {
    setErrorScanner('');
    try {
      await api.delete(`/events/${event._id}/scanners/${userId}`);
      await onRefresh();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setErrorScanner(e.response?.data?.message ?? 'Failed to remove scanner');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <TeamSection
        title="CO-HOSTS"
        description="Co-hosts can help manage the event and see guest details."
        members={event.coHosts ?? []}
        username={coHostUsername}
        onUsernameChange={setCoHostUsername}
        onAdd={handleAddCoHost}
        onRemove={handleRemoveCoHost}
        adding={addingCoHost}
        error={errorCoHost}
        placeholder="Co-host @username"
      />

      <TeamSection
        title="SCANNERS"
        description="Scanners can check guests in at the door with the QR scanner."
        members={event.scanners ?? []}
        username={scannerUsername}
        onUsernameChange={setScannerUsername}
        onAdd={handleAddScanner}
        onRemove={handleRemoveScanner}
        adding={addingScanner}
        error={errorScanner}
        placeholder="Scanner @username"
      />
    </div>
  );
}

function TeamSection({
  title, description, members, username, onUsernameChange,
  onAdd, onRemove, adding, error, placeholder,
}: {
  title: string; description: string;
  members: EventMember[]; username: string;
  onUsernameChange: (v: string) => void;
  onAdd: (e: React.FormEvent) => void;
  onRemove: (userId: string) => void;
  adding: boolean; error: string; placeholder: string;
}) {
  return (
    <div className="rounded-card border border-line-2 bg-card p-5">
      <div className="clique-label">{title}</div>
      <p className="m-0 mt-1.5 font-display text-[13px] leading-relaxed text-cream">{description}</p>

      <form onSubmit={onAdd} className="mt-4 flex items-start gap-2">
        <div className="flex-1">
          <Input
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            placeholder={placeholder}
            error={error || undefined}
          />
        </div>
        <Button type="submit" loading={adding} className="shrink-0 py-3.5">
          Add
        </Button>
      </form>

      {members.length === 0 ? (
        <p className="m-0 py-3 text-center font-mono text-[10px] uppercase tracking-[.1em] text-dim">
          No {title.toLowerCase()} yet
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between rounded-xl border border-line-2 bg-well px-3.5 py-2.5">
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
              <button
                onClick={() => onRemove(m.userId)}
                aria-label={`Remove @${m.username}`}
                className="rounded-full border border-transparent px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.08em] text-dim transition-colors hover:border-hot/30 hover:text-hot"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Scanner tab ──────────────────────────────────────────────────────────────

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
                Publish the event first — passes only scan for live events.
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
