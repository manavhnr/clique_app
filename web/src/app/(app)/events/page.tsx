'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, CalendarX } from 'lucide-react';
import EventCard from '@/components/EventCard';
import Spinner from '@/components/ui/Spinner';
import { Event } from '@/types';
import api from '@/lib/api';

const CATEGORIES = ['All', 'Tonight', 'This Weekend', 'Near Me', 'House Party', 'Club', 'College', 'Free'];

export default function EventsPage() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async (q = '', cat = 'All') => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (q) params.q = q;
      if (cat === 'Tonight') params.date = 'tonight';
      else if (cat === 'This Weekend') params.date = 'weekend';
      else if (cat === 'House Party') params.category = 'house_party';
      else if (cat === 'Club') params.category = 'club';
      else if (cat === 'College') params.category = 'college';
      else if (cat === 'Free') { params.minPrice = '0'; params.maxPrice = '0'; }
      else if (cat === 'Near Me' && navigator.geolocation) {
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
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(query, activeCategory);
  }, [activeCategory, fetchEvents]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents(query, activeCategory);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Discover Events</h1>
        <p className="text-muted text-sm">Find your next night out</p>
      </div>

      <form onSubmit={handleSearch} className="relative mb-5">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          placeholder="Search events, hosts, vibes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-dark-card border border-dark-border rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </form>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`cursor-pointer flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-150 border ${
              activeCategory === cat
                ? 'bg-primary border-primary text-white'
                : 'border-dark-border text-muted hover:text-white hover:border-zinc-600'
            }`}
          >
            {cat === 'Near Me' && <MapPin size={13} />}
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner className="h-8 w-8" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-16 h-16 rounded-2xl bg-dark-card border border-dark-border flex items-center justify-center mx-auto mb-4">
            <CalendarX size={28} className="text-muted" />
          </div>
          <h3 className="text-white font-semibold text-lg mb-1">No events found</h3>
          <p className="text-muted text-sm">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((event) => (
            <EventCard key={event._id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
