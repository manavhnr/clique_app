'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Plus, Calendar, Users, CheckSquare, Edit2, ChevronRight, Ticket, Music2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { Event } from '@/types';
import { formatDate, formatTime, formatPrice, getImageUrl } from '@/lib/utils';
import api from '@/lib/api';
import Link from 'next/link';

export default function HostDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'draft'>('all');

  useEffect(() => {
    if (user && !user.isVerifiedHost) router.replace('/become-host');
  }, [user, router]);

  useEffect(() => {
    api.get('/events/mine')
      .then(({ data }) => setEvents(data.data?.events ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = events.filter((e) => {
    if (activeTab === 'published') return e.status === 'published';
    if (activeTab === 'draft') return e.status === 'draft';
    return true;
  });

  const stats = {
    total: events.length,
    published: events.filter((e) => e.status === 'published').length,
    totalBookings: events.reduce((s, e) => s + e.bookedCount, 0),
    totalCheckins: events.reduce((s, e) => s + (e.checkedInCount ?? 0), 0),
  };

  if (loading) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Host Dashboard</h1>
          <p className="text-muted text-sm mt-0.5">Manage your events and team</p>
        </div>
        <Button onClick={() => router.push('/host/events/new')}>
          <Plus size={16} />
          New Event
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total Events', value: stats.total, icon: Calendar, color: 'text-primary-light' },
          { label: 'Live Events', value: stats.published, icon: CheckSquare, color: 'text-green-400' },
          { label: 'Total Bookings', value: stats.totalBookings, icon: Ticket, color: 'text-blue-400' },
          { label: 'Check-ins', value: stats.totalCheckins, icon: Users, color: 'text-yellow-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-dark-card border border-dark-border rounded-xl p-4">
            <Icon size={18} className={`${color} mb-2`} />
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-5">
        {(['all', 'published', 'draft'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-colors duration-150 capitalize border ${activeTab === tab ? 'bg-primary border-primary text-white' : 'border-dark-border text-muted hover:text-white'}`}>
            {tab === 'all' ? 'All Events' : tab}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-dark-card border border-dark-border rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-dark-hover border border-dark-border flex items-center justify-center mx-auto mb-3">
            <Calendar size={24} className="text-muted" />
          </div>
          <h3 className="text-white font-semibold mb-1">No events yet</h3>
          <p className="text-muted text-sm mb-5">Create your first event and start hosting.</p>
          <Button onClick={() => router.push('/host/events/new')}><Plus size={14} /> Create Event</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((event) => (
            <HostEventRow key={event._id} event={event} onUpdate={(updated) => setEvents(events.map((e) => e._id === updated._id ? updated : e))} />
          ))}
        </div>
      )}
    </div>
  );
}

function HostEventRow({ event, onUpdate }: { event: Event; onUpdate: (e: Event) => void }) {
  const router = useRouter();
  const imageUrl = event.images?.[0] ? getImageUrl(event.images[0]) : null;

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors duration-150">
      <div className="flex items-center gap-4 p-4">
        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-dark-border">
          {imageUrl ? (
            <img src={imageUrl} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-violet-900/20">
              <Music2 size={20} className="text-primary/50" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-semibold text-sm truncate">{event.title}</h3>
            <EventStatusBadge status={event.status} />
          </div>
          <p className="text-xs text-muted">{formatDate(event.date)} · {formatTime(event.startTime)}</p>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-muted">
            <span className="flex items-center gap-1"><Users size={11} /> {event.bookedCount}/{event.capacity}</span>
            <span className="flex items-center gap-1"><Ticket size={11} /> {formatPrice(event.price)}</span>
            <span className="flex items-center gap-1"><CheckSquare size={11} /> {event.checkedInCount ?? 0} checked in</span>
          </div>
        </div>

        <Link
          href={`/host/events/${event._id}`}
          className="cursor-pointer flex items-center gap-1 text-xs text-muted hover:text-white transition-colors duration-150 px-3 py-2 rounded-lg hover:bg-dark-hover"
        >
          <Edit2 size={13} />
          Manage
          <ChevronRight size={13} />
        </Link>
      </div>
    </div>
  );
}

function EventStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'green' | 'yellow' | 'red' | 'blue' | 'default' }> = {
    published: { label: 'Live', variant: 'green' },
    draft: { label: 'Draft', variant: 'yellow' },
    cancelled: { label: 'Cancelled', variant: 'red' },
    completed: { label: 'Completed', variant: 'blue' },
    blocked: { label: 'Blocked', variant: 'red' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'default' };
  return <Badge variant={variant}>{label}</Badge>;
}
