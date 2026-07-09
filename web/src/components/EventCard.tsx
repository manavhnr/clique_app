'use client';

import Link from 'next/link';
import { Event } from '@/types';
import { formatDate, formatPrice, getImageUrl, categoryLabel } from '@/lib/utils';
import { catColor } from '@/lib/theme';

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

/**
 * Lineup row: one entry on the night's board. Door time set big on the left,
 * the bill in the middle, the damage on the right. Hairlines, not boxes.
 */
export default function EventCard({ event }: EventCardProps) {
  const host      = typeof event.hostId === 'object' ? event.hostId : null;
  const imageUrl  = event.images?.[0] ? getImageUrl(event.images[0]) : null;
  const spotsLeft = event.capacity - event.bookedCount;
  const isFull    = spotsLeft <= 0;
  const filled    = Math.min(100, (event.bookedCount / event.capacity) * 100);
  const color     = catColor(event.category);

  return (
    <Link
      href={`/events/${event._id}`}
      className="ledger-row group grid grid-cols-[64px_1fr] items-center gap-x-4 gap-y-2 px-2 py-4 sm:grid-cols-[88px_1fr_auto] sm:gap-x-6 sm:py-5"
    >
      {/* Door time + category tick */}
      <div className="self-start sm:self-center">
        <div className="font-display text-[22px] font-bold leading-none tracking-[-0.02em] text-paper sm:text-[26px]">
          {event.startTime ? fmtHour(event.startTime).replace(' ', '') : formatDate(event.date).split(',')[0]}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2 w-2 rounded-[1px]" style={{ background: color }} />
          <span className="font-mono text-[9px] uppercase tracking-[.12em] text-dim">
            {categoryLabel(event.category)}
          </span>
        </div>
      </div>

      {/* The bill */}
      <div className="flex min-w-0 items-center gap-4">
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className="hidden h-14 w-14 shrink-0 rounded-[3px] border border-line-2 object-cover sm:block"
          />
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="truncate font-display text-xl font-bold leading-tight tracking-[-0.02em] text-paper sm:text-[22px]">
              {event.title}
            </span>
            {event.privacy === 'private' && (
              <span className="stamp stamp-flat text-dim">Private</span>
            )}
            {isFull && <span className="stamp text-hot">Sold out</span>}
          </div>
          <div className="mt-1 truncate font-mono text-[11px] tracking-[.06em] text-cream">
            {event.locationName}
            {host ? <span className="text-dim"> · by @{host.username}</span> : null}
            {event.endTime ? <span className="text-dim"> · till {fmtHour(event.endTime)}</span> : null}
          </div>
        </div>
      </div>

      {/* The damage */}
      <div className="col-start-2 flex items-center gap-5 sm:col-start-auto sm:block sm:text-right">
        <div className="font-display text-lg font-bold tracking-[-0.02em] text-paper sm:text-xl">
          {formatPrice(event.price)}
        </div>
        <div className="flex items-center gap-2 sm:mt-1.5 sm:justify-end">
          <span className={`font-mono text-[10px] tracking-[.1em] ${isFull ? 'text-hot' : 'text-dim'}`}>
            {isFull ? '00 LEFT' : `${String(spotsLeft).padStart(2, '0')} LEFT`}
          </span>
          <span className="inline-block h-[3px] w-12 overflow-hidden rounded-sm bg-line" aria-hidden>
            <span
              className="block h-full"
              style={{ width: `${filled}%`, background: filled > 85 || isFull ? 'var(--hot)' : 'var(--lime)' }}
            />
          </span>
          <span aria-hidden className="font-mono text-xs text-dim opacity-0 transition-opacity group-hover:opacity-100">→</span>
        </div>
      </div>
    </Link>
  );
}
