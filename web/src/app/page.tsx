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

// Parse "HH:MM" or "HH:MM:SS" into a float hour (e.g. "22:30" → 22.5)
function parseTimeStr(t: string): number {
  const parts = t.split(':').map(Number);
  return parts[0] + (parts[1] ?? 0) / 60;
}

// Convert a real API event into the DemoEvent shape
function apiEventToDemo(e: {
  _id: string;
  title: string;
  category: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
}, idx: number): DemoEvent {
  let start = parseTimeStr(e.startTime);
  let end = parseTimeStr(e.endTime);
  // If end <= start treat it as next-day (add 24)
  if (end <= start) end += 24;
  // Clamp into the 18-30 window so the timeline renders it
  start = Math.max(HOUR_MIN, Math.min(HOUR_MAX - 0.01, start));
  end   = Math.max(start + 0.5, Math.min(HOUR_MAX, end));

  return {
    id:    e._id,
    title: e.title,
    cat:   e.category.replace(/_/g, ' '),
    start,
    end,
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

// ─────── Nav — receives synced live data from root ───────
interface NavProps {
  timeStr: string;
  dayLabel: string;
  totalLive: number;
  totalOut: number;
}
function Nav({ timeStr, dayLabel, totalLive, totalOut }: NavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [liveBarGone, setLiveBarGone] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      setLiveBarGone(window.scrollY > 210);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const showLive = scrolled && liveBarGone;

  return (
    <nav style={{
      position: 'fixed', inset: '0 0 auto 0', zIndex: 50,
      display: 'flex', alignItems: 'center',
      padding: '0 40px',
      height: showLive ? 52 : 64,
      backdropFilter: 'blur(12px) saturate(140%)',
      background: scrolled ? 'rgba(11,9,7,0.96)' : 'linear-gradient(180deg, rgba(11,9,7,0.78) 0%, rgba(11,9,7,0.0) 100%)',
      borderBottom: scrolled ? '1px solid var(--line)' : '1px solid transparent',
      transition: 'background .3s, border-color .3s, height .3s',
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontFamily: 'var(--display)', fontWeight: 800, letterSpacing: '-0.04em', fontSize: 22, color: 'var(--paper)', flexShrink: 0 }}>
        <span style={{ width: 9, height: 9, background: 'var(--lime)', borderRadius: '50%', alignSelf: 'center', boxShadow: '0 0 18px var(--lime)', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
        CLIQUE
        <sup style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 400, color: 'var(--dim)', letterSpacing: 0, alignSelf: 'flex-start', marginTop: 4 }}>est. tonight</sup>
      </Link>

      {/* Live bar — synced with scrubber, slides into nav when hero strip scrolls away */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 28px',
        opacity: showLive ? 1 : 0,
        transform: showLive ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity .25s ease, transform .25s ease',
        pointerEvents: 'none',
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
        <Link href="/login" style={{ color: 'var(--cream)', padding: '10px 14px', borderRadius: 999 }}>
          Log in
        </Link>
        <Link href="/signup" style={{ background: 'var(--lime)', color: 'var(--ink)', padding: '10px 14px', borderRadius: 999, border: '1px solid var(--lime)', transition: 'transform .15s ease' }}>
          Get on the list →
        </Link>
      </div>
    </nav>
  );
}

// ─────── Timeline scrubber ───────
function Timeline({ events, hour, setHour, auto, setAuto }: {
  events: DemoEvent[];
  hour: number; setHour: (h: number) => void; auto: boolean; setAuto: (a: boolean | ((prev: boolean) => boolean)) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(false);

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
  for (let h = HOUR_MIN; h <= HOUR_MAX; h++) ticks.push(h);

  return (
    <div style={{ marginTop: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginBottom: 28, flexWrap: 'wrap' }}>
        <div>
          <div className="clique-label" style={{ marginBottom: 6 }}>SCRUB THE NIGHT</div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600, color: 'var(--paper)' }}>
            Drag the cursor. The city responds.{' '}
            <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--dim)' }}>— or hit play.</span>
          </div>
        </div>
        <button
          onClick={() => setAuto((a) => !a)}
          style={{ background: 'transparent', color: 'var(--paper)', border: '1px solid var(--line-2)', padding: '12px 18px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 500, letterSpacing: '0.1em', cursor: 'pointer', transition: 'border-color .15s, color .15s' }}
        >
          {auto ? '■ PAUSE' : '▶ PLAY THE NIGHT'}
        </button>
      </div>

      <div
        ref={trackRef}
        onMouseDown={onDown}
        onTouchStart={onDown}
        style={{ position: 'relative', height: 130, border: '1px solid var(--line-2)', borderRadius: 14, overflow: 'hidden', cursor: drag ? 'grabbing' : 'ew-resize', background: '#0F0C09', userSelect: 'none' }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #1a1428 0%, #0d0c1f 22%, #06070C 50%, #060a18 75%, #1d1408 100%)', opacity: 0.7 }} />

        {events.map((e, idx) => {
          const left = hourToPct(e.start) * 100;
          const w = (hourToPct(e.end) - hourToPct(e.start)) * 100;
          const active = isLive(e, hour);
          return (
            <div key={e.id} title={e.title} style={{
              position: 'absolute', height: 10, borderRadius: 4,
              padding: '0 6px', display: 'flex', alignItems: 'center',
              fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.04em', color: 'var(--ink)',
              whiteSpace: 'nowrap', overflow: 'hidden',
              left: `${left}%`, width: `${w}%`,
              top: 16 + (idx % 3) * 14,
              background: active ? e.color : 'rgba(232,225,210,0.15)',
              border: `1px solid ${active ? e.color : 'transparent'}`,
              transform: active ? 'scaleY(1.2)' : 'none',
              transition: 'background .25s ease, transform .25s ease',
            }}>
              <span style={{ opacity: active ? 1 : 0 }}>{e.title}</span>
            </div>
          );
        })}

        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 8, height: 22 }}>
          {ticks.map((h) => (
            <div key={h} style={{ position: 'absolute', left: `${hourToPct(h) * 100}%`, transform: 'translateX(-50%)' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.08em' }}>
                {h % 24 === 0 ? '00' : String(h % 24).padStart(2, '0')}
              </span>
            </div>
          ))}
        </div>

        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${handlePct * 100}%`, transform: 'translateX(-50%)', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 2, marginLeft: -1, background: 'var(--lime)', boxShadow: '0 0 12px rgba(201,243,110,0.6)' }} />
          <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', width: 16, height: 16, background: 'var(--lime)', borderRadius: '50%', boxShadow: '0 0 0 4px rgba(201,243,110,0.18), 0 0 18px rgba(201,243,110,0.5)' }} />
          <div style={{ position: 'absolute', top: -38, left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink)', background: 'var(--lime)', padding: '4px 8px', borderRadius: 4, whiteSpace: 'nowrap', letterSpacing: '.04em' }}>
            {fmtClock(hour)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────── Floating ticket widget ───────
function FloatingTicket({ event, hour }: { event: DemoEvent; hour: number }) {
  const [open, setOpen] = useState(true);
  const live = isLive(event, hour);
  const minsUntil = Math.max(0, Math.round((event.start - hour) * 60));
  const status = live ? 'HAPPENING NOW' : event.start > hour ? `STARTS IN ${minsUntil}m` : 'JUST WRAPPED';
  const filled = Math.min(100, (event.rsvp / event.spots) * 100);

  return (
    <div style={{
      position: 'fixed', right: 24, bottom: 24, zIndex: 60,
      width: 360, maxWidth: 'calc(100vw - 32px)',
      background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 16,
      boxShadow: '0 30px 60px -20px rgba(0,0,0,0.7)', overflow: 'hidden',
      maxHeight: open ? 520 : 56, transition: 'max-height .35s ease',
    }}>
      <div onClick={() => setOpen((o) => !o)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 14px 16px 18px', cursor: 'pointer', borderBottom: open ? '1px solid var(--line)' : '1px solid transparent', userSelect: 'none' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: live ? event.color : 'var(--dim)', boxShadow: live ? `0 0 8px ${event.color}` : 'none', flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', color: 'var(--lime)', textTransform: 'uppercase', flexShrink: 0 }}>{status}</span>
        <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--display)', fontWeight: 600, fontSize: 14, color: 'var(--paper)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</span>
        <button style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid var(--line-2)', background: 'transparent', color: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 14, lineHeight: 1, flexShrink: 0 }}>
          {open ? '—' : '+'}
        </button>
      </div>
      <div style={{ padding: 18, opacity: open ? 1 : 0, transition: 'opacity .25s ease' }}>
        <div style={{ position: 'relative', background: event.color, borderRadius: 12, height: 100, marginBottom: 16, overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: 14 }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <line key={i} x1={i * 9} y1="0" x2={i * 9 - 30} y2="100" stroke="rgba(11,9,7,0.18)" strokeWidth="0.4" />
            ))}
          </svg>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22, color: 'var(--ink)', zIndex: 1, lineHeight: 0.95 }}>{event.title}</div>
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

// ─────── Hero — receives shared hour state from root ───────
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
  return (
    <section style={{ padding: '140px 40px 60px', position: 'relative' }}>
      {/* Live strip — full width, left-aligned, synced with scrubber */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 22, borderBottom: '1px solid var(--line)', marginBottom: 56 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--hot)', boxShadow: '0 0 0 4px rgba(255,61,110,0.18)', animation: 'pulse 1.6s ease-in-out infinite', display: 'inline-block' }} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--cream)', whiteSpace: 'nowrap' }}>
          LIVE — {dayLabel} · {timeStr}
        </span>
        <span style={{ flex: 1, height: 1, background: 'var(--line)', minWidth: 20 }} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--dim)', letterSpacing: '.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          {totalLive} open · {totalOut} out
        </span>
      </div>

      {/* Headline — left-aligned, full viewport width */}
      <div>
        <h1 className="display-xxl">
          There&apos;s<br />
          somewhere<br />
          <span className="text-italic-serif" style={{ color: 'var(--lime)' }}>better</span><br />
          to be.
        </h1>
        <p style={{ marginTop: 28, fontFamily: 'var(--display)', fontSize: 20, lineHeight: 1.35, maxWidth: 580, color: 'var(--cream)' }}>
          Clique is the guest list for your city — house parties, warehouse nights, supper clubs, listening rooms.
          <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--paper)' }}> One tap to RSVP. A QR pass at the door.</span>{' '}
          No middle-man, no scalper.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 38, flexWrap: 'wrap' }}>
          <Link href="/signup" style={{ display: 'inline-flex', alignItems: 'center', padding: '16px 22px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'var(--lime)', color: 'var(--ink)', transition: 'transform .15s ease' }}>
            Get on the list →
          </Link>
          <a href="#tonight" style={{ display: 'inline-flex', alignItems: 'center', padding: '16px 22px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'transparent', color: 'var(--paper)', border: '1px solid var(--line-2)' }}>
            See tonight
          </a>
        </div>
      </div>

      <Timeline events={events} hour={hour} setHour={setHour} auto={auto} setAuto={setAuto} />
      <FloatingTicket event={featured} hour={hour} />
    </section>
  );
}

// ─────── Live events grid — centered, justified headings ───────
function TonightGrid({ events, hour }: { events: DemoEvent[]; hour: number }) {
  return (
    <section id="tonight" style={{ borderTop: '1px solid var(--line)', padding: '72px 40px', maxWidth: 1480, margin: '0 auto' }}>
      <div className="clique-label" style={{ marginBottom: 12, textAlign: 'center' }}>TONIGHT</div>
      <h2 className="display-xl" style={{ fontSize: 'clamp(40px, 5vw, 80px)', marginBottom: 36, textAlign: 'center' }}>
        What&apos;s open<br />
        <span className="text-italic-serif" style={{ color: 'var(--lime)' }}>right now.</span>
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
        {events.map((e) => {
          const live = isLive(e, hour);
          const filled = Math.min(100, (e.rsvp / e.spots) * 100);
          return (
            <Link href="/signup" key={e.id} style={{ display: 'flex', flexDirection: 'column', background: '#14110E', border: `1px solid ${live ? e.color : 'var(--line-2)'}`, borderRadius: 16, overflow: 'hidden', cursor: 'pointer', transition: 'transform .25s ease, border-color .25s ease', textDecoration: 'none' }}>
              <div style={{ position: 'relative', height: 110, background: e.color, padding: 14, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <svg viewBox="0 0 100 60" preserveAspectRatio="none" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
                  {Array.from({ length: 18 }).map((_, i) => (
                    <line key={i} x1={i * 6 - 30} y1="0" x2={i * 6} y2="60" stroke="rgba(11,9,7,0.14)" strokeWidth="0.7" />
                  ))}
                </svg>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', color: 'rgba(11,9,7,0.85)', background: 'rgba(11,9,7,0.15)', padding: '4px 8px', borderRadius: 4, backdropFilter: 'blur(4px)', position: 'relative' }}>
                  {fmtHour(e.start)} → {fmtHour(e.end)}
                </span>
                {live && (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--ink)', background: 'var(--paper)', padding: '4px 8px', borderRadius: 4, position: 'relative' }}>LIVE</span>
                )}
              </div>
              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--dim)' }}>{e.cat.toUpperCase()}</div>
                <div className="display-m" style={{ fontSize: 22 }}>{e.title}</div>
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

// ─────── Signup Band — centered, justified ───────
function SignupBand() {
  return (
    <section style={{ borderTop: '1px solid var(--line)', padding: '90px 40px', maxWidth: 1480, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 48, alignItems: 'end' }}>
        <div>
          <div className="clique-label" style={{ textAlign: 'center' }}>JOIN</div>
          <h2 className="display-xl" style={{ marginTop: 12, textAlign: 'center' }}>
            Doors open in<br />
            <span className="text-italic-serif" style={{ color: 'var(--lime)' }}>your city.</span>
          </h2>
          <p style={{ fontFamily: 'var(--display)', fontSize: 18, lineHeight: 1.4, color: 'var(--cream)', marginTop: 18, textAlign: 'justify' }}>
            30 seconds to make an account. Free, no card, no spam. We text you when something good happens.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
          <Link href="/signup" style={{ display: 'inline-flex', alignItems: 'center', padding: '16px 22px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'var(--lime)', color: 'var(--ink)' }}>
            Create account →
          </Link>
          <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', padding: '16px 22px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'transparent', color: 'var(--paper)', border: '1px solid var(--line-2)' }}>
            I already have one
          </Link>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '.12em', display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ width: 6, height: 6, background: 'var(--lime)', borderRadius: '50%', boxShadow: '0 0 8px var(--lime)' }} />
            12,400 already on the list
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────── Footer — centered ───────
function MiniFooter() {
  return (
    <footer style={{ borderTop: '1px solid var(--line)', padding: '24px 40px', maxWidth: 1480, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', color: 'var(--dim)' }}>
        © {new Date().getFullYear()} CLIQUE CO.
      </div>
      <div style={{ display: 'flex', gap: 18 }}>
        {['Code of conduct', 'Privacy', 'Terms', '@clique'].map((label) => (
          <a key={label} href="#" style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--dim)' }}>{label}</a>
        ))}
      </div>
    </footer>
  );
}

// ─────── Root — owns all shared time/scrubber state ───────
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

  // Fetch real events; fall back to DEMO_EVENTS only if none exist
  useEffect(() => {
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5001/api/v1';
    axios.get(`${BASE_URL}/events/public`)
      .then((res) => {
        const raw: Array<{
          _id: string; title: string; category: string;
          startTime: string; endTime: string; capacity: number; bookedCount: number;
        }> = res.data?.data?.events ?? [];
        if (raw.length > 0) {
          setEvents(raw.map((e, i) => apiEventToDemo(e, i)));
        } else {
          setEvents(DEMO_EVENTS);
        }
      })
      .catch(() => {
        setEvents(DEMO_EVENTS);
      })
      .finally(() => setEventsReady(true));
  }, []);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => {
      setHour((h) => { const next = h + 0.05; return next >= HOUR_MAX ? HOUR_MIN : next; });
    }, 80);
    return () => clearInterval(id);
  }, [auto]);

  // Render nothing until events are resolved so we never flash placeholders
  if (!eventsReady) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>Loading…</span>
      </div>
    );
  }

  // All live data derived from the shared scrubber hour
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
