'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Event, Squad, JoinRequest } from '@/types';
import { formatDate, formatTime, getImageUrl, categoryLabel } from '@/lib/utils';
import { catColor } from '@/lib/theme';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

function Spinner({ size = 32 }: { size?: number }) {
  return <div style={{ width: size, height: size, border: '2px solid var(--line-2)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

// ─── Squad section ────────────────────────────────────────────────────────────

function SquadSection({ eventId, userId }: { eventId: string; userId: string }) {
  const [squad, setSquad]           = useState<Squad | null>(null);
  const [pendingInvite, setPendingInvite] = useState<Squad | null>(null);
  const [loading, setLoading]       = useState(true);
  const [squadName, setSquadName]   = useState('');
  const [inviteHandle, setInviteHandle] = useState('');
  const [creating, setCreating]     = useState(false);
  const [inviting, setInviting]     = useState(false);
  const [responding, setResponding] = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  const refresh = async () => {
    try {
      const { data } = await api.get(`/squads/event/${eventId}`);
      setSquad(data.data.squad || null);
      setPendingInvite(data.data.pendingInvite || null);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  const flash = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    setCreating(true);
    try {
      await api.post('/squads', { eventId, name: squadName.trim() || undefined });
      flash('Squad created!');
      await refresh();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Failed to create squad');
    } finally { setCreating(false); }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    setInviting(true);
    try {
      await api.post(`/squads/${squad!._id}/invite`, { username: inviteHandle.trim().replace(/^@/, '') });
      setInviteHandle('');
      flash('Invite sent!');
      await refresh();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Failed to send invite');
    } finally { setInviting(false); }
  };

  const handleRespond = async (accept: boolean) => {
    if (!pendingInvite) return;
    setResponding(true); setError('');
    try {
      await api.patch(`/squads/${pendingInvite._id}/respond`, { accept });
      flash(accept ? 'Joined squad!' : 'Invite declined');
      await refresh();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Failed');
    } finally { setResponding(false); }
  };

  const handleLeave = async () => {
    if (!squad) return;
    setError('');
    try {
      await api.delete(`/squads/${squad._id}/leave`);
      flash('Left squad');
      await refresh();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Failed');
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner size={20} /></div>;

  const btn = (variant: 'primary' | 'secondary' | 'danger' = 'primary'): React.CSSProperties => ({
    padding: '10px 16px', borderRadius: 6, fontFamily: 'var(--mono)', fontSize: 11,
    letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', border: '1px solid',
    background: variant === 'primary' ? 'var(--lime)' : variant === 'danger' ? 'rgba(255,61,110,0.12)' : 'transparent',
    color: variant === 'primary' ? 'var(--ink)' : variant === 'danger' ? 'var(--hot)' : 'var(--cream)',
    borderColor: variant === 'primary' ? 'var(--lime)' : variant === 'danger' ? 'rgba(255,61,110,0.4)' : 'var(--line-2)',
  });

  return (
    <div style={{ border: '1px solid var(--line-2)', borderRadius: 10, padding: 20, marginTop: 8, background: 'var(--card)' }}>
      <div className="clique-label" style={{ marginBottom: 14 }}>YOUR SQUAD</div>

      {error  && <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--hot)', marginBottom: 12 }}>{error}</div>}
      {success && <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--lime)', marginBottom: 12 }}>{success}</div>}

      {!squad && pendingInvite && (
        <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: 16, marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
            Invite to join <span style={{ color: 'var(--lime)' }}>{pendingInvite.name}</span>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--cream)', marginBottom: 14 }}>
            {pendingInvite.members.length} member{pendingInvite.members.length !== 1 ? 's' : ''} · {pendingInvite.members.map((m) => '@' + m.username).join(', ')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => handleRespond(true)} disabled={responding} style={btn('primary')}>Accept</button>
            <button onClick={() => handleRespond(false)} disabled={responding} style={btn('secondary')}>Decline</button>
          </div>
        </div>
      )}

      {squad && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20 }}>{squad.name}</div>
            <button onClick={handleLeave} style={btn('danger')}>
              {squad.creatorId === userId ? 'Disband' : 'Leave'}
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {squad.members.map((m) => (
              <span key={m.userId} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px solid var(--line-2)', borderRadius: 20, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--cream)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--lime)', display: 'inline-block' }} />
                @{m.username}
                {m.userId === userId && <span style={{ color: 'var(--dim)' }}> · you</span>}
              </span>
            ))}
            {squad.invites.filter((i) => i.status === 'pending').map((i) => (
              <span key={i.userId} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px dashed var(--line-2)', borderRadius: 20, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)' }}>
                pending invite
              </span>
            ))}
          </div>
          <form onSubmit={handleInvite} style={{ display: 'flex', gap: 8 }}>
            <input
              className="clique-input"
              style={{ flex: 1, padding: '10px 14px', fontSize: 14, borderRadius: 6 }}
              placeholder="@username to invite"
              value={inviteHandle}
              onChange={(e) => setInviteHandle(e.target.value)}
            />
            <button type="submit" disabled={inviting || !inviteHandle.trim()} style={{ ...btn('primary'), opacity: inviting || !inviteHandle.trim() ? 0.5 : 1 }}>
              {inviting ? '…' : 'Invite'}
            </button>
          </form>
        </>
      )}

      {!squad && !pendingInvite && (
        <div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 14, color: 'var(--cream)', marginBottom: 16, lineHeight: 1.5 }}>
            Coming with friends? Create a squad so the host knows who you&apos;re rolling with.
          </div>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8 }}>
            <input
              className="clique-input"
              style={{ flex: 1, padding: '10px 14px', fontSize: 14, borderRadius: 6 }}
              placeholder="Squad name (optional)"
              value={squadName}
              onChange={(e) => setSquadName(e.target.value)}
            />
            <button type="submit" disabled={creating} style={{ ...btn('primary'), opacity: creating ? 0.6 : 1 }}>
              {creating ? '…' : 'Create'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const { id }     = useParams<{ id: string }>();
  const router     = useRouter();
  const { user }   = useAuth();
  const isMobile   = useIsMobile();

  const [event, setEvent]           = useState<Event | null>(null);
  const [loading, setLoading]       = useState(true);
  const [regLoading, setRegLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError]           = useState('');
  const [requestMsg, setRequestMsg] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bookLoading, setBookLoading] = useState(false);
  const [upiModal, setUpiModal] = useState<{ bookingId: string; amount: number } | null>(null);
  const [utr, setUtr] = useState('');
  const [upiId, setUpiId] = useState('');
  const [upiSubmitting, setUpiSubmitting] = useState(false);
  const [selectedGroupIdx, setSelectedGroupIdx] = useState<number | null>(null);

  useEffect(() => {
    api.get(`/events/${id}`)
      .then(({ data }) => setEvent(data.data.event))
      .catch(() => setEvent(null))
      .finally(() => setLoading(false));
  }, [id]);

  const refreshEvent = () =>
    api.get(`/events/${id}`).then(({ data }) => setEvent(data.data.event)).catch(() => {});

  const host         = event ? (typeof event.hostId === 'object' ? event.hostId as import('@/types').User : null) : null;
  const isOwnEvent   = host?._id === user?._id;
  const isFull       = event ? event.bookedCount >= event.capacity : false;
  const spotsLeft    = event ? event.capacity - event.bookedCount : 0;
  const filled       = event ? Math.min(100, (event.bookedCount / event.capacity) * 100) : 0;
  const ev           = event as unknown as { activeTier?: { label: string; commonPrice: number; malePrice: number; femalePrice: number; capacity?: number; soldCount: number } | null; pricingTiers?: { label: string; commonPrice: number; malePrice: number; femalePrice: number; capacity?: number; soldCount: number; isOpen: boolean }[]; pricingMode?: string; groupPricing?: { label: string; size: number; price: number }[]; userDiscount?: { discountType: 'percentage' | 'absolute'; discountValue: number } | null };
  const activeTier   = ev?.activeTier ?? null;
  const allTiers     = ev?.pricingTiers ?? [];
  const pricingMode  = ev?.pricingMode ?? 'common';
  const groupPricing = ev?.groupPricing ?? [];
  const selectedGroup = selectedGroupIdx !== null ? (groupPricing[selectedGroupIdx] ?? null) : null;
  const hasPhases    = allTiers.length > 0;
  const ticketsAvailable = !hasPhases || !!activeTier;
  const userDiscount = ev?.userDiscount ?? null;

  const userRequest  = event?.userRequest as JoinRequest | null;
  const userBooking  = event?.userBooking as any;

  const isPending           = userRequest?.status === 'requested';
  const requestApproved     = userRequest?.status === 'approved';
  const isRejected          = userRequest?.status === 'rejected';
  const bookingConfirmed    = !!(userBooking && ['confirmed', 'checked_in'].includes(userBooking.status));
  const needsBookingAfterApproval = requestApproved && !userBooking;
  const isApproved          = bookingConfirmed;
  const isRegistered        = !!(isPending || requestApproved || bookingConfirmed);
  const paymentPending      = !!(userBooking?.status === 'payment_pending');
  const paymentUnderReview  = !!(userBooking?.status === 'utr_submitted');

  const basePrice = (() => {
    if (!event) return 0;
    if (selectedGroup) return selectedGroup.price;
    if (activeTier) {
      if (pricingMode === 'split') {
        if (user?.gender === 'male') return activeTier.malePrice;
        if (user?.gender === 'female') return activeTier.femalePrice;
      }
      return activeTier.commonPrice;
    }
    return event.price;
  })();
  const effectivePrice = userDiscount
    ? userDiscount.discountType === 'percentage'
      ? Math.max(0, Math.round(basePrice * (1 - userDiscount.discountValue / 100)))
      : Math.max(0, basePrice - userDiscount.discountValue)
    : basePrice;
  const applyDiscountToPrice = (price: number): number => {
    if (!userDiscount || price === 0) return price;
    return userDiscount.discountType === 'percentage'
      ? Math.max(0, Math.round(price * (1 - userDiscount.discountValue / 100)))
      : Math.max(0, price - userDiscount.discountValue);
  };

  const missingSocials = (event?.requiresSocials && (event?.requiredSocials?.length ?? 0) > 0)
    ? (event.requiredSocials ?? []).filter((s) => !user?.connectedSocials?.[s as keyof typeof user.connectedSocials])
    : [];
  const socialGated = missingSocials.length > 0;

  const handleRegister = async () => {
    setError(''); setRegLoading(true);
    try {
      await api.post('/requests', { eventId: id, message: requestMsg || undefined });
      setConfirmOpen(false);
      await refreshEvent();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Registration failed');
    } finally { setRegLoading(false); }
  };

  const handleSave = async () => {
    if (!event) return;
    setSaveLoading(true);
    try {
      if (event.saved) await api.delete(`/events/${id}/save`);
      else await api.post(`/events/${id}/save`);
      setEvent({ ...event, saved: !event.saved });
    } catch { /* ignore */ }
    finally { setSaveLoading(false); }
  };

  const handleBook = async () => {
    if (!event) return;
    setError(''); setBookLoading(true);
    try {
      const payload: Record<string, unknown> = { eventId: id };
      if (selectedGroupIdx !== null) payload.groupPricingIndex = selectedGroupIdx;
      const { data: bookRes } = await api.post('/bookings', payload);
      const createdBooking = bookRes.data?.booking;
      if (createdBooking?.amount > 0 && createdBooking?.status === 'payment_pending') {
        setUtr('');
        setUpiId('');
        setUpiModal({ bookingId: createdBooking._id, amount: createdBooking.amount });
      } else {
        await refreshEvent();
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      const status = (e as { response?: { status?: number } }).response?.status;
      if (status === 409) {
        await refreshEvent();
      } else {
        setError(e.response?.data?.message ?? 'Booking failed');
      }
    } finally { setBookLoading(false); }
  };

  const handleCompletePayment = () => {
    if (!userBooking || !event) return;
    setUtr('');
    setUpiId('');
    setUpiModal({ bookingId: userBooking._id, amount: userBooking.amount });
  };

  const handleUPISubmit = async () => {
    if (!upiModal) return;
    if (!utr.trim() && !upiId.trim()) { setError('Enter your UTR number or the UPI ID you paid from.'); return; }
    setError(''); setUpiSubmitting(true);
    try {
      await api.post('/payments/upi-submit', {
        bookingId: upiModal.bookingId,
        utrNumber: utr.trim() || undefined,
        upiId: upiId.trim() || undefined,
      });
      setUpiModal(null);
      await refreshEvent();
    } catch (err: unknown) {
      const e = err as { code?: string; response?: { status?: number; data?: { message?: string } } };
      if (e.response?.status === 409) {
        setUpiModal(null);
        await refreshEvent();
      } else {
        const msg = e.response?.data?.message ?? 'Submission failed. Please try again.';
        if (msg === 'Booking does not require payment') {
          setUpiModal(null);
          await refreshEvent();
        } else {
          setError(msg);
        }
      }
    } finally { setUpiSubmitting(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '96px 0' }}>
      <Spinner />
    </div>
  );

  if (!event) return (
    <div style={{ padding: '72px 8px', maxWidth: 480 }}>
      <div className="clique-label" style={{ marginBottom: 14 }}>Event not found</div>
      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em', marginBottom: 8 }}>This event doesn&apos;t exist.</div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 15, color: 'var(--cream)', marginBottom: 24, lineHeight: 1.5 }}>The link might be expired, or the host pulled it.</div>
      <button onClick={() => router.back()} style={{ background: 'transparent', color: 'var(--paper)', border: '1px solid var(--line-2)', padding: '12px 18px', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}>← Go back</button>
    </div>
  );

  const imageUrl = event.images?.[0] ? getImageUrl(event.images[0]) : null;
  const artColor = catColor(event.category);
  const SOCIAL_LABELS: Record<string, string> = { instagram: 'Instagram', twitter: 'Twitter/X', snapchat: 'Snapchat', facebook: 'Facebook', linkedin: 'LinkedIn' };

  // CTA label helper
  const ctaLabel = () => {
    if (isFull) return 'Sold out';
    if (bookLoading) return '…';
    if (effectivePrice === 0) return 'Get free pass';
    if (selectedGroup) return `Book group · ₹${effectivePrice.toLocaleString('en-IN')}`;
    return `Book tickets · ₹${effectivePrice.toLocaleString('en-IN')}`;
  };

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', width: '100%' }}>
      {/* Back */}
      <Link href="/events" style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', color: 'var(--dim)', textTransform: 'uppercase', display: 'inline-block', marginBottom: 20 }}>
        ← Events
      </Link>

      {/* Hero image */}
      {imageUrl && (
        <div style={{ width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 28, background: 'var(--card)', aspectRatio: '16/7', position: 'relative' }}>
          <img
            src={imageUrl}
            alt={event.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {/* Status overlays on image */}
          {(event.status === 'cancelled' || isFull) && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--hot)', border: '1.5px solid var(--hot)', padding: '8px 16px', borderRadius: 4 }}>
                {event.status === 'cancelled' ? 'Cancelled' : 'Sold out'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Event header */}
      <div style={{ marginBottom: 28 }}>
        {/* Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: artColor, background: `${artColor}18`, padding: '4px 10px', borderRadius: 20 }}>
            {categoryLabel(event.category)}
          </span>
          {event.privacy === 'private' && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--dim)', border: '1px solid var(--line-2)', padding: '4px 10px', borderRadius: 20 }}>Private</span>
          )}
          {event.privacy === 'secret' && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--dim)', border: '1px solid var(--line-2)', padding: '4px 10px', borderRadius: 20 }}>Secret</span>
          )}
        </div>

        {/* Title + save */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <h1 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 'clamp(26px, 3.8vw, 48px)', lineHeight: 1.1, letterSpacing: '-0.025em', margin: 0, flex: 1, minWidth: 0 }}>
            {event.title}
          </h1>
          <button
            onClick={handleSave}
            disabled={saveLoading}
            style={{ flexShrink: 0, background: event.saved ? 'rgba(201,243,110,0.12)' : 'transparent', border: `1px solid ${event.saved ? 'var(--lime)' : 'var(--line-2)'}`, color: event.saved ? 'var(--lime)' : 'var(--cream)', padding: '8px 14px', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s ease' }}
          >
            {event.saved ? '★ Saved' : '☆ Save'}
          </button>
        </div>

        {/* Host + co-hosts */}
        {host && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 32, height: 32, borderRadius: '50%', background: artColor, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 13, color: 'var(--ink)', flexShrink: 0 }}>
                {host.name?.[0]?.toUpperCase()}
              </span>
              <div>
                <span style={{ fontFamily: 'var(--display)', fontSize: 14, fontWeight: 600 }}>{host.name}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '.06em', marginLeft: 8 }}>@{host.username}</span>
              </div>
            </div>
            {(event.coHosts ?? []).length > 0 && (
              <>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--line-2)', letterSpacing: '.1em' }}>+</span>
                {(event.coHosts ?? []).map((ch) => (
                  <div key={ch.userId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--card)', border: '1px solid var(--line-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--cream)', flexShrink: 0 }}>
                      {ch.username?.[0]?.toUpperCase()}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '.06em' }}>@{ch.username}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Meta strip */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 12 : 24, marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--line-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 14, fontWeight: 600 }}>{formatDate(event.date)}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.1em', marginTop: 1 }}>DATE</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 14, fontWeight: 600 }}>{formatTime(event.startTime)} – {formatTime(event.endTime)}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.1em', marginTop: 1 }}>TIME</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 14, fontWeight: 600 }}>{event.locationName}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.1em', marginTop: 1 }}>
                {event.exactAddressHiddenBeforeBooking ? 'Address after booking' : (event.address || 'VENUE')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.6fr 1fr', gap: isMobile ? 32 : 40, alignItems: 'start' }}>

        {/* Left: content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* About */}
          {event.description && (
            <div>
              <div className="clique-label" style={{ marginBottom: 12 }}>About</div>
              <p style={{ fontFamily: 'var(--display)', fontSize: 16, lineHeight: 1.65, color: 'var(--cream)', margin: 0, maxWidth: '64ch' }}>{event.description}</p>
            </div>
          )}

          {/* Tags */}
          {(event.vibeTags?.length > 0 || event.musicTags?.length > 0) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {event.musicTags?.map((tag) => (
                <span key={tag} style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--sky)', background: 'rgba(125,180,255,0.1)', padding: '5px 12px', borderRadius: 20 }}>
                  {tag}
                </span>
              ))}
              {event.vibeTags?.map((tag) => (
                <span key={tag} style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--dim)', border: '1px solid var(--line-2)', padding: '5px 12px', borderRadius: 20 }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Group pricing */}
          {groupPricing.length > 0 && (
            <div>
              <div className="clique-label" style={{ marginBottom: 12 }}>Group offers</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {groupPricing.map((g, i) => {
                  const isSelected = selectedGroupIdx === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedGroupIdx(isSelected ? null : i)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', border: `1px solid ${isSelected ? 'var(--lime)' : 'var(--line-2)'}`, borderRadius: 10, background: isSelected ? 'rgba(201,243,110,0.07)' : 'var(--card)', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all .15s ease' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {isSelected && <span style={{ color: 'var(--lime)', fontSize: 12 }}>✓</span>}
                        <div>
                          <span style={{ fontFamily: 'var(--display)', fontSize: 15, fontWeight: 600, color: isSelected ? 'var(--lime)' : 'var(--paper)' }}>{g.label || `Group of ${g.size}`}</span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.1em', marginLeft: 10 }}>{g.size} people</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                        {userDiscount && g.price > 0 && (
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', textDecoration: 'line-through' }}>₹{g.price.toLocaleString('en-IN')}</span>
                        )}
                        <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 17, color: 'var(--lime)' }}>
                          ₹{applyDiscountToPrice(g.price).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedGroupIdx !== null && (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.08em', marginTop: 8 }}>
                  Group offer selected · tap again to switch back to individual
                </div>
              )}
            </div>
          )}

          {/* House rules */}
          {event.rules && (
            <div>
              <div className="clique-label" style={{ marginBottom: 12 }}>House rules</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {event.rules.split(/\n|•|-/).map((r) => r.trim()).filter(Boolean).map((rule, i) => (
                  <li key={i} style={{ fontFamily: 'var(--display)', fontSize: 15, lineHeight: 1.5, color: 'var(--cream)' }}>{rule}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Refund policy */}
          {event.refundPolicy && (
            <div>
              <div className="clique-label" style={{ marginBottom: 8 }}>Refund policy</div>
              <p style={{ fontFamily: 'var(--display)', fontSize: 14, lineHeight: 1.6, color: 'var(--dim)', margin: 0, maxWidth: '62ch' }}>{event.refundPolicy}</p>
            </div>
          )}

          {/* Squad */}
          {user && !isOwnEvent && (
            <SquadSection eventId={id} userId={user._id} />
          )}
        </div>

        {/* Right: booking card */}
        <aside style={{ position: isMobile ? 'static' : 'sticky', top: 36 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line-2)', borderRadius: 14, overflow: 'hidden' }}>

            {/* Price header */}
            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--line-2)' }}>
              {/* Phase pills */}
              {allTiers.length > 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                  {allTiers.map((t, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: t.isOpen ? 'rgba(201,243,110,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${t.isOpen ? 'rgba(201,243,110,0.25)' : 'var(--line-2)'}`, opacity: t.isOpen ? 1 : 0.5 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.1em', color: t.isOpen ? 'var(--lime)' : 'var(--dim)', textTransform: 'uppercase' }}>
                        {t.label}{!t.isOpen && ' · Closed'}
                      </span>
                      {pricingMode === 'split' ? (
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--cream)', letterSpacing: '.06em' }}>
                          ♂ ₹{t.malePrice} · ♀ ₹{t.femalePrice}
                        </span>
                      ) : (
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--cream)' }}>₹{t.commonPrice}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Price display */}
              {!selectedGroup && pricingMode === 'split' && activeTier ? (
                <div style={{ display: 'flex', gap: 20 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.1em', marginBottom: 4 }}>MALE</div>
                    {userDiscount && activeTier.malePrice > 0 && (
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', textDecoration: 'line-through' }}>₹{activeTier.malePrice.toLocaleString('en-IN')}</div>
                    )}
                    <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22 }}>
                      {activeTier.malePrice === 0 ? 'Free' : `₹${applyDiscountToPrice(activeTier.malePrice).toLocaleString('en-IN')}`}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.1em', marginBottom: 4 }}>FEMALE</div>
                    {userDiscount && activeTier.femalePrice > 0 && (
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', textDecoration: 'line-through' }}>₹{activeTier.femalePrice.toLocaleString('en-IN')}</div>
                    )}
                    <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22 }}>
                      {activeTier.femalePrice === 0 ? 'Free' : `₹${applyDiscountToPrice(activeTier.femalePrice).toLocaleString('en-IN')}`}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.1em', marginBottom: 6 }}>
                    {selectedGroup ? `GROUP · ${selectedGroup.size} PEOPLE` : (activeTier ? activeTier.label.toUpperCase() : 'PRICE')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    {userDiscount && basePrice > 0 && (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--dim)', textDecoration: 'line-through' }}>
                        ₹{basePrice.toLocaleString('en-IN')}
                      </span>
                    )}
                    <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em', color: userDiscount ? 'var(--lime)' : 'var(--paper)' }}>
                      {effectivePrice === 0 ? 'Free' : `₹${effectivePrice.toLocaleString('en-IN')}`}
                    </span>
                  </div>
                  {userDiscount && (
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--lime)', letterSpacing: '.1em', marginTop: 4 }}>
                      {userDiscount.discountType === 'percentage' ? `${userDiscount.discountValue}% off` : `₹${userDiscount.discountValue} off`} · your price
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* CTA area */}
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {event.status === 'cancelled' ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.14em', color: 'var(--hot)' }}>EVENT CANCELLED</span>
                </div>
              ) : isOwnEvent ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.12em', color: 'var(--lime)' }}>★ YOU&apos;RE HOSTING THIS</span>
                </div>
              ) : isApproved ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0 4px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--lime)', display: 'inline-block' }} />
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.12em', color: 'var(--lime)' }}>YOU&apos;RE ON THE LIST</span>
                  </div>
                  <button onClick={() => router.push('/passes')} style={{ width: '100%', background: 'var(--lime)', color: 'var(--ink)', border: 'none', padding: '15px', borderRadius: 10, fontFamily: 'var(--display)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                    View QR pass →
                  </button>
                </>
              ) : isPending ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', padding: '12px 0' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.12em', color: 'var(--gold)' }}>REQUEST SENT</span>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 13, color: 'var(--dim)', textAlign: 'center', lineHeight: 1.4 }}>
                    You&apos;ll get notified when the host responds.
                  </div>
                </div>
              ) : needsBookingAfterApproval ? (
                <>
                  <div style={{ background: 'rgba(201,243,110,0.08)', border: '1px solid rgba(201,243,110,0.25)', borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--lime)', letterSpacing: '.1em' }}>
                    ✓ Request approved — complete booking
                  </div>
                  <button onClick={handleBook} disabled={isFull || bookLoading} style={{ width: '100%', background: 'var(--lime)', color: 'var(--ink)', border: 'none', padding: '15px', borderRadius: 10, fontFamily: 'var(--display)', fontSize: 15, fontWeight: 700, cursor: (isFull || bookLoading) ? 'not-allowed' : 'pointer', opacity: (isFull || bookLoading) ? 0.45 : 1 }}>
                    {bookLoading ? '…' : event.price === 0 ? 'Get free pass' : 'Book & pay'}
                  </button>
                </>
              ) : isRejected ? (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--hot)', letterSpacing: '.12em', marginBottom: 8 }}>REQUEST DECLINED</div>
                  {userRequest?.rejectionReason && <div style={{ fontFamily: 'var(--display)', fontSize: 13, color: 'var(--cream)', lineHeight: 1.4 }}>{userRequest.rejectionReason}</div>}
                </div>
              ) : socialGated ? (
                <>
                  <div style={{ background: 'rgba(255,61,110,0.08)', border: '1px solid rgba(255,61,110,0.25)', borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--hot)', letterSpacing: '.1em', marginBottom: 6 }}>SOCIAL ACCOUNT REQUIRED</div>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 13, color: 'var(--cream)', lineHeight: 1.4 }}>
                      Connect your {missingSocials.map((s) => SOCIAL_LABELS[s] ?? s).join(' and ')} to register.
                    </div>
                  </div>
                  <button onClick={() => router.push('/profile')} style={{ width: '100%', background: 'var(--lime)', color: 'var(--ink)', border: 'none', padding: '15px', borderRadius: 10, fontFamily: 'var(--display)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                    Connect socials →
                  </button>
                </>
              ) : paymentUnderReview ? (
                <>
                  <div style={{ background: 'rgba(232,196,110,0.08)', border: '1px solid rgba(232,196,110,0.25)', borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--gold)', letterSpacing: '.1em' }}>
                    ⏳ Payment proof under review
                  </div>
                  <button onClick={handleCompletePayment} style={{ width: '100%', background: 'transparent', color: 'var(--cream)', border: '1px solid var(--line-2)', padding: '13px', borderRadius: 10, fontFamily: 'var(--display)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    Resubmit proof →
                  </button>
                </>
              ) : paymentPending ? (
                <button onClick={handleCompletePayment} disabled={bookLoading} style={{ width: '100%', background: 'var(--lime)', color: 'var(--ink)', border: 'none', padding: '15px', borderRadius: 10, fontFamily: 'var(--display)', fontSize: 15, fontWeight: 700, cursor: bookLoading ? 'not-allowed' : 'pointer', opacity: bookLoading ? 0.6 : 1 }}>
                  {bookLoading ? '…' : 'Complete payment →'}
                </button>
              ) : !ticketsAvailable ? (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '.1em', marginBottom: 8 }}>NO TICKETS AVAILABLE</div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 13, color: 'var(--cream)', lineHeight: 1.4 }}>
                    The next phase hasn&apos;t opened yet.
                  </div>
                </div>
              ) : !event.approvalRequired ? (
                <button
                  onClick={handleBook}
                  disabled={isFull || bookLoading || event.status !== 'published'}
                  style={{ width: '100%', background: 'var(--lime)', color: 'var(--ink)', border: 'none', padding: '15px', borderRadius: 10, fontFamily: 'var(--display)', fontSize: 15, fontWeight: 700, cursor: (isFull || bookLoading || event.status !== 'published') ? 'not-allowed' : 'pointer', opacity: (isFull || bookLoading || event.status !== 'published') ? 0.45 : 1 }}
                >
                  {ctaLabel()}
                </button>
              ) : (
                <button
                  onClick={() => { setError(''); setConfirmOpen(true); }}
                  disabled={isFull || event.status !== 'published'}
                  style={{ width: '100%', background: 'var(--lime)', color: 'var(--ink)', border: 'none', padding: '15px', borderRadius: 10, fontFamily: 'var(--display)', fontSize: 15, fontWeight: 700, cursor: (isFull || event.status !== 'published') ? 'not-allowed' : 'pointer', opacity: (isFull || event.status !== 'published') ? 0.45 : 1 }}
                >
                  {isFull ? 'Sold out' : 'Request a spot'}
                </button>
              )}

              {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--hot)', letterSpacing: '.06em', textAlign: 'center', lineHeight: 1.5 }}>{error}</div>}

              {event.privacy === 'private' && (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.1em', textAlign: 'center', lineHeight: 1.6 }}>
                  Host reviews each request manually
                </div>
              )}
            </div>

            {/* No-image fallback: show image inside card at bottom */}
            {!imageUrl && (
              <div style={{ height: 3, background: `linear-gradient(to right, ${artColor}44, transparent)` }} />
            )}
          </div>
        </aside>
      </div>

      {/* UPI Payment modal */}
      {upiModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', padding: 20 }} onClick={() => setUpiModal(null)}>
          <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 14, width: '100%', maxWidth: 440, boxShadow: '0 40px 80px -20px rgba(0,0,0,0.8)', animation: 'riseIn .25s cubic-bezier(.4,1.4,.5,1) both' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #1E293B' }}>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20 }}>Pay via UPI</div>
              <button onClick={() => setUpiModal(null)} aria-label="Close" style={{ background: 'transparent', border: 'none', color: '#64748B', fontSize: 28, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ fontFamily: 'var(--display)', fontSize: 14, color: '#94A3B8', lineHeight: 1.5 }}>
                Scan the QR with any UPI app and pay{' '}
                <strong style={{ color: '#F59E0B', fontSize: 16 }}>₹{upiModal.amount}</strong>{' '}
                to Clique.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <img src="/upi-qr.png" alt="UPI QR Code" style={{ width: 220, height: 220, borderRadius: 10, background: '#fff', padding: 8, objectFit: 'contain' }} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#64748B', letterSpacing: '.1em' }}>SCAN & PAY ₹{upiModal.amount}</span>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#94A3B8', letterSpacing: '.12em', marginBottom: 8 }}>UTR NUMBER</div>
                <input className="clique-input" style={{ width: '100%', padding: '12px 14px', fontSize: 14, borderRadius: 8, boxSizing: 'border-box' }} placeholder="Enter 12-digit UTR number" value={utr} onChange={(e) => setUtr(e.target.value)} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#94A3B8', letterSpacing: '.12em', marginBottom: 8 }}>OR UPI ID YOU PAID FROM</div>
                <input className="clique-input" style={{ width: '100%', padding: '12px 14px', fontSize: 14, borderRadius: 8, boxSizing: 'border-box' }} placeholder="e.g. yourname@upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#64748B', letterSpacing: '.06em', marginTop: 6 }}>Enter either your UTR number or the UPI ID you paid from.</div>
              </div>
              {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--hot)', letterSpacing: '.06em' }}>{error}</div>}
              <button onClick={handleUPISubmit} disabled={upiSubmitting} style={{ width: '100%', background: 'var(--lime)', color: 'var(--ink)', border: 'none', padding: '16px', borderRadius: 10, fontFamily: 'var(--display)', fontSize: 15, fontWeight: 700, cursor: upiSubmitting ? 'not-allowed' : 'pointer', opacity: upiSubmitting ? 0.6 : 1 }}>
                {upiSubmitting ? 'Submitting…' : 'Submit payment proof →'}
              </button>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#64748B', letterSpacing: '.08em', textAlign: 'center' }}>
                YOUR PASS WILL BE ISSUED AFTER VERIFICATION
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm registration modal */}
      {confirmOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', padding: 20 }} onClick={() => setConfirmOpen(false)}>
          <div style={{ background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 14, width: '100%', maxWidth: 420, boxShadow: '0 40px 80px -20px rgba(0,0,0,0.7)', animation: 'riseIn .25s cubic-bezier(.4,1.4,.5,1) both' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20 }}>Request a spot</div>
              <button onClick={() => setConfirmOpen(false)} aria-label="Close" style={{ background: 'transparent', border: 'none', color: 'var(--dim)', fontSize: 28, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.12em', marginBottom: 6 }}>{categoryLabel(event.category).toUpperCase()}</div>
                <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' }}>{event.title}</div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 14, color: 'var(--cream)', marginTop: 4 }}>{event.locationName} · {formatTime(event.startTime)}</div>
              </div>
              {event.requiresSocials && event.requiredSocials && event.requiredSocials.length > 0 && (
                <div style={{ padding: 12, background: 'rgba(201,243,110,0.06)', border: '1px solid rgba(201,243,110,0.2)', borderRadius: 8 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', color: 'var(--lime)', marginBottom: 8 }}>SOCIALS SHARED WITH HOST</div>
                  {event.requiredSocials.map((s) => (
                    <div key={s} style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--cream)', marginBottom: 4 }}>
                      {SOCIAL_LABELS[s] ?? s}: @{user?.connectedSocials?.[s as keyof typeof user.connectedSocials] ?? '—'}
                    </div>
                  ))}
                </div>
              )}
              <textarea
                className="clique-input"
                value={requestMsg}
                onChange={(e) => setRequestMsg(e.target.value)}
                placeholder="Message to host (optional) — tell them why you want in"
                rows={3}
                style={{ resize: 'none', fontSize: 14, borderRadius: 8 }}
              />
              {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--hot)' }}>{error}</div>}
              <button onClick={handleRegister} disabled={regLoading} style={{ background: 'var(--lime)', color: 'var(--ink)', border: 'none', padding: '15px', borderRadius: 10, fontFamily: 'var(--display)', fontSize: 15, fontWeight: 700, cursor: regLoading ? 'not-allowed' : 'pointer', opacity: regLoading ? 0.7 : 1 }}>
                {regLoading ? 'Sending…' : 'Send request →'}
              </button>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.08em', textAlign: 'center' }}>HOST REVIEWS AND ACCEPTS YOUR REQUEST</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
