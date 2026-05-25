'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { Event, Pass, User } from '@/types';
import { formatDate, formatTime, formatPrice, getImageUrl, categoryLabel } from '@/lib/utils';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { usePayment } from '@/hooks/usePayment';

function Spinner({ size = 32 }: { size?: number }) {
  return <div style={{ width: size, height: size, border: '2px solid var(--line-2)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}

function PseudoQR({ seed }: { seed: string }) {
  const N = 21;
  const cells: React.ReactNode[] = [];
  function h(str: string) {
    let v = 2166136261;
    for (let i = 0; i < str.length; i++) { v ^= str.charCodeAt(i); v = Math.imul(v, 16777619); }
    return Math.abs(v);
  }
  function inFinder(r: number, c: number) { return (r < 7 && c < 7) || (r < 7 && c >= N - 7) || (r >= N - 7 && c < 7); }
  function finderCell(r: number, c: number) {
    let lr = r, lc = c;
    if (r >= N - 7) lr = r - (N - 7);
    if (c >= N - 7) lc = c - (N - 7);
    if ((lr === 0 || lr === 6) && lc >= 0 && lc <= 6) return true;
    if ((lc === 0 || lc === 6) && lr >= 0 && lr <= 6) return true;
    if (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4) return true;
    return false;
  }
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const on = inFinder(r, c) ? finderCell(r, c) : (h(seed + ':' + r + 'x' + c) % 100) < 48;
      if (on) cells.push(<rect key={r + '-' + c} x={c} y={r} width="1" height="1" fill="#0B0907" />);
    }
  }
  return <svg viewBox={`0 0 ${N} ${N}`} preserveAspectRatio="xMidYMid meet" shapeRendering="crispEdges" style={{ width: '100%', height: '100%' }}>{cells}</svg>;
}

function PassModal({ open, onClose, pass, event }: { open: boolean; onClose: () => void; pass: Pass | null; event: Event | null }) {
  if (!open || !pass || !event) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', padding: 20, animation: 'fadeIn .2s ease-out' }} onClick={onClose}>
      <div style={{ background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 18, width: '100%', maxWidth: 380, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.7)', animation: 'riseIn .25s cubic-bezier(.4,1.4,.5,1) both' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20 }}>Your pass</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--dim)', fontSize: 28, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.14em' }}>{categoryLabel(event.category).toUpperCase()}</div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22 }}>{event.title}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--cream)', letterSpacing: '.06em' }}>{event.locationName} · {formatTime(event.startTime)}</div>
          <div style={{ background: 'var(--paper)', padding: 22, borderRadius: 14, margin: '10px 0', aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {pass.qrCodeUrl
              ? <img src={pass.qrCodeUrl} alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <PseudoQR seed={pass._id} />
            }
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--lime)', letterSpacing: '.12em', textAlign: 'center' }}>● ACTIVE · SHOW THIS AT THE DOOR</div>
        </div>
      </div>
    </div>
  );
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { user } = useAuth();
  const { paying, paymentError, setPaymentError, initiatePayment } = usePayment();

  const [event, setEvent]         = useState<Event | null>(null);
  const [loading, setLoading]     = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [saveLoading, setSaveLoading]       = useState(false);
  const [confirmOpen, setConfirmOpen]       = useState(false);
  const [earnedPass, setEarnedPass]         = useState<Pass | null>(null);
  const [error, setError]                   = useState('');
  const [requestMsg, setRequestMsg]         = useState('');

  useEffect(() => {
    api.get(`/events/${id}`)
      .then(({ data }) => setEvent(data.data.event))
      .catch(() => setEvent(null))
      .finally(() => setLoading(false));
  }, [id]);

  const host         = event ? (typeof event.hostId === 'object' ? event.hostId as User : null) : null;
  const isOwnEvent   = host?._id === user?._id;
  const alreadyBooked = !!(event?.userBooking && ['confirmed', 'checked_in'].includes(event.userBooking.status));
  const paymentPending = event?.userBooking?.status === 'payment_pending';
  const isFull        = event ? event.bookedCount >= event.capacity : false;
  const filled        = event ? Math.min(100, (event.bookedCount / event.capacity) * 100) : 0;
  const spotsLeft     = event ? event.capacity - event.bookedCount : 0;

  const refreshEvent = () => api.get(`/events/${id}`).then(({ data }) => setEvent(data.data.event)).catch(() => {});

  const handlePaymentSuccess = (pass: Pass) => { setEarnedPass(pass); refreshEvent(); };

  const handleBook = async () => {
    setError(''); setPaymentError(''); setBookingLoading(true);
    try {
      const { data: resp } = await api.post('/bookings', { eventId: id });
      const { booking, pass } = resp.data;
      setConfirmOpen(false);
      if (event!.price > 0) {
        initiatePayment({ bookingId: booking._id, eventTitle: event!.title, userName: user?.name ?? '', onSuccess: handlePaymentSuccess, onDismiss: () => { setError('Payment not completed.'); refreshEvent(); } });
      } else {
        setEarnedPass(pass as Pass);
        refreshEvent();
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCompletePayment = () => {
    if (!event?.userBooking) return;
    setPaymentError('');
    initiatePayment({ bookingId: event.userBooking._id, eventTitle: event.title, userName: user?.name ?? '', onSuccess: handlePaymentSuccess, onDismiss: () => {} });
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

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '96px 0' }}><Spinner /></div>;

  if (!event) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 28 }}>Event not found.</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--dim)', letterSpacing: '.08em', marginTop: 8 }}>THE LINK MIGHT BE EXPIRED, OR THE HOST PULLED IT</div>
      <button onClick={() => router.back()} style={{ marginTop: 22, background: 'transparent', color: 'var(--paper)', border: '1px solid var(--line-2)', padding: '12px 18px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.08em', cursor: 'pointer' }}>← Back to feed</button>
    </div>
  );

  const imageUrl = event.images?.[0] ? getImageUrl(event.images[0]) : null;
  const displayError = error || paymentError;
  const catColors: Record<string, string> = { house_party: '#C9F36E', warehouse: '#FF3D6E', club: '#FF3D6E', college: '#E8C46E', private: '#E8C46E', concert: '#E8C46E', other: '#E8E1D2' };
  const artColor = catColors[event.category] ?? '#E8E1D2';

  return (
    <div>
      <Link href="/events" style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', color: 'var(--dim)', textTransform: 'uppercase', display: 'inline-block', marginBottom: 22 }}>
        ← Tonight&apos;s feed
      </Link>

      {/* Hero */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 28, marginBottom: 40 }}>
        <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', aspectRatio: '5/3', background: imageUrl ? 'var(--line)' : artColor, display: 'flex', alignItems: 'flex-end', padding: 28 }}>
          {imageUrl && <img src={imageUrl} alt={event.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
          {!imageUrl && (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
              {Array.from({ length: 20 }).map((_, i) => <line key={i} x1={i * 6} y1="0" x2={i * 6 - 30} y2="100" stroke="rgba(11,9,7,0.16)" strokeWidth="0.5" />)}
            </svg>
          )}
          {imageUrl && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }} />}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: imageUrl ? 'rgba(255,255,255,0.7)' : 'rgba(11,9,7,0.6)', marginBottom: 12 }}>{categoryLabel(event.category).toUpperCase()}</div>
            <h1 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 'clamp(36px, 5vw, 64px)', lineHeight: 0.95, letterSpacing: '-0.035em', color: imageUrl ? 'var(--paper)' : 'var(--ink)', margin: 0 }}>{event.title}</h1>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 20, border: '1px solid var(--line-2)', borderRadius: 16 }}>
          {host && (
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)', marginBottom: 8 }}>HOSTED BY</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: artColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
                  {host.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 16 }}>{host.name}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '.08em' }}>@{host.username}</div>
                </div>
              </div>
            </div>
          )}
          {event.vibeTags?.length > 0 && (
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)', marginBottom: 8 }}>VIBES</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {event.vibeTags.map((v) => (
                  <span key={v} style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', color: 'var(--cream)', padding: '5px 10px', border: '1px solid var(--line-2)', borderRadius: 999 }}>{v}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 40, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          {/* About */}
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)', marginBottom: 14 }}>ABOUT</div>
            <p style={{ fontFamily: 'var(--display)', fontSize: 17, lineHeight: 1.5, color: 'var(--paper)', margin: 0 }}>{event.description}</p>
          </div>

          {/* Details */}
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)', marginBottom: 14 }}>THE DETAILS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { label: 'WHEN', big: `${formatTime(event.startTime)} → ${formatTime(event.endTime)}`, sub: formatDate(event.date) },
                { label: 'WHERE', big: event.locationName, sub: event.exactAddressHiddenBeforeBooking ? 'Address after booking' : event.address },
                { label: 'CAPACITY', big: `${event.capacity} heads`, sub: `${event.bookedCount} on the list · ${spotsLeft} left` },
                ...(event.musicTags?.length ? [{ label: 'MUSIC', big: event.musicTags.join(' / '), sub: '' }] : []),
              ].map(({ label, big, sub }) => (
                <div key={label} style={{ padding: 16, background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 12 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--dim)' }}>{label}</div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 600, marginTop: 6, lineHeight: 1.2 }}>{big}</div>
                  {sub && <div style={{ fontSize: 13, color: 'var(--cream)', marginTop: 4 }}>{sub}</div>}
                </div>
              ))}
            </div>
          </div>

          {event.rules && (
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)', marginBottom: 14 }}>HOUSE RULES</div>
              <p style={{ fontFamily: 'var(--display)', fontSize: 15, lineHeight: 1.5, color: 'var(--cream)', margin: 0 }}>{event.rules}</p>
            </div>
          )}
        </div>

        {/* Booking sidebar */}
        <aside style={{ position: 'sticky', top: 36, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ paddingBottom: 18, borderBottom: '1px solid var(--line)' }}>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 56, lineHeight: 0.95, letterSpacing: '-0.03em' }}>{formatPrice(event.price)}</div>
              {event.price > 0 && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '.08em', marginTop: 6 }}>+ {event.platformFee ? `₹${event.platformFee}` : '$1'} PLATFORM FEE</div>}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--cream)' }}>{event.bookedCount} / {event.capacity} ON THE LIST</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: spotsLeft < 10 ? 'var(--hot)' : 'var(--cream)' }}>{spotsLeft} LEFT</span>
              </div>
              <div style={{ height: 4, background: 'var(--line)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${filled}%`, background: filled > 85 ? 'var(--hot)' : 'var(--lime)', transition: 'width .4s ease' }} />
              </div>
            </div>

            {event.status === 'cancelled' ? (
              <div style={{ background: 'rgba(255,61,110,0.1)', border: '1px solid rgba(255,61,110,0.3)', borderRadius: 12, padding: '14px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--hot)', letterSpacing: '.08em' }}>EVENT CANCELLED</div>
            ) : isOwnEvent ? (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--lime)', letterSpacing: '.1em', textAlign: 'center', padding: 14, border: '1px dashed var(--lime)', borderRadius: 10 }}>★ YOU&apos;RE HOSTING THIS</div>
            ) : alreadyBooked ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--lime)', color: 'var(--ink)', padding: 16, borderRadius: 12, fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                  <svg width="20" height="20" viewBox="0 0 20 20"><path d="M4 10 L8 14 L16 6" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  You&apos;re on the list
                </div>
                <button onClick={() => router.push('/passes')} style={{ width: '100%', background: 'transparent', color: 'var(--paper)', border: '1px solid var(--line-2)', padding: '12px', borderRadius: 10, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', marginTop: 10 }}>
                  View QR pass →
                </button>
              </>
            ) : paymentPending ? (
              <button onClick={handleCompletePayment} disabled={paying} style={{ width: '100%', background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '16px', borderRadius: 10, fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, letterSpacing: '.08em', textTransform: 'uppercase', cursor: paying ? 'not-allowed' : 'pointer', opacity: paying ? 0.7 : 1 }}>
                {paying ? 'Processing…' : 'Complete Payment →'}
              </button>
            ) : (
              <button onClick={() => { setError(''); setPaymentError(''); setConfirmOpen(true); }} disabled={isFull || event.status !== 'published'} style={{ width: '100%', background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '16px', borderRadius: 10, fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, letterSpacing: '.08em', textTransform: 'uppercase', cursor: (isFull || event.status !== 'published') ? 'not-allowed' : 'pointer', opacity: (isFull || event.status !== 'published') ? 0.45 : 1 }}>
                {event.price === 0 ? 'RSVP →' : `Book pass · ${formatPrice(event.price)} →`}
              </button>
            )}

            <button onClick={handleSave} disabled={saveLoading} style={{ background: 'transparent', border: `1px solid ${event.saved ? 'var(--lime)' : 'var(--line)'}`, color: event.saved ? 'var(--lime)' : 'var(--cream)', padding: 12, borderRadius: 10, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', cursor: 'pointer', transition: 'all .15s ease' }}>
              {event.saved ? '★ Saved' : '☆ Save for later'}
            </button>

            {displayError && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--hot)', letterSpacing: '.08em', textAlign: 'center', lineHeight: 1.5 }}>{displayError}</div>}
          </div>

          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.12em', textAlign: 'center' }}>
            ※ ENTRY IS BY QR PASS ONLY. PASS LIVES IN YOUR PASSES TAB.
          </div>
        </aside>
      </div>

      {/* Confirm booking modal */}
      {confirmOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', padding: 20 }} onClick={() => setConfirmOpen(false)}>
          <div style={{ background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 18, width: '100%', maxWidth: 380, boxShadow: '0 40px 80px -20px rgba(0,0,0,0.7)', animation: 'riseIn .25s cubic-bezier(.4,1.4,.5,1) both' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20 }}>Confirm your spot</div>
              <button onClick={() => setConfirmOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--dim)', fontSize: 28, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '.1em' }}>{categoryLabel(event.category).toUpperCase()}</div>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22 }}>{event.title}</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 14, color: 'var(--cream)' }}>{event.locationName} · {formatTime(event.startTime)}</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, border: '1px solid var(--line)', borderRadius: 12 }}>
                {[
                  { label: 'ENTRY', val: formatPrice(event.price) },
                  ...(event.price > 0 ? [{ label: 'PLATFORM', val: event.platformFee ? `₹${event.platformFee}` : '$1' }] : []),
                  { label: 'TOTAL', val: event.price === 0 ? 'FREE' : `₹${event.price + (event.platformFee ?? 0)}`, bold: true },
                ].map(({ label, val, bold }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...(label === 'TOTAL' ? { borderTop: '1px dashed var(--line)', paddingTop: 10, marginTop: 4 } : {}) }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', fontWeight: bold ? 700 : 400 }}>{label}</span>
                    <span style={{ fontFamily: 'var(--display)', fontSize: bold ? 18 : 14, fontWeight: bold ? 700 : 400 }}>{val}</span>
                  </div>
                ))}
              </div>

              {event.approvalRequired && (
                <textarea value={requestMsg} onChange={(e) => setRequestMsg(e.target.value)} placeholder="Add a message to the host (optional)…" rows={2} style={{ width: '100%', background: '#0B0907', border: '1px solid var(--line-2)', color: 'var(--paper)', padding: '12px 16px', borderRadius: 12, fontFamily: 'var(--display)', fontSize: 14, outline: 'none', resize: 'none' }} />
              )}

              {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--hot)' }}>{error}</div>}

              <button onClick={handleBook} disabled={bookingLoading} style={{ background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '16px', borderRadius: 10, fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, letterSpacing: '.08em', textTransform: 'uppercase', cursor: bookingLoading ? 'not-allowed' : 'pointer', opacity: bookingLoading ? 0.7 : 1 }}>
                {bookingLoading ? 'Processing…' : event.price === 0 ? 'Confirm RSVP' : 'Pay & get QR pass →'}
              </button>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.08em', textAlign: 'center' }}>CANCEL FREE UP TO 24H BEFORE THE DOOR</div>
            </div>
          </div>
        </div>
      )}

      <PassModal open={!!earnedPass} onClose={() => setEarnedPass(null)} pass={earnedPass} event={event} />
    </div>
  );
}
