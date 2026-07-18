'use client';

import { useState, useEffect, useCallback } from 'react';
import EventCard from '@/components/EventCard';
import { Event } from '@/types';
import { formatDate } from '@/lib/utils';
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

const CATEGORIES = ['all', 'tonight', 'this weekend', 'near me', 'house party', 'warehouse', 'club', 'free'];
const ALL_VIBES  = ['chill', 'techno', 'indie', 'rooftop', 'late', 'loud', 'dance', 'food', 'ambient', 'bass', 'desi', 'bollywood'];

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={on} style={{ background: on ? 'var(--lime)' : 'transparent', color: on ? 'var(--ink)' : 'var(--cream)', border: `1px solid ${on ? 'var(--lime)' : 'var(--line-2)'}`, padding: '8px 14px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all .15s ease', whiteSpace: 'nowrap' }}>
      {children}
    </button>
  );
}

/** Skeleton lineup rows while the board loads. */
function BoardSkeleton() {
  return (
    <div className="ledger" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="ledger-row" style={{ display: 'grid', gridTemplateColumns: '88px 1fr auto', gap: 24, alignItems: 'center', padding: '22px 8px', animation: 'pulse 1.6s ease-in-out infinite', animationDelay: `${i * 0.12}s` }}>
          <div style={{ height: 24, width: 64, background: 'var(--line)', borderRadius: 3 }} />
          <div>
            <div style={{ height: 18, width: `${52 - i * 6}%`, background: 'var(--line)', borderRadius: 3 }} />
            <div style={{ height: 10, width: '30%', background: 'var(--line)', borderRadius: 3, marginTop: 8, opacity: 0.7 }} />
          </div>
          <div style={{ height: 16, width: 56, background: 'var(--line)', borderRadius: 3 }} />
        </div>
      ))}
    </div>
  );
}

export default function EventsPage() {
  const isMobile = useIsMobile();
  const [query, setQuery]           = useState('');
  const [activeCat, setActiveCat]   = useState('all');
  const [activeVibes, setActiveVibes] = useState<string[]>([]);
  const [events, setEvents]         = useState<Event[]>([]);
  const [loading, setLoading]       = useState(true);
  const [nearMeCity, setNearMeCity] = useState<string | null>(null);

  function toggleVibe(v: string) {
    setActiveVibes((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  }

  const fetchEvents = useCallback(async (q = '', cat = 'all') => {
    setLoading(true);
    setNearMeCity(null);
    try {
      if (cat === 'near me') {
        const { data } = await api.get('/events/near-me');
        setEvents(data.data?.events ?? []);
        setNearMeCity(data.data?.city ?? null);
        return;
      }

      const params: Record<string, string> = {};
      if (q) params.q = q;
      if (cat === 'tonight') params.date = 'tonight';
      else if (cat === 'this weekend') params.date = 'weekend';
      else if (cat === 'house party') params.category = 'house_party';
      else if (cat === 'warehouse') params.category = 'warehouse';
      else if (cat === 'club') params.category = 'club';
      else if (cat === 'free') { params.minPrice = '0'; params.maxPrice = '0'; }
      const { data } = await api.get('/events/search', { params });
      setEvents(data.data?.events ?? []);
    } catch { setEvents([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEvents(query, activeCat); }, [activeCat, fetchEvents]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchEvents(query, activeCat); };

  // Group the board by night, keeping chronological order
  const nights: { label: string; items: Event[] }[] = [];
  {
    const byDate = new Map<string, Event[]>();
    const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (const e of sorted) {
      const label = formatDate(e.date);
      if (!byDate.has(label)) { byDate.set(label, []); nights.push({ label, items: byDate.get(label)! }); }
      byDate.get(label)!.push(e);
    }
  }

  return (
    <div>
      {/* Masthead */}
      <div style={{ marginBottom: isMobile ? 18 : 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span aria-hidden style={{ height: 1, width: 20, background: 'var(--line-2)' }} />
          <div className="clique-label" style={{ whiteSpace: 'nowrap' }}>
            {activeCat === 'near me' && nearMeCity ? `IN ${nearMeCity.toUpperCase()}` : 'TONIGHT · YOUR CITY'}
          </div>
          <span aria-hidden style={{ height: 1, flex: 1, background: 'var(--line-2)' }} />
          <div className="clique-label" style={{ whiteSpace: 'nowrap' }}>
            {loading ? '· · ·' : `${String(events.length).padStart(2, '0')} ON THE BOARD`}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginTop: 16, paddingBottom: isMobile ? 16 : 22, borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: isMobile ? 'clamp(32px, 9vw, 48px)' : 'clamp(40px, 5vw, 64px)', lineHeight: 0.95, letterSpacing: '-0.03em', margin: 0 }}>
            What&apos;s open<br />
            <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--lime)' }}>right now.</span>
          </h1>
          {!isMobile && (
            <div style={{ textAlign: 'right', paddingBottom: 4 }}>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 56, lineHeight: 1, letterSpacing: '-0.03em' }}>
                {String(events.length).padStart(2, '0')}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--dim)', marginTop: 4 }}>OPEN NOW</div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky filter bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--ink)', paddingTop: 10, paddingBottom: 2, marginBottom: 8 }}>
        {/* Search: a line on the ledger, not a box */}
        <form onSubmit={handleSearch} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, borderBottom: '1px solid var(--line-2)', padding: '0 2px' }}>
            <label htmlFor="board-search" style={{ fontFamily: 'var(--mono)', color: 'var(--dim)', fontSize: 11, letterSpacing: '.14em', flexShrink: 0, cursor: 'text' }}>
              SEARCH /
            </label>
            <input
              id="board-search"
              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="title, host, venue…"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--display)', fontSize: isMobile ? 17 : 20, color: 'var(--paper)', padding: '12px 0' }}
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Clear search" style={{ background: 'transparent', border: 'none', color: 'var(--dim)', fontSize: 18, cursor: 'pointer', padding: '4px 8px' }}>×</button>
            )}
            <button type="submit" style={{ background: 'transparent', border: 'none', color: 'var(--lime)', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', cursor: 'pointer', padding: '4px 2px', flexShrink: 0 }}>
              GO →
            </button>
          </div>
        </form>

        {/* Category pills */}
        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 6, marginBottom: 10, paddingBottom: 12, borderBottom: '1px solid var(--line)', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {CATEGORIES.map((c) => (
            <Pill key={c} on={activeCat === c} onClick={() => setActiveCat(c)}>{c}</Pill>
          ))}
        </div>

        {/* Vibe pills */}
        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 6, alignItems: 'center', paddingBottom: 12, overflowX: 'auto', scrollbarWidth: 'none' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--dim)', marginRight: 8, flexShrink: 0 }}>VIBE:</span>
          {ALL_VIBES.map((v) => (
            <Pill key={v} on={activeVibes.includes(v)} onClick={() => toggleVibe(v)}>{v}</Pill>
          ))}
          {activeVibes.length > 0 && (
            <button onClick={() => setActiveVibes([])} style={{ background: 'transparent', border: 'none', color: 'var(--dim)', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', marginLeft: 4, flexShrink: 0 }}>
              clear ×
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <BoardSkeleton />
      ) : events.length === 0 ? (
        <div className="ledger" style={{ padding: '64px 8px 72px', textAlign: 'left' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.16em', color: 'var(--dim)', marginBottom: 14 }}>№ 000 — BLANK PAGE</div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: isMobile ? 30 : 40, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 10 }}>
            Nothing on the board.
          </div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 15, color: 'var(--cream)', marginBottom: 24, maxWidth: '46ch', lineHeight: 1.45 }}>
            {activeCat === 'near me' && !nearMeCity
              ? 'Add your city to your profile and we\'ll show you what\'s happening nearby.'
              : 'No events match these filters. Loosen up, or check back once hosts post tonight\'s lineup.'}
          </div>
          <button onClick={() => { setActiveCat('all'); setActiveVibes([]); setQuery(''); }} style={{ background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '13px 20px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
            Reset filters
          </button>
        </div>
      ) : (
        <div>
          {nights.map(({ label, items }) => (
            <section key={label} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '18px 2px 10px' }}>
                <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: isMobile ? 15 : 17, letterSpacing: '-0.01em', color: 'var(--paper)', whiteSpace: 'nowrap' }}>
                  {label}
                </span>
                <span aria-hidden style={{ height: 1, flex: 1, background: 'var(--line)', alignSelf: 'center' }} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', color: 'var(--dim)', whiteSpace: 'nowrap' }}>
                  {String(items.length).padStart(2, '0')} {items.length === 1 ? 'DOOR' : 'DOORS'}
                </span>
              </div>
              <div className="ledger">
                {items.map((e) => <EventCard key={e._id} event={e} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
