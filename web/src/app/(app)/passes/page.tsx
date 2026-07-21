'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Pass, Event, Booking } from '@/types';
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,9,7,0.94)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div style={{ background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 6, padding: 0, maxWidth: 360, width: '100%', animation: 'riseIn .3s ease-out', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
        {event && (
          <div style={{ textAlign: 'center', padding: '26px 28px 22px' }}>
            <div className="clique-label">YOUR PASS</div>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.02em', marginTop: 8, lineHeight: 1 }}>{event.title}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--cream)', letterSpacing: '.06em', marginTop: 8 }}>
              {event.startTime && event.endTime ? `${fmtHour(event.startTime)} → ${fmtHour(event.endTime)}` : formatDate(event.date)}
            </div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 13, color: 'var(--cream)', marginTop: 4 }}>{event.locationName}</div>
          </div>
        )}

        {/* Perforation */}
        <div style={{ position: 'relative' }}>
          <div className="perf" />
          <span aria-hidden style={{ position: 'absolute', left: -8, top: -7, width: 14, height: 14, background: 'var(--ink)', borderRadius: '50%', border: '1px solid var(--line-2)' }} />
          <span aria-hidden style={{ position: 'absolute', right: -8, top: -7, width: 14, height: 14, background: 'var(--ink)', borderRadius: '50%', border: '1px solid var(--line-2)' }} />
        </div>

        <div style={{ padding: '24px 28px 26px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            {pass.status === 'used' ? (
              <div style={{ width: 200, height: 200, background: 'var(--paper)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
                <span className="stamp" style={{ color: '#3a7a1e', fontSize: 15, padding: '10px 16px 9px' }}>✓ CHECKED IN</span>
              </div>
            ) : (pass.status === 'cancelled' || pass.status === 'expired') ? (
              <div style={{ width: 200, height: 200, background: 'var(--line)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="stamp" style={{ color: 'var(--dim)', fontSize: 13, padding: '8px 14px 7px' }}>{pass.status.toUpperCase()}</span>
              </div>
            ) : (
              /* Real scannable QR — prefer the JWT token (from getPassById), fall back to Cloudinary image */
              <div style={{ background: 'var(--paper)', borderRadius: 4, padding: 14 }}>
                {(pass as Pass & { qrToken?: string }).qrToken ? (
                  <QRCodeSVG
                    value={(pass as Pass & { qrToken?: string }).qrToken!}
                    size={176}
                    bgColor="#FFFFFF"
                    fgColor="#0B0907"
                    level="M"
                  />
                ) : pass.qrCodeUrl ? (
                  <img src={pass.qrCodeUrl} alt="QR Code" style={{ width: 176, height: 176, objectFit: 'contain', display: 'block' }} />
                ) : (
                  /* Last-resort: generate QR from pass ID — scanner will reject it, but at least it's a real QR */
                  <QRCodeSVG value={pass._id} size={176} bgColor="#FFFFFF" fgColor="#0B0907" level="M" />
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: pass.status === 'active' ? 'var(--lime)' : 'var(--dim)' }}>
              {pass.status === 'active' ? '● ACTIVE · SHOW AT THE DOOR' : pass.status === 'used' ? '✓ CHECKED IN' : '○ ' + pass.status.toUpperCase()}
            </div>
          </div>
          <div className="barcode" aria-hidden style={{ height: 22, color: 'var(--line-2)', marginBottom: 6 }} />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.3em', color: 'var(--dim)', textAlign: 'center', marginBottom: 18 }}>
            № {pass._id.slice(-8).toUpperCase()}
          </div>
          <button onClick={onClose} style={{ width: '100%', background: 'transparent', border: '1px solid var(--line-2)', color: 'var(--cream)', padding: '12px 0', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
            Close
          </button>
        </div>
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
  const [passes, setPasses] = useState<PassGroup>({ upcoming: [], past: [], cancelled: [] });
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [openPass, setOpenPass] = useState<Pass | null>(null);
  const [passDetail, setPassDetail] = useState<Pass | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [upiModal, setUpiModal] = useState<{ bookingId: string; amount: number } | null>(null);
  const [utr, setUtr] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [upiSubmitting, setUpiSubmitting] = useState(false);
  const [upiError, setUpiError] = useState('');

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
    setUtr(''); setProofFile(null); setUpiError('');
    setUpiModal({ bookingId: booking._id, amount: booking.amount / 100 });
  };

  const handleUPISubmit = async () => {
    if (!upiModal) return;
    if (!utr.trim()) { setUpiError('Enter the UTR / transaction ID.'); return; }
    setUpiError(''); setUpiSubmitting(true);
    try {
      let proofUrl: string | undefined;
      if (proofFile) {
        const form = new FormData();
        form.append('proof', proofFile);
        const { data: uploadRes } = await api.post('/payments/upload-proof', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        proofUrl = uploadRes.data.url;
      }
      await api.post('/payments/upi-submit', { bookingId: upiModal.bookingId, utrNumber: utr.trim(), transactionProofUrl: proofUrl });
      setUpiModal(null);
      setLoading(true);
      fetchData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setUpiError(e.response?.data?.message ?? 'Submission failed');
    } finally { setUpiSubmitting(false); }
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
      {/* Masthead */}
      <div style={{ marginBottom: isMobile ? 18 : 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span aria-hidden style={{ height: 1, width: 20, background: 'var(--line-2)' }} />
          <div className="clique-label" style={{ whiteSpace: 'nowrap' }}>YOUR PASSES</div>
          <span aria-hidden style={{ height: 1, flex: 1, background: 'var(--line-2)' }} />
          <div className="clique-label" style={{ whiteSpace: 'nowrap' }}>{String(activeCount).padStart(2, '0')} ACTIVE</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginTop: 16, paddingBottom: isMobile ? 16 : 22, borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: isMobile ? 'clamp(32px, 9vw, 48px)' : 'clamp(40px, 5vw, 64px)', lineHeight: 0.95, letterSpacing: '-0.03em', margin: 0 }}>
            The stubs.<br />
            <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--lime)' }}>Show at the door.</span>
          </h1>
          {!isMobile && (
            <div style={{ textAlign: 'right', paddingBottom: 4 }}>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 56, lineHeight: 1, letterSpacing: '-0.03em' }}>
                {String(activeCount).padStart(2, '0')}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--dim)', marginTop: 4 }}>ACTIVE</div>
            </div>
          )}
        </div>
      </div>

      {/* Pending payments */}
      {pendingBookings.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--hot)', marginBottom: 10 }}>
            AWAITING PAYMENT · {pendingBookings.length}
          </div>
          <div className="ledger">
            {pendingBookings.map((booking) => {
              const evt = typeof booking.eventId === 'object' ? booking.eventId as Event : null;
              return (
                <div key={booking._id} className="ledger-row" style={{ padding: '14px 4px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span className="stamp stamp-alt" style={{ color: 'var(--hot)', flexShrink: 0 }}>Unpaid</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 16, fontWeight: 600, color: 'var(--paper)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{evt?.title ?? 'Event'}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.08em', marginTop: 3 }}>
                      {formatPrice(booking.amount)} DUE
                    </div>
                  </div>
                  <button onClick={() => handleCompletePayment(booking)}
                    style={{ background: 'var(--lime)', color: 'var(--ink)', border: 'none', padding: '11px 16px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0 }}>
                    Pay now →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        {TABS.map(({ key, label }) => {
          const on = activeTab === key;
          const count = passes[key].length;
          return (
            <button key={key} onClick={() => setActiveTab(key)} aria-pressed={on} style={{ background: on ? 'var(--lime)' : 'transparent', color: on ? 'var(--ink)' : 'var(--cream)', border: `1px solid ${on ? 'var(--lime)' : 'var(--line-2)'}`, padding: '8px 14px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all .15s ease', whiteSpace: 'nowrap' }}>
              {label} <span style={{ opacity: 0.6 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {displayPasses.length === 0 ? (
        <div className="ledger" style={{ padding: '56px 8px 64px' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.16em', color: 'var(--dim)', marginBottom: 14 }}>№ 000 — NO STUBS</div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: isMobile ? 28 : 36, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 10 }}>
            {activeTab === 'upcoming' ? 'No active passes.' : 'Nothing here yet.'}
          </div>
          {activeTab === 'upcoming' && (
            <>
              <div style={{ fontFamily: 'var(--display)', fontSize: 15, color: 'var(--cream)', marginBottom: 24, maxWidth: '46ch', lineHeight: 1.45 }}>
                Get on a list tonight and your first pass shows up here, QR and all.
              </div>
              <button onClick={() => router.push('/events')} style={{ background: 'var(--lime)', color: 'var(--ink)', border: 'none', padding: '13px 20px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                Browse tonight →
              </button>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))', gap: isMobile ? 14 : 20 }}>
          {displayPasses.map((pass) => (
            <PassCard key={pass._id} pass={pass} onOpen={() => handleOpenPass(pass)} />
          ))}
        </div>
      )}

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
                <strong style={{ color: '#F59E0B', fontSize: 16 }}>₹{upiModal.amount}</strong> to Clique.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <img src="/upi-qr.png" alt="UPI QR Code" style={{ width: 220, height: 220, borderRadius: 10, background: '#fff', padding: 8, objectFit: 'contain' }} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#64748B', letterSpacing: '.1em' }}>SCAN & PAY ₹{upiModal.amount}</span>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#94A3B8', letterSpacing: '.12em', marginBottom: 8 }}>UTR / TRANSACTION ID *</div>
                <input className="clique-input" style={{ width: '100%', padding: '12px 14px', fontSize: 14, borderRadius: 6, boxSizing: 'border-box' }} placeholder="Enter UTR number" value={utr} onChange={(e) => setUtr(e.target.value)} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#94A3B8', letterSpacing: '.12em', marginBottom: 8 }}>TRANSACTION SCREENSHOT (OPTIONAL)</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px dashed #334155', borderRadius: 6, padding: 12, cursor: 'pointer', color: proofFile ? '#60A5FA' : '#64748B', fontFamily: 'var(--display)', fontSize: 13 }}>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} />
                  {proofFile ? `✓ ${proofFile.name}` : '+ Upload payment screenshot'}
                </label>
              </div>
              {upiError && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--hot)', letterSpacing: '.06em' }}>{upiError}</div>}
              <button onClick={handleUPISubmit} disabled={upiSubmitting} style={{ width: '100%', background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '16px', borderRadius: 6, fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', cursor: upiSubmitting ? 'not-allowed' : 'pointer', opacity: upiSubmitting ? 0.6 : 1 }}>
                {upiSubmitting ? 'SUBMITTING…' : 'SUBMIT PAYMENT PROOF →'}
              </button>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#64748B', letterSpacing: '.08em', textAlign: 'center' }}>YOUR PASS WILL BE ISSUED AFTER VERIFICATION</div>
            </div>
          </div>
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
  const isActive = status === 'active';
  const stampColor = status === 'active' ? 'var(--lime)' : status === 'used' ? 'var(--dim)' : 'var(--hot)';
  const stampLabel = status === 'active' ? 'Admit one' : status === 'used' ? 'Checked in' : status;

  return (
    <button onClick={onOpen}
      style={{
        position: 'relative', textAlign: 'left', width: '100%',
        background: isActive ? '#100D0A' : '#0E0C09',
        border: `1px solid ${isActive ? 'rgba(201,243,110,0.3)' : 'var(--line-2)'}`,
        borderRadius: 6, overflow: 'hidden', cursor: 'pointer',
        transition: 'transform .2s ease, border-color .2s ease',
        padding: 0, opacity: isActive ? 1 : 0.6,
        fontFamily: 'inherit', color: 'inherit',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.borderColor = isActive ? 'var(--lime)' : 'var(--cream)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.borderColor = isActive ? 'rgba(201,243,110,0.3)' : 'var(--line-2)'; }}
    >
      {/* Head */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', padding: '20px 22px 18px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--dim)' }}>
            {evt?.category ? evt.category.replace('_', ' ').toUpperCase() : 'EVENT'}
          </div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 23, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--paper)', marginTop: 6, overflowWrap: 'break-word' }}>
            {evt?.title ?? 'Event'}
          </div>
        </div>
        <span className="stamp" style={{ color: stampColor, flexShrink: 0, marginTop: 2 }}>{stampLabel}</span>
      </div>

      {/* Perforation */}
      <div style={{ position: 'relative' }}>
        <div className="perf" />
        <span aria-hidden style={{ position: 'absolute', left: -8, top: -7, width: 14, height: 14, background: 'var(--ink)', borderRadius: '50%', border: '1px solid var(--line-2)' }} />
        <span aria-hidden style={{ position: 'absolute', right: -8, top: -7, width: 14, height: 14, background: 'var(--ink)', borderRadius: '50%', border: '1px solid var(--line-2)' }} />
      </div>

      {/* Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 18, padding: '18px 22px 16px' }}>
        <div style={{ width: 80, height: 80, borderRadius: 3, background: isActive ? 'var(--paper)' : '#26221C', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6 }}>
          {isActive && <PseudoQR seed={pass._id} size={68} />}
          {status === 'used' && <span style={{ color: 'var(--lime)', fontSize: 32 }}>✓</span>}
          {(status === 'expired' || status === 'cancelled') && <span style={{ color: 'var(--dim)', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', textAlign: 'center' }}>{status.toUpperCase()}</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          {evt && (
            <>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.14em', color: 'var(--dim)' }}>WHEN</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 13, marginTop: 4, color: 'var(--paper)' }}>
                  {evt.startTime ? `${fmtHour(evt.startTime)} → ${fmtHour(evt.endTime)}` : formatDate(evt.date)}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.14em', color: 'var(--dim)' }}>WHERE</div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 14, marginTop: 4, lineHeight: 1.2, color: 'var(--paper)' }}>{evt.locationName}</div>
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

      {/* Barcode footer */}
      <div style={{ padding: '0 22px 18px' }}>
        <div className="barcode" aria-hidden style={{ height: 20, color: isActive ? '#3A3428' : 'var(--line-2)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>
          <span>№ {pass._id.slice(-6).toUpperCase()}</span>
          <span>TAP FOR QR →</span>
        </div>
      </div>
    </button>
  );
}
