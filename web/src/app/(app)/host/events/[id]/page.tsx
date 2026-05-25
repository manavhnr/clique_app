'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { Event, EventMember } from '@/types';
import { formatDate, formatTime, formatPrice, getImageUrl } from '@/lib/utils';
import api from '@/lib/api';

interface Booking {
  _id: string;
  userId: { _id: string; name: string; username: string; profileImage?: string };
  status: string;
  amount: number;
  createdAt: string;
}

export default function HostEventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'guests' | 'team' | 'scanner'>('overview');

  useEffect(() => {
    Promise.all([
      api.get(`/events/${id}`),
      api.get(`/bookings/my`).catch(() => ({ data: { data: { bookings: [] } } })),
    ]).then(([evtRes]) => {
      setEvent(evtRes.data.data.event);
    }).catch(() => {})
    .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (activeTab === 'guests') {
      api.get(`/bookings/event/${id}`)
        .then((res) => { if (res?.data?.data?.bookings) setBookings(res.data.data.bookings); })
        .catch(() => {});
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
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-1 justify-center ${activeTab === key ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab event={event} onRefresh={refreshEvent} />}
      {activeTab === 'guests' && <GuestsTab eventId={id} bookings={bookings} />}
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
            { label: 'Privacy', value: event.privacy === 'private' ? '🔒 Private' : '🌐 Public' },
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
  const [cancelling, setCancelling] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await api.patch(`/events/${event._id}/cancel`);
      onRefresh();
      setCancelOpen(false);
    } catch { /* ignore */ }
    finally { setCancelling(false); }
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

      {event.status !== 'cancelled' && (
        <div className="pt-2">
          <Button variant="danger" className="w-full" onClick={() => setCancelOpen(true)}>
            <XCircle size={16} />
            Cancel Event
          </Button>
        </div>
      )}

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
    </div>
  );
}

function GuestsTab({ eventId, bookings }: { eventId: string; bookings: Booking[] }) {
  if (bookings.length === 0) {
    return (
      <div className="text-center py-12 bg-dark-card border border-dark-border rounded-xl">
        <Users size={32} className="text-muted mx-auto mb-3" />
        <p className="text-white font-semibold mb-1">No bookings yet</p>
        <p className="text-sm text-muted">Guest list will appear here as people book.</p>
      </div>
    );
  }

  const enteredCount = bookings.filter((b) => b.status === 'checked_in').length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted">{bookings.length} bookings</p>
        <p className="text-sm text-muted">
          <span className="text-green-400 font-medium">{enteredCount}</span> entered
          {' · '}
          <span className="text-zinc-400 font-medium">{bookings.length - enteredCount}</span> awaiting
        </p>
      </div>
      {bookings.map((b) => {
        const entered = b.status === 'checked_in';
        return (
          <div key={b._id} className="flex items-center gap-3 bg-dark-card border border-dark-border rounded-xl p-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary-light shrink-0">
              {b.userId?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{b.userId?.name ?? 'User'}</p>
              <p className="text-xs text-muted">@{b.userId?.username ?? '—'}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <BookingStatusBadge status={b.status} />
              {(b.status === 'confirmed' || b.status === 'checked_in') && (
                <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  entered
                    ? 'bg-green-500/15 text-green-400'
                    : 'bg-zinc-700/50 text-zinc-400'
                }`}>
                  {entered ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                  {entered ? 'Entered' : 'Not entered'}
                </span>
              )}
            </div>
          </div>
        );
      })}
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

    import('jsqr').then(({ default: jsQR }) => {
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
      if (code?.data) handleDecode(code.data);
    });

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
