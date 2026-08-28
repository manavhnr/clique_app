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
    padding: '10px 16px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 11,
    letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', border: '1px solid',
    background: variant === 'primary' ? 'var(--lime)' : variant === 'danger' ? 'rgba(255,61,110,0.12)' : 'transparent',
    color: variant === 'primary' ? 'var(--ink)' : variant === 'danger' ? 'var(--hot)' : 'var(--cream)',
    borderColor: variant === 'primary' ? 'var(--lime)' : variant === 'danger' ? 'rgba(255,61,110,0.4)' : 'var(--line-2)',
  });

  return (
    <div style={{ border: '1px dashed var(--line-2)', borderRadius: 6, padding: 20, marginTop: 20 }}>
      <div className="clique-label" style={{ marginBottom: 14 }}>YOUR SQUAD</div>

      {error  && <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--hot)', marginBottom: 12 }}>{error}</div>}
      {success && <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--lime)', marginBottom: 12 }}>{success}</div>}

      {/* Pending invite */}
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

      {/* Already in a squad */}
      {squad && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20 }}>{squad.name}</div>
            <button onClick={handleLeave} style={btn('danger')}>
              {squad.creatorId === userId ? 'Disband' : 'Leave'}
            </button>
          </div>

          {/* Members */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {squad.members.map((m) => (
              <span key={m.userId} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px solid var(--line-2)', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--cream)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--lime)', display: 'inline-block' }} />
                @{m.username}
                {m.userId === userId && <span style={{ color: 'var(--dim)' }}> · you</span>}
              </span>
            ))}
            {squad.invites.filter((i) => i.status === 'pending').map((i) => (
              <span key={i.userId} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px dashed var(--line-2)', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)' }}>
                pending invite
              </span>
            ))}
          </div>

          {/* Invite */}
          <form onSubmit={handleInvite} style={{ display: 'flex', gap: 8 }}>
            <input
              className="clique-input"
              style={{ flex: 1, padding: '10px 14px', fontSize: 14, borderRadius: 3 }}
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

      {/* No squad yet */}
      {!squad && !pendingInvite && (
        <div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 14, color: 'var(--cream)', marginBottom: 16, lineHeight: 1.5 }}>
            Coming with friends? Create a squad so the host knows who you&apos;re rolling with.
          </div>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8 }}>
            <input
              className="clique-input"
              style={{ flex: 1, padding: '10px 14px', fontSize: 14, borderRadius: 3 }}
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
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [upiSubmitting, setUpiSubmitting] = useState(false);

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
  const ev           = event as unknown as { activeTier?: { label: string; commonPrice: number; malePrice: number; femalePrice: number; capacity?: number; soldCount: number } | null; pricingTiers?: { label: string; commonPrice: number; malePrice: number; femalePrice: number; capacity?: number; soldCount: number; isOpen: boolean }[]; pricingMode?: string; groupPricing?: { label: string; size: number; price: number }[] };
  const activeTier   = ev?.activeTier ?? null;
  const allTiers     = ev?.pricingTiers ?? [];
  const pricingMode  = ev?.pricingMode ?? 'common';
  const groupPricing = ev?.groupPricing ?? [];
  const hasPhases    = allTiers.length > 0;
  const ticketsAvailable = !hasPhases || !!activeTier;

  const userRequest  = event?.userRequest as JoinRequest | null;
  const userBooking  = event?.userBooking as any;

  const isPending           = userRequest?.status === 'requested';
  const requestApproved     = userRequest?.status === 'approved';
  const isRejected          = userRequest?.status === 'rejected';
  const bookingConfirmed    = !!(userBooking && ['confirmed', 'checked_in'].includes(userBooking.status));
  // Request approved but user hasn't completed booking/payment yet
  const needsBookingAfterApproval = requestApproved && !userBooking;
  const isApproved          = bookingConfirmed;
  const isRegistered        = !!(isPending || requestApproved || bookingConfirmed);
  const paymentPending      = !!(userBooking?.status === 'payment_pending');
  const paymentUnderReview  = !!(userBooking?.status === 'utr_submitted');

  // Effective price for the current user (gender-aware for split pricing)
  const effectivePrice = (() => {
    if (!event) return 0;
    if (activeTier) {
      if (pricingMode === 'split') {
        if (user?.gender === 'male') return activeTier.malePrice;
        if (user?.gender === 'female') return activeTier.femalePrice;
      }
      return activeTier.commonPrice;
    }
    return event.price;
  })();

  // Social gate: check if user has required socials
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
      const { data: bookRes } = await api.post('/bookings', { eventId: id });
      const createdBooking = bookRes.data?.booking;
      if (createdBooking?.amount > 0 && createdBooking?.status === 'payment_pending') {
        setUtr('');
        setProofFile(null);
        setUpiModal({ bookingId: createdBooking._id, amount: createdBooking.amount });
      } else {
        await refreshEvent();
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Booking failed');
    } finally { setBookLoading(false); }
  };

  const handleCompletePayment = () => {
    if (!userBooking || !event) return;
    setUtr('');
    setProofFile(null);
    setUpiModal({ bookingId: userBooking._id, amount: userBooking.amount });
  };

  const handleUPISubmit = async () => {
    if (!upiModal) return;
    if (!utr.trim()) { setError('Enter the UTR / transaction ID.'); return; }
    setError(''); setUpiSubmitting(true);
    try {
      let proofUrl: string | undefined;
      if (proofFile) {
        const form = new FormData();
        form.append('proof', proofFile);
        const { data: uploadRes } = await api.post('/payments/upload-proof', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        proofUrl = uploadRes.data.url;
      }
      await api.post('/payments/upi-submit', {
        bookingId: upiModal.bookingId,
        utrNumber: utr.trim(),
        transactionProofUrl: proofUrl,
      });
      setUpiModal(null);
      await refreshEvent();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Submission failed');
    } finally { setUpiSubmitting(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '96px 0' }}>
      <Spinner />
    </div>
  );

  if (!event) return (
    <div className="ledger" style={{ padding: '72px 8px' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.16em', color: 'var(--dim)', marginBottom: 14 }}>№ 404 — TORN OFF</div>
      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 36, letterSpacing: '-0.02em' }}>Event not found.</div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 15, color: 'var(--cream)', marginTop: 8 }}>The link might be expired, or the host pulled it.</div>
      <button onClick={() => router.back()} style={{ marginTop: 24, background: 'transparent', color: 'var(--paper)', border: '1px solid var(--line-2)', padding: '12px 18px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}>← Back to the board</button>
    </div>
  );

  const imageUrl = event.images?.[0] ? getImageUrl(event.images[0]) : null;
  const artColor = catColor(event.category);

  const SOCIAL_LABELS: Record<string, string> = { instagram: 'Instagram', twitter: 'Twitter/X', snapchat: 'Snapchat', facebook: 'Facebook', linkedin: 'LinkedIn' };

  const detailRows: { label: string; big: string; sub?: string }[] = [
    { label: 'WHEN', big: `${formatTime(event.startTime)} → ${formatTime(event.endTime)}`, sub: formatDate(event.date) },
    { label: 'WHERE', big: event.locationName, sub: event.exactAddressHiddenBeforeBooking ? 'Address after acceptance' : event.address },
    { label: 'CAPACITY', big: `${event.capacity} heads`, sub: `${event.bookedCount} on the list · ${spotsLeft} left` },
    ...(event.musicTags?.length ? [{ label: 'MUSIC', big: event.musicTags.join(' / ') }] : []),
    ...(event.vibeTags?.length ? [{ label: 'VIBES', big: event.vibeTags.join(' · ') }] : []),
  ];

  return (
    <div style={{ maxWidth: 1080 }}>
      <Link href="/events" style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', color: 'var(--dim)', textTransform: 'uppercase', display: 'inline-block', marginBottom: 20 }}>
        ← The board
      </Link>

      {/* Flyer masthead */}
      <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: isMobile ? 22 : 30, marginBottom: isMobile ? 24 : 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <span aria-hidden style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 1, background: artColor }} />
          <span className="clique-label">{categoryLabel(event.category).toUpperCase()}</span>
          <span aria-hidden style={{ height: 1, flex: 1, background: 'var(--line-2)' }} />
          {event.privacy === 'private' && <span className="stamp stamp-flat" style={{ color: 'var(--dim)' }}>Private</span>}
          {event.privacy === 'secret' && <span className="stamp stamp-flat" style={{ color: 'var(--dim)' }}>Secret</span>}
          {isFull && <span className="stamp" style={{ color: 'var(--hot)' }}>Sold out</span>}
          {event.status === 'cancelled' && <span className="stamp" style={{ color: 'var(--hot)' }}>Cancelled</span>}
        </div>

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 20 : 36, alignItems: isMobile ? 'stretch' : 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 'clamp(40px,6.5vw,84px)', lineHeight: 0.92, letterSpacing: '-0.035em', margin: 0, overflowWrap: 'break-word' }}>
              {event.title}
            </h1>
            {host && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
                <span style={{ width: 30, height: 30, borderRadius: '50%', background: artColor, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 13, color: 'var(--ink)', flexShrink: 0 }}>{host.name?.[0]?.toUpperCase()}</span>
                <span style={{ fontFamily: 'var(--display)', fontSize: 16 }}>
                  thrown by <b>{host.name}</b>{' '}
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '.06em' }}>@{host.username}</span>
                </span>
              </div>
            )}
          </div>

          {/* Flyer art */}
          <div style={{ width: isMobile ? '100%' : 300, flexShrink: 0 }}>
            {imageUrl ? (
              <img src={imageUrl} alt={event.title} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 4, border: '1px solid var(--line-2)', display: 'block' }} />
            ) : (
              <div aria-hidden style={{ width: '100%', aspectRatio: '4/3', borderRadius: 4, background: artColor, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: 16 }}>
                <svg viewBox="0 0 100 75" preserveAspectRatio="none" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
                  {Array.from({ length: 20 }).map((_, i) => <line key={i} x1={i * 6} y1="0" x2={i * 6 - 24} y2="75" stroke="rgba(11,9,7,0.16)" strokeWidth="0.6" />)}
                </svg>
                <span style={{ position: 'relative', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.16em', color: 'rgba(11,9,7,0.75)' }}>
                  {formatDate(event.date).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: isMobile ? 32 : 48, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
          <div>
            <div className="clique-label" style={{ marginBottom: 14 }}>ABOUT</div>
            <p style={{ fontFamily: 'var(--display)', fontSize: 17, lineHeight: 1.5, color: 'var(--paper)', margin: 0, maxWidth: '62ch' }}>{event.description}</p>
          </div>

          {/* The details — a ledger, not a card grid */}
          <div>
            <div className="clique-label" style={{ marginBottom: 6 }}>THE DETAILS</div>
            <div className="ledger">
              {detailRows.map(({ label, big, sub }) => (
                <div key={label} className="ledger-row" style={{ display: 'grid', gridTemplateColumns: isMobile ? '92px 1fr' : '120px 1fr', gap: 16, padding: '14px 2px', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--dim)' }}>{label}</span>
                  <span>
                    <span style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 600, lineHeight: 1.25 }}>{big}</span>
                    {sub && <span style={{ display: 'block', fontFamily: 'var(--display)', fontSize: 13, color: 'var(--cream)', marginTop: 3 }}>{sub}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {event.rules && (
            <div>
              <div className="clique-label" style={{ marginBottom: 12 }}>HOUSE RULES</div>
              <p style={{ fontFamily: 'var(--display)', fontSize: 15, lineHeight: 1.5, color: 'var(--cream)', margin: 0, maxWidth: '62ch' }}>{event.rules}</p>
            </div>
          )}

          {groupPricing.length > 0 && (
            <div>
              <div className="clique-label" style={{ marginBottom: 12 }}>GROUP OFFERS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {groupPricing.map((g, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid var(--line-2)', borderRadius: 4 }}>
                    <div>
                      <span style={{ fontFamily: 'var(--display)', fontSize: 15, fontWeight: 600 }}>{g.label || `Group of ${g.size}`}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.1em', marginLeft: 10 }}>{g.size} PEOPLE</span>
                    </div>
                    <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18, color: 'var(--lime)' }}>₹{g.price.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Squad section — shown once registered */}
          {isRegistered && !isOwnEvent && user && (
            <div>
              <div className="clique-label" style={{ marginBottom: 4 }}>SQUADS</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 13, color: 'var(--cream)' }}>
                Group up with friends — the host will see your squad on their guest list.
              </div>
              <SquadSection eventId={id} userId={user._id} />
            </div>
          )}
        </div>

        {/* Registration rail: the ticket stub */}
        <aside style={{ position: isMobile ? 'static' : 'sticky', top: 36 }}>
          <div style={{ background: '#100D0A', border: '1px solid var(--line-2)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
            {/* Stub head */}
            <div style={{ padding: '18px 22px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <div>
                  <span className="clique-label">ADMIT ONE</span>
                  {activeTier && (
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.14em', color: 'var(--lime)', marginTop: 4, textTransform: 'uppercase' }}>
                      {activeTier.label}
                    </div>
                  )}
                </div>
                {pricingMode === 'split' && activeTier ? (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '.06em' }}>
                      ♂ <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18, color: 'var(--paper)' }}>
                        {activeTier.malePrice === 0 ? 'Free' : `₹${activeTier.malePrice.toLocaleString('en-IN')}`}
                      </span>
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '.06em' }}>
                      ♀ <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18, color: 'var(--paper)' }}>
                        {activeTier.femalePrice === 0 ? 'Free' : `₹${activeTier.femalePrice.toLocaleString('en-IN')}`}
                      </span>
                    </span>
                  </div>
                ) : (
                  <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' }}>
                    {activeTier
                      ? (activeTier.commonPrice === 0 ? 'Free' : `₹${activeTier.commonPrice.toLocaleString('en-IN')}`)
                      : (event.price === 0 ? 'Free' : `₹${event.price.toLocaleString('en-IN')}`)}
                  </span>
                )}
              </div>
              {/* All phases */}
              {allTiers.length > 1 && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {allTiers.map((t, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: t.isOpen ? 1 : 0.4 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', color: t.isOpen ? 'var(--lime)' : 'var(--dim)', textTransform: 'uppercase' }}>
                        {t.label}{!t.isOpen && ' · CLOSED'}
                      </span>
                      {pricingMode === 'split' ? (
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--cream)', letterSpacing: '.06em' }}>
                          ♂ ₹{t.malePrice} · ♀ ₹{t.femalePrice}
                        </span>
                      ) : (
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--cream)', letterSpacing: '.06em' }}>
                          ₹{t.commonPrice}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Perforation */}
            <div style={{ position: 'relative' }}>
              <div className="perf" />
              <span aria-hidden style={{ position: 'absolute', left: -8, top: -7, width: 14, height: 14, background: 'var(--ink)', borderRadius: '50%', border: '1px solid var(--line-2)' }} />
              <span aria-hidden style={{ position: 'absolute', right: -8, top: -7, width: 14, height: 14, background: 'var(--ink)', borderRadius: '50%', border: '1px solid var(--line-2)' }} />
            </div>

            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Capacity line */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--cream)', letterSpacing: '.06em' }}>{event.bookedCount} / {event.capacity} ON THE LIST</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: spotsLeft < 10 ? 'var(--hot)' : 'var(--cream)', letterSpacing: '.06em' }}>{spotsLeft} LEFT</span>
                </div>
                <div style={{ height: 4, background: 'var(--line)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${filled}%`, background: filled > 85 ? 'var(--hot)' : 'var(--lime)', transition: 'width .4s ease' }} />
                </div>
              </div>

              {/* CTA */}
              {event.status === 'cancelled' ? (
                <div style={{ textAlign: 'center', padding: '18px 0 10px' }}>
                  <span className="stamp" style={{ color: 'var(--hot)', fontSize: 13, padding: '8px 14px 7px' }}>EVENT CANCELLED</span>
                </div>
              ) : isOwnEvent ? (
                <div style={{ textAlign: 'center', padding: '18px 0 10px' }}>
                  <span className="stamp stamp-alt" style={{ color: 'var(--lime)', fontSize: 12, padding: '8px 14px 7px' }}>★ YOU&apos;RE HOSTING THIS</span>
                </div>
              ) : isApproved ? (
                <>
                  <div style={{ textAlign: 'center', padding: '14px 0 6px' }}>
                    <span className="stamp" style={{ color: 'var(--lime)', fontSize: 14, padding: '10px 16px 9px' }}>✓ ON THE LIST</span>
                  </div>
                  <button onClick={() => router.push('/passes')} style={{ width: '100%', background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '14px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                    View QR pass →
                  </button>
                </>
              ) : isPending ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ textAlign: 'center', padding: '14px 0 4px' }}>
                    <span className="stamp stamp-alt" style={{ color: 'var(--gold)', fontSize: 12, padding: '8px 14px 7px' }}>AWAITING THE HOST</span>
                  </div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 13, color: 'var(--dim)', textAlign: 'center', lineHeight: 1.4 }}>
                    You&apos;ll get notified when the host responds.
                  </div>
                </div>
              ) : needsBookingAfterApproval ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ border: '1px dashed rgba(201,243,110,0.35)', borderRadius: 3, padding: '12px 14px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--lime)', letterSpacing: '.1em' }}>
                    ✓ REQUEST APPROVED — COMPLETE YOUR BOOKING
                  </div>
                  <button
                    onClick={handleBook}
                    disabled={isFull || bookLoading}
                    style={{ width: '100%', background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '16px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', cursor: (isFull || bookLoading) ? 'not-allowed' : 'pointer', opacity: (isFull || bookLoading) ? 0.45 : 1 }}
                  >
                    {bookLoading ? '…' : event.price === 0 ? 'GET FREE PASS →' : 'BOOK & PAY →'}
                  </button>
                </div>
              ) : isRejected ? (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <span className="stamp" style={{ color: 'var(--hot)', fontSize: 12, padding: '8px 14px 7px' }}>REGISTRATION DECLINED</span>
                  {userRequest?.rejectionReason && <div style={{ fontFamily: 'var(--display)', fontSize: 13, marginTop: 12, color: 'var(--cream)' }}>{userRequest.rejectionReason}</div>}
                </div>
              ) : socialGated ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ border: '1px dashed rgba(255,61,110,0.4)', borderRadius: 3, padding: '14px' }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--hot)', letterSpacing: '.1em', marginBottom: 6 }}>SOCIAL ACCOUNT REQUIRED</div>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 13, color: 'var(--cream)', lineHeight: 1.4 }}>
                      This event requires a connected {missingSocials.map((s) => SOCIAL_LABELS[s] ?? s).join(' and ')} account to register.
                    </div>
                  </div>
                  <button onClick={() => router.push('/profile')} style={{ width: '100%', background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '14px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                    Connect socials in profile →
                  </button>
                </div>
              ) : paymentUnderReview ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ border: '1px dashed rgba(245,158,11,0.4)', borderRadius: 3, padding: '14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--gold)', letterSpacing: '.1em' }}>⏳ PAYMENT PROOF UNDER REVIEW</span>
                  </div>
                  <button
                    onClick={handleCompletePayment}
                    style={{ width: '100%', background: 'transparent', color: 'var(--cream)', border: '1px solid var(--line-2)', padding: '14px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}
                  >
                    RESUBMIT / UPDATE PROOF →
                  </button>
                </div>
              ) : paymentPending ? (
                <button
                  onClick={handleCompletePayment}
                  disabled={bookLoading}
                  style={{ width: '100%', background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '16px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', cursor: bookLoading ? 'not-allowed' : 'pointer', opacity: bookLoading ? 0.6 : 1 }}
                >
                  {bookLoading ? '…' : 'COMPLETE PAYMENT →'}
                </button>
              ) : !ticketsAvailable ? (
                <div style={{ textAlign: 'center', padding: '18px 0 10px' }}>
                  <span className="stamp" style={{ color: 'var(--dim)', fontSize: 12, padding: '8px 14px 7px' }}>NO TICKETS AVAILABLE</span>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 13, color: 'var(--cream)', marginTop: 10, lineHeight: 1.4 }}>
                    The host hasn&apos;t opened the next phase yet.
                  </div>
                </div>
              ) : !event.approvalRequired ? (
                /* public + secret + private-without-approval: direct booking */
                <button
                  onClick={handleBook}
                  disabled={isFull || bookLoading || event.status !== 'published'}
                  style={{ width: '100%', background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '16px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', cursor: (isFull || bookLoading || event.status !== 'published') ? 'not-allowed' : 'pointer', opacity: (isFull || bookLoading || event.status !== 'published') ? 0.45 : 1 }}
                >
                  {isFull ? 'SOLD OUT' : bookLoading ? '…' : effectivePrice === 0 ? 'GET FREE PASS →' : `BOOK · ₹${effectivePrice.toLocaleString('en-IN')} →`}
                </button>
              ) : (
                /* private: request approval first */
                <button
                  onClick={() => { setError(''); setConfirmOpen(true); }}
                  disabled={isFull || event.status !== 'published'}
                  style={{ width: '100%', background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '16px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', cursor: (isFull || event.status !== 'published') ? 'not-allowed' : 'pointer', opacity: (isFull || event.status !== 'published') ? 0.45 : 1 }}
                >
                  {isFull ? 'SOLD OUT' : 'REQUEST TO REGISTER →'}
                </button>
              )}

              <button onClick={handleSave} disabled={saveLoading} style={{ background: 'transparent', border: `1px solid ${event.saved ? 'var(--lime)' : 'var(--line-2)'}`, color: event.saved ? 'var(--lime)' : 'var(--cream)', padding: 12, borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all .15s ease' }}>
                {event.saved ? '★ Saved' : '☆ Save for later'}
              </button>

              {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--hot)', letterSpacing: '.08em', textAlign: 'center', lineHeight: 1.5 }}>{error}</div>}

              {/* Barcode footer */}
              <div style={{ paddingTop: 4 }}>
                <div className="barcode" aria-hidden style={{ height: 26, color: 'var(--line-2)' }} />
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.3em', color: 'var(--dim)', marginTop: 6, textAlign: 'center' }}>
                  CLQ-{String(event._id).slice(-8).toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {event.privacy === 'private' && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.12em', textAlign: 'center', marginTop: 14 }}>
              ※ HOST REVIEWS AND ACCEPTS REGISTRATIONS MANUALLY
            </div>
          )}
        </aside>
      </div>

      {/* UPI Payment modal */}
      {upiModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', padding: 20 }} onClick={() => setUpiModal(null)}>
          <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 10, width: '100%', maxWidth: 440, boxShadow: '0 40px 80px -20px rgba(0,0,0,0.8)', animation: 'riseIn .25s cubic-bezier(.4,1.4,.5,1) both' }} onClick={(e) => e.stopPropagation()}>
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

              {/* QR Code */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <img src="/upi-qr.png" alt="UPI QR Code" style={{ width: 220, height: 220, borderRadius: 10, background: '#fff', padding: 8, objectFit: 'contain' }} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#64748B', letterSpacing: '.1em' }}>SCAN & PAY ₹{upiModal.amount}</span>
              </div>

              {/* UTR input */}
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#94A3B8', letterSpacing: '.12em', marginBottom: 8 }}>UTR / TRANSACTION ID *</div>
                <input
                  className="clique-input"
                  style={{ width: '100%', padding: '12px 14px', fontSize: 14, borderRadius: 6, boxSizing: 'border-box' }}
                  placeholder="Enter 12-digit UTR number"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                />
              </div>

              {/* Proof upload */}
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#94A3B8', letterSpacing: '.12em', marginBottom: 8 }}>TRANSACTION SCREENSHOT (OPTIONAL)</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px dashed #334155', borderRadius: 6, padding: 12, cursor: 'pointer', color: proofFile ? '#60A5FA' : '#64748B', fontFamily: 'var(--display)', fontSize: 13 }}>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} />
                  {proofFile ? `✓ ${proofFile.name}` : '+ Upload payment screenshot'}
                </label>
              </div>

              {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--hot)', letterSpacing: '.06em' }}>{error}</div>}

              <button
                onClick={handleUPISubmit}
                disabled={upiSubmitting}
                style={{ width: '100%', background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '16px', borderRadius: 6, fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', cursor: upiSubmitting ? 'not-allowed' : 'pointer', opacity: upiSubmitting ? 0.6 : 1 }}
              >
                {upiSubmitting ? 'SUBMITTING…' : 'SUBMIT PAYMENT PROOF →'}
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
          <div style={{ background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 6, width: '100%', maxWidth: 420, boxShadow: '0 40px 80px -20px rgba(0,0,0,0.7)', animation: 'riseIn .25s cubic-bezier(.4,1.4,.5,1) both' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20 }}>Request a spot</div>
              <button onClick={() => setConfirmOpen(false)} aria-label="Close" style={{ background: 'transparent', border: 'none', color: 'var(--dim)', fontSize: 28, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.12em', marginBottom: 6 }}>{categoryLabel(event.category).toUpperCase()}</div>
                <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 24, letterSpacing: '-0.02em' }}>{event.title}</div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 14, color: 'var(--cream)', marginTop: 4 }}>{event.locationName} · {formatTime(event.startTime)}</div>
              </div>

              {/* User's connected socials preview */}
              {event.requiresSocials && event.requiredSocials && event.requiredSocials.length > 0 && (
                <div style={{ padding: 12, border: '1px dashed rgba(201,243,110,0.35)', borderRadius: 3 }}>
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
                style={{ resize: 'none', fontSize: 14, borderRadius: 3 }}
              />

              {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--hot)' }}>{error}</div>}

              <button onClick={handleRegister} disabled={regLoading} style={{ background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '16px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', cursor: regLoading ? 'not-allowed' : 'pointer', opacity: regLoading ? 0.7 : 1 }}>
                {regLoading ? 'Sending…' : 'Send Request →'}
              </button>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.08em', textAlign: 'center' }}>HOST REVIEWS AND ACCEPTS YOUR REQUEST</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
