'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { getImageUrl } from '@/lib/utils';

interface Host {
  _id: string;
  name: string;
  username: string;
  profileImage?: string;
  city?: string;
  cliquescore?: number;
  followerCount?: number;
  postCount?: number;
  createdAt: string;
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--line-2)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );
}

export default function AdminHostsListPage() {
  const router = useRouter();
  const [hosts, setHosts]   = useState<Host[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [q, setQ]           = useState('');
  const [input, setInput]   = useState('');
  const [loading, setLoading] = useState(true);
  const LIMIT = 20;

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (q) params.set('q', q);
    api.get(`/admin/hosts/verified?${params}`)
      .then(({ data }) => {
        setHosts(data.data?.hosts ?? []);
        setTotal(data.data?.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, q]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / LIMIT);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setQ(input.trim());
  }

  return (
    <div>
      {/* Head */}
      <div style={{ marginBottom: 28 }}>
        <div className="clique-label" style={{ marginBottom: 8 }}>ADMIN / HOSTS</div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(28px, 4.5vw, 44px)', fontWeight: 800, lineHeight: 0.94, letterSpacing: '-0.03em', margin: 0 }}>
          Verified hosts.
        </h1>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search by name or username…"
          className="clique-input"
          style={{ flex: 1, maxWidth: 340 }}
        />
        <button
          type="submit"
          style={{
            fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase',
            padding: '8px 16px', borderRadius: 6, border: '1px solid var(--line-2)',
            background: 'transparent', color: 'var(--cream)', cursor: 'pointer',
          }}
        >
          Search
        </button>
        {q && (
          <button
            type="button"
            onClick={() => { setInput(''); setQ(''); setPage(1); }}
            style={{
              fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em',
              padding: '8px 12px', border: 'none', background: 'transparent',
              color: 'var(--dim)', cursor: 'pointer',
            }}
          >
            Clear
          </button>
        )}
      </form>

      {/* Count */}
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', marginBottom: 12 }}>
        {total} host{total !== 1 ? 's' : ''}
      </div>

      {loading ? (
        <Spinner />
      ) : hosts.length === 0 ? (
        <div style={{ padding: '32px 4px', borderTop: '1px solid var(--line)' }}>
          <p style={{ fontFamily: 'var(--display)', fontSize: 15, color: 'var(--cream)', margin: 0 }}>No hosts found.</p>
        </div>
      ) : (
        <div className="ledger">
          {hosts.map((h) => {
            const avatar = h.profileImage ? getImageUrl(h.profileImage) : null;
            return (
              <div
                key={h._id}
                className="ledger-row"
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 6px', cursor: 'pointer' }}
                onClick={() => router.push(`/admin/hosts/${h._id}`)}
              >
                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  overflow: 'hidden', background: 'var(--line)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--display)', fontSize: 15, fontWeight: 700, color: 'var(--cream)',
                }}>
                  {avatar
                    ? <img src={avatar} alt={h.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (h.name?.[0] ?? '?').toUpperCase()
                  }
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--display)', fontSize: 16, fontWeight: 600, color: 'var(--paper)',
                    textDecoration: 'underline', textDecorationColor: 'transparent', textUnderlineOffset: 3, transition: 'text-decoration-color .15s',
                  }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecorationColor = 'var(--lime)')}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecorationColor = 'transparent')}
                  >
                    {h.name || '—'}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '.04em', marginTop: 2 }}>
                    @{h.username}
                    {h.city ? ` · ${h.city}` : ''}
                    {h.followerCount != null ? ` · ${h.followerCount} followers` : ''}
                    {h.cliquescore != null ? ` · ★ ${h.cliquescore}` : ''}
                  </div>
                </div>

                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--dim)', flexShrink: 0 }}>→</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, alignItems: 'center' }}>
          <button
            onClick={() => setPage((p) => p - 1)} disabled={page === 1}
            style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '6px 12px', border: '1px solid var(--line-2)', borderRadius: 6, background: 'transparent', color: page === 1 ? 'var(--dim)' : 'var(--cream)', cursor: page === 1 ? 'default' : 'pointer' }}
          >
            ← Prev
          </button>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)' }}>{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}
            style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '6px 12px', border: '1px solid var(--line-2)', borderRadius: 6, background: 'transparent', color: page === totalPages ? 'var(--dim)' : 'var(--cream)', cursor: page === totalPages ? 'default' : 'pointer' }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Link back to verifications */}
      <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--line)' }}>
        <Link href="/admin/hosts" style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '.06em', textDecoration: 'none' }}>
          ← Host applications &amp; verifications
        </Link>
      </div>
    </div>
  );
}
