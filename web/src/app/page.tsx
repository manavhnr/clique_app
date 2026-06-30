'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

// ─────── Data ───────
const HOUR_MIN = 18;
const HOUR_MAX = 30;

const DEMO_EVENTS = [
  { id: 'e1', title: 'Sunset on the Roof',   cat: 'house party', start: 19, end: 23, color: '#E8C46E', rsvp: 31,  spots: 42  },
  { id: 'e2', title: 'BASEMENT / Vol. 12',   cat: 'warehouse',   start: 22, end: 28, color: '#FF3D6E', rsvp: 174, spots: 200 },
  { id: 'e3', title: 'Dim Sum & Disco',       cat: 'supper club', start: 21, end: 26, color: '#C9F36E', rsvp: 64,  spots: 80  },
  { id: 'e4', title: 'Quiet Riot Listening',  cat: 'listening',   start: 20, end: 24, color: '#7DB4FF', rsvp: 28,  spots: 35  },
  { id: 'e5', title: 'Last Call Karaoke',     cat: 'karaoke',     start: 23, end: 28, color: '#E8C46E', rsvp: 47,  spots: 60  },
  { id: 'e6', title: 'Afterhours @ The Pool', cat: 'afterhours',  start: 26, end: 30, color: '#FF3D6E', rsvp: 89,  spots: 120 },
  { id: 'e7', title: 'Slow Sunday Garden',    cat: 'garden',      start: 18, end: 22, color: '#C9F36E', rsvp: 22,  spots: 50  },
];

const CAT_COLORS: Record<string, string> = {
  house_party: '#E8C46E',
  club:        '#FF3D6E',
  college:     '#C9F36E',
  private:     '#7DB4FF',
  concert:     '#E8A0FF',
  other:       '#C9F36E',
};
const COLOR_CYCLE = ['#E8C46E', '#FF3D6E', '#C9F36E', '#7DB4FF', '#E8A0FF'];

type DemoEvent = typeof DEMO_EVENTS[0];

function parseTimeStr(t: string): number {
  const parts = t.split(':').map(Number);
  return parts[0] + (parts[1] ?? 0) / 60;
}

function apiEventToDemo(e: {
  _id: string; title: string; category: string;
  startTime: string; endTime: string; capacity: number; bookedCount: number;
}, idx: number): DemoEvent {
  let start = parseTimeStr(e.startTime);
  let end = parseTimeStr(e.endTime);
  if (end <= start) end += 24;
  start = Math.max(HOUR_MIN, Math.min(HOUR_MAX - 0.01, start));
  end   = Math.max(start + 0.5, Math.min(HOUR_MAX, end));
  return {
    id:    e._id,
    title: e.title,
    cat:   e.category.replace(/_/g, ' '),
    start, end,
    color: CAT_COLORS[e.category] ?? COLOR_CYCLE[idx % COLOR_CYCLE.length],
    rsvp:  e.bookedCount,
    spots: e.capacity,
  };
}

function fmtClock(h: number) {
  const hh = Math.floor(h) % 24;
  const ampm = hh < 12 ? 'AM' : 'PM';
  const display = hh % 12 === 0 ? 12 : hh % 12;
  const mm = String(Math.floor((h - Math.floor(h)) * 60)).padStart(2, '0');
  return `${display}:${mm} ${ampm}`;
}
function fmtHour(h: number) {
  const hh = h % 24;
  const ampm = hh < 12 || hh === 24 ? 'AM' : 'PM';
  const display = hh % 12 === 0 ? 12 : hh % 12;
  return `${display}:00 ${ampm}`;
}
function isLive(e: DemoEvent, hour: number) { return hour >= e.start && hour < e.end; }
function hourToPct(h: number) { return (h - HOUR_MIN) / (HOUR_MAX - HOUR_MIN); }
function pctToHour(p: number) { return HOUR_MIN + (HOUR_MAX - HOUR_MIN) * p; }

// ─────── Responsive hook ───────
function useBreakpoint() {
  const [width, setWidth] = useState(1024);
  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return {
    isMobile: width < 640,
    isTablet: width >= 640 && width < 1024,
    isDesktop: width >= 1024,
    width,
  };
}


// ─────── Nav ───────
interface NavProps {
  timeStr: string;
  dayLabel: string;
  totalLive: number;
  totalOut: number;
}
function Nav({ timeStr, dayLabel, totalLive, totalOut }: NavProps) {
  const [scrolled, setScrolled] = useState(false);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    const onScroll = () => { setScrolled(window.scrollY > 24); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav style={{
      position: 'fixed', inset: '0 0 auto 0', zIndex: 50,
      display: 'flex', alignItems: 'center',
      padding: isMobile ? '0 16px' : '0 40px',
      height: isMobile ? 56 : 64,
      backdropFilter: 'blur(12px) saturate(140%)',
      background: scrolled ? 'rgba(11,9,7,0.96)' : 'linear-gradient(180deg, rgba(11,9,7,0.78) 0%, rgba(11,9,7,0.0) 100%)',
      borderBottom: scrolled ? '1px solid var(--line)' : '1px solid transparent',
      transition: 'background .3s, border-color .3s, height .3s',
    }}>
      <Link href="/" style={{
        display: 'flex', alignItems: 'baseline', gap: 8,
        fontFamily: 'var(--display)', fontWeight: 800,
        letterSpacing: '-0.04em',
        fontSize: isMobile ? 18 : 22,
        color: 'var(--paper)', flexShrink: 0,
      }}>
        <span style={{
          width: 8, height: 8, background: 'var(--lime)', borderRadius: '50%',
          alignSelf: 'center', boxShadow: '0 0 18px var(--lime)', display: 'inline-block',
          animation: 'pulse 2s ease-in-out infinite',
        }} />
        CLIQUE
        {!isMobile && (
          <sup style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 400, color: 'var(--dim)', letterSpacing: 0, alignSelf: 'flex-start', marginTop: 4 }}>est. tonight</sup>
        )}
      </Link>

      {/* Live bar — desktop only, always visible */}
      {!isMobile && (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 12,
          padding: '0 28px',
          overflow: 'hidden',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--hot)', boxShadow: '0 0 0 3px rgba(255,61,110,0.18)', animation: 'pulse 1.6s ease-in-out infinite', display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--cream)', whiteSpace: 'nowrap' }}>
            LIVE — {dayLabel} · {timeStr}
          </span>
          <span style={{ height: 1, background: 'var(--line)', flex: 1, minWidth: 16 }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            {totalLive} OPEN · {totalOut} OUT
          </span>
        </div>
      )}

      {isMobile ? <div style={{ flex: 1 }} /> : null}

      <div style={{
        display: 'flex', alignItems: 'center',
        gap: isMobile ? 6 : 4,
        fontFamily: 'var(--mono)', fontSize: isMobile ? 11 : 12,
        fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0,
      }}>
        {!isMobile && (
          <Link href="/login" style={{ color: 'var(--cream)', padding: '10px 14px', borderRadius: 999 }}>
            Log in
          </Link>
        )}
        <Link href="/signup" style={{
          background: 'var(--lime)', color: 'var(--ink)',
          padding: isMobile ? '8px 12px' : '10px 14px',
          borderRadius: 999,
          border: '1px solid var(--lime)',
          fontSize: isMobile ? 10 : 12,
          whiteSpace: 'nowrap',
        }}>
          {isMobile ? 'Join →' : 'Get on the list →'}
        </Link>
      </div>
    </nav>
  );
}

// ─────── Timeline / video section ───────
function Timeline({ events, hour, setHour, auto, setAuto }: {
  events: DemoEvent[];
  hour: number; setHour: (h: number) => void;
  auto: boolean; setAuto: (a: boolean | ((prev: boolean) => boolean)) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(false);
  const { isMobile } = useBreakpoint();

  function pointerMove(e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setHour(pctToHour(pct));
  }

  function onDown(e: React.MouseEvent | React.TouchEvent) {
    setAuto(() => false);
    setDrag(true);
    pointerMove(e as unknown as MouseEvent);
    const move = (ev: MouseEvent | TouchEvent) => pointerMove(ev);
    const up = () => {
      setDrag(false);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', up);
  }

  const handlePct = hourToPct(hour);
  const ticks: number[] = [];
  for (let h = HOUR_MIN; h <= HOUR_MAX; h += isMobile ? 2 : 1) ticks.push(h);

  return (
    <div style={{ marginTop: isMobile ? 48 : 80 }}>
      {/* Header row */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'flex-end',
        gap: isMobile ? 16 : 24,
        marginBottom: isMobile ? 20 : 28,
      }}>
        <div>
          <div className="clique-label" style={{ marginBottom: 6 }}>
            {auto ? 'NOW PLAYING' : 'SCRUB THE NIGHT'}
          </div>
          <div style={{
            fontFamily: 'var(--display)',
            fontSize: isMobile ? 16 : 22,
            fontWeight: 600, color: 'var(--paper)',
          }}>
            {auto
              ? <>The night is playing.{' '}<span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--dim)' }}>— click pause to scrub.</span></>
              : <>Drag the cursor.{!isMobile && ' The city responds.'}{' '}<span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--dim)' }}>— or hit play.</span></>
            }
          </div>
        </div>
        <button
          onClick={() => setAuto((a) => !a)}
          style={{
            background: auto ? 'var(--line-2)' : 'transparent',
            color: 'var(--paper)',
            border: '1px solid var(--line-2)',
            padding: isMobile ? '10px 16px' : '12px 18px',
            borderRadius: 999, fontFamily: 'var(--mono)',
            fontSize: isMobile ? 11 : 12,
            fontWeight: 500, letterSpacing: '0.1em', cursor: 'pointer',
            transition: 'background .15s, border-color .15s',
            whiteSpace: 'nowrap',
            alignSelf: isMobile ? 'flex-start' : 'auto',
          }}
        >
          {auto ? '■ PAUSE' : '▶ PLAY THE NIGHT'}
        </button>
      </div>

      {/* ── Scrubber ── */}
      <div
        ref={trackRef}
        onMouseDown={onDown}
        onTouchStart={onDown}
        style={{
          position: 'relative',
          height: isMobile ? 100 : 130,
          border: '1px solid var(--line-2)', borderRadius: 14,
          overflow: 'hidden',
          cursor: drag ? 'grabbing' : 'ew-resize',
          background: '#0F0C09', userSelect: 'none',
          touchAction: 'none',
          animation: 'fadeIn .25s ease-out',
        }}
      >
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #1a1428 0%, #0d0c1f 22%, #06070C 50%, #060a18 75%, #1d1408 100%)', opacity: 0.7 }} />

          {events.map((e, idx) => {
            const left = hourToPct(e.start) * 100;
            const w = (hourToPct(e.end) - hourToPct(e.start)) * 100;
            const active = isLive(e, hour);
            return (
              <div key={e.id} title={e.title} style={{
                position: 'absolute', height: isMobile ? 8 : 10, borderRadius: 4,
                padding: '0 4px', display: 'flex', alignItems: 'center',
                fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '.04em', color: 'var(--ink)',
                whiteSpace: 'nowrap', overflow: 'hidden',
                left: `${left}%`, width: `${w}%`,
                top: (isMobile ? 12 : 16) + (idx % 3) * (isMobile ? 11 : 14),
                background: active ? e.color : 'rgba(232,225,210,0.15)',
                border: `1px solid ${active ? e.color : 'transparent'}`,
                transform: active ? 'scaleY(1.2)' : 'none',
                transition: 'background .25s ease, transform .25s ease',
              }}>
                <span style={{ opacity: active && !isMobile ? 1 : 0 }}>{e.title}</span>
              </div>
            );
          })}

          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 8, height: 22 }}>
            {ticks.map((h) => (
              <div key={h} style={{ position: 'absolute', left: `${hourToPct(h) * 100}%`, transform: 'translateX(-50%)' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: isMobile ? 8 : 10, color: 'var(--dim)', letterSpacing: '.08em' }}>
                  {h % 24 === 0 ? '00' : String(h % 24).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>

          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${handlePct * 100}%`, transform: 'translateX(-50%)', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 2, marginLeft: -1, background: 'var(--lime)', boxShadow: '0 0 12px rgba(201,243,110,0.6)' }} />
            <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', width: isMobile ? 18 : 16, height: isMobile ? 18 : 16, background: 'var(--lime)', borderRadius: '50%', boxShadow: '0 0 0 4px rgba(201,243,110,0.18), 0 0 18px rgba(201,243,110,0.5)' }} />
            <div style={{
              position: 'absolute', top: isMobile ? -34 : -38, left: '50%', transform: 'translateX(-50%)',
              fontFamily: 'var(--mono)', fontSize: isMobile ? 10 : 12,
              color: 'var(--ink)', background: 'var(--lime)',
              padding: isMobile ? '3px 6px' : '4px 8px',
              borderRadius: 4, whiteSpace: 'nowrap', letterSpacing: '.04em',
            }}>
              {fmtClock(hour)}
            </div>
          </div>
        </div>
    </div>
  );
}

// ─────── Floating ticket widget ───────
function FloatingTicket({ event, hour }: { event: DemoEvent; hour: number }) {
  const { isMobile, isTablet } = useBreakpoint();
  // Start collapsed on mobile/tablet to avoid blocking content
  const [open, setOpen] = useState(!isMobile && !isTablet);
  const live = isLive(event, hour);
  const minsUntil = Math.max(0, Math.round((event.start - hour) * 60));
  const status = live ? 'HAPPENING NOW' : event.start > hour ? `STARTS IN ${minsUntil}m` : 'JUST WRAPPED';
  const filled = Math.min(100, (event.rsvp / event.spots) * 100);

  // Hide entirely on very small screens in portrait
  if (isMobile) return null;

  return (
    <div style={{
      position: 'fixed', right: isTablet ? 16 : 24, bottom: isTablet ? 16 : 24, zIndex: 60,
      width: isTablet ? 300 : 360, maxWidth: 'calc(100vw - 32px)',
      background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 16,
      boxShadow: '0 30px 60px -20px rgba(0,0,0,0.7)', overflow: 'hidden',
      maxHeight: open ? 520 : 56, transition: 'max-height .35s ease',
    }}>
      <div onClick={() => setOpen((o) => !o)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 14px 16px 18px', cursor: 'pointer', borderBottom: open ? '1px solid var(--line)' : '1px solid transparent', userSelect: 'none' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: live ? event.color : 'var(--dim)', boxShadow: live ? `0 0 8px ${event.color}` : 'none', flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', color: 'var(--lime)', textTransform: 'uppercase', flexShrink: 0 }}>{status}</span>
        <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--display)', fontWeight: 600, fontSize: 14, color: 'var(--paper)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</span>
        <button style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid var(--line-2)', background: 'transparent', color: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 14, lineHeight: 1, flexShrink: 0, cursor: 'pointer' }}>
          {open ? '—' : '+'}
        </button>
      </div>
      <div style={{ padding: 18, opacity: open ? 1 : 0, transition: 'opacity .25s ease' }}>
        <div style={{ position: 'relative', borderRadius: 12, height: 140, marginBottom: 16, overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: 14 }}>
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${event.color}33 0%, #0d0c1f 60%, #06070C 100%)` }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)' }} />
          <div style={{ position: 'absolute', top: 12, left: 12, width: 8, height: 8, borderRadius: '50%', background: event.color, boxShadow: `0 0 10px ${event.color}` }} />
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22, color: '#fff', zIndex: 1, lineHeight: 0.95, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>{event.title}</div>
        </div>
        {[
          ['WHEN',  `${fmtHour(event.start)} → ${fmtHour(event.end)}`],
          ['PRICE', event.rsvp < event.spots ? 'SPOTS AVAILABLE' : 'SOLD OUT'],
        ].map(([label, val]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0', borderBottom: '1px dashed var(--line)', gap: 16 }}>
            <span className="clique-label">{label}</span>
            <span style={{ fontFamily: 'var(--display)', fontSize: 14, color: 'var(--cream)' }}>{val}</span>
          </div>
        ))}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', color: 'var(--dim)' }}>{event.rsvp} / {event.spots} ON THE LIST</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', color: filled > 85 ? 'var(--hot)' : 'var(--cream)' }}>{event.spots - event.rsvp} LEFT</span>
          </div>
          <div style={{ height: 4, background: 'var(--line)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${filled}%`, background: filled > 85 ? 'var(--hot)' : 'var(--lime)', transition: 'width .4s ease' }} />
          </div>
        </div>
        <Link href="/signup" style={{ display: 'block', marginTop: 14, background: 'var(--lime)', color: 'var(--ink)', padding: '12px', borderRadius: 10, fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 500, letterSpacing: '.08em', textTransform: 'uppercase', textAlign: 'center' }}>
          Get on the list →
        </Link>
      </div>
    </div>
  );
}

// ─────── Hero ───────
interface HeroProps {
  events: DemoEvent[];
  hour: number;
  setHour: (h: number) => void;
  auto: boolean;
  setAuto: (a: boolean | ((p: boolean) => boolean)) => void;
  timeStr: string;
  dayLabel: string;
  totalLive: number;
  totalOut: number;
  featured: DemoEvent;
}
function Hero({ events, hour, setHour, auto, setAuto, timeStr, dayLabel, totalLive, totalOut, featured }: HeroProps) {
  const { isMobile, isTablet } = useBreakpoint();
  const hPad = isMobile ? '16px' : isTablet ? '28px' : '40px';
  const vPadTop = isMobile ? '88px' : isTablet ? '110px' : '140px';

  return (
    <section style={{ padding: `${vPadTop} ${hPad} ${isMobile ? '40px' : '60px'}`, position: 'relative' }}>
      {/* Headline */}
      <div>
        <h1 className="display-xxl">
          There&apos;s<br />
          somewhere<br />
          <span className="text-italic-serif" style={{ color: 'var(--lime)' }}>better</span><br />
          to be.
        </h1>
        <p style={{
          marginTop: isMobile ? 20 : 28,
          fontFamily: 'var(--display)',
          fontSize: isMobile ? 16 : 20,
          lineHeight: 1.35,
          maxWidth: 580,
          color: 'var(--cream)',
        }}>
          Clique is the guest list for your city — house parties, warehouse nights, supper clubs, listening rooms.
          <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--paper)' }}> One tap to RSVP. A QR pass at the door.</span>{' '}
          No middle-man, no scalper.
        </p>
        <div style={{
          display: 'flex', gap: 12, marginTop: isMobile ? 28 : 38,
          flexWrap: 'wrap',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'flex-start',
        }}>
          <Link href="/signup" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: isMobile ? '14px 20px' : '16px 22px',
            borderRadius: 999, fontFamily: 'var(--mono)',
            fontSize: isMobile ? 12 : 13,
            fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
            background: 'var(--lime)', color: 'var(--ink)',
            width: isMobile ? '100%' : 'auto',
          }}>
            Get on the list →
          </Link>
          <a href="#tonight" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: isMobile ? '14px 20px' : '16px 22px',
            borderRadius: 999, fontFamily: 'var(--mono)',
            fontSize: isMobile ? 12 : 13,
            fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
            background: 'transparent', color: 'var(--paper)', border: '1px solid var(--line-2)',
            width: isMobile ? '100%' : 'auto',
          }}>
            See tonight
          </a>
        </div>
      </div>

      <Timeline events={events} hour={hour} setHour={setHour} auto={auto} setAuto={setAuto} />
      <FloatingTicket event={featured} hour={hour} />
    </section>
  );
}

// ─────── Live events grid ───────
function TonightGrid({ events, hour }: { events: DemoEvent[]; hour: number }) {
  const { isMobile, isTablet } = useBreakpoint();
  const hPad = isMobile ? '16px' : isTablet ? '28px' : '40px';

  return (
    <section id="tonight" style={{
      borderTop: '1px solid var(--line)',
      padding: `${isMobile ? '48px' : '72px'} ${hPad}`,
      maxWidth: 1480, margin: '0 auto',
    }}>
      <div className="clique-label" style={{ marginBottom: 12, textAlign: 'center' }}>TONIGHT</div>
      <h2 className="display-xl" style={{
        fontSize: isMobile ? 'clamp(36px, 10vw, 56px)' : 'clamp(40px, 5vw, 80px)',
        marginBottom: isMobile ? 24 : 36,
        textAlign: 'center',
      }}>
        What&apos;s open<br />
        <span className="text-italic-serif" style={{ color: 'var(--lime)' }}>right now.</span>
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile
          ? '1fr'
          : isTablet
            ? 'repeat(2, 1fr)'
            : 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: isMobile ? 12 : 18,
      }}>
        {events.map((e) => {
          const live = isLive(e, hour);
          const filled = Math.min(100, (e.rsvp / e.spots) * 100);
          return (
            <Link href="/signup" key={e.id} style={{
              display: 'flex', flexDirection: isMobile ? 'row' : 'column',
              background: '#14110E',
              border: `1px solid ${live ? e.color : 'var(--line-2)'}`,
              borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
              transition: 'transform .25s ease, border-color .25s ease',
              textDecoration: 'none',
            }}>
              {/* Color header / left strip */}
              <div style={{
                position: 'relative',
                height: isMobile ? 'auto' : 110,
                width: isMobile ? 80 : 'auto',
                minWidth: isMobile ? 80 : 'auto',
                background: e.color,
                padding: isMobile ? '12px 8px' : 14,
                display: 'flex',
                alignItems: isMobile ? 'center' : 'flex-start',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}>
                <svg viewBox="0 0 100 60" preserveAspectRatio="none" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
                  {Array.from({ length: 18 }).map((_, i) => (
                    <line key={i} x1={i * 6 - 30} y1="0" x2={i * 6} y2="60" stroke="rgba(11,9,7,0.14)" strokeWidth="0.7" />
                  ))}
                </svg>
                {!isMobile && (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', color: 'rgba(11,9,7,0.85)', background: 'rgba(11,9,7,0.15)', padding: '4px 8px', borderRadius: 4, backdropFilter: 'blur(4px)', position: 'relative' }}>
                    {fmtHour(e.start)} → {fmtHour(e.end)}
                  </span>
                )}
                {live && (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--ink)', background: 'var(--paper)', padding: '4px 8px', borderRadius: 4, position: 'relative' }}>LIVE</span>
                )}
              </div>
              {/* Content */}
              <div style={{ padding: isMobile ? '14px 16px' : 18, display: 'flex', flexDirection: 'column', gap: isMobile ? 6 : 10, flex: 1 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--dim)' }}>{e.cat.toUpperCase()}</div>
                <div className="display-m" style={{ fontSize: isMobile ? 18 : 22 }}>{e.title}</div>
                {isMobile && (
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)' }}>
                    {fmtHour(e.start)} → {fmtHour(e.end)}
                  </div>
                )}
                <div style={{ height: 3, background: 'var(--line)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${filled}%`, background: filled > 85 ? 'var(--hot)' : 'var(--lime)' }} />
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: filled > 85 ? 'var(--hot)' : 'var(--dim)', letterSpacing: '.1em' }}>
                  {e.spots - e.rsvp} OF {e.spots} LEFT
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ─────── Signup Band ───────
function SignupBand() {
  const { isMobile, isTablet } = useBreakpoint();
  const hPad = isMobile ? '16px' : isTablet ? '28px' : '40px';

  return (
    <section style={{
      borderTop: '1px solid var(--line)',
      padding: `${isMobile ? '56px' : '90px'} ${hPad}`,
      maxWidth: 1480, margin: '0 auto',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <div className="clique-label">JOIN</div>
        <h2 className="display-xl" style={{
          marginTop: 12,
          textAlign: 'left',
          fontSize: isMobile ? 'clamp(36px, 10vw, 56px)' : undefined,
        }}>
          Doors open<br />
          in<br />
          <span className="text-italic-serif" style={{ color: 'var(--lime)' }}>your city.</span>
        </h2>
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 14,
          alignItems: 'flex-start',
          marginTop: isMobile ? 28 : 38,
          width: isMobile ? '100%' : 'auto',
        }}>
          <Link href="/signup" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px 22px', borderRadius: 999,
            fontFamily: 'var(--mono)', fontSize: isMobile ? 12 : 13,
            fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
            background: 'var(--lime)', color: 'var(--ink)',
            width: isMobile ? '100%' : 'auto',
          }}>
            Create account →
          </Link>
          <Link href="/login" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px 22px', borderRadius: 999,
            fontFamily: 'var(--mono)', fontSize: isMobile ? 12 : 13,
            fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
            background: 'transparent', color: 'var(--paper)', border: '1px solid var(--line-2)',
            width: isMobile ? '100%' : 'auto',
          }}>
            I already have one
          </Link>
        </div>
        <p style={{
          fontFamily: 'var(--display)',
          fontSize: isMobile ? 15 : 18,
          lineHeight: 1.4, color: 'var(--cream)',
          marginTop: 18,
          textAlign: 'left',
        }}>
          Find the secret. Everyone&apos;s invited.
        </p>
      </div>
    </section>
  );
}

// ─────── Footer ───────
function MiniFooter() {
  const { isMobile } = useBreakpoint();
  return (
    <footer style={{
      borderTop: '1px solid var(--line)',
      padding: isMobile ? '20px 16px' : '24px 40px',
      maxWidth: 1480, margin: '0 auto',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'flex-start' : 'center',
      gap: isMobile ? 12 : 16,
    }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', color: 'var(--dim)' }}>
        © {new Date().getFullYear()} CLIQUE CO.
      </div>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: isMobile ? 14 : 18,
      }}>
        {[
          { label: 'Code of conduct', href: '#' },
          { label: 'Privacy',         href: '/privacy' },
          { label: 'Terms',           href: '/terms' },
          { label: '@clique',         href: '#' },
        ].map(({ label, href }) => (
          <a key={label} href={href} style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--dim)' }}>{label}</a>
        ))}
      </div>
    </footer>
  );
}

// ─────── Root ───────
export default function LandingPage() {
  const { user } = useAuth();
  const router = useRouter();

  if (user) { router.replace('/events'); return null; }

  const realNow = new Date();
  const realFloat = realNow.getHours() + realNow.getMinutes() / 60;
  const initHour = (realFloat >= HOUR_MIN || realFloat < HOUR_MAX - 24)
    ? Math.max(realFloat < HOUR_MIN ? realFloat + 24 : realFloat, HOUR_MIN)
    : 21.5;
  const safeHour = isNaN(initHour) || initHour < HOUR_MIN || initHour > HOUR_MAX ? 21.5 : initHour;

  return <LandingInner initHour={safeHour} />;
}

function LandingInner({ initHour }: { initHour: number }) {
  const [hour, setHour] = useState(initHour);
  const [auto, setAuto] = useState(false);
  const [events, setEvents] = useState<DemoEvent[]>([]);
  const [eventsReady, setEventsReady] = useState(false);

  useEffect(() => {
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5001/api/v1';
    axios.get(`${BASE_URL}/events/public`)
      .then((res) => {
        const raw: Array<{
          _id: string; title: string; category: string;
          startTime: string; endTime: string; capacity: number; bookedCount: number;
        }> = res.data?.data?.events ?? [];
        setEvents(raw.length > 0 ? raw.map((e, i) => apiEventToDemo(e, i)) : DEMO_EVENTS);
      })
      .catch(() => setEvents(DEMO_EVENTS))
      .finally(() => setEventsReady(true));
  }, []);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => {
      setHour((h) => { const next = h + 0.05; return next >= HOUR_MAX ? HOUR_MIN : next; });
    }, 80);
    return () => clearInterval(id);
  }, [auto]);

  if (!eventsReady) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>Loading…</span>
      </div>
    );
  }

  const liveEvents = events.filter((e) => isLive(e, hour));
  const totalLive  = liveEvents.length;
  const totalOut   = liveEvents.reduce((s, e) => s + e.rsvp, 0);
  const timeStr    = fmtClock(hour);
  const dayLabel   = Math.floor(hour) >= 24 ? 'WED · LATE' : 'TUE · TONIGHT';
  const featured   = liveEvents.length
    ? [...liveEvents].sort((a, b) => b.rsvp - a.rsvp)[0]
    : events.slice().sort((a, b) => a.start - b.start).find((e) => e.start >= hour) ?? events[0];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', color: 'var(--paper)' }}>
      <Nav timeStr={timeStr} dayLabel={dayLabel} totalLive={totalLive} totalOut={totalOut} />
      <Hero
        events={events}
        hour={hour} setHour={setHour} auto={auto} setAuto={setAuto}
        timeStr={timeStr} dayLabel={dayLabel}
        totalLive={totalLive} totalOut={totalOut}
        featured={featured}
      />
      <TonightGrid events={events} hour={hour} />
      <SignupBand />
      <MiniFooter />
    </div>
  );
}
