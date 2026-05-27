'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import jsQR from 'jsqr';
import {
  ArrowLeft, Users, QrCode, UserPlus, Trash2, CheckCircle2,
  XCircle, Shield, Edit2, Globe, AlertTriangle, UserCheck,
  Camera, CameraOff,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import { Event, EventMember, Squad } from '@/types';
import { formatDate, formatTime, formatPrice, getImageUrl } from '@/lib/utils';
import api from '@/lib/api';

interface Booking {
  _id: string;
  userId: { _id: string; name: string; username: string; profileImage?: string; gender?: string; age?: number; phone?: string; connectedSocials?: { instagram?: string }; city?: string; cliquescore?: number };
  status: string;
  amount: number;
  createdAt: string;
}

interface PendingRequest {
  _id: string;
  userId: { _id: string; name: string; username: string; profileImage?: string; gender?: string; age?: number; phone?: string; connectedSocials?: { instagram?: string }; cliquescore?: number; city?: string };
  status: string;
  message?: string;
  createdAt: string;
}

export default function HostEventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'guests' | 'team' | 'scanner'>('overview');

  useEffect(() => {
    api.get(`/events/${id}`)
      .then((evtRes) => setEvent(evtRes.data.data.event))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (activeTab === 'guests') {
      Promise.all([
        api.get(`/bookings/event/${id}`).catch(() => null),
        api.get(`/requests/host?eventId=${id}`).catch(() => null),
        api.get(`/squads/event/${id}/all`).catch(() => null),
      ]).then(([bRes, rRes, sRes]) => {
        if (bRes?.data?.data?.bookings) setBookings(bRes.data.data.bookings);
        if (rRes?.data?.data?.requests) setRequests(rRes.data.data.requests);
        if (sRes?.data?.data?.squads) setSquads(sRes.data.data.squads);
      });
    }
  }, [activeTab, id]);

  const refreshEvent = async () => {
    const { data } = await api.get(`/events/${id}`);
    setEvent(data.data.event);
  };

  if (loading) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;
  if (!event) return <div className="text-center py-24 text-muted">Event not found.</div>;

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Globe },
    { key: 'guests', label: 'Guests', icon: Users },
    { key: 'team', label: 'Co-hosts & Scanners', icon: Shield },
    { key: 'scanner', label: 'QR Scanner', icon: QrCode },
  ] as const;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-muted hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>

      <EventHeader event={event} onRefresh={refreshEvent} />

      <div className="flex gap-1 mt-6 mb-6 bg-dark-card border border-dark-border rounded-xl p-1 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key as typeof activeTab)}
            className={`cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 whitespace-nowrap flex-1 justify-center ${activeTab === key ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab event={event} onRefresh={refreshEvent} />}
      {activeTab === 'guests' && <GuestsTab eventId={id} eventTitle={event.title} bookings={bookings} requests={requests} squads={squads} onRefresh={() => {
        Promise.all([
          api.get(`/bookings/event/${id}`).catch(() => null),
          api.get(`/requests/host?eventId=${id}`).catch(() => null),
          api.get(`/squads/event/${id}/all`).catch(() => null),
        ]).then(([bRes, rRes, sRes]) => {
          if (bRes?.data?.data?.bookings) setBookings(bRes.data.data.bookings);
          if (rRes?.data?.data?.requests) setRequests(rRes.data.data.requests);
          if (sRes?.data?.data?.squads) setSquads(sRes.data.data.squads);
        });
      }} />}
      {activeTab === 'team' && <TeamTab event={event} onRefresh={refreshEvent} />}
      {activeTab === 'scanner' && <ScannerTab event={event} />}
    </div>
  );
}

function EventHeader({ event, onRefresh }: { event: Event; onRefresh: () => void }) {
  const router = useRouter();
  const imageUrl = event.images?.[0] ? getImageUrl(event.images[0]) : null;

  const statusMap: Record<string, { label: string; variant: 'green' | 'yellow' | 'red' | 'blue' | 'default' }> = {
    published: { label: 'Live', variant: 'green' },
    draft: { label: 'Draft', variant: 'yellow' },
    cancelled: { label: 'Cancelled', variant: 'red' },
    completed: { label: 'Completed', variant: 'blue' },
    blocked: { label: 'Blocked', variant: 'red' },
  };
  const statusBadge = statusMap[event.status] ?? { label: event.status, variant: 'default' as const };

  const handlePublish = async () => {
    await api.patch(`/events/${event._id}/publish`);
    onRefresh();
  };

  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
      {imageUrl && <div className="h-36 overflow-hidden"><img src={imageUrl} alt={event.title} className="w-full h-full object-cover" /></div>}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-white truncate">{event.title}</h2>
              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
            </div>
            <p className="text-sm text-muted">{formatDate(event.date)} · {formatTime(event.startTime)} · {event.locationName}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {event.status === 'draft' && (
              <Button size="sm" onClick={handlePublish}>Publish</Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => router.push(`/host/events/new?edit=${event._id}`)}>
              <Edit2 size={13} />
            </Button>
          </div>
        </div>

        <div className="flex gap-5 mt-4 pt-4 border-t border-dark-border text-center">
          {[
            { label: 'Bookings', value: `${event.bookedCount}/${event.capacity}` },
            { label: 'Check-ins', value: event.checkedInCount ?? 0 },
            { label: 'Price', value: formatPrice(event.price) },
            { label: 'Privacy', value: event.privacy === 'private' ? 'Private' : 'Public' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-sm font-semibold text-white">{value}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ event, onRefresh }: { event: Event; onRefresh: () => void }) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await api.patch(`/events/${event._id}/cancel`);
      // Navigate to dashboard so it re-fetches fresh data (avoids stale cache)
      router.push('/host/dashboard');
    } catch { /* ignore */ }
    finally { setCancelling(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/events/${event._id}`);
      // Navigate to dashboard — event is gone, fresh fetch will exclude it
      router.push('/host/dashboard');
    } catch { /* ignore */ }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-dark-card border border-dark-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Description</h3>
        <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{event.description}</p>
      </div>

      {event.rules && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-yellow-400 mb-2">Event Rules</h3>
          <p className="text-sm text-zinc-300 leading-relaxed">{event.rules}</p>
        </div>
      )}

      {event.refundPolicy && (
        <div className="bg-dark-card border border-dark-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-2">Refund Policy</h3>
          <p className="text-sm text-muted leading-relaxed">{event.refundPolicy}</p>
        </div>
      )}

      {/* Cancel — for published events */}
      {event.status === 'published' && (
        <div className="pt-2">
          <Button variant="danger" className="w-full" onClick={() => setCancelOpen(true)}>
            <XCircle size={16} />
            Cancel Event
          </Button>
        </div>
      )}

      {/* Delete — for draft events only */}
      {event.status === 'draft' && (
        <div className="pt-2">
          <Button variant="danger" className="w-full" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={16} />
            Delete Draft
          </Button>
        </div>
      )}

      {/* Cancel modal */}
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel Event?" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300 leading-relaxed">
              This will cancel the event, invalidate all passes, and notify all guests. This cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setCancelOpen(false)}>Keep Event</Button>
            <Button variant="danger" className="flex-1" loading={cancelling} onClick={handleCancel}>Yes, Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Draft?" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300 leading-relaxed">
              This will permanently delete this draft. It cannot be recovered.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteOpen(false)}>Keep Draft</Button>
            <Button variant="danger" className="flex-1" loading={deleting} onClick={handleDelete}>Yes, Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InstagramLink({ socials }: { socials?: { instagram?: string } }) {
  if (!socials?.instagram) return null;
  return (
    <a
      href={`https://instagram.com/${socials.instagram}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 text-xs text-pink-400 hover:text-pink-300 transition-colors"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="ig-h" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FEDA75"/>
            <stop offset="50%" stopColor="#D62976"/>
            <stop offset="100%" stopColor="#4F5BD5"/>
          </linearGradient>
        </defs>
        <path fill="url(#ig-h)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
      @{socials.instagram}
    </a>
  );
}

function GenderBadge({ gender }: { gender?: string }) {
  if (!gender || gender === 'prefer_not_to_say') return null;
  const map: Record<string, { label: string; color: string }> = {
    male:   { label: 'M', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    female: { label: 'F', color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
  };
  const cfg = map[gender];
  if (!cfg) return null;
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function AttendeeCard({
  name, username, profileImage, gender, age, phone, connectedSocials, city, cliquescore,
  right, requestStatus, entryType, squadName,
}: {
  name: string; username: string; profileImage?: string; gender?: string; age?: number; phone?: string;
  connectedSocials?: { instagram?: string }; city?: string; cliquescore?: number;
  right?: React.ReactNode; requestStatus?: string | null;
  entryType?: EntryType; squadName?: string;
}) {
  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-4">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary-light shrink-0 overflow-hidden">
          {profileImage ? (
            <img src={profileImage} alt={name} className="w-full h-full object-cover" />
          ) : (
            (name?.[0] ?? '?').toUpperCase()
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          {/* Row 1: name + gender badge + age + entry type + request status */}
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-white text-sm font-semibold">{name || 'Unknown'}</p>
            <GenderBadge gender={gender} />
            {age != null && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border text-zinc-400 bg-zinc-500/10 border-zinc-500/20">
                {age}y
              </span>
            )}
            {entryType && <EntryTypeBadge type={entryType} squadName={squadName} />}
            {requestStatus === 'requested' && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border text-yellow-400 bg-yellow-500/10 border-yellow-500/20">
                Pending
              </span>
            )}
            {requestStatus === 'approved' && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border text-green-400 bg-green-500/10 border-green-500/20">
                Approved
              </span>
            )}
          </div>

          {/* Row 2: username + city + cliquescore */}
          <p className="text-xs text-muted">
            @{username || '—'}{city ? ` · ${city}` : ''}
            {cliquescore != null ? ` · ★ ${cliquescore}` : ''}
          </p>

          {/* Row 3: instagram */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <InstagramLink socials={connectedSocials} />
          </div>
        </div>

        {/* Right slot (actions) */}
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </div>
  );
}

// ── Entry type derivation ────────────────────────────────────────────────────

type EntryType = 'stag' | 'solo' | 'group' | 'mixed';

function getEntryType(gender: string | undefined, squadName: string | undefined, squadMembers?: { gender?: string }[]): EntryType {
  if (squadName && squadMembers) {
    const hasMale   = squadMembers.some((m) => m.gender === 'male');
    const hasFemale = squadMembers.some((m) => m.gender === 'female');
    if (hasMale && hasFemale) return 'mixed';
    return 'group';
  }
  if (gender === 'male') return 'stag';
  return 'solo';
}

function EntryTypeBadge({ type, squadName }: { type: EntryType; squadName?: string }) {
  const map: Record<EntryType, { label: string; color: string }> = {
    stag:  { label: 'STAG',  color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    solo:  { label: 'SOLO',  color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
    group: { label: squadName ? `GROUP · ${squadName}` : 'GROUP', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
    mixed: { label: squadName ? `MIXED · ${squadName}` : 'MIXED', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  };
  const { label, color } = map[type];
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border whitespace-nowrap ${color}`}>
      {label}
    </span>
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
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${eventTitle.replace(/[^a-z0-9]/gi, '_')}_guests.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── GuestsTab ────────────────────────────────────────────────────────────────

function GuestsTab({ eventId: _eventId, eventTitle, bookings, requests, squads, onRefresh }: {
  eventId: string;
  eventTitle: string;
  bookings: Booking[];
  requests: PendingRequest[];
  squads: Squad[];
  onRefresh: () => void;
}) {
  const [approving, setApproving]           = useState<string | null>(null);  // requestId
  const [rejecting, setRejecting]           = useState<string | null>(null);  // requestId
  const [approvingGroup, setApprovingGroup] = useState<string | null>(null);  // squadId

  // Build lookup: userId → squad (for entry type & CSV)
  const squadByUserId = new Map<string, Squad>();
  for (const sq of squads) {
    for (const m of sq.members) squadByUserId.set(m.userId, sq);
  }

  const handleApprove = async (requestId: string) => {
    setApproving(requestId);
    try { await api.patch(`/requests/${requestId}/approve`); onRefresh(); }
    catch { /* ignore */ }
    finally { setApproving(null); }
  };

  const handleReject = async (requestId: string) => {
    setRejecting(requestId);
    try { await api.patch(`/requests/${requestId}/reject`); onRefresh(); }
    catch { /* ignore */ }
    finally { setRejecting(null); }
  };

  const handleApproveGroup = async (squadId: string) => {
    setApprovingGroup(squadId);
    try { await api.patch(`/squads/${squadId}/approve`); onRefresh(); }
    catch { /* ignore */ }
    finally { setApprovingGroup(null); }
  };

  const enteredCount = bookings.filter((b) => b.status === 'checked_in').length;

  // Split squads into pending (any member pending) and approved
  const pendingGroups  = squads.filter((sq) => sq.groupStatus === 'pending' || sq.groupStatus === 'mixed');
  const approvedGroups = squads.filter((sq) => sq.groupStatus === 'approved');

  // Exclude group members from individual pending requests
  const allGroupMemberUserIds = new Set(squads.flatMap((sq) => sq.members.map((m) => m.userId)));
  const soloRequests = requests.filter((r) => !allGroupMemberUserIds.has(r.userId._id));

  const isEmpty = soloRequests.length === 0 && bookings.length === 0 && squads.length === 0;

  if (isEmpty) {
    return (
      <div className="text-center py-12 bg-dark-card border border-dark-border rounded-xl">
        <Users size={32} className="text-muted mx-auto mb-3" />
        <p className="text-white font-semibold mb-1">No registrations yet</p>
        <p className="text-sm text-muted">Pending and confirmed guests will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Pending group requests ── */}
      {pendingGroups.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-white">Pending Groups</p>
            <Badge variant="yellow">{pendingGroups.length}</Badge>
          </div>
          <div className="space-y-4">
            {pendingGroups.map((sq) => {
              const pendingMemberCount = sq.members.filter((m) => m.requestStatus === 'requested').length;
              const entryType = getEntryType(undefined, sq.name, sq.members);
              return (
                <div key={sq._id.toString()} className="bg-dark-card border border-yellow-500/20 rounded-xl overflow-hidden">
                  {/* Group header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border bg-yellow-500/5">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-semibold">{sq.name}</p>
                        <EntryTypeBadge type={entryType} />
                      </div>
                      <p className="text-xs text-muted">
                        {sq.members.length} members
                        {pendingMemberCount > 0 && ` · ${pendingMemberCount} pending`}
                      </p>
                    </div>
                    {pendingMemberCount > 0 && (
                      <button
                        onClick={() => handleApproveGroup(sq._id.toString())}
                        disabled={approvingGroup === sq._id.toString()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-semibold rounded-lg hover:bg-green-500/25 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 size={13} />
                        {approvingGroup === sq._id.toString() ? 'Approving…' : 'Approve All'}
                      </button>
                    )}
                  </div>
                  {/* Members */}
                  <div className="divide-y divide-dark-border">
                    {sq.members.map((m) => (
                      <div key={m.userId} className="px-4 py-3">
                        <AttendeeCard
                          name={m.name} username={m.username} profileImage={m.profileImage}
                          gender={m.gender} age={m.age} phone={m.phone} connectedSocials={m.connectedSocials}
                          city={m.city} cliquescore={m.cliquescore} requestStatus={m.requestStatus}
                          entryType={getEntryType(m.gender, sq.name, sq.members)}
                          squadName={sq.name}
                          right={
                            m.requestStatus === 'requested' && m.requestId ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApprove(m.requestId!)}
                                  disabled={approving === m.requestId}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-medium rounded-lg hover:bg-green-500/25 transition-colors disabled:opacity-50"
                                >
                                  <CheckCircle2 size={12} />
                                  {approving === m.requestId ? '…' : 'Accept'}
                                </button>
                                <button
                                  onClick={() => handleReject(m.requestId!)}
                                  disabled={rejecting === m.requestId}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                >
                                  <XCircle size={12} />
                                  {rejecting === m.requestId ? '…' : 'Decline'}
                                </button>
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

      {/* ── Individual pending requests (solo — not in any group) ── */}
      {soloRequests.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-white">Pending Requests</p>
            <Badge variant="yellow">{soloRequests.length}</Badge>
          </div>
          <div className="space-y-2">
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
                    <button
                      onClick={() => handleApprove(r._id)}
                      disabled={approving === r._id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-medium rounded-lg hover:bg-green-500/25 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 size={12} />
                      {approving === r._id ? '…' : 'Accept'}
                    </button>
                    <button
                      onClick={() => handleReject(r._id)}
                      disabled={rejecting === r._id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={12} />
                      {rejecting === r._id ? '…' : 'Decline'}
                    </button>
                  </div>
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Approved groups on the list ── */}
      {approvedGroups.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-white">Groups on the List</p>
            <Badge variant="green">{approvedGroups.length}</Badge>
          </div>
          <div className="space-y-3">
            {approvedGroups.map((sq) => {
              const entryType = getEntryType(undefined, sq.name, sq.members);
              return (
                <div key={sq._id.toString()} className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-semibold">{sq.name}</p>
                        <EntryTypeBadge type={entryType} />
                      </div>
                      <p className="text-xs text-muted">{sq.members.length} members</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {sq.groupPass && (
                        <span className="flex items-center gap-1 text-xs text-lime-400 bg-lime-400/10 border border-lime-400/20 px-2 py-1 rounded-full">
                          <QrCode size={10} />
                          Group pass issued
                        </span>
                      )}
                      <Badge variant={sq.groupPass ? 'green' : 'default'}>
                        {sq.groupPass ? 'Approved' : 'No pass yet'}
                      </Badge>
                    </div>
                  </div>
                  <div className="divide-y divide-dark-border">
                    {sq.members.map((m) => (
                      <div key={m.userId} className="px-4 py-3">
                        <AttendeeCard
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

      {/* ── Individual confirmed guests ── */}
      {bookings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-white">On the List</p>
              <p className="text-xs text-muted mt-0.5">
                <span className="text-green-400 font-medium">{enteredCount}</span> entered ·{' '}
                <span className="text-zinc-400 font-medium">{bookings.length - enteredCount}</span> awaiting
              </p>
            </div>
            {/* CSV Export */}
            <button
              onClick={() => exportGuestsCSV(bookings, squads, eventTitle)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-medium rounded-lg hover:bg-zinc-700 hover:text-white transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export CSV
            </button>
          </div>
          <div className="space-y-2">
            {bookings.map((b) => {
              const entered  = b.status === 'checked_in';
              const sq       = squadByUserId.get(b.userId?._id ?? '');
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
                    <div className="flex items-center gap-2">
                      <BookingStatusBadge status={b.status} />
                      {(b.status === 'confirmed' || b.status === 'checked_in') && (
                        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${entered ? 'bg-green-500/15 text-green-400' : 'bg-zinc-700/50 text-zinc-400'}`}>
                          {entered ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                          {entered ? 'In' : 'Awaiting'}
                        </span>
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

function BookingStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'green' | 'yellow' | 'blue' | 'red' | 'default' }> = {
    confirmed: { label: 'Confirmed', variant: 'green' },
    checked_in: { label: 'Checked In', variant: 'blue' },
    payment_pending: { label: 'Payment Pending', variant: 'yellow' },
    cancelled: { label: 'Cancelled', variant: 'red' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'default' };
  return <Badge variant={variant}>{label}</Badge>;
}

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
    try {
      await api.delete(`/events/${event._id}/co-hosts/${userId}`);
      await onRefresh();
    } catch { /* ignore */ }
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
    try {
      await api.delete(`/events/${event._id}/scanners/${userId}`);
      await onRefresh();
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <TeamSection
        title="Co-hosts"
        description="Co-hosts can help manage the event and see guest details."
        icon={<UserCheck size={18} className="text-primary-light" />}
        members={event.coHosts ?? []}
        username={coHostUsername}
        onUsernameChange={setCoHostUsername}
        onAdd={handleAddCoHost}
        onRemove={handleRemoveCoHost}
        adding={addingCoHost}
        error={errorCoHost}
        placeholder="Enter co-host username"
      />

      <TeamSection
        title="Scanners"
        description="Scanners can check guests in at the door using QR code scanning."
        icon={<QrCode size={18} className="text-blue-400" />}
        members={event.scanners ?? []}
        username={scannerUsername}
        onUsernameChange={setScannerUsername}
        onAdd={handleAddScanner}
        onRemove={handleRemoveScanner}
        adding={addingScanner}
        error={errorScanner}
        placeholder="Enter scanner username"
      />
    </div>
  );
}

function TeamSection({
  title, description, icon, members, username, onUsernameChange,
  onAdd, onRemove, adding, error, placeholder,
}: {
  title: string; description: string; icon: React.ReactNode;
  members: EventMember[]; username: string;
  onUsernameChange: (v: string) => void;
  onAdd: (e: React.FormEvent) => void;
  onRemove: (userId: string) => void;
  adding: boolean; error: string; placeholder: string;
}) {
  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">{icon}</div>
        <div>
          <h3 className="text-white font-semibold text-sm">{title}</h3>
          <p className="text-xs text-muted mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>

      <form onSubmit={onAdd} className="flex gap-2 mb-4">
        <div className="flex-1">
          <Input
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            placeholder={placeholder}
            className="text-sm"
          />
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
        <Button type="submit" loading={adding} size="sm" className="shrink-0">
          <UserPlus size={14} />
          Add
        </Button>
      </form>

      {members.length === 0 ? (
        <p className="text-xs text-muted text-center py-3">No {title.toLowerCase()} added yet.</p>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between bg-dark border border-dark-border rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary-light">
                  {m.username?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">@{m.username}</p>
                  <p className="text-xs text-muted">Added {new Date(m.addedAt).toLocaleDateString()}</p>
                </div>
              </div>
              <button onClick={() => onRemove(m.userId)} className="p-1.5 text-muted hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScannerTab({ event }: { event: Event }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const processingRef = useRef(false);

  const [active, setActive] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    guest?: { name: string; username: string };
  } | null>(null);

  const handleDecode = useCallback(async (qrToken: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setVerifying(true);
    setScanResult(null);
    try {
      const { data } = await api.post('/passes/scan', { qrToken: qrToken.trim(), eventId: event._id });
      setScanResult({ success: true, message: data.message ?? 'Entry Approved', guest: data.data?.guest });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setScanResult({ success: false, message: e.response?.data?.message ?? 'Invalid pass' });
    } finally {
      setVerifying(false);
      setTimeout(() => { processingRef.current = false; }, 3000);
    }
  }, [event._id]);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) { rafRef.current = requestAnimationFrame(tick); return; }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // jsQR is imported statically at the top — no dynamic import per frame.
    // 'attemptBoth' handles both normal and inverted QR codes (dark-on-light and light-on-dark).
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
    if (code?.data && !processingRef.current) handleDecode(code.data);

    rafRef.current = requestAnimationFrame(tick);
  }, [handleDecode]);

  const startScanner = useCallback(async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setCameraError('Camera access denied. Please allow camera permissions and try again.');
    }
  }, [tick]);

  const stopScanner = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
    setScanResult(null);
    processingRef.current = false;
  }, []);

  useEffect(() => { return () => { stopScanner(); }; }, [stopScanner]);

  return (
    <div className="space-y-4">
      <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
        {/* Camera viewport */}
        <div className="relative bg-black">
          <video
            ref={videoRef}
            className={`w-full ${active ? 'block' : 'hidden'}`}
            muted
            playsInline
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scan target overlay */}
          {active && (
            <>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-56 border-2 border-white/60 rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary-light rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary-light rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary-light rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary-light rounded-br-lg" />
                </div>
              </div>
              <div className="absolute top-3 right-3">
                <button
                  onClick={stopScanner}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-black/70 border border-white/20 text-white text-xs rounded-full hover:bg-black/90 transition-colors"
                >
                  <CameraOff size={13} />
                  Stop
                </button>
              </div>
            </>
          )}

          {!active && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center">
                <Camera size={28} className="text-primary-light" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold">Camera Scanner</p>
                <p className="text-xs text-muted mt-1">Point the camera at a guest's QR pass</p>
                {cameraError && <p className="text-xs text-red-400 mt-2 max-w-xs">{cameraError}</p>}
              </div>
              <Button onClick={startScanner}>
                <Camera size={16} />
                Start Camera
              </Button>
            </div>
          )}
        </div>

        {/* Result banner */}
        {(verifying || scanResult) && (
          <div className={`px-5 py-4 flex items-start gap-3 ${
            verifying ? 'bg-primary/10 border-t border-primary/20' :
            scanResult?.success ? 'bg-green-500/10 border-t border-green-500/20' :
            'bg-red-500/10 border-t border-red-500/20'
          }`}>
            {verifying ? (
              <Spinner className="h-5 w-5 shrink-0 mt-0.5" />
            ) : scanResult?.success ? (
              <CheckCircle2 size={20} className="text-green-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`font-semibold text-sm ${
                verifying ? 'text-primary-light' :
                scanResult?.success ? 'text-green-400' : 'text-red-400'
              }`}>
                {verifying ? 'Verifying pass…' : scanResult?.message}
              </p>
              {scanResult?.guest && (
                <p className="text-xs text-zinc-300 mt-0.5">
                  {scanResult.guest.name} · @{scanResult.guest.username}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {(event.scanners?.length ?? 0) > 0 && (
        <div className="bg-dark-card border border-dark-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Shield size={14} className="text-primary-light" />
            Authorised Scanners
          </h3>
          <div className="flex flex-wrap gap-2">
            {event.scanners?.map((s) => (
              <div key={s.userId} className="flex items-center gap-2 px-3 py-1.5 bg-dark border border-dark-border rounded-full">
                <div className="w-4 h-4 rounded-full bg-primary/30 flex items-center justify-center text-[10px] font-bold text-primary-light">
                  {s.username?.[0]?.toUpperCase()}
                </div>
                <span className="text-xs text-white">@{s.username}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
