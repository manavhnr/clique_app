'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

// ─────── Data ───────
const DAY_COUNT = 7;
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

// start/end are day-index floats: 0.0 = start of MON, 7.0 = end of SUN
const DEMO_EVENTS = [
  { id: 'e1', title: 'Sunset on the Roof',    cat: 'house party', start: 0.1, end: 0.9, color: '#E8C46E', rsvp: 31,  spots: 42  },
  { id: 'e2', title: 'BASEMENT / Vol. 12',    cat: 'warehouse',   start: 1.1, end: 1.9, color: '#FF3D6E', rsvp: 174, spots: 200 },
  { id: 'e3', title: 'Dim Sum & Disco',        cat: 'supper club', start: 2.1, end: 2.9, color: '#C9F36E', rsvp: 64,  spots: 80  },
  { id: 'e4', title: 'Quiet Riot Listening',   cat: 'listening',   start: 3.1, end: 3.9, color: '#7DB4FF', rsvp: 28,  spots: 35  },
  { id: 'e5', title: 'Last Call Karaoke',      cat: 'karaoke',     start: 4.1, end: 4.9, color: '#E8C46E', rsvp: 47,  spots: 60  },
  { id: 'e6', title: 'Afterhours @ The Pool',  cat: 'afterhours',  start: 5.1, end: 5.9, color: '#FF3D6E', rsvp: 89,  spots: 120 },
  { id: 'e7', title: 'Slow Sunday Garden',     cat: 'garden',      start: 6.1, end: 6.9, color: '#C9F36E', rsvp: 22,  spots: 50  },
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

// dayOfWeek: 0=Mon … 6=Sun (Mon-based, matching our axis)
function apiEventToDemo(e: {
  _id: string; title: string; category: string;
  startTime: string; endTime: string; capacity: number; bookedCount: number;
  dayOfWeek: number;
}, idx: number): DemoEvent {
  const d = Math.max(0, Math.min(6, e.dayOfWeek));
  return {
    id:    e._id,
    title: e.title,
    cat:   e.category.replace(/_/g, ' '),
    start: d + 0.05,
    end:   d + 0.95,
    color: CAT_COLORS[e.category] ?? COLOR_CYCLE[idx % COLOR_CYCLE.length],
    rsvp:  e.bookedCount,
    spots: e.capacity,
  };
}

function dayToPct(d: number)  { return d / DAY_COUNT; }
function pctToDay(p: number)  { return DAY_COUNT * p; }
function isActive(e: DemoEvent, day: number) { return day >= e.start && day < e.end; }
function fmtDay(d: number)    { return DAYS[Math.min(6, Math.max(0, Math.floor(d)))]; }

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
    isMobile:  width < 640,
    isTablet:  width >= 640 && width < 1024,
    isDesktop: width >= 1024,
    width,
  };
}

// ─────── Nav ───────
interface NavProps {
  weekLabel: string;
  dayLabel:  string;
  totalLive: number;
  totalOut:  number;
}
function Nav({ weekLabel, dayLabel, totalLive, totalOut }: NavProps) {
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
      transition: 'background .3s, border-color .3s',
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
            LIVE — {weekLabel} · {dayLabel}
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

// ─────── Timeline ───────
function Timeline({ events, day, setDay, auto, setAuto }: {
  events: DemoEvent[];
  day: number; setDay: (d: number) => void;
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
    setDay(pctToDay(pct));
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

  const handlePct = dayToPct(day);

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
            {auto ? 'NOW PLAYING' : 'SCRUB THE WEEK'}
          </div>
          <div style={{
            fontFamily: 'var(--display)',
            fontSize: isMobile ? 16 : 22,
            fontWeight: 600, color: 'var(--paper)',
          }}>
            {auto
              ? <>The week is playing.{' '}<span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--dim)' }}>— click pause to scrub.</span></>
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
          {auto ? '■ PAUSE' : '▶ PLAY THE WEEK'}
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

        {/* Day column dividers */}
        {DAYS.map((_, i) => i > 0 && (
          <div key={i} style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${(i / DAY_COUNT) * 100}%`,
            width: 1, background: 'rgba(255,255,255,0.05)',
            pointerEvents: 'none',
          }} />
        ))}

        {/* Event pills */}
        {events.map((e, idx) => {
          const left   = dayToPct(e.start) * 100;
          const w      = (dayToPct(e.end) - dayToPct(e.start)) * 100;
          const active = isActive(e, day);
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

        {/* Day axis — centered labels per column */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 8, height: 22 }}>
          {DAYS.map((label, i) => (
            <div key={label} style={{ position: 'absolute', left: `${((i + 0.5) / DAY_COUNT) * 100}%`, transform: 'translateX(-50%)' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: isMobile ? 8 : 10, color: 'var(--dim)', letterSpacing: '.08em' }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Scrubber handle */}
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
            {fmtDay(day)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────── Floating ticket widget (draggable) ───────
function FloatingTicket({ event, day }: { event: DemoEvent; day: number }) {
  const { isMobile, isTablet } = useBreakpoint();
  const [open, setOpen]   = useState(!isMobile && !isTablet);
  // null = use CSS right/bottom anchor; once dragged, switches to absolute x/y
  const [pos, setPos]     = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const widgetRef   = useRef<HTMLDivElement>(null);
  const dragOrigin  = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const movedRef    = useRef(false);

  const active    = isActive(event, day);
  const daysUntil = Math.max(0, Math.ceil(event.start - day));
  const status    = active ? 'HAPPENING THIS WEEK' : event.start > day ? `UP IN ${daysUntil}d` : 'JUST WRAPPED';
  const filled    = Math.min(100, (event.rsvp / event.spots) * 100);
  const w         = isTablet ? 300 : 360;

  function startDrag(e: React.MouseEvent | React.TouchEvent) {
    // Don't block clicks on the +/— button
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    e.preventDefault();
    movedRef.current = false;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    // Capture current widget rect so we can offset correctly
    const rect = widgetRef.current?.getBoundingClientRect() ?? {
      left: pos?.x ?? window.innerWidth - w - 24,
      top:  pos?.y ?? window.innerHeight - 520 - 24,
    };
    dragOrigin.current = { mx: clientX, my: clientY, ox: rect.left, oy: rect.top };
    if (pos === null) setPos({ x: rect.left, y: rect.top });
    setDragging(true);

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!dragOrigin.current) return;
      const cx = 'touches' in ev ? (ev as TouchEvent).touches[0].clientX : (ev as MouseEvent).clientX;
      const cy = 'touches' in ev ? (ev as TouchEvent).touches[0].clientY : (ev as MouseEvent).clientY;
      const dx = cx - dragOrigin.current.mx;
      const dy = cy - dragOrigin.current.my;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth  - w,  dragOrigin.current.ox + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 56, dragOrigin.current.oy + dy)),
      });
    };
    const onUp = () => {
      setDragging(false);
      dragOrigin.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend',  onUp);
  }

  function handleHeaderClick() {
    // Suppress toggle if the user actually dragged
    if (movedRef.current) return;
    setOpen((o) => !o);
  }

  if (isMobile) return null;

  const anchorStyle: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y }
    : { right: isTablet ? 16 : 24, bottom: isTablet ? 16 : 24 };

  return (
    <div ref={widgetRef} style={{
      position: 'fixed', ...anchorStyle, zIndex: 60,
      width: w, maxWidth: 'calc(100vw - 32px)',
      background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 16,
      boxShadow: '0 30px 60px -20px rgba(0,0,0,0.7)', overflow: 'hidden',
      maxHeight: open ? 520 : 56,
      transition: dragging ? 'none' : 'max-height .35s ease',
      userSelect: 'none',
    }}>
      {/* Drag handle + toggle header */}
      <div
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        onClick={handleHeaderClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '16px 14px 16px 18px',
          cursor: dragging ? 'grabbing' : 'grab',
          borderBottom: open ? '1px solid var(--line)' : '1px solid transparent',
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? event.color : 'var(--dim)', boxShadow: active ? `0 0 8px ${event.color}` : 'none', flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', color: 'var(--lime)', textTransform: 'uppercase', flexShrink: 0 }}>{status}</span>
        <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--display)', fontWeight: 600, fontSize: 14, color: 'var(--paper)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</span>
        <button
          onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
          style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid var(--line-2)', background: 'transparent', color: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 14, lineHeight: 1, flexShrink: 0, cursor: 'pointer' }}
        >
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
          ['WHEN',  fmtDay(event.start)],
          ['SPOTS', event.rsvp < event.spots ? 'AVAILABLE' : 'SOLD OUT'],
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
  events:    DemoEvent[];
  day:       number;
  setDay:    (d: number) => void;
  auto:      boolean;
  setAuto:   (a: boolean | ((p: boolean) => boolean)) => void;
  weekLabel: string;
  dayLabel:  string;
  totalLive: number;
  totalOut:  number;
  featured:  DemoEvent;
}
function Hero({ events, day, setDay, auto, setAuto, featured }: HeroProps) {
  const { isMobile, isTablet } = useBreakpoint();
  const hPad    = isMobile ? '16px' : isTablet ? '28px' : '40px';
  const vPadTop = isMobile ? '88px' : isTablet ? '110px' : '140px';

  return (
    <section style={{ padding: `${vPadTop} ${hPad} ${isMobile ? '40px' : '60px'}`, position: 'relative' }}>
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
          Find the secret. Everyone&apos;s invited.
        </p>
      </div>

      <Timeline events={events} day={day} setDay={setDay} auto={auto} setAuto={setAuto} />
      <FloatingTicket event={featured} day={day} />
    </section>
  );
}

// ─────── This-week events grid ───────
function TonightGrid({ events, day }: { events: DemoEvent[]; day: number }) {
  const { isMobile, isTablet } = useBreakpoint();
  const hPad = isMobile ? '16px' : isTablet ? '28px' : '40px';

  return (
    <section id="tonight" style={{
      borderTop: '1px solid var(--line)',
      padding: `${isMobile ? '48px' : '72px'} ${hPad}`,
      maxWidth: 1480, margin: '0 auto',
    }}>
      <div className="clique-label" style={{ marginBottom: 12, textAlign: 'center' }}>THIS WEEK</div>
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
          const active = isActive(e, day);
          const filled = Math.min(100, (e.rsvp / e.spots) * 100);
          return (
            <Link href="/signup" key={e.id} style={{
              display: 'flex', flexDirection: isMobile ? 'row' : 'column',
              background: '#14110E',
              border: `1px solid ${active ? e.color : 'var(--line-2)'}`,
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
                    {fmtDay(e.start)}
                  </span>
                )}
                {active && (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--ink)', background: 'var(--paper)', padding: '4px 8px', borderRadius: 4, position: 'relative' }}>THIS WEEK</span>
                )}
              </div>
              {/* Content */}
              <div style={{ padding: isMobile ? '14px 16px' : 18, display: 'flex', flexDirection: 'column', gap: isMobile ? 6 : 10, flex: 1 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--dim)' }}>{e.cat.toUpperCase()}</div>
                <div className="display-m" style={{ fontSize: isMobile ? 18 : 22 }}>{e.title}</div>
                {isMobile && (
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)' }}>
                    {fmtDay(e.start)}
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div className="clique-label">JOIN</div>
        <h2 className="display-xl" style={{
          marginTop: 12,
          textAlign: 'center',
          fontSize: isMobile ? 'clamp(36px, 10vw, 56px)' : undefined,
        }}>
          Doors open<br />
          in<br />
          <span className="text-italic-serif" style={{ color: 'var(--lime)' }}>your city.</span>
        </h2>
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 14,
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
          textAlign: 'center',
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 14 : 18 }}>
        {[
          { label: 'Code of conduct', href: '/conduct' },
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

  // JS getDay(): 0=Sun → convert to Mon-based: 0=Mon … 6=Sun
  const initDay = (new Date().getDay() + 6) % 7;
  return <LandingInner initDay={initDay} />;
}

function LandingInner({ initDay }: { initDay: number }) {
  const [day, setDay]               = useState(initDay + 0.5);
  const [auto, setAuto]             = useState(false);
  const [events, setEvents]         = useState<DemoEvent[]>([]);
  const [eventsReady, setEventsReady] = useState(false);

  useEffect(() => {
    const BASE_URL  = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5001/api/v1';
    const startDate = new Date();
    const endDate   = new Date(); endDate.setDate(endDate.getDate() + 7);
    axios.get(`${BASE_URL}/events/public`, {
      params: { start_date: startDate.toISOString(), end_date: endDate.toISOString() },
    })
      .then((res) => {
        const raw: Array<{
          _id: string; title: string; category: string;
          startTime: string; endTime: string; capacity: number; bookedCount: number;
          dayOfWeek: number;
        }> = res.data?.data?.events ?? [];
        setEvents(raw.length > 0 ? raw.map((e, i) => apiEventToDemo(e, i)) : DEMO_EVENTS);
      })
      .catch(() => setEvents(DEMO_EVENTS))
      .finally(() => setEventsReady(true));
  }, []);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => {
      setDay((d) => { const next = d + 0.02; return next >= DAY_COUNT ? 0 : next; });
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

  const activeEvents = events.filter((e) => isActive(e, day));
  const totalLive    = activeEvents.length;
  const totalOut     = activeEvents.reduce((s, e) => s + e.rsvp, 0);
  const weekLabel    = 'THIS WEEK';
  const dayLabel     = fmtDay(day);
  const featured     = activeEvents.length
    ? [...activeEvents].sort((a, b) => b.rsvp - a.rsvp)[0]
    : events.slice().sort((a, b) => a.start - b.start).find((e) => e.start >= day) ?? events[0];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', color: 'var(--paper)' }}>
      <Nav weekLabel={weekLabel} dayLabel={dayLabel} totalLive={totalLive} totalOut={totalOut} />
      <Hero
        events={events}
        day={day} setDay={setDay} auto={auto} setAuto={setAuto}
        weekLabel={weekLabel} dayLabel={dayLabel}
        totalLive={totalLive} totalOut={totalOut}
        featured={featured}
      />
      <TonightGrid events={events} day={day} />
      <SignupBand />
      <MiniFooter />
    </div>
  );
}
