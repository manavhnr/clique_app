'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Calendar, Clock, MapPin, QrCode, CheckCircle2, XCircle, CreditCard, Music2, Ticket } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import PassQRModal from '@/components/ui/PassQRModal';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import { Pass, Booking, Event, User } from '@/types';
import { formatDate, formatTime, formatPrice, getImageUrl } from '@/lib/utils';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { usePayment } from '@/hooks/usePayment';

type PassGroup = { upcoming: Pass[]; past: Pass[]; cancelled: Pass[] };

export default function PassesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { paying, paymentError, setPaymentError, initiatePayment } = usePayment();

  const [passes, setPasses] = useState<PassGroup>({ upcoming: [], past: [], cancelled: [] });
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [selectedPass, setSelectedPass] = useState<Pass | null>(null);
  const [passDetail, setPassDetail] = useState<Pass | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [earnedPass, setEarnedPass] = useState<Pass | null>(null);

  const fetchData = () => {
    setFetchError('');
    return Promise.all([
      api.get('/passes/my'),
      api.get('/bookings/my?limit=50'),
    ])
      .then(([passesResp, bookingsResp]) => {
        setPasses(passesResp.data.data);
        const allBookings: Booking[] = bookingsResp.data.data.bookings;
        setPendingBookings(allBookings.filter((b) => b.status === 'payment_pending'));
      })
      .catch(() => setFetchError('Could not load passes. Please refresh.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenPass = async (pass: Pass) => {
    setSelectedPass(pass);
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/passes/${pass._id}`);
      setPassDetail(data.data.pass);
    } catch {
      setPassDetail(pass);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCompletePayment = (booking: Booking) => {
    const evt = typeof booking.eventId === 'object' ? booking.eventId as Event : null;
    setPaymentError('');
    initiatePayment({
      bookingId: booking._id,
      eventTitle: evt?.title ?? 'Event',
      userName: user?.name ?? '',
      onSuccess: (pass) => {
        setEarnedPass(pass);
        // Refresh data so the pending booking moves to passes
        setLoading(true);
        fetchData();
      },
      onDismiss: () => {},
    });
  };

  const displayPasses = passes[activeTab];

  if (loading) return (
    <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8" /></div>
  );

  if (fetchError) return (
    <div className="text-center py-24">
      <p className="text-red-400 text-sm mb-4">{fetchError}</p>
      <Button variant="secondary" onClick={() => { setLoading(true); fetchData(); }}>Retry</Button>
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">My Passes</h1>
        <p className="text-muted text-sm">Your event QR passes</p>
      </div>

      {/* Pending payments */}
      {pendingBookings.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
            <CreditCard size={14} />
            Pending Payment ({pendingBookings.length})
          </h2>
          <div className="space-y-3">
            {pendingBookings.map((booking) => {
              const evt = typeof booking.eventId === 'object' ? booking.eventId as Event : null;
              return (
                <div key={booking._id} className="bg-dark-card border border-yellow-500/20 rounded-2xl p-4 flex items-center gap-4">
                  {evt?.images?.[0] ? (
                    <img
                      src={getImageUrl(evt.images[0])}
                      alt={evt.title}
                      className="w-14 h-14 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Music2 size={20} className="text-primary/60" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm line-clamp-1">{evt?.title ?? 'Event'}</p>
                    {evt?.date && (
                      <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                        <Calendar size={10} />
                        {formatDate(evt.date)}
                        {evt.startTime && <> · {formatTime(evt.startTime)}</>}
                      </p>
                    )}
                    <p className="text-xs text-yellow-500/80 mt-1">
                      {formatPrice(booking.amount)} · awaiting payment
                    </p>
                  </div>
                  <Button
                    size="sm"
                    loading={paying}
                    onClick={() => handleCompletePayment(booking)}
                    className="shrink-0"
                  >
                    Pay Now
                  </Button>
                </div>
              );
            })}
            {paymentError && (
              <p className="text-xs text-red-400 px-1">{paymentError}</p>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {(['upcoming', 'past', 'cancelled'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-colors duration-150 capitalize border ${
              activeTab === tab
                ? 'bg-primary border-primary text-white'
                : 'border-dark-border text-muted hover:text-white'
            }`}
          >
            {tab}
            {passes[tab].length > 0 && (
              <span className="ml-1 opacity-70">({passes[tab].length})</span>
            )}
          </button>
        ))}
      </div>

      {displayPasses.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-16 h-16 rounded-2xl bg-dark-card border border-dark-border flex items-center justify-center mx-auto mb-4">
            <Ticket size={28} className="text-muted" />
          </div>
          <h3 className="text-white font-semibold text-lg mb-1">No {activeTab} passes</h3>
          <p className="text-muted text-sm mb-6">
            {activeTab === 'upcoming'
              ? 'Book an event to get your QR pass.'
              : 'Passes will appear here after events.'}
          </p>
          {activeTab === 'upcoming' && (
            <Button onClick={() => router.push('/events')}>Explore Events</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {displayPasses.map((pass) => {
            const evt = typeof pass.eventId === 'object' ? pass.eventId as Event : null;
            return (
              <div
                key={pass._id}
                onClick={() => handleOpenPass(pass)}
                className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden cursor-pointer hover:border-primary/40 transition-all duration-200 group"
              >
                {evt?.images?.[0] && (
                  <div className="h-28 overflow-hidden">
                    <img
                      src={getImageUrl(evt.images[0])}
                      alt={evt.title ?? ''}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="text-white font-semibold text-sm line-clamp-1">{evt?.title ?? 'Event'}</h3>
                    <PassStatusBadge status={pass.status} />
                  </div>

                  {evt && (
                    <div className="space-y-1 text-xs text-muted">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={11} />
                        <span>{formatDate(evt.date)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={11} />
                        <span>{formatTime(evt.startTime)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin size={11} />
                        <span className="line-clamp-1">{evt.locationName}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1 border-t border-dark-border">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <QrCode size={16} className="text-primary-light" />
                    </div>
                    <span className="text-xs text-muted">Tap to view QR pass</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pass detail modal */}
      <Modal
        open={!!selectedPass}
        onClose={() => { setSelectedPass(null); setPassDetail(null); }}
        title="Your Pass"
        size="sm"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-8"><Spinner /></div>
        ) : passDetail ? (
          <PassDetailView pass={passDetail} />
        ) : null}
      </Modal>

      {/* Post-payment pass modal */}
      <PassQRModal
        open={!!earnedPass}
        onClose={() => setEarnedPass(null)}
        pass={earnedPass}
        event={earnedPass
          ? (() => {
              const evt = pendingBookings.find(
                (b) => typeof b.eventId === 'object' && b.eventId
              );
              const e = evt ? evt.eventId as Event : null;
              return e ? { title: e.title, date: e.date, startTime: e.startTime, locationName: e.locationName } : null;
            })()
          : null}
      />
    </div>
  );
}

function PassStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'green' | 'blue' | 'yellow' | 'red' | 'default' }> = {
    active: { label: 'Active', variant: 'green' },
    used: { label: 'Used', variant: 'blue' },
    expired: { label: 'Expired', variant: 'yellow' },
    cancelled: { label: 'Cancelled', variant: 'red' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'default' };
  return <Badge variant={variant}>{label}</Badge>;
}

function PassDetailView({ pass }: { pass: Pass }) {
  const evt = typeof pass.eventId === 'object' ? pass.eventId as Event : null;
  const attendee = typeof pass.userId === 'object' ? pass.userId as User : null;

  return (
    <div className="space-y-5">
      {evt && (
        <div className="text-center">
          <h3 className="text-white font-bold text-lg">{evt.title}</h3>
          {evt.date && (
            <p className="text-sm text-muted mt-0.5">
              {formatDate(String(evt.date))}
              {evt.startTime && ` · ${formatTime(evt.startTime)}`}
            </p>
          )}
          {evt.locationName && <p className="text-xs text-muted">{evt.locationName}</p>}
        </div>
      )}

      {attendee && (
        <div className="flex items-center gap-3 bg-dark border border-dark-border rounded-xl p-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary-light">
            {attendee.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-white text-sm font-medium">{attendee.name}</p>
            <p className="text-xs text-muted">@{attendee.username}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        {pass.status === 'used' ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <CheckCircle2 size={48} className="text-green-400" />
            <p className="text-green-400 font-semibold">Checked In</p>
            {pass.checkedInAt && (
              <p className="text-xs text-muted">{new Date(pass.checkedInAt).toLocaleString()}</p>
            )}
          </div>
        ) : pass.status === 'cancelled' ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <XCircle size={48} className="text-red-400" />
            <p className="text-red-400 font-semibold">Cancelled</p>
          </div>
        ) : pass.qrCodeUrl ? (
          <div className="p-4 bg-white rounded-2xl">
            <img src={pass.qrCodeUrl} alt="QR Pass" className="w-52 h-52 object-contain" />
          </div>
        ) : (
          <div className="p-4 bg-white rounded-2xl">
            <QRCodeSVG value={pass._id} size={200} />
          </div>
        )}

        <PassStatusBadge status={pass.status} />
        {pass.status === 'active' && (
          <p className="text-xs text-muted text-center">Show this QR at the door for entry</p>
        )}
      </div>
    </div>
  );
}
