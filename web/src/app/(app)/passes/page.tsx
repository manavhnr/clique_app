'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pass, Event, Booking } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { usePayment } from '@/hooks/usePayment';
import { formatDate, formatPrice } from '@/lib/utils';
import api from '@/lib/api';

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

function PseudoQR({ seed, size = 72 }: { seed: string; size?: number }) {
  function hash(s: string) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  const N = 21;
  const cells: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false));
  [[0, 0], [0, 14], [14, 0]].forEach(([r, c]) => {
    for (let dr = 0; dr < 7; dr++) for (let dc = 0; dc < 7; dc++) {
      cells[r + dr][c + dc] = dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4);
    }
  });
  let h = hash(seed);
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const inFinder = (r < 8 && c < 8) || (r < 8 && c >= 13) || (r >= 13 && c < 8);
    if (!inFinder) { h ^= (r * 31 + c); h = Math.imul(h, 1000003); cells[r][c] = (h & 1) === 1; }
  }
  const cell = size / N;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges">
      <rect width={size} height={size} fill="transparent" />
      {cells.flatMap((row, r) => row.map((on, c) => on ? (
        <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#0B0907" />
      ) : null))}
    </svg>
  );
}

function fmtHour(t: string) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${String(m).padStart(2, '0')} ${ampm}`;
}

function Spinner() {
  return <div style={{ width: 32, height: 32, border: '2px solid var(--line-2)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}

function PassQRModal({ pass, event, onClose }: { pass: Pass; event: Event | null; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,9,7,0.92)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div style={{ background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 20, padding: 32, maxWidth: 360, width: '100%', animation: 'riseIn .3s ease-out' }} onClick={(e) => e.stopPropagation()}>
        {event && (
          <div style={{ textAlign: 'center', marginBottom: 24, paddingBottom: 24, borderBottom: '1px dashed var(--line)' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--dim)' }}>YOUR PASS</div>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 24, letterSpacing: '-0.02em', marginTop: 8 }}>{event.title}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--cream)', letterSpacing: '.06em', marginTop: 6 }}>
              {event.startTime && event.endTime ? `${fmtHour(event.startTime)} → ${fmtHour(event.endTime)}` : formatDate(event.date)}
            </div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 13, color: 'var(--cream)', marginTop: 4 }}>{event.locationName}</div>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          {pass.status === 'used' ? (
            <div style={{ width: 200, height: 200, background: 'var(--paper)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
              <div style={{ color: 'var(--lime)', fontSize: 64, lineHeight: 1 }}>✓</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink)', letterSpacing: '.1em' }}>CHECKED IN</div>
            </div>
          ) : (pass.status === 'cancelled' || pass.status === 'expired') ? (
            <div style={{ width: 200, height: 200, background: 'var(--line)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 28, color: 'var(--dim)' }}>○</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '.1em' }}>{pass.status.toUpperCase()}</div>
            </div>
          ) : pass.qrCodeUrl ? (
            <div style={{ background: 'var(--paper)', borderRadius: 12, padding: 12 }}>
              <img src={pass.qrCodeUrl} alt="QR Code" style={{ width: 176, height: 176, objectFit: 'contain' }} />
            </div>
          ) : (
            <div style={{ background: 'var(--paper)', borderRadius: 12, padding: 12 }}>
              <PseudoQR seed={pass._id} size={176} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', color: pass.status === 'active' ? 'var(--lime)' : 'var(--dim)' }}>
            {pass.status === 'active' ? '● ACTIVE · SHOW AT THE DOOR' : pass.status === 'used' ? '✓ CHECKED IN' : '○ ' + pass.status.toUpperCase()}
          </div>
        </div>
        <button onClick={onClose} style={{ width: '100%', background: 'transparent', border: '1px solid var(--line-2)', color: 'var(--cream)', padding: '12px 0', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
          Close
        </button>
      </div>
    </div>
  );
}

type PassGroup = { upcoming: Pass[]; past: Pass[]; cancelled: Pass[] };

const TABS = [
  { key: 'upcoming' as const, label: 'active' },
  { key: 'past' as const, label: 'used' },
  { key: 'cancelled' as const, label: 'cancelled' },
];

export default function PassesPage() {
  const isMobile = useIsMobile();
  const router = useRouter();
  const { user } = useAuth();
  const { paying, initiatePayment } = usePayment();

  const [passes, setPasses] = useState<PassGroup>({ upcoming: [], past: [], cancelled: [] });
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [openPass, setOpenPass] = useState<Pass | null>(null);
  const [passDetail, setPassDetail] = useState<Pass | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = () => {
    return Promise.all([
      api.get('/passes/my'),
      api.get('/bookings/my?limit=50'),
    ])
      .then(([passesResp, bookingsResp]) => {
        setPasses(passesResp.data.data);
        const allBookings: Booking[] = bookingsResp.data.data.bookings;
        setPendingBookings(allBookings.filter((b) => b.status === 'payment_pending'));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenPass = async (pass: Pass) => {
    setOpenPass(pass);
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
    initiatePayment({
      bookingId: booking._id,
      eventTitle: evt?.title ?? 'Event',
      userName: user?.name ?? '',
      onSuccess: () => { setLoading(true); fetchData(); },
      onDismiss: () => {},
    });
  };

  const displayPasses = passes[activeTab];
  const activeCount = passes.upcoming.length;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '96px 0' }}>
      <Spinner />
    </div>
  );

  return (
    <div>
      {/* Page head */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: isMobile ? 20 : 32, paddingBottom: isMobile ? 16 : 24, borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)', marginBottom: 8 }}>YOUR PASSES</div>
          <h1 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: isMobile ? 'clamp(32px, 9vw, 48px)' : 'clamp(40px, 5vw, 64px)', lineHeight: 0.95, letterSpacing: '-0.03em', margin: 0 }}>
            The list.<br />
            <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--lime)' }}>Show at the door.</span>
          </h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--dim)' }}>ACTIVE</div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: isMobile ? 36 : 56, lineHeight: 1, letterSpacing: '-0.03em' }}>
            {String(activeCount).padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* Pending payments */}
      {pendingBookings.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--hot)', marginBottom: 14 }}>
            AWAITING PAYMENT · {pendingBookings.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingBookings.map((booking) => {
              const evt = typeof booking.eventId === 'object' ? booking.eventId as Event : null;
              return (
                <div key={booking._id} style={{ background: '#14110E', border: '1px solid rgba(255,61,110,0.3)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 15, fontWeight: 600, color: 'var(--paper)' }}>{evt?.title ?? 'Event'}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.08em', marginTop: 4 }}>
                      {formatPrice(booking.amount)} · PENDING
                    </div>
                  </div>
                  <button onClick={() => handleCompletePayment(booking)} disabled={paying}
                    style={{ background: 'var(--lime)', color: 'var(--ink)', border: 'none', padding: '10px 16px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', cursor: paying ? 'not-allowed' : 'pointer', opacity: paying ? 0.6 : 1 }}>
                    Pay now →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
        {TABS.map(({ key, label }) => {
          const on = activeTab === key;
          const count = passes[key].length;
          return (
            <button key={key} onClick={() => setActiveTab(key)} style={{ background: on ? 'var(--lime)' : 'transparent', color: on ? 'var(--ink)' : 'var(--cream)', border: `1px solid ${on ? 'var(--lime)' : 'var(--line-2)'}`, padding: '8px 14px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all .15s ease', whiteSpace: 'nowrap' }}>
              {label} <span style={{ opacity: 0.6 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {displayPasses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', border: '1px solid var(--line-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: 32, color: 'var(--dim)', margin: '0 auto 14px' }}>
            {activeTab === 'upcoming' ? '○' : '✓'}
          </div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em', marginBottom: 8 }}>
            {activeTab === 'upcoming' ? 'No active passes.' : 'Nothing here yet.'}
          </div>
          {activeTab === 'upcoming' && (
            <>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--dim)', letterSpacing: '.08em', marginBottom: 22 }}>BOOK SOMETHING TONIGHT TO GET YOUR FIRST PASS</div>
              <button onClick={() => router.push('/events')} style={{ background: 'var(--lime)', color: 'var(--ink)', border: 'none', padding: '12px 20px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                Browse tonight →
              </button>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: isMobile ? 12 : 18 }}>
          {displayPasses.map((pass) => (
            <PassCard key={pass._id} pass={pass} onOpen={() => handleOpenPass(pass)} />
          ))}
        </div>
      )}

      {/* QR modal */}
      {openPass && detailLoading && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,9,7,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner />
        </div>
      )}
      {openPass && !detailLoading && (
        <PassQRModal
          pass={passDetail ?? openPass}
          event={typeof (passDetail ?? openPass).eventId === 'object' ? (passDetail ?? openPass).eventId as Event : null}
          onClose={() => { setOpenPass(null); setPassDetail(null); }}
        />
      )}
    </div>
  );
}

function PassCard({ pass, onOpen }: { pass: Pass; onOpen: () => void }) {
  const evt = typeof pass.eventId === 'object' ? pass.eventId as Event : null;
  const status = pass.status;
  const statusColor = status === 'active' ? 'var(--lime)' : status === 'used' ? 'var(--dim)' : 'var(--hot)';
  const statusLabel = status === 'active' ? '● ACTIVE' : status === 'used' ? '✓ USED' : '○ ' + status.toUpperCase();
  const isActive = status === 'active';

  return (
    <div onClick={onOpen}
      style={{ position: 'relative', background: '#14110E', border: `1px solid ${isActive ? 'rgba(201,243,110,0.3)' : 'var(--line-2)'}`, borderRadius: 16, overflow: 'hidden', cursor: 'pointer', transition: 'transform .25s ease, border-color .25s ease, box-shadow .25s ease', padding: 22, opacity: isActive ? 1 : 0.65 }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.borderColor = isActive ? 'var(--lime)' : 'var(--cream)'; if (isActive) (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 1px var(--lime)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.borderColor = isActive ? 'rgba(201,243,110,0.3)' : 'var(--line-2)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
    >
      {/* Perforation */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 88, height: 1, backgroundImage: 'linear-gradient(to right, var(--line-2) 50%, transparent 0%)', backgroundSize: '7px 1px' }} />
      <div style={{ position: 'absolute', left: -7, top: 81, width: 14, height: 14, background: 'var(--ink)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', right: -7, top: 81, width: 14, height: 14, background: 'var(--ink)', borderRadius: '50%' }} />

      {/* Head */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, minHeight: 64, alignItems: 'flex-start', paddingBottom: 26 }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--dim)' }}>
            {evt ? evt.category.replace('_', ' ').toUpperCase() : 'EVENT'}
          </div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--paper)', marginTop: 6 }}>
            {evt?.title ?? 'Event'}
          </div>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.1em', textAlign: 'right', flexShrink: 0 }}>
          <span style={{ color: statusColor, letterSpacing: '.12em', display: 'block', marginBottom: 4 }}>{statusLabel}</span>
          № {pass._id.slice(-6).toUpperCase()}
        </div>
      </div>

      {/* Mini body */}
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 16, paddingTop: 18 }}>
        <div style={{ width: 80, height: 80, borderRadius: 8, background: isActive ? 'var(--paper)' : '#26221C', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6 }}>
          {isActive && <PseudoQR seed={pass._id} size={68} />}
          {status === 'used' && <div style={{ color: 'var(--lime)', fontSize: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>✓</div>}
          {(status === 'expired' || status === 'cancelled') && <div style={{ color: 'var(--dim)', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.1em', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>{status.toUpperCase()}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {evt && (
            <>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.14em', color: 'var(--dim)' }}>WHEN</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 13, marginTop: 4 }}>
                  {evt.startTime ? `${fmtHour(evt.startTime)} → ${fmtHour(evt.endTime)}` : formatDate(evt.date)}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.14em', color: 'var(--dim)' }}>WHERE</div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 14, marginTop: 4, lineHeight: 1.2 }}>{evt.locationName}</div>
              </div>
            </>
          )}
          {pass.checkedInAt && (
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.14em', color: 'var(--dim)' }}>CHECKED IN</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, marginTop: 4, color: 'var(--lime)' }}>
                {new Date(pass.checkedInAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTop: '1px dashed var(--line)', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', color: 'var(--dim)', textTransform: 'uppercase' }}>
        TAP TO SHOW QR <span>→</span>
      </div>
    </div>
  );
}
