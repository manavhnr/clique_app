'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

// ─────── Data ───────
const DEMO_EVENTS = [
  { id: 'e1', title: 'Sunset on the Roof',   cat: 'house party', day: 'MON', color: '#E8C46E', rsvp: 31,  spots: 42  },
  { id: 'e2', title: 'BASEMENT / Vol. 12',   cat: 'warehouse',   day: 'TUE', color: '#FF3D6E', rsvp: 174, spots: 200 },
  { id: 'e3', title: 'Dim Sum & Disco',       cat: 'supper club', day: 'WED', color: '#C9F36E', rsvp: 64,  spots: 80  },
  { id: 'e4', title: 'Quiet Riot Listening',  cat: 'listening',   day: 'THU', color: '#7DB4FF', rsvp: 28,  spots: 35  },
  { id: 'e5', title: 'Last Call Karaoke',     cat: 'karaoke',     day: 'FRI', color: '#E8C46E', rsvp: 47,  spots: 60  },
  { id: 'e6', title: 'Afterhours @ The Pool', cat: 'afterhours',  day: 'SAT', color: '#FF3D6E', rsvp: 89,  spots: 120 },
  { id: 'e7', title: 'Slow Sunday Garden',    cat: 'garden',      day: 'SUN', color: '#C9F36E', rsvp: 22,  spots: 50  },
];

const DEMO_PAST_EVENTS = [
  { id: 'p1', title: 'Neon Garden Rave',       date: 'OCT 18', cat: 'warehouse',   attended: 187, capacity: 200, color: '#FF3D6E' },
  { id: 'p2', title: 'Rooftop Reunion',         date: 'OCT 12', cat: 'house party', attended: 38,  capacity: 42,  color: '#E8C46E' },
  { id: 'p3', title: 'Midnight Brunch Club',    date: 'OCT 5',  cat: 'supper club', attended: 72,  capacity: 80,  color: '#C9F36E' },
  { id: 'p4', title: 'Vol. 11 / BASEMENT',      date: 'SEP 28', cat: 'warehouse',   attended: 198, capacity: 200, color: '#FF3D6E' },
  { id: 'p5', title: 'Soft Sunday Sessions',    date: 'SEP 22', cat: 'garden',      attended: 44,  capacity: 50,  color: '#7DB4FF' },
  { id: 'p6', title: 'Last Train to Nowhere',   date: 'SEP 14', cat: 'concert',     attended: 115, capacity: 120, color: '#E8A0FF' },
];

// Hero media slots — swap src/videoSrc for real assets when available
const HERO_MEDIA = [
  { id: 'm1', title: 'BASEMENT Vol. 11', date: 'SEP 28', type: 'video' as const, color: '#FF3D6E', src: '' },
  { id: 'm2', title: 'Rooftop Reunion',  date: 'OCT 12', type: 'image' as const, color: '#E8C46E', src: '' },
  { id: 'm3', title: 'Neon Garden Rave', date: 'OCT 18', type: 'image' as const, color: '#C9F36E', src: '' },
  { id: 'm4', title: 'Soft Sunday',      date: 'SEP 22', type: 'video' as const, color: '#7DB4FF', src: '' },
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

type UpcomingEvent = typeof DEMO_EVENTS[0];
type PastEvent     = typeof DEMO_PAST_EVENTS[0];

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
function Nav({ totalEvents }: { totalEvents: number }) {
  const [scrolled, setScrolled] = useState(false);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
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

      {!isMobile && totalEvents > 0 && (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 12,
          padding: '0 28px', overflow: 'hidden',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--hot)', boxShadow: '0 0 0 3px rgba(255,61,110,0.18)', animation: 'pulse 1.6s ease-in-out infinite', display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--cream)', whiteSpace: 'nowrap' }}>
            {totalEvents} EVENTS THIS WEEK
          </span>
        </div>
      )}

      {isMobile && <div style={{ flex: 1 }} />}

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

// ─────── Media mosaic ───────
function MediaMosaic() {
  const { isMobile, isTablet } = useBreakpoint();

  const [featured, ...rest] = HERO_MEDIA;

  if (isMobile) {
    // 2×2 grid on mobile
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '140px 140px',
        gap: 8,
        marginTop: 32,
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        {HERO_MEDIA.map((m) => (
          <MediaSlot key={m.id} item={m} />
        ))}
      </div>
    );
  }

  if (isTablet) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gridTemplateRows: '200px 200px',
        gap: 10,
        marginTop: 40,
        borderRadius: 14,
        overflow: 'hidden',
      }}>
        <div style={{ gridRow: '1 / 3' }}>
          <MediaSlot key={featured.id} item={featured} style={{ height: '100%' }} />
        </div>
        {rest.slice(0, 2).map((m) => (
          <MediaSlot key={m.id} item={m} />
        ))}
      </div>
    );
  }

  // Desktop: tall featured left + 2 stacked right + 1 wide bottom strip
  return (
    <div style={{ marginTop: 52 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr',
        gridTemplateRows: '260px 180px',
        gap: 12,
        borderRadius: 16,
        overflow: 'hidden',
      }}>
        {/* Featured — spans 2 rows */}
        <div style={{ gridRow: '1 / 3' }}>
          <MediaSlot item={HERO_MEDIA[0]} style={{ height: '100%' }} />
        </div>
        {/* Top right */}
        <MediaSlot item={HERO_MEDIA[1]} />
        <MediaSlot item={HERO_MEDIA[2]} />
        {/* Bottom right two */}
        <div style={{ gridColumn: '2 / 4' }}>
          <MediaSlot item={HERO_MEDIA[3]} style={{ height: '100%' }} wide />
        </div>
      </div>
    </div>
  );
}

function MediaSlot({
  item,
  style,
  wide,
}: {
  item: typeof HERO_MEDIA[0];
  style?: React.CSSProperties;
  wide?: boolean;
}) {
  return (
    <div style={{
      position: 'relative',
      background: `linear-gradient(135deg, ${item.color}2a 0%, #0d0c1f 55%, #06070C 100%)`,
      overflow: 'hidden',
      ...style,
    }}>
      {/* Real image/video — shown when src is provided */}
      {item.src && item.type === 'image' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.src} alt={item.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      {item.src && item.type === 'video' && (
        <video src={item.src} autoPlay muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}

      {/* Grain overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)' }} />

      {/* Video play badge */}
      {item.type === 'video' && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          width: 28, height: 28, borderRadius: '50%',
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 9, color: '#fff', marginLeft: 1 }}>▶</span>
        </div>
      )}

      {/* Color accent dot */}
      <div style={{
        position: 'absolute', top: 12, left: 12,
        width: 8, height: 8, borderRadius: '50%',
        background: item.color, boxShadow: `0 0 8px ${item.color}`,
      }} />

      {/* Bottom label */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: wide ? '10px 16px' : '10px 12px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <span style={{
          fontFamily: 'var(--display)', fontWeight: 700,
          fontSize: wide ? 15 : 13,
          color: '#fff', lineHeight: 1.1,
          textShadow: '0 1px 6px rgba(0,0,0,0.6)',
          whiteSpace: wide ? 'nowrap' : undefined,
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {item.title}
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.1em', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {item.date}
        </span>
      </div>
    </div>
  );
}

// ─────── Hero ───────
function Hero() {
  const { isMobile, isTablet } = useBreakpoint();
  const hPad    = isMobile ? '16px' : isTablet ? '28px' : '40px';
  const vPadTop = isMobile ? '88px' : isTablet ? '110px' : '140px';

  return (
    <section style={{ padding: `${vPadTop} ${hPad} ${isMobile ? '40px' : '60px'}`, position: 'relative' }}>
      <div style={{ maxWidth: 1480, margin: '0 auto' }}>
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

        <MediaMosaic />
      </div>
    </section>
  );
}

// ─────── Live ticker strip ───────
function Ticker({ events }: { events: UpcomingEvent[] }) {
  if (events.length === 0) return null;
  const line = events.map((e) => {
    const left = Math.max(0, e.spots - e.rsvp);
    return `${e.title.toUpperCase()} — ${e.day} · ${left} LEFT`;
  }).map((t) => `● ${t}`).join('   ');

  return (
    <div className="ticker" aria-hidden style={{ padding: '10px 0' }}>
      <div className="ticker-track">
        {[0, 1].map((i) => (
          <span key={i} style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', paddingRight: 48, textTransform: 'uppercase', whiteSpace: 'pre' }}>
            {line}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─────── This-week lineup board ───────
function TonightGrid({ events }: { events: UpcomingEvent[] }) {
  const { isMobile, isTablet } = useBreakpoint();
  const hPad = isMobile ? '16px' : isTablet ? '28px' : '40px';

  return (
    <section id="tonight" style={{
      borderTop: '1px solid var(--line)',
      padding: `${isMobile ? '48px' : '72px'} ${hPad}`,
      maxWidth: 1480, margin: '0 auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: isMobile ? 20 : 28, flexWrap: 'wrap' }}>
        <div>
          <div className="clique-label" style={{ marginBottom: 12 }}>THIS WEEK — THE BOARD</div>
          <h2 className="display-xl" style={{ fontSize: isMobile ? 'clamp(36px, 10vw, 56px)' : 'clamp(40px, 5vw, 80px)' }}>
            What&apos;s open<br />
            <span className="text-italic-serif" style={{ color: 'var(--lime)' }}>right now.</span>
          </h2>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', color: 'var(--dim)', paddingBottom: 10, whiteSpace: 'nowrap' }}>
          {String(events.length).padStart(2, '0')} DOORS THIS WEEK
        </div>
      </div>

      <div className="ledger">
        {events.map((e, idx) => {
          const filled = Math.min(100, (e.rsvp / e.spots) * 100);
          const left   = Math.max(0, e.spots - e.rsvp);
          return (
            <Link href="/signup" key={e.id} className="ledger-row" style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '52px 1fr' : '72px 90px 1fr auto',
              alignItems: 'center',
              gap: isMobile ? 14 : 24,
              padding: isMobile ? '16px 4px' : '20px 8px',
              textDecoration: 'none',
            }}>
              <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: isMobile ? 20 : 28, letterSpacing: '-0.02em', color: 'var(--line-2)', lineHeight: 1 }}>
                {String(idx + 1).padStart(2, '0')}
              </span>

              {!isMobile && (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.14em', color: 'var(--dim)' }}>
                  {e.day}
                </span>
              )}

              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span className="display-m" style={{ fontSize: isMobile ? 19 : 26, color: 'var(--paper)' }}>{e.title}</span>
                  <span aria-hidden style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 1, background: e.color, flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', color: 'var(--dim)', textTransform: 'uppercase' }}>{e.cat}</span>
                </span>
                {isMobile && (
                  <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--dim)', marginTop: 5 }}>
                    {e.day} · {left} OF {e.spots} LEFT
                  </span>
                )}
              </span>

              {!isMobile && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 12, justifySelf: 'end' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.1em', color: filled > 85 ? 'var(--hot)' : 'var(--dim)', whiteSpace: 'nowrap' }}>
                    {left} OF {e.spots} LEFT
                  </span>
                  <span style={{ display: 'inline-block', height: 3, width: 64, background: 'var(--line)', borderRadius: 2, overflow: 'hidden' }} aria-hidden>
                    <span style={{ display: 'block', height: '100%', width: `${filled}%`, background: filled > 85 ? 'var(--hot)' : 'var(--lime)' }} />
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--dim)' }}>→</span>
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ─────── Past events section ───────
function PastEvents({ events }: { events: PastEvent[] }) {
  const { isMobile, isTablet } = useBreakpoint();
  const hPad = isMobile ? '16px' : isTablet ? '28px' : '40px';
  const cols = isMobile ? 1 : isTablet ? 2 : 3;
  const totalAttended = events.reduce((s, e) => s + e.attended, 0);

  return (
    <section style={{
      borderTop: '1px solid var(--line)',
      padding: `${isMobile ? '48px' : '72px'} ${hPad}`,
      maxWidth: 1480, margin: '0 auto',
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end',
        justifyContent: 'space-between', gap: 24,
        marginBottom: isMobile ? 28 : 44, flexWrap: 'wrap',
      }}>
        <div>
          <div className="clique-label" style={{ marginBottom: 12 }}>PREVIOUSLY</div>
          <h2 className="display-xl" style={{ fontSize: isMobile ? 'clamp(36px, 10vw, 56px)' : 'clamp(40px, 5vw, 80px)' }}>
            What went<br />
            <span className="text-italic-serif" style={{ color: 'var(--lime)' }}>down.</span>
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'flex-start' : 'flex-end', gap: 4, paddingBottom: 10 }}>
          <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: isMobile ? 28 : 36, letterSpacing: '-0.03em', color: 'var(--paper)', lineHeight: 1 }}>
            {totalAttended.toLocaleString()}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', color: 'var(--dim)', textTransform: 'uppercase' }}>
            people showed up
          </span>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: isMobile ? 12 : 16,
      }}>
        {events.map((e) => {
          const fillPct = Math.min(100, (e.attended / e.capacity) * 100);
          const soldOut = e.attended >= e.capacity;
          return (
            <div key={e.id} style={{
              position: 'relative',
              border: '1px solid var(--line)',
              borderRadius: 12,
              padding: isMobile ? '20px 18px' : '24px 22px',
              background: '#0D0B09',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column', gap: 16,
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: e.color, opacity: 0.85 }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', color: 'var(--dim)', textTransform: 'uppercase' }}>
                  {e.date}
                </span>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.1em',
                  textTransform: 'uppercase', color: 'var(--ink)',
                  background: e.color, padding: '3px 8px', borderRadius: 2,
                  opacity: 0.9,
                }}>
                  {e.cat}
                </span>
              </div>

              <div style={{
                fontFamily: 'var(--display)', fontWeight: 700,
                fontSize: isMobile ? 22 : 26, lineHeight: 0.95,
                letterSpacing: '-0.02em', color: 'var(--paper)',
                flex: 1,
              }}>
                {e.title}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', color: 'var(--dim)', textTransform: 'uppercase' }}>
                    {e.attended} / {e.capacity} showed up
                  </span>
                  {soldOut && (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--hot)', textTransform: 'uppercase' }}>
                      SOLD OUT
                    </span>
                  )}
                </div>
                <div style={{ height: 3, background: 'var(--line)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${fillPct}%`, background: soldOut ? 'var(--hot)' : e.color, opacity: 0.75 }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: isMobile ? 24 : 32,
        fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em',
        color: 'var(--dim)', textTransform: 'uppercase', textAlign: 'center',
      }}>
        More events dropping every week —{' '}
        <Link href="/signup" style={{ color: 'var(--lime)', textDecoration: 'none' }}>
          join to see all →
        </Link>
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
            padding: '16px 24px', borderRadius: 3,
            fontFamily: 'var(--mono)', fontSize: isMobile ? 12 : 13,
            fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
            background: 'var(--lime)', color: 'var(--ink)',
            width: isMobile ? '100%' : 'auto',
          }}>
            Create account →
          </Link>
          <Link href="/login" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px 24px', borderRadius: 3,
            fontFamily: 'var(--mono)', fontSize: isMobile ? 12 : 13,
            fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
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
          { label: 'Refund policy',   href: '/refund' },
          { label: 'Contact',         href: '/contact' },
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
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) return;
    if (!user.hasCompletedSetup) {
      router.replace('/setup');
    } else {
      router.replace('/events');
    }
  }, [isLoading, user, router]);

  if (isLoading || user) return null;

  return <LandingInner />;
}

function LandingInner() {
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [pastEvents, setPastEvents]         = useState<PastEvent[]>(DEMO_PAST_EVENTS);
  const [ready, setReady]                   = useState(false);

  useEffect(() => {
    const BASE_URL  = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5001/api/v1';
    const startDate = new Date();
    const endDate   = new Date(); endDate.setDate(endDate.getDate() + 7);

    const upFetch = axios.get(`${BASE_URL}/events/public`, {
      params: { start_date: startDate.toISOString(), end_date: endDate.toISOString() },
    }).then((res) => {
      const raw: Array<{
        _id: string; title: string; category: string;
        capacity: number; bookedCount: number; dayOfWeek: number;
      }> = res.data?.data?.events ?? [];
      const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
      setUpcomingEvents(raw.length > 0
        ? raw.map((e, i) => ({
          id:    e._id,
          title: e.title,
          cat:   e.category.replace(/_/g, ' '),
          day:   days[Math.max(0, Math.min(6, e.dayOfWeek))],
          color: CAT_COLORS[e.category] ?? COLOR_CYCLE[i % COLOR_CYCLE.length],
          rsvp:  e.bookedCount,
          spots: e.capacity,
        }))
        : DEMO_EVENTS,
      );
    }).catch(() => setUpcomingEvents(DEMO_EVENTS));

    const pastFetch = axios.get(`${BASE_URL}/events/public`, {
      params: { status: 'completed', limit: 6 },
    }).then((res) => {
      const raw: Array<{
        _id: string; title: string; category: string;
        date: string; bookedCount: number; capacity: number; checkedInCount?: number;
      }> = res.data?.data?.events ?? [];
      if (raw.length > 0) {
        setPastEvents(raw.map((e, i) => ({
          id:       e._id,
          title:    e.title,
          date:     new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase(),
          cat:      e.category.replace(/_/g, ' '),
          attended: e.checkedInCount ?? e.bookedCount,
          capacity: e.capacity,
          color:    CAT_COLORS[e.category] ?? COLOR_CYCLE[i % COLOR_CYCLE.length],
        })));
      }
    }).catch(() => {});

    Promise.all([upFetch, pastFetch]).finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>Loading…</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', color: 'var(--paper)' }}>
      <Nav totalEvents={upcomingEvents.length} />
      <Hero />
      <Ticker events={upcomingEvents} />
      <TonightGrid events={upcomingEvents} />
      <PastEvents events={pastEvents} />
      <SignupBand />
      <MiniFooter />
    </div>
  );
}
