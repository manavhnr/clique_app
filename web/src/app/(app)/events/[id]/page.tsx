'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Calendar, Clock, MapPin, Users, Tag,
  ShieldCheck, AlertCircle, Bookmark, UserCheck,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import PassQRModal from '@/components/ui/PassQRModal';
import { Event, Pass, User } from '@/types';
import { formatDate, formatTime, formatPrice, getImageUrl, categoryLabel } from '@/lib/utils';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { usePayment } from '@/hooks/usePayment';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { paying, paymentError, setPaymentError, initiatePayment } = usePayment();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [earnedPass, setEarnedPass] = useState<Pass | null>(null);
  const [error, setError] = useState('');
  const [requestMsg, setRequestMsg] = useState('');

  useEffect(() => {
    api.get(`/events/${id}`)
      .then(({ data }) => setEvent(data.data.event))
      .catch(() => setEvent(null))
      .finally(() => setLoading(false));
  }, [id]);

  // Derived booking state
  const host = event ? (typeof event.hostId === 'object' ? event.hostId as User : null) : null;
  const isOwnEvent = host?._id === user?._id;
  const alreadyConfirmed = !!(event?.userBooking && ['confirmed', 'checked_in'].includes(event.userBooking.status));
  const paymentPending = event?.userBooking?.status === 'payment_pending';
  const isFull = event ? event.bookedCount >= event.capacity : false;

  const refreshEvent = () =>
    api.get(`/events/${id}`).then(({ data }) => setEvent(data.data.event)).catch(() => {});

  const handlePaymentSuccess = (pass: Pass) => {
    setEarnedPass(pass);
    refreshEvent();
  };

  const handleBook = async () => {
    setError('');
    setPaymentError('');
    setBookingLoading(true);
    try {
      const { data: resp } = await api.post('/bookings', { eventId: id });
      const { booking, pass } = resp.data;
      setConfirmOpen(false);

      if (event!.price > 0) {
        // Paid event → open Razorpay
        initiatePayment({
          bookingId: booking._id,
          eventTitle: event!.title,
          userName: user?.name ?? '',
          onSuccess: handlePaymentSuccess,
          onDismiss: () => {
            setError('Payment not completed. Your spot is held — tap "Complete Payment" to finish.');
            refreshEvent();
          },
        });
      } else {
        // Free event → pass generated immediately
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
    initiatePayment({
      bookingId: event.userBooking._id,
      eventTitle: event.title,
      userName: user?.name ?? '',
      onSuccess: handlePaymentSuccess,
      onDismiss: () => {},
    });
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

  if (loading) return (
    <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8" /></div>
  );

  if (!event) return (
    <div className="text-center py-24">
      <h3 className="text-white font-semibold text-lg">Event not found</h3>
      <Button variant="ghost" className="mt-4" onClick={() => router.back()}>Go back</Button>
    </div>
  );

  const imageUrl = event.images?.[0] ? getImageUrl(event.images[0]) : null;
  const displayError = error || paymentError;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-muted hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Hero image */}
      <div className="relative h-72 rounded-2xl overflow-hidden mb-6 bg-gradient-to-br from-primary/20 to-dark-border">
        {imageUrl ? (
          <img src={imageUrl} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">🎉</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute top-4 left-4 flex gap-2">
          <Badge variant="purple">{categoryLabel(event.category)}</Badge>
          {event.privacy === 'private' && <Badge variant="yellow">Private</Badge>}
          {event.status === 'cancelled' && <Badge variant="red">Cancelled</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-5">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{event.title}</h1>
            {host && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary-light">
                  {host.name?.[0]?.toUpperCase()}
                </div>
                <span className="text-sm text-muted">
                  Hosted by <span className="text-white font-medium">@{host.username}</span>
                </span>
                {host.isVerifiedHost && <ShieldCheck size={14} className="text-primary-light" />}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InfoCard icon={<Calendar size={18} className="text-primary-light mt-0.5 shrink-0" />} label="Date" value={formatDate(event.date)} />
            <InfoCard icon={<Clock size={18} className="text-primary-light mt-0.5 shrink-0" />} label="Time" value={`${formatTime(event.startTime)} – ${formatTime(event.endTime)}`} />
            <InfoCard
              icon={<MapPin size={18} className="text-primary-light mt-0.5 shrink-0" />}
              label="Location"
              value={event.locationName}
              sub={!event.exactAddressHiddenBeforeBooking ? event.address : undefined}
            />
            <InfoCard
              icon={<Users size={18} className="text-primary-light mt-0.5 shrink-0" />}
              label="Capacity"
              value={`${event.bookedCount} / ${event.capacity}`}
            />
          </div>

          <div className="bg-dark-card border border-dark-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-2">About this event</h3>
            <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{event.description}</p>
          </div>

          {event.vibeTags?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Tag size={14} /> Vibes
              </h3>
              <div className="flex flex-wrap gap-2">
                {event.vibeTags.map((tag) => <Badge key={tag} variant="purple">{tag}</Badge>)}
              </div>
            </div>
          )}

          {event.rules && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-yellow-400 mb-1.5 flex items-center gap-2">
                <AlertCircle size={14} /> Rules
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed">{event.rules}</p>
            </div>
          )}

          {event.refundPolicy && (
            <div className="bg-dark-card border border-dark-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-1.5">Refund Policy</h3>
              <p className="text-sm text-muted leading-relaxed">{event.refundPolicy}</p>
            </div>
          )}
        </div>

        {/* Right: booking card */}
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-dark-card border border-dark-border rounded-2xl p-5 sticky top-6">
            <div className="text-center mb-5">
              <p className="text-3xl font-bold text-white">{formatPrice(event.price)}</p>
              {event.price > 0 && (event.platformFee ?? 0) > 0 && (
                <p className="text-xs text-muted mt-0.5">+ ₹{event.platformFee} platform fee</p>
              )}
              <p className="text-xs text-muted mt-1">
                {isFull
                  ? <span className="text-red-400">Event is full</span>
                  : `${event.capacity - event.bookedCount} spots left`}
              </p>
            </div>

            {event.status === 'cancelled' ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                <p className="text-sm text-red-400">This event has been cancelled</p>
              </div>
            ) : alreadyConfirmed ? (
              <div className="space-y-2">
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center flex items-center justify-center gap-2">
                  <UserCheck size={16} className="text-green-400" />
                  <p className="text-sm text-green-400 font-medium">You&apos;re going!</p>
                </div>
                <Button variant="secondary" className="w-full" size="sm" onClick={() => router.push('/passes')}>
                  View My Pass
                </Button>
              </div>
            ) : paymentPending ? (
              <div className="space-y-2">
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center">
                  <p className="text-sm text-yellow-400 font-medium">Payment pending</p>
                  <p className="text-xs text-muted mt-0.5">Complete payment to get your pass</p>
                </div>
                <Button className="w-full" size="sm" loading={paying} onClick={handleCompletePayment}>
                  Complete Payment
                </Button>
              </div>
            ) : isOwnEvent ? (
              <p className="text-center text-sm text-muted">You&apos;re hosting this event</p>
            ) : (
              <div className="space-y-2">
                <Button
                  className="w-full"
                  size="lg"
                  disabled={isFull || event.status !== 'published'}
                  onClick={() => { setError(''); setPaymentError(''); setConfirmOpen(true); }}
                >
                  {event.approvalRequired ? 'Request Access' : 'Book Pass'}
                </Button>
                <Button variant="secondary" className="w-full" size="sm" loading={saveLoading} onClick={handleSave}>
                  <Bookmark size={14} className={event.saved ? 'fill-white' : ''} />
                  {event.saved ? 'Saved' : 'Save Event'}
                </Button>
              </div>
            )}

            {displayError && (
              <p className="text-xs text-red-400 mt-3 text-center leading-relaxed">{displayError}</p>
            )}
          </div>

          {event.ageLimit && (
            <div className="bg-dark-card border border-dark-border rounded-xl p-3 text-center">
              <p className="text-xs text-muted">Age Restriction</p>
              <p className="text-sm font-semibold text-white mt-0.5">{event.ageLimit}+ only</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirm booking modal */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={event.approvalRequired ? 'Request Access' : 'Confirm Booking'}
      >
        <div className="space-y-4">
          <div className="bg-dark border border-dark-border rounded-xl p-4">
            <p className="text-white font-medium text-sm">{event.title}</p>
            <p className="text-xs text-muted mt-1">{formatDate(event.date)} · {formatTime(event.startTime)}</p>
            <p className="text-xs text-muted">{event.locationName}</p>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted">Entry fee</span>
              <span className="font-semibold text-white">{formatPrice(event.price)}</span>
            </div>
            {event.price > 0 && (event.platformFee ?? 0) > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-muted">Platform fee</span>
                <span className="text-white">₹{event.platformFee}</span>
              </div>
            )}
            {event.price > 0 && (
              <div className="flex justify-between items-center border-t border-dark-border pt-2 font-semibold">
                <span className="text-white">Total</span>
                <span className="text-white">₹{event.price + (event.platformFee ?? 0)}</span>
              </div>
            )}
          </div>

          {event.approvalRequired && (
            <textarea
              value={requestMsg}
              onChange={(e) => setRequestMsg(e.target.value)}
              placeholder="Add a message to the host (optional)..."
              rows={2}
              className="w-full bg-dark border border-dark-border rounded-xl px-3 py-2 text-white text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" loading={bookingLoading} onClick={handleBook}>
              {event.price > 0 ? 'Pay & Book' : 'Confirm'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Pass QR modal — shown after successful booking/payment */}
      <PassQRModal
        open={!!earnedPass}
        onClose={() => setEarnedPass(null)}
        pass={earnedPass}
        event={{
          title: event.title,
          date: event.date,
          startTime: event.startTime,
          locationName: event.locationName,
        }}
        onViewPasses={() => { setEarnedPass(null); router.push('/passes'); }}
      />
    </div>
  );
}

function InfoCard({
  icon, label, value, sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-3 flex items-start gap-3">
      {icon}
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-sm font-medium text-white mt-0.5 line-clamp-1">{value}</p>
        {sub && <p className="text-xs text-muted mt-0.5 line-clamp-1">{sub}</p>}
      </div>
    </div>
  );
}
