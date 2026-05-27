'use client';

import { useState, useEffect, useCallback } from 'react';
import EventCard from '@/components/EventCard';
import { Event } from '@/types';
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

function Spinner() {
  return <div style={{ width: 32, height: 32, border: '2px solid var(--line-2)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ background: on ? 'var(--lime)' : 'transparent', color: on ? 'var(--ink)' : 'var(--cream)', border: `1px solid ${on ? 'var(--lime)' : 'var(--line-2)'}`, padding: '8px 14px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all .15s ease', whiteSpace: 'nowrap' }}>
      {children}
    </button>
  );
}

export default function EventsPage() {
  const isMobile = useIsMobile();
  const [query, setQuery]           = useState('');
  const [activeCat, setActiveCat]   = useState('all');
  const [activeVibes, setActiveVibes] = useState<string[]>([]);
  const [events, setEvents]         = useState<Event[]>([]);
  const [loading, setLoading]       = useState(true);

  function toggleVibe(v: string) {
    setActiveVibes((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  }

  const fetchEvents = useCallback(async (q = '', cat = 'all') => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (q) params.q = q;
      if (cat === 'tonight') params.date = 'tonight';
      else if (cat === 'this weekend') params.date = 'weekend';
      else if (cat === 'house party') params.category = 'house_party';
      else if (cat === 'warehouse') params.category = 'warehouse';
      else if (cat === 'club') params.category = 'club';
      else if (cat === 'free') { params.minPrice = '0'; params.maxPrice = '0'; }
      else if (cat === 'near me' && navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition((pos) => {
            params.latitude = String(pos.coords.latitude);
            params.longitude = String(pos.coords.longitude);
            params.radius = '10000';
            resolve();
          }, () => resolve());
        });
      }
      const { data } = await api.get('/events/search', { params });
      setEvents(data.data?.events ?? []);
    } catch { setEvents([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEvents(query, activeCat); }, [activeCat, fetchEvents]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchEvents(query, activeCat); };

  return (
    <div>
      {/* Page head */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: isMobile ? 20 : 32, paddingBottom: isMobile ? 16 : 24, borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)', marginBottom: 8 }}>
            TONIGHT · YOUR CITY
          </div>
          <h1 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: isMobile ? 'clamp(32px, 9vw, 48px)' : 'clamp(40px, 5vw, 64px)', lineHeight: 0.95, letterSpacing: '-0.03em', margin: 0 }}>
            What&apos;s open<br />
            <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--lime)' }}>right now.</span>
          </h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--dim)' }}>OPEN NOW</div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: isMobile ? 36 : 56, lineHeight: 1, letterSpacing: '-0.03em' }}>
            {String(events.length).padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* Sticky filter bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--ink)', paddingTop: 14, paddingBottom: 2, marginBottom: 8 }}>
        {/* Search */}
        <form onSubmit={handleSearch} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 12, padding: '0 18px', transition: 'border-color .15s ease' }}
            onFocusCapture={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--lime)')}
            onBlurCapture={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--line-2)')}
          >
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--dim)', fontSize: 12, letterSpacing: '.1em', flexShrink: 0 }}>SEARCH</span>
            <input
              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="title, host, venue…"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--display)', fontSize: 16, color: 'var(--paper)', padding: '14px 0' }}
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} style={{ background: 'transparent', border: 'none', color: 'var(--dim)', fontSize: 18, cursor: 'pointer', padding: '4px 8px' }}>×</button>
            )}
          </div>
        </form>

        {/* Category pills */}
        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 6, marginBottom: 10, paddingBottom: 12, borderBottom: '1px solid var(--line)', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {CATEGORIES.map((c) => (
            <Pill key={c} on={activeCat === c} onClick={() => setActiveCat(c)}>{c}</Pill>
          ))}
        </div>

        {/* Vibe pills */}
        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 6, alignItems: 'center', paddingBottom: 14, overflowX: 'auto', scrollbarWidth: 'none' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '96px 0', marginTop: 12 }}>
          <Spinner />
        </div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', border: '1px solid var(--line-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: 32, color: 'var(--dim)', margin: '0 auto 14px' }}>○</div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em', marginBottom: 8 }}>Nothing matches.</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--dim)', letterSpacing: '.08em', marginBottom: 22 }}>LOOSEN UP THE FILTERS, OR CHECK BACK LATER</div>
          <button onClick={() => { setActiveCat('all'); setActiveVibes([]); setQuery(''); }} style={{ background: 'transparent', color: 'var(--paper)', border: '1px solid var(--line-2)', padding: '12px 18px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 500, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
            Reset filters
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: isMobile ? 12 : 18 }}>
          {events.map((e) => <EventCard key={e._id} event={e} />)}
        </div>
      )}
    </div>
  );
}
