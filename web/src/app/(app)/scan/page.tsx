'use client';

import { useState, useEffect } from 'react';
import { Event } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { formatDate, formatTime } from '@/lib/utils';
import { catColor } from '@/lib/theme';
import Button from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import PageHead from '@/components/ui/PageHead';
import ScannerModal from '@/components/ScannerModal';
import api from '@/lib/api';

export default function ScanPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [preselectedId, setPreselectedId] = useState('');

  useEffect(() => {
    api.get('/events/scannable')
      .then((r) => setEvents(r.data.data?.events ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  function openForEvent(eventId: string) {
    setPreselectedId(eventId);
    setScannerOpen(true);
  }

  function openGeneral() {
    setPreselectedId('');
    setScannerOpen(true);
  }

  if (loading) return <PageSpinner />;

  return (
    <div>
      {scannerOpen && (
        <ScannerModal
          events={events}
          preselectedEventId={preselectedId}
          onClose={() => { setScannerOpen(false); setPreselectedId(''); }}
        />
      )}

      <PageHead
        kicker="DOOR SCANNER"
        title="Scan passes."
        accent="Let them in."
        aside={
          events.length > 0
            ? <Button onClick={openGeneral}>Launch scanner →</Button>
            : undefined
        }
      />

      {events.length === 0 ? (
        <div className="ledger px-1 py-14">
          <div className="clique-label mb-3.5 !text-[10px] !tracking-[.16em]">NO ASSIGNMENTS</div>
          <div className="mb-2 font-display text-3xl font-bold tracking-[-0.02em]">Nothing to scan.</div>
          <div className="max-w-[42ch] font-display text-[15px] leading-relaxed text-cream">
            You&apos;ll appear here once a host adds you as a scanner on one of their events.
          </div>
        </div>
      ) : (
        <>
          <div className="clique-label mb-2">
            {user?.isVerifiedHost ? 'YOUR EVENTS' : 'EVENTS YOU CAN SCAN'}
          </div>
          <div className="ledger">
            {events.map((e) => (
              <ScannableEventRow key={e._id} event={e} onScan={() => openForEvent(e._id)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ScannableEventRow({ event, onScan }: { event: Event; onScan: () => void }) {
  const color = catColor(event.category);
  const filled = Math.min(100, (event.bookedCount / event.capacity) * 100);
  const checkedIn = event.checkedInCount ?? 0;

  return (
    <div className="ledger-row grid grid-cols-[72px_1fr_auto] items-center gap-x-4 gap-y-2 px-2 py-4 sm:gap-x-6">
      <div className="self-start sm:self-center">
        <div className="font-display text-[22px] font-bold leading-none tracking-[-0.02em] text-paper sm:text-[24px]">
          {event.startTime ? formatTime(event.startTime).replace(':00', '').replace(' ', '') : '—'}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2 w-2 rounded-[1px]" style={{ background: color }} />
          <span className="font-mono text-[9px] uppercase tracking-[.12em] text-dim">
            {(event.category ?? 'other').replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="min-w-0">
        <div className="truncate font-display text-xl font-bold leading-tight tracking-[-0.02em] text-paper">
          {event.title}
        </div>
        <div className="mt-1 truncate font-mono text-[11px] tracking-[.06em] text-cream">
          {event.locationName} · {formatDate(event.date)}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex items-baseline gap-1">
            <span className="font-display text-base font-bold">{checkedIn}</span>
            <span className="font-mono text-[10px] text-dim">checked in</span>
          </div>
          <span className="font-mono text-[10px] text-dim">/</span>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-base font-bold">{event.bookedCount}</span>
            <span className="font-mono text-[10px] text-dim">booked</span>
          </div>
          <span className="inline-block h-[3px] w-12 overflow-hidden rounded-sm bg-line" aria-hidden>
            <span className="block h-full" style={{ width: `${filled}%`, background: filled > 85 ? 'var(--hot)' : 'var(--lime)' }} />
          </span>
        </div>
      </div>

      <Button onClick={onScan}>Scan →</Button>
    </div>
  );
}
