'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { Event } from '@/types';
import api from '@/lib/api';

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

/**
 * The door scanner. One implementation for every surface that scans passes:
 * event picker → camera with finder frame → full-viewport pass/fail overlay
 * with guest name → running in/denied session stats.
 */
export default function ScannerModal({ events, onClose }: ScannerModalProps) {
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
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') { stopCamera(); onClose(); } };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      stopCamera();
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, [stopCamera, onClose]);

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
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });

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
  }, []);

  async function startCamera() {
    if (!selectedEventId) return;
    activeEventIdRef.current = selectedEventId;
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Door scanner"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink/95 p-6 backdrop-blur"
    >
      <div className="flex w-full max-w-[520px] flex-col overflow-hidden rounded-[20px] border border-line-2 bg-[#0E0C09]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <div className="clique-label">DOOR SCANNER</div>
            {selectedEvent && cameraActive && (
              <div className="mt-0.5 font-display text-base font-bold text-paper">{selectedEvent.title}</div>
            )}
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            aria-label="Close scanner"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-line font-mono text-lg leading-none text-cream hover:text-paper"
          >
            ×
          </button>
        </div>

        {/* Event picker — shown before camera starts */}
        {!cameraActive && (
          <div className="flex flex-col gap-5 p-7">
            <div>
              <div className="clique-label mb-2.5">SELECT EVENT</div>
              {publishedEvents.length === 0 ? (
                <div className="py-4 font-display text-[15px] text-dim">No published events — publish an event first.</div>
              ) : (
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full cursor-pointer rounded-xl border border-line-2 bg-well px-4 py-3.5 font-display text-[15px] text-paper focus:border-lime focus:outline-none"
                >
                  {publishedEvents.length > 1 && <option value="">Choose an event…</option>}
                  {publishedEvents.map((e) => (
                    <option key={e._id} value={e._id}>{e.title}</option>
                  ))}
                </select>
              )}
            </div>

            {cameraError && (
              <div className="rounded-lg border border-hot/20 bg-hot/[.08] px-3.5 py-2.5 font-mono text-[11px] leading-relaxed tracking-[.06em] text-hot">
                {cameraError}
              </div>
            )}

            <button
              onClick={startCamera}
              disabled={!selectedEventId || publishedEvents.length === 0}
              className="rounded-full py-4 font-mono text-[13px] font-semibold uppercase tracking-[.08em] transition-colors enabled:bg-lime enabled:text-ink enabled:hover:bg-paper disabled:cursor-not-allowed disabled:bg-line disabled:text-dim"
            >
              Start scanning
            </button>

            <div className="text-center font-mono text-[10px] tracking-[.1em] text-dim">
              Your browser will ask for camera permission
            </div>
          </div>
        )}

        {/* Video is always mounted so the ref exists before startCamera() attaches the stream */}
        <div className="relative bg-black leading-none" style={{ display: cameraActive ? 'block' : 'none' }}>
          <video ref={videoRef} playsInline muted autoPlay className="block w-full max-h-[380px] object-cover" />

          {/* Finder frame overlay */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-[200px] w-[200px]">
              {[
                { top: 0,    left: 0,  borderTop:    '3px solid var(--lime)', borderLeft:   '3px solid var(--lime)' },
                { top: 0,    right: 0, borderTop:    '3px solid var(--lime)', borderRight:  '3px solid var(--lime)' },
                { bottom: 0, left: 0,  borderBottom: '3px solid var(--lime)', borderLeft:   '3px solid var(--lime)' },
                { bottom: 0, right: 0, borderBottom: '3px solid var(--lime)', borderRight:  '3px solid var(--lime)' },
              ].map((s, i) => (
                <div key={i} style={{ position: 'absolute', width: 24, height: 24, ...s }} />
              ))}
              {!result && (
                <div
                  className="absolute left-0 right-0 h-0.5 opacity-80"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, var(--lime) 40%, var(--lime) 60%, transparent 100%)',
                    animation: 'scanLine 1.8s ease-in-out infinite',
                  }}
                />
              )}
            </div>
          </div>

          {/* Scan result overlay */}
          {result && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 backdrop-blur-[2px] animate-fade-in"
              style={{ background: result.ok ? 'rgba(201,243,110,0.15)' : 'rgba(255,61,110,0.12)' }}
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full font-mono text-[28px]"
                style={{
                  background: result.ok ? 'var(--lime)' : 'var(--hot)',
                  color: result.ok ? 'var(--ink)' : 'var(--paper)',
                  boxShadow: result.ok ? '0 0 40px rgba(201,243,110,0.5)' : '0 0 40px rgba(255,61,110,0.4)',
                }}
              >
                {result.ok ? '✓' : '✗'}
              </div>
              <div className={`font-mono text-sm font-bold uppercase tracking-[.1em] ${result.ok ? 'text-lime' : 'text-hot'}`}>
                {result.message}
              </div>
              {result.ok && result.guestName && (
                <div className="font-display text-lg font-bold text-paper">
                  {result.guestName}
                  {result.guestUsername && (
                    <span className="ml-2 font-mono text-xs font-normal text-dim">@{result.guestUsername}</span>
                  )}
                </div>
              )}
              {!result.ok && (
                <div className="font-mono text-[11px] tracking-[.06em] text-hot opacity-80">
                  {result.message === 'Pass already used' ? 'ALREADY CHECKED IN' : 'DENY ENTRY'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Canvas for jsQR — always hidden */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Session stats */}
        {cameraActive && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5">
            <div className="flex gap-6">
              {[
                { label: 'SCANNED', value: stats.total, cls: 'text-paper' },
                { label: 'IN',      value: stats.approved, cls: 'text-lime' },
                { label: 'DENIED',  value: stats.rejected, cls: 'text-hot' },
              ].map(({ label, value, cls }) => (
                <div key={label} className="flex flex-col items-center gap-0.5">
                  <div className={`font-display text-[22px] font-bold leading-none ${cls}`}>{value}</div>
                  <div className="font-mono text-[10px] tracking-[.12em] text-dim">{label}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => { stopCamera(); setStats({ total: 0, approved: 0, rejected: 0 }); }}
              className="rounded-full border border-line-2 px-3.5 py-2 font-mono text-[10px] uppercase tracking-[.1em] text-dim hover:text-cream"
            >
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
