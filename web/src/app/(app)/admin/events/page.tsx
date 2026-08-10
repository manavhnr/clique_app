'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import Button from '@/components/ui/Button';

interface AdminEvent {
  _id: string;
  title: string;
  status: string;
  date: string;
  privacy: string;
  capacity: number;
  bookedCount: number;
  hostId: { name: string; username: string } | string;
  createdAt: string;
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--line-2)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );
}

function dateFmt(s: string) {
  return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusColor(s: string) {
  if (s === 'published') return 'var(--lime)';
  if (s === 'blocked')   return 'var(--hot)';
  if (s === 'cancelled') return 'var(--hot)';
  if (s === 'draft')     return 'var(--gold)';
  if (s === 'completed') return 'var(--sky)';
  return 'var(--dim)';
}

const STATUS_OPTIONS = ['', 'published', 'draft', 'cancelled', 'blocked', 'completed'];

export default function AdminEventsPage() {
  const [events, setEvents]     = useState<AdminEvent[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [status, setStatus]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [working, setWorking]   = useState<string | null>(null);
  const [toast, setToast]       = useState('');
  const [toastType, setToastType] = useState<'ok' | 'err'>('ok');
  const LIMIT = 20;

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(''), 3000);
  }

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (status) params.set('status', status);
    api.get(`/admin/events?${params}`)
      .then(({ data }) => {
        setEvents(data.data?.events ?? []);
        setTotal(data.data?.total ?? 0);
      })
      .catch(() => showToast('Failed to load events', 'err'))
      .finally(() => setLoading(false));
  }, [page, status]);

  useEffect(() => { load(); }, [load]);

  async function handleBlock(eventId: string) {
    setWorking(eventId);
    try {
      await api.patch(`/admin/events/${eventId}/block`);
      setEvents((prev) => prev.map((e) => e._id === eventId ? { ...e, status: 'blocked' } : e));
      showToast('Event blocked and active passes cancelled.', 'ok');
    } catch {
      showToast('Failed to block event.', 'err');
    } finally {
      setWorking(null);
    }
  }

  async function handleUnblock(eventId: string) {
    setWorking(eventId);
    try {
      await api.patch(`/admin/events/${eventId}/unblock`);
      setEvents((prev) => prev.map((e) => e._id === eventId ? { ...e, status: 'published' } : e));
      showToast('Event unblocked.', 'ok');
    } catch {
      showToast('Failed to unblock event.', 'err');
    } finally {
      setWorking(null);
    }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      {/* Head */}
      <div style={{ marginBottom: 28 }}>
        <div className="clique-label" style={{ marginBottom: 8 }}>ADMIN / EVENTS</div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(28px, 4.5vw, 44px)', fontWeight: 800, lineHeight: 0.94, letterSpacing: '-0.03em', margin: 0 }}>
          Events.
        </h1>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          background: toastType === 'ok' ? 'color-mix(in srgb, var(--lime) 8%, transparent)' : 'color-mix(in srgb, var(--hot) 8%, transparent)',
          border: `1px solid ${toastType === 'ok' ? 'color-mix(in srgb, var(--lime) 25%, transparent)' : 'color-mix(in srgb, var(--hot) 25%, transparent)'}`,
          borderRadius: 6, padding: '10px 14px', marginBottom: 20,
        }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: toastType === 'ok' ? 'var(--lime)' : 'var(--hot)', letterSpacing: '.06em' }}>{toast}</span>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s || 'all'}
            onClick={() => { setStatus(s); setPage(1); }}
            style={{
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase',
              padding: '6px 12px', borderRadius: 99,
              background: status === s ? 'var(--lime)' : 'transparent',
              color: status === s ? 'var(--ink)' : 'var(--dim)',
              border: status === s ? '1px solid var(--lime)' : '1px solid var(--line-2)',
              cursor: 'pointer', transition: 'all .15s',
            }}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Count */}
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', marginBottom: 12 }}>
        {total} event{total !== 1 ? 's' : ''}
      </div>

      {loading ? (
        <Spinner />
      ) : events.length === 0 ? (
        <div style={{ padding: '32px 4px', borderTop: '1px solid var(--line)' }}>
          <p style={{ fontFamily: 'var(--display)', fontSize: 15, color: 'var(--cream)', margin: 0 }}>No events found.</p>
        </div>
      ) : (
        <div className="ledger">
          {events.map((ev) => {
            const host = typeof ev.hostId === 'object' ? ev.hostId : null;
            return (
              <div
                key={ev._id}
                className="ledger-row"
                style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px 16px', padding: '14px 6px', alignItems: 'start' }}
              >
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--display)', fontSize: 16, fontWeight: 600, color: 'var(--paper)' }}>
                      {ev.title}
                    </span>
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase',
                      color: statusColor(ev.status), border: `1px solid ${statusColor(ev.status)}`,
                      borderRadius: 3, padding: '1px 5px',
                    }}>
                      {ev.status}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '.04em' }}>
                    {host ? `@${host.username}` : '—'}
                    {' · '}
                    {dateFmt(ev.date)}
                    {' · '}
                    {ev.bookedCount}/{ev.capacity} booked
                    {' · '}
                    {ev.privacy}
                  </div>
                </div>
                <div>
                  {ev.status === 'blocked' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleUnblock(ev._id)}
                      loading={working === ev._id}
                      disabled={!!working}
                    >
                      Unblock
                    </Button>
                  ) : ev.status === 'published' ? (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleBlock(ev._id)}
                      loading={working === ev._id}
                      disabled={!!working}
                    >
                      Block
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, alignItems: 'center' }}>
          <Button size="sm" variant="ghost" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
            ← Prev
          </Button>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)' }}>
            {page} / {totalPages}
          </span>
          <Button size="sm" variant="ghost" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
            Next →
          </Button>
        </div>
      )}
    </div>
  );
}
