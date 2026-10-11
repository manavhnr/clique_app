'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Event } from '@/types';
import { getImageUrl } from '@/lib/utils';
import api from '@/lib/api';

function Spinner({ size = 32 }: { size?: number }) {
  return <div style={{ width: size, height: size, border: '2px solid var(--line-2)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}

type TicketType = {
  label: string;
  price: number;
  description?: string;
  capacity?: number;
  soldCount: number;
};

type Selection = Record<number, number>; // ticketTypeIndex → quantity

export default function TicketsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<Selection>({});
  const [bookLoading, setBookLoading] = useState(false);
  const [error, setError] = useState('');
  const [upiModal, setUpiModal] = useState<{ bookingId: string; amount: number } | null>(null);
  const [utr, setUtr] = useState('');
  const [upiId, setUpiId] = useState('');
  const [upiSubmitting, setUpiSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/events/${id}`)
      .then(({ data }) => setEvent(data.data.event))
      .catch(() => setEvent(null))
      .finally(() => setLoading(false));
  }, [id]);

  const ev = event as unknown as { ticketTypes?: TicketType[]; userDiscount?: { discountType: 'percentage' | 'absolute'; discountValue: number } | null };
  const ticketTypes: TicketType[] = ev?.ticketTypes ?? [];
  const userDiscount = ev?.userDiscount ?? null;

  const applyDiscount = (price: number) => {
    if (!userDiscount || price === 0) return price;
    return userDiscount.discountType === 'percentage'
      ? Math.max(0, Math.round(price * (1 - userDiscount.discountValue / 100)))
      : Math.max(0, price - userDiscount.discountValue);
  };

  const totalTickets = Object.values(selection).reduce((a, b) => a + b, 0);
  const rawTotal = Object.entries(selection).reduce((sum, [idx, qty]) => {
    const tt = ticketTypes[Number(idx)];
    return sum + (tt ? tt.price * qty : 0);
  }, 0);
  const totalAmount = applyDiscount(rawTotal);
  const hasSelection = totalTickets > 0;

  const setQty = (idx: number, qty: number) => {
    setSelection((prev) => {
      if (qty <= 0) {
        const next = { ...prev };
        delete next[idx];
        return next;
      }
      return { ...prev, [idx]: qty };
    });
  };

  const handleBook = async () => {
    if (!hasSelection || !event) return;
    setError(''); setBookLoading(true);
    try {
      const ticketSelections = Object.entries(selection).map(([idx, qty]) => ({
        ticketTypeIndex: Number(idx),
        quantity: qty,
      }));
      const { data: bookRes } = await api.post('/bookings', { eventId: id, ticketSelections });
      const createdBooking = bookRes.data?.booking;
      if (createdBooking?.amount > 0 && createdBooking?.status === 'payment_pending') {
        setUtr(''); setUpiId('');
        setUpiModal({ bookingId: createdBooking._id, amount: createdBooking.amount });
      } else {
        router.push('/passes');
      }
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      if (e.response?.status === 409) {
        router.push('/passes');
      } else {
        setError(e.response?.data?.message ?? 'Booking failed. Please try again.');
      }
    } finally { setBookLoading(false); }
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
      router.push('/passes');
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      if (e.response?.status === 409) {
        setUpiModal(null);
        router.push('/passes');
      } else {
        const msg = e.response?.data?.message ?? 'Submission failed. Please try again.';
        if (msg === 'Booking does not require payment') {
          setUpiModal(null);
          router.push('/passes');
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

  if (!event || ticketTypes.length === 0) {
    router.replace(`/events/${id}`);
    return null;
  }

  const imageUrl = event.images?.[0] ? getImageUrl(event.images[0]) : null;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', width: '100%', paddingBottom: 120 }}>
      {/* Back */}
      <button
        onClick={() => router.back()}
        style={{ background: 'transparent', border: 'none', color: 'var(--dim)', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer', padding: '0 0 20px', display: 'inline-block' }}
      >
        ← Back
      </button>

      {/* Event header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, padding: '16px 0', borderBottom: '1px solid var(--line)' }}>
        {imageUrl && (
          <div style={{ width: 52, height: 52, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
            <img src={imageUrl} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.14em', marginBottom: 4 }}>CHOOSE TICKETS</div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20, lineHeight: 1.1, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</div>
        </div>
      </div>

      {/* Ticket list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {ticketTypes.map((tt, idx) => {
          const isSoldOut = !!(tt.capacity && tt.soldCount >= tt.capacity);
          const qty = selection[idx] ?? 0;
          const hasQty = qty > 0;
          const descLines = tt.description
            ? tt.description.split(/[•·\n]/).map((s) => s.trim()).filter(Boolean)
            : [];

          return (
            <div
              key={idx}
              style={{
                padding: '20px 0',
                borderBottom: '1px solid var(--line-2)',
                opacity: isSoldOut ? 0.4 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                {/* Left: name + price */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16, marginBottom: 4, color: 'var(--paper)' }}>{tt.label}</div>
                  <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 15, color: 'var(--cream)', marginBottom: descLines.length > 0 ? 12 : 0 }}>
                    {tt.price === 0 ? 'Free' : `₹${tt.price.toLocaleString('en-IN')}`}
                    {userDiscount && tt.price > 0 && (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--lime)', marginLeft: 8, letterSpacing: '.06em' }}>
                        → ₹{applyDiscount(tt.price).toLocaleString('en-IN')} after discount
                      </span>
                    )}
                  </div>
                  {descLines.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {descLines.map((line, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, fontFamily: 'var(--display)', fontSize: 12, color: 'var(--dim)', lineHeight: 1.5 }}>
                          <span style={{ flexShrink: 0, color: 'var(--line-2)' }}>•</span>
                          <span>{line}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: ADD or stepper */}
                <div style={{ flexShrink: 0, alignSelf: 'center' }}>
                  {isSoldOut ? (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.1em', border: '1px solid var(--line-2)', padding: '8px 14px', borderRadius: 4 }}>SOLD OUT</span>
                  ) : !hasQty ? (
                    <button
                      onClick={() => setQty(idx, 1)}
                      style={{ background: 'transparent', color: 'var(--paper)', border: '1px solid var(--line-2)', padding: '9px 22px', borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer', transition: 'border-color .15s, color .15s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--lime)'; e.currentTarget.style.color = 'var(--lime)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--paper)'; }}
                    >
                      Add
                    </button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid var(--lime)', borderRadius: 4, overflow: 'hidden' }}>
                      <button
                        onClick={() => setQty(idx, qty - 1)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--lime)', width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201,243,110,0.12)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        aria-label="Decrease"
                      >
                        −
                      </button>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: 'var(--paper)', minWidth: 28, textAlign: 'center', lineHeight: '36px' }}>
                        {qty}
                      </span>
                      <button
                        onClick={() => setQty(idx, qty + 1)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--lime)', width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201,243,110,0.12)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        aria-label="Increase"
                        disabled={!!(tt.capacity && qty >= (tt.capacity - tt.soldCount))}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--hot)', letterSpacing: '.06em', marginTop: 16, lineHeight: 1.5, textAlign: 'center' }}>
          {error}
        </div>
      )}

      {/* Sticky bottom bar */}
      {hasSelection && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: 'rgba(11,9,7,0.96)', backdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--line-2)',
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {totalAmount === 0 ? 'Free' : `₹${totalAmount.toLocaleString('en-IN')}`}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.1em', marginTop: 3 }}>
              {totalTickets} TICKET{totalTickets !== 1 ? 'S' : ''}
            </div>
          </div>
          <button
            onClick={handleBook}
            disabled={bookLoading}
            style={{
              background: 'var(--lime)', color: 'var(--ink)',
              border: 'none', padding: '14px 28px',
              borderRadius: 8, fontFamily: 'var(--display)', fontSize: 15, fontWeight: 700,
              cursor: bookLoading ? 'not-allowed' : 'pointer',
              opacity: bookLoading ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {bookLoading ? '…' : totalAmount === 0 ? 'Get passes →' : 'Book & pay →'}
          </button>
        </div>
      )}

      {/* UPI Payment modal */}
      {upiModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.82)', padding: 20 }} onClick={() => setUpiModal(null)}>
          <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 10, width: '100%', maxWidth: 440, boxShadow: '0 40px 80px -20px rgba(0,0,0,0.8)', animation: 'riseIn .25s cubic-bezier(.4,1.4,.5,1) both' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #1E293B' }}>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20 }}>Pay via UPI</div>
              <button onClick={() => setUpiModal(null)} aria-label="Close" style={{ background: 'transparent', border: 'none', color: '#64748B', fontSize: 28, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ fontFamily: 'var(--display)', fontSize: 14, color: '#94A3B8', lineHeight: 1.5 }}>
                Scan the QR with any UPI app and pay{' '}
                <strong style={{ color: '#F59E0B', fontSize: 16 }}>₹{upiModal.amount}</strong> to Clique.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/upi-qr.png" alt="UPI QR" style={{ width: 220, height: 220, borderRadius: 10, background: '#fff', padding: 8, objectFit: 'contain' }} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#64748B', letterSpacing: '.1em' }}>SCAN & PAY ₹{upiModal.amount}</span>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#94A3B8', letterSpacing: '.12em', marginBottom: 8 }}>UTR / TRANSACTION ID *</div>
                <input className="clique-input" style={{ width: '100%', padding: '12px 14px', fontSize: 14, borderRadius: 6, boxSizing: 'border-box' }} placeholder="Enter UTR number" value={utr} onChange={(e) => setUtr(e.target.value)} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#94A3B8', letterSpacing: '.12em', marginBottom: 8 }}>OR UPI ID YOU PAID FROM</div>
                <input className="clique-input" style={{ width: '100%', padding: '12px 14px', fontSize: 14, borderRadius: 6, boxSizing: 'border-box' }} placeholder="e.g. 9876543210@upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
              </div>
              {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--hot)', letterSpacing: '.06em' }}>{error}</div>}
              <button
                onClick={handleUPISubmit}
                disabled={upiSubmitting}
                style={{ width: '100%', background: 'var(--lime)', color: 'var(--ink)', border: 'none', padding: '16px', borderRadius: 6, fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', cursor: upiSubmitting ? 'not-allowed' : 'pointer', opacity: upiSubmitting ? 0.6 : 1 }}
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
    </div>
  );
}
