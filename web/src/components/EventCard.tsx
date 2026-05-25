'use client';

import Link from 'next/link';
import { Event } from '@/types';
import { formatDate, formatTime, formatPrice, getImageUrl, categoryLabel } from '@/lib/utils';

const CAT_COLORS: Record<string, string> = {
  house_party: '#C9F36E',
  warehouse:   '#FF3D6E',
  club:        '#FF3D6E',
  college:     '#E8C46E',
  supper_club: '#C9F36E',
  listening:   '#7DB4FF',
  private:     '#E8C46E',
  concert:     '#E8C46E',
  other:       '#E8E1D2',
};

function fmtHour(t: string) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${String(m).padStart(2, '0')} ${ampm}`;
}

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  const host    = typeof event.hostId === 'object' ? event.hostId : null;
  const imageUrl = event.images?.[0] ? getImageUrl(event.images[0]) : null;
  const spotsLeft = event.capacity - event.bookedCount;
  const isFull    = spotsLeft <= 0;
  const filled    = Math.min(100, (event.bookedCount / event.capacity) * 100);
  const color     = CAT_COLORS[event.category] ?? '#E8E1D2';

  return (
    <Link href={`/events/${event._id}`} style={{ display: 'flex', flexDirection: 'column', background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', transition: 'transform .25s ease, border-color .25s ease', textDecoration: 'none' }}>
      {/* Art */}
      <div style={{ position: 'relative', height: 110, background: imageUrl ? 'var(--line)' : color, padding: 14, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', overflow: 'hidden' }}>
        {imageUrl && (
          <img src={imageUrl} alt={event.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        {!imageUrl && (
          <svg viewBox="0 0 100 60" preserveAspectRatio="none" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
            {Array.from({ length: 18 }).map((_, i) => (
              <line key={i} x1={i * 6 - 30} y1="0" x2={i * 6} y2="60" stroke="rgba(11,9,7,0.14)" strokeWidth="0.7" />
            ))}
          </svg>
        )}
        <div style={{ position: 'relative', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', color: imageUrl ? 'var(--paper)' : 'rgba(11,9,7,0.85)', background: imageUrl ? 'rgba(11,9,7,0.6)' : 'rgba(11,9,7,0.15)', padding: '4px 8px', borderRadius: 4, backdropFilter: 'blur(4px)' }}>
          {event.startTime && event.endTime ? `${fmtHour(event.startTime)} → ${fmtHour(event.endTime)}` : formatDate(event.date)}
        </div>
        {event.privacy === 'private' && (
          <div style={{ position: 'relative', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--ink)', background: 'var(--paper)', padding: '4px 8px', borderRadius: 4 }}>PRIVATE</div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--dim)' }}>
          {categoryLabel(event.category).toUpperCase()}
        </div>
        <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--paper)' }}>
          {event.title}
        </div>
        {host && (
          <div style={{ fontFamily: 'var(--display)', fontSize: 14, color: 'var(--cream)' }}>
            by {host.name} <span style={{ fontFamily: 'var(--mono)', color: 'var(--dim)' }}>@{host.username}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderTop: '1px dashed var(--line)', borderBottom: '1px dashed var(--line)', fontFamily: 'var(--display)', fontSize: 14 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--cream)' }}>{event.locationName}</span>
          <span style={{ fontWeight: 700 }}>{formatPrice(event.price)}</span>
        </div>
        <div style={{ height: 3, background: 'var(--line)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${filled}%`, background: filled > 85 || isFull ? 'var(--hot)' : 'var(--lime)', transition: 'width .4s ease' }} />
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: isFull ? 'var(--hot)' : 'var(--dim)', letterSpacing: '.1em' }}>
          {isFull ? 'SOLD OUT' : `${spotsLeft} OF ${event.capacity} LEFT`}
        </div>
      </div>
    </Link>
  );
}
