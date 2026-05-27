'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Event } from '@/types';
import api from '@/lib/api';
import jsQR from 'jsqr';

const CAT_COLORS: Record<string, string> = {
  house_party: '#C9F36E',
  warehouse:   '#FF3D6E',
  club:        '#FF3D6E',
  college:     '#E8C46E',
  private:     '#E8C46E',
  concert:     '#7DB4FF',
  other:       '#E8E1D2',
};

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

// ─── Scanner Modal ───────────────────────────────────────────────────────────

interface ScanResult {
  ok: boolean;
  message: string;
  guestName?: string;
  guestUsername?: string;
}

interface ScannerModalProps {
  events: Event[];
  onClose: () => void;
}

function ScannerModal({ events, onClose }: ScannerModalProps) {
  const publishedEvents = events.filter((e) => e.status === 'published');
  const [selectedEventId, setSelectedEventId] = useState(
    publishedEvents.length === 1 ? publishedEvents[0]._id : ''
  );
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [stats, setStats] = useState({ total: 0, approved: 0, rejected: 0 });

  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<number>(0);
  const processingRef = useRef(false);
  const lastTokenRef  = useRef('');
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeEventIdRef = useRef('');

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, [stopCamera]);

  const scanLoop = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) { rafRef.current = requestAnimationFrame(scanLoop); return; }

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });

    if (code && code.data && code.data !== lastTokenRef.current && !processingRef.current) {
      lastTokenRef.current = code.data;
      processingRef.current = true;

      api.post('/passes/scan', { qrToken: code.data, eventId: activeEventIdRef.current })
        .then(({ data }) => {
          const r = data.data;
          setResult({ ok: true, message: 'ENTRY APPROVED', guestName: r.guest?.name, guestUsername: r.guest?.username });
          setStats((s) => ({ total: s.total + 1, approved: s.approved + 1, rejected: s.rejected }));
        })
        .catch((err) => {
          const msg = err?.response?.data?.message ?? 'Invalid pass';
          setResult({ ok: false, message: msg });
          setStats((s) => ({ total: s.total + 1, approved: s.approved, rejected: s.rejected + 1 }));
        })
        .finally(() => {
          resultTimerRef.current = setTimeout(() => {
            setResult(null);
            processingRef.current = false;
            lastTokenRef.current = '';
            rafRef.current = requestAnimationFrame(scanLoop);
          }, 2500);
        });

      return;
    }

    rafRef.current = requestAnimationFrame(scanLoop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function startCamera() {
    if (!selectedEventId) return;
    activeEventIdRef.current = selectedEventId;
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      // Attach stream to the video element — it is always in the DOM (just hidden)
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setCameraActive(true);
      rafRef.current = requestAnimationFrame(scanLoop);
    } catch (err) {
      const msg = (err as { name?: string }).name === 'NotAllowedError'
        ? 'Camera permission denied — tap Allow when your browser asks, then try again.'
        : (err as { name?: string }).name === 'NotFoundError'
        ? 'No camera found on this device.'
        : 'Could not start camera. Make sure the page is loaded over HTTPS.';
      setCameraError(msg);
    }
  }

  const selectedEvent = publishedEvents.find((e) => e._id === selectedEventId);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(11,9,7,0.96)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 520, background: '#0E0C09', border: '1px solid var(--line-2)', borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--line)' }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>DOOR SCANNER</div>
            {selectedEvent && cameraActive && (
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16, marginTop: 2 }}>{selectedEvent.title}</div>
            )}
          </div>
          <button onClick={() => { stopCamera(); onClose(); }}
            style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--line)', border: 'none', color: 'var(--cream)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', lineHeight: 1 }}>
            ×
          </button>
        </div>

        {/* Event picker — shown before camera starts */}
        {!cameraActive && (
          <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase', marginBottom: 10 }}>SELECT EVENT</div>
              {publishedEvents.length === 0 ? (
                <div style={{ fontFamily: 'var(--display)', fontSize: 15, color: 'var(--dim)', padding: '16px 0' }}>No published events — publish an event first.</div>
              ) : (
                <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}
                  style={{ width: '100%', background: '#0B0907', border: '1px solid var(--line-2)', color: 'var(--paper)', padding: '14px 16px', borderRadius: 12, fontFamily: 'var(--display)', fontSize: 15, outline: 'none', cursor: 'pointer' }}>
                  {publishedEvents.length > 1 && <option value="">Choose an event…</option>}
                  {publishedEvents.map((e) => (
                    <option key={e._id} value={e._id}>{e.title}</option>
                  ))}
                </select>
              )}
            </div>

            {cameraError && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--hot)', letterSpacing: '.08em', padding: '10px 14px', background: 'rgba(255,61,110,0.08)', border: '1px solid rgba(255,61,110,0.2)', borderRadius: 8, lineHeight: 1.5 }}>
                {cameraError}
              </div>
            )}

            <button onClick={startCamera} disabled={!selectedEventId || publishedEvents.length === 0}
              style={{ background: selectedEventId ? 'var(--lime)' : 'var(--line)', color: selectedEventId ? 'var(--ink)' : 'var(--dim)', border: 'none', padding: '16px 0', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', cursor: selectedEventId ? 'pointer' : 'not-allowed', transition: 'all .15s ease', fontWeight: 600 }}>
              ↗ Start scanning
            </button>

            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.1em', textAlign: 'center' }}>
              Your browser will ask for camera permission
            </div>
          </div>
        )}

        {/*
          Video is ALWAYS mounted so videoRef.current is populated before startCamera() attaches
          the MediaStream. CSS display:none hides it until cameraActive is true.
        */}
        <div style={{ position: 'relative', background: '#000', lineHeight: 0, display: cameraActive ? 'block' : 'none' }}>
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{ width: '100%', maxHeight: 380, objectFit: 'cover', display: 'block' }}
          />

          {/* Finder frame overlay */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ width: 200, height: 200, position: 'relative' }}>
              {[
                { top: 0,    left: 0,  borderTop:    '3px solid var(--lime)', borderLeft:   '3px solid var(--lime)' },
                { top: 0,    right: 0, borderTop:    '3px solid var(--lime)', borderRight:  '3px solid var(--lime)' },
                { bottom: 0, left: 0,  borderBottom: '3px solid var(--lime)', borderLeft:   '3px solid var(--lime)' },
                { bottom: 0, right: 0, borderBottom: '3px solid var(--lime)', borderRight:  '3px solid var(--lime)' },
              ].map((s, i) => (
                <div key={i} style={{ position: 'absolute', width: 24, height: 24, ...s }} />
              ))}
              {!result && (
                <div style={{ position: 'absolute', left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent 0%, var(--lime) 40%, var(--lime) 60%, transparent 100%)', top: '50%', opacity: 0.8, animation: 'scanLine 1.8s ease-in-out infinite' }} />
              )}
            </div>
          </div>

          {/* Scan result overlay */}
          {result && (
            <div style={{
              position: 'absolute', inset: 0,
              background: result.ok ? 'rgba(201,243,110,0.15)' : 'rgba(255,61,110,0.12)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 10, backdropFilter: 'blur(2px)',
              animation: 'riseIn .2s ease-out',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: result.ok ? 'var(--lime)' : 'var(--hot)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontFamily: 'var(--mono)', color: result.ok ? 'var(--ink)' : 'var(--paper)',
                boxShadow: result.ok ? '0 0 40px rgba(201,243,110,0.5)' : '0 0 40px rgba(255,61,110,0.4)',
              }}>
                {result.ok ? '✓' : '✗'}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, letterSpacing: '.1em', color: result.ok ? 'var(--lime)' : 'var(--hot)', textTransform: 'uppercase' }}>
                {result.message}
              </div>
              {result.ok && result.guestName && (
                <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18, color: 'var(--paper)' }}>
                  {result.guestName}
                  {result.guestUsername && (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--dim)', marginLeft: 8 }}>@{result.guestUsername}</span>
                  )}
                </div>
              )}
              {!result.ok && (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--hot)', letterSpacing: '.06em', opacity: 0.8 }}>
                  {result.message === 'Pass already used' ? 'ALREADY CHECKED IN' : 'DENY ENTRY'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Canvas for jsQR — always hidden */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Session stats */}
        {cameraActive && (
          <div style={{ padding: '14px 22px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 24 }}>
              {[
                { label: 'SCANNED', value: stats.total, color: 'var(--paper)' },
                { label: 'IN',      value: stats.approved, color: 'var(--lime)' },
                { label: 'DENIED',  value: stats.rejected, color: 'var(--hot)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22, color, lineHeight: 1 }}>{value}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', color: 'var(--dim)' }}>{label}</div>
                </div>
              ))}
            </div>
            <button onClick={() => { stopCamera(); setStats({ total: 0, approved: 0, rejected: 0 }); }}
              style={{ background: 'transparent', border: '1px solid var(--line-2)', color: 'var(--dim)', padding: '8px 14px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
              Stop camera
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scanLine {
          0%, 100% { top: 20%; opacity: 0.3; }
          50% { top: 80%; opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Dashboard Page ──────────────────────────────────────────────────────────

export default function HostDashboardPage() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/auth/me'),
      api.get('/events/mine'),
    ])
      .then(([meResp, eventsResp]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fresh = (meResp.data.data as any)?.user ?? meResp.data.data;
        updateUser(fresh);
        if (!fresh.isVerifiedHost) { router.replace('/become-host'); return; }
        setEvents(eventsResp.data.data?.events ?? []);
      })
      .catch(() => {
        if (user && !user.isVerifiedHost) router.replace('/become-host');
        setEvents([]);
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeEvents    = events.filter((e) => e.status === 'published' || e.status === 'draft');
  const inactiveEvents  = events.filter((e) => e.status === 'cancelled' || e.status === 'completed');

  const liveEvents = events.filter((e) => e.status === 'published').length;
  const totalRSVPs = activeEvents.reduce((s, e) => s + e.bookedCount, 0);
  const revenue    = activeEvents.reduce((s, e) => s + e.bookedCount * e.price, 0);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '96px 0' }}>
      <Spinner />
    </div>
  );

  return (
    <div>
      {scannerOpen && <ScannerModal events={events} onClose={() => setScannerOpen(false)} />}

      {/* Page head */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)', marginBottom: 8 }}>HOST DASHBOARD</div>
          <h1 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 'clamp(40px, 5vw, 64px)', lineHeight: 0.95, letterSpacing: '-0.03em', margin: 0 }}>
            Your nights.<br />
            <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--lime)' }}>Run the door.</span>
          </h1>
        </div>
        <button onClick={() => router.push('/host/events/new')}
          style={{ background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '14px 22px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          + Throw something →
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 36, paddingBottom: 32, borderBottom: '1px solid var(--line)' }}>
        {[
          { label: 'LIVE EVENTS', value: liveEvents, accent: true },
          { label: 'TOTAL RSVPS', value: totalRSVPs, accent: false },
          { label: 'REVENUE', value: `₹${revenue.toLocaleString('en-IN')}`, accent: revenue > 0 },
          { label: 'RATING', value: '4.8', sub: '★ ★ ★ ★ ★', accent: false },
        ].map(({ label, value, sub, accent }) => (
          <div key={label} style={{ padding: 18, background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 12 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--dim)' }}>{label}</div>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 44, lineHeight: 1, marginTop: 6, letterSpacing: '-0.03em', color: accent ? 'var(--lime)' : 'var(--paper)' }}>{value}</div>
            {sub && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--cream)', letterSpacing: '.08em', marginTop: 6 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Your events */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)', marginBottom: 16 }}>YOUR EVENTS</div>
        {activeEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 16 }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: 32, color: 'var(--dim)', marginBottom: 12 }}>○</div>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 24, letterSpacing: '-0.02em', marginBottom: 8 }}>Nothing on the books.</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--dim)', letterSpacing: '.08em', marginBottom: 22 }}>THROW SOMETHING. THE CITY IS LISTENING.</div>
            <button onClick={() => router.push('/host/events/new')}
              style={{ background: 'var(--lime)', color: 'var(--ink)', border: 'none', padding: '12px 20px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
              + New event
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeEvents.map((e) => <HostEventRow key={e._id} event={e} />)}
          </div>
        )}
      </div>

      {/* Past / cancelled events (collapsed section) */}
      {inactiveEvents.length > 0 && (
        <PastEventsSection events={inactiveEvents} />
      )}

      {/* Scanner */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)' }}>DOOR SCANNER</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--cream)', letterSpacing: '.04em', marginTop: 6 }}>hand your phone to the bouncer — they scan passes here</div>
        </div>
        <div style={{ background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' }}>Open the scanner</div>
              <p style={{ fontFamily: 'var(--display)', fontSize: 14, color: 'var(--cream)', marginTop: 8, lineHeight: 1.4 }}>
                Camera-based QR scanner for the door. Shows live entry count and confirms each pass instantly.
              </p>
            </div>
            <button onClick={() => setScannerOpen(true)}
              style={{ background: 'var(--lime)', color: 'var(--ink)', border: 'none', padding: '12px 20px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600 }}>
              ↗ LAUNCH SCANNER
            </button>
          </div>
        </div>
      </div>

      {/* Requests */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)', marginBottom: 16 }}>REQUESTS</div>
        <div style={{ textAlign: 'center', padding: '48px 20px', background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 16 }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 32, color: 'var(--dim)', marginBottom: 8 }}>○</div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em', marginBottom: 6 }}>No requests right now.</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '.08em' }}>ALL CAUGHT UP</div>
        </div>
      </div>
    </div>
  );
}

function PastEventsSection({ events }: { events: Event[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 40 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: open ? 14 : 0 }}
      >
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)' }}>
          PAST &amp; CANCELLED
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', transition: 'transform .2s', display: 'inline-block', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          ›
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', background: 'var(--line)', padding: '2px 8px', borderRadius: 999 }}>
          {events.length}
        </span>
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {events.map((e) => <HostEventRow key={e._id} event={e} dimmed />)}
        </div>
      )}
    </div>
  );
}

function HostEventRow({ event, dimmed = false }: { event: Event; dimmed?: boolean }) {
  const router = useRouter();
  const color  = CAT_COLORS[event.category] ?? '#E8E1D2';
  const filled = Math.min(100, (event.bookedCount / event.capacity) * 100);
  const isCancelled = event.status === 'cancelled';

  return (
    <div onClick={() => router.push(`/host/events/${event._id}`)}
      style={{ display: 'grid', gridTemplateColumns: '64px 1fr auto auto', gap: 18, alignItems: 'center', padding: 14, background: '#14110E', border: `1px solid ${isCancelled ? 'rgba(255,61,110,0.15)' : 'var(--line-2)'}`, borderRadius: 12, cursor: 'pointer', transition: 'border-color .15s ease', opacity: dimmed ? 0.55 : 1 }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = dimmed ? 'rgba(255,61,110,0.3)' : 'var(--cream)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = isCancelled ? 'rgba(255,61,110,0.15)' : 'var(--line-2)')}
    >
      <div style={{ width: 64, height: 64, borderRadius: 8, background: color, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 8, flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'rgba(11,9,7,0.7)', letterSpacing: '.12em' }}>{(event.category ?? 'other').replace('_', ' ').toUpperCase()}</div>
        <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16, color: 'var(--ink)', lineHeight: 1 }}>
          {event.startTime ? fmtHour(event.startTime).replace(':00', '') : '—'}
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--paper)' }}>{event.title}</div>
          {event.status === 'cancelled' && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', color: 'var(--hot)', background: 'rgba(255,61,110,0.12)', border: '1px solid rgba(255,61,110,0.25)', padding: '2px 7px', borderRadius: 999, textTransform: 'uppercase', flexShrink: 0 }}>
              Cancelled
            </span>
          )}
          {event.status === 'draft' && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', color: 'var(--cream)', background: 'var(--line)', border: '1px solid var(--line-2)', padding: '2px 7px', borderRadius: 999, textTransform: 'uppercase', flexShrink: 0 }}>
              Draft
            </span>
          )}
          {event.status === 'completed' && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', color: '#7DB4FF', background: 'rgba(125,180,255,0.1)', border: '1px solid rgba(125,180,255,0.2)', padding: '2px 7px', borderRadius: 999, textTransform: 'uppercase', flexShrink: 0 }}>
              Completed
            </span>
          )}
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--cream)', letterSpacing: '.06em', marginTop: 4 }}>
          {event.locationName}{event.startTime ? ` · ${fmtHour(event.startTime)}` : ''}{event.endTime ? ` → ${fmtHour(event.endTime)}` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 90 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.1em' }}>RSVPS</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
          <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 24, letterSpacing: '-0.02em' }}>{event.bookedCount}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)' }}>/ {event.capacity}</span>
        </div>
        <div style={{ height: 3, background: 'var(--line)', borderRadius: 2, overflow: 'hidden', marginTop: 6, width: 80 }}>
          <div style={{ height: '100%', width: `${filled}%`, background: filled > 85 ? 'var(--hot)' : 'var(--lime)' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={(e) => { e.stopPropagation(); router.push(`/host/events/${event._id}`); }}
          style={{ background: 'transparent', color: 'var(--cream)', border: '1px solid var(--line-2)', padding: '8px 12px', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all .15s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--cream)'; e.currentTarget.style.color = 'var(--paper)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--cream)'; }}
        >
          Edit
        </button>
        <button onClick={(e) => { e.stopPropagation(); router.push(`/host/events/${event._id}`); }}
          style={{ background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '8px 12px', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper)'; e.currentTarget.style.borderColor = 'var(--paper)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--lime)'; e.currentTarget.style.borderColor = 'var(--lime)'; }}
        >
          Manage list
        </button>
      </div>
    </div>
  );
}
