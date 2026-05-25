'use client';

import { Event } from '@/types';
import { formatDate, formatTime, formatPrice, getImageUrl, categoryLabel } from '@/lib/utils';
import { Calendar, MapPin, Users, Music2 } from 'lucide-react';
import Badge from './ui/Badge';
import Link from 'next/link';

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  const host = typeof event.hostId === 'object' ? event.hostId : null;
  const imageUrl = event.images?.[0] ? getImageUrl(event.images[0]) : null;
  const spotsLeft = event.capacity - event.bookedCount;
  const isFull = spotsLeft <= 0;

  return (
    <Link href={`/events/${event._id}`} className="block group cursor-pointer">
      <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden hover:border-primary/40 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
        <div className="relative h-44 bg-gradient-to-br from-primary/20 to-dark-border overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-violet-900/20">
              <Music2 size={32} className="text-primary/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge variant="purple">{categoryLabel(event.category)}</Badge>
            {event.privacy === 'private' && <Badge variant="yellow">Private</Badge>}
          </div>
          <div className="absolute bottom-3 right-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${event.price === 0 ? 'bg-green-500 text-white' : 'bg-dark/80 text-white border border-white/20'}`}>
              {formatPrice(event.price)}
            </span>
          </div>
        </div>

        <div className="p-4">
          <h3 className="text-white font-semibold text-base mb-2 line-clamp-1 group-hover:text-primary-light transition-colors">{event.title}</h3>

          <div className="flex flex-col gap-1.5 text-xs text-muted">
            <div className="flex items-center gap-1.5">
              <Calendar size={12} className="shrink-0" />
              <span>{formatDate(event.date)} · {formatTime(event.startTime)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin size={12} className="shrink-0" />
              <span className="line-clamp-1">{event.locationName}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-dark-border">
            {host && (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-primary/30 flex items-center justify-center text-xs text-white font-medium">
                  {host.name?.[0]?.toUpperCase() ?? 'H'}
                </div>
                <span className="text-xs text-muted">@{host.username}</span>
              </div>
            )}
            <div className="flex items-center gap-1 ml-auto">
              <Users size={12} className={isFull ? 'text-red-400' : 'text-muted'} />
              <span className={`text-xs ${isFull ? 'text-red-400' : 'text-muted'}`}>
                {isFull ? 'Full' : `${spotsLeft} left`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
