'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import Button from '@/components/ui/Button';

interface AdminUser {
  _id: string;
  name: string;
  username: string;
  phone?: string;
  role: string;
  isVerifiedHost?: boolean;
  isBanned?: boolean;
  cliquescore?: number;
  createdAt: string;
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--line-2)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );
}

function roleBadgeColor(role: string) {
  if (role === 'admin') return 'var(--gold)';
  if (role === 'host')  return 'var(--lime)';
  return 'var(--dim)';
}

const LIMIT = 20;

export default function AdminUsersPage() {
  const [users, setUsers]       = useState<AdminUser[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [q, setQ]               = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [loading, setLoading]   = useState(true);
  const [working, setWorking]   = useState<string | null>(null);
  const [toast, setToast]       = useState('');
  const [toastType, setToastType] = useState<'ok' | 'err'>('ok');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(''), 3000);
  }

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (debouncedQ) params.set('q', debouncedQ);
    api.get(`/admin/users?${params}`)
      .then(({ data }) => {
        setUsers(data.data?.users ?? []);
        setTotal(data.data?.total ?? 0);
      })
      .catch(() => showToast('Failed to load users', 'err'))
      .finally(() => setLoading(false));
  }, [page, debouncedQ]);

  useEffect(() => { load(); }, [load]);

  async function handleBan(userId: string) {
    setWorking(userId);
    try {
      await api.patch(`/admin/users/${userId}/ban`);
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, isBanned: true } : u));
      showToast('User banned and sessions revoked.', 'ok');
    } catch {
      showToast('Failed to ban user.', 'err');
    } finally {
      setWorking(null);
    }
  }

  async function handleUnban(userId: string) {
    setWorking(userId);
    try {
      await api.patch(`/admin/users/${userId}/unban`);
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, isBanned: false } : u));
      showToast('User unbanned.', 'ok');
    } catch {
      showToast('Failed to unban user.', 'err');
    } finally {
      setWorking(null);
    }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      {/* Head */}
      <div style={{ marginBottom: 28 }}>
        <div className="clique-label" style={{ marginBottom: 8 }}>ADMIN / USERS</div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(28px, 4.5vw, 44px)', fontWeight: 800, lineHeight: 0.94, letterSpacing: '-0.03em', margin: 0 }}>
          Users.
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

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, username, phone..."
          style={{
            width: '100%', maxWidth: 400,
            background: 'var(--card)', border: '1px solid var(--line-2)',
            borderRadius: 6, padding: '10px 14px',
            fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--paper)',
            outline: 'none',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
          onBlur={(e)  => (e.target.style.borderColor = 'var(--line-2)')}
        />
      </div>

      {/* Count */}
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', marginBottom: 12 }}>
        {total} user{total !== 1 ? 's' : ''}
      </div>

      {loading ? (
        <Spinner />
      ) : users.length === 0 ? (
        <div style={{ padding: '32px 4px', borderTop: '1px solid var(--line)' }}>
          <p style={{ fontFamily: 'var(--display)', fontSize: 15, color: 'var(--cream)', margin: 0 }}>No users found.</p>
        </div>
      ) : (
        <div className="ledger">
          {users.map((u) => (
            <div
              key={u._id}
              className="ledger-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: '12px 16px',
                padding: '14px 6px',
                alignItems: 'center',
                opacity: u.isBanned ? 0.5 : 1,
              }}
            >
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--display)', fontSize: 16, fontWeight: 600, color: 'var(--paper)' }}>
                    {u.name}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.06em' }}>
                    @{u.username}
                  </span>
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em',
                    color: roleBadgeColor(u.role), border: `1px solid ${roleBadgeColor(u.role)}`,
                    borderRadius: 3, padding: '1px 5px',
                  }}>
                    {u.role}
                  </span>
                  {u.isBanned && (
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em',
                      color: 'var(--hot)', border: '1px solid var(--hot)', borderRadius: 3, padding: '1px 5px',
                    }}>
                      Banned
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '.04em' }}>
                  {u.phone ?? '—'}
                  {u.cliquescore != null && ` · Score: ${u.cliquescore}`}
                </div>
              </div>
              <div>
                {u.role !== 'admin' && (
                  u.isBanned ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleUnban(u._id)}
                      loading={working === u._id}
                      disabled={!!working}
                    >
                      Unban
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleBan(u._id)}
                      loading={working === u._id}
                      disabled={!!working}
                    >
                      Ban
                    </Button>
                  )
                )}
              </div>
            </div>
          ))}
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
