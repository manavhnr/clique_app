'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageSpinner } from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { formatDate, formatTime, formatPrice, getImageUrl } from '@/lib/utils';
import api from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUserDetail {
  _id: string;
  name: string;
  username: string;
  phone?: string;
  email?: string;
  profileImage?: string;
  bio?: string;
  city?: string;
  gender?: string;
  dob?: string;
  age?: number;
  interests?: string[];
  vibeTags?: string[];
  connectedSocials?: { instagram?: string; twitter?: string };
  cliquescore?: number;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  role: string;
  isVerifiedHost?: boolean;
  hostVerificationStatus?: string;
  isBanned?: boolean;
  createdAt: string;
}

interface AdminUserBooking {
  _id: string;
  status: string;
  amount: number;
  tierLabel?: string;
  groupSize: number;
  createdAt: string;
  eventId: {
    _id: string;
    title: string;
    date: string;
    startTime?: string;
    locationName: string;
    images?: string[];
    status: string;
  };
}

interface AdminUserPost {
  _id: string;
  text?: string;
  mediaUrls: string[];
  mediaType: string;
  likeCount: number;
  commentCount: number;
  status: string;
  visibility: string;
  createdAt: string;
}

interface AdminUserReport {
  _id: string;
  reason: string;
  description?: string;
  status: string;
  createdAt: string;
}

interface UserDetailData {
  user: AdminUserDetail;
  bookings: AdminUserBooking[];
  posts: AdminUserPost[];
  reports: AdminUserReport[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleBadgeColor(role: string) {
  if (role === 'admin') return 'var(--gold)';
  if (role === 'host')  return 'var(--lime)';
  return 'var(--dim)';
}

function bookingStatusVariant(status: string): 'lime' | 'gold' | 'sky' | 'hot' | 'neutral' {
  const map: Record<string, 'lime' | 'gold' | 'sky' | 'hot' | 'neutral'> = {
    confirmed: 'lime',
    checked_in: 'sky',
    payment_pending: 'gold',
    utr_submitted: 'gold',
    cancelled: 'hot',
    refunded: 'neutral',
    rejected: 'hot',
  };
  return map[status] ?? 'neutral';
}

function bookingStatusLabel(status: string) {
  const map: Record<string, string> = {
    confirmed: 'Confirmed',
    checked_in: 'Checked in',
    payment_pending: 'Payment pending',
    utr_submitted: 'UPI submitted',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
    rejected: 'Rejected',
    pending: 'Pending',
  };
  return map[status] ?? status;
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'profile',  label: 'Profile'  },
  { key: 'bookings', label: 'Bookings' },
  { key: 'posts',    label: 'Posts'    },
  { key: 'reports',  label: 'Reports'  },
] as const;

type TabKey = typeof TABS[number]['key'];

// ─── Profile tab ──────────────────────────────────────────────────────────────

function ProfileTab({ data, onBan, onUnban, working }: {
  data: UserDetailData;
  onBan: () => void;
  onUnban: () => void;
  working: boolean;
}) {
  const { user } = data;
  const confirmedBookings = data.bookings.filter((b) => ['confirmed', 'checked_in'].includes(b.status)).length;

  return (
    <div className="flex flex-col gap-7">
      {/* Identity grid */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
        {[
          { label: 'PHONE',    value: user.phone ?? '—' },
          { label: 'EMAIL',    value: user.email ?? '—' },
          { label: 'CITY',     value: user.city ?? '—' },
          { label: 'GENDER',   value: user.gender ?? '—' },
          { label: 'AGE',      value: user.age != null ? `${user.age}` : '—' },
          { label: 'JOINED',   value: formatDate(user.createdAt) },
        ].map(({ label, value }) => (
          <div key={label}>
            <div className="clique-label mb-1">{label}</div>
            <p className="m-0 font-display text-sm text-paper">{value}</p>
          </div>
        ))}
      </div>

      {/* Social counts */}
      <div className="flex flex-wrap gap-x-8 gap-y-3 rounded-xl border border-line-2 bg-card px-5 py-4">
        {[
          { label: 'CLIQUESCORE',  value: user.cliquescore ?? 0,    accent: true },
          { label: 'FOLLOWERS',    value: user.followerCount ?? 0,  accent: false },
          { label: 'FOLLOWING',    value: user.followingCount ?? 0, accent: false },
          { label: 'POSTS',        value: user.postCount ?? 0,      accent: false },
          { label: 'BOOKINGS',     value: confirmedBookings,        accent: false },
        ].map(({ label, value, accent }) => (
          <div key={label} className="flex items-baseline gap-2.5">
            <span className={`font-display text-[28px] font-bold leading-none tracking-[-0.03em] ${accent ? 'text-lime' : 'text-paper'}`}>
              {value}
            </span>
            <span className="clique-label !text-[9px]">{label}</span>
          </div>
        ))}
      </div>

      {/* Bio */}
      {user.bio && (
        <div>
          <div className="clique-label mb-2">BIO</div>
          <p className="m-0 max-w-[56ch] font-display text-sm leading-relaxed text-paper">{user.bio}</p>
        </div>
      )}

      {/* Connected socials */}
      {(user.connectedSocials?.instagram || user.connectedSocials?.twitter) && (
        <div>
          <div className="clique-label mb-2">CONNECTED SOCIALS</div>
          <div className="flex flex-wrap gap-3">
            {user.connectedSocials.instagram && (
              <a
                href={`https://instagram.com/${user.connectedSocials.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md border border-line-2 bg-card px-3 py-2 font-mono text-[11px] tracking-[.04em] text-cream hover:border-lime/40 hover:text-paper transition-colors"
              >
                <span className="text-[10px] uppercase tracking-[.08em] text-dim">IG</span>
                @{user.connectedSocials.instagram}
              </a>
            )}
            {user.connectedSocials.twitter && (
              <a
                href={`https://x.com/${user.connectedSocials.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md border border-line-2 bg-card px-3 py-2 font-mono text-[11px] tracking-[.04em] text-cream hover:border-lime/40 hover:text-paper transition-colors"
              >
                <span className="text-[10px] uppercase tracking-[.08em] text-dim">X</span>
                @{user.connectedSocials.twitter}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Interests + vibe tags */}
      {((user.interests?.length ?? 0) > 0 || (user.vibeTags?.length ?? 0) > 0) && (
        <div>
          <div className="clique-label mb-2">TAGS</div>
          <div className="flex flex-wrap gap-2">
            {[...(user.interests ?? []), ...(user.vibeTags ?? [])].map((tag) => (
              <span key={tag} className="rounded-full border border-line-2 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[.08em] text-cream">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Host status */}
      {user.role === 'host' || user.hostVerificationStatus ? (
        <div>
          <div className="clique-label mb-2">HOST STATUS</div>
          <div className="flex items-center gap-2">
            <span className="font-display text-sm text-paper capitalize">
              {user.isVerifiedHost ? 'Verified host' : user.hostVerificationStatus ?? 'Not a host'}
            </span>
            {user.isVerifiedHost && (
              <Link href={`/admin/hosts/${user._id}`} className="font-mono text-[10px] uppercase tracking-[.08em] text-lime hover:underline">
                View host dashboard →
              </Link>
            )}
          </div>
        </div>
      ) : null}

      {/* Admin action */}
      {user.role !== 'admin' && (
        <div className="border-t border-line pt-6">
          <div className="clique-label mb-3 !text-hot">ADMIN ACTION</div>
          {user.isBanned ? (
            <Button variant="secondary" loading={working} onClick={onUnban}>Unban user</Button>
          ) : (
            <Button variant="danger" loading={working} onClick={onBan}>Ban user</Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Bookings tab ─────────────────────────────────────────────────────────────

function BookingsTab({ bookings }: { bookings: AdminUserBooking[] }) {
  if (bookings.length === 0) {
    return (
      <div className="ledger px-1 py-12">
        <p className="m-0 font-display text-xl font-bold tracking-[-0.02em] text-paper">No bookings yet.</p>
      </div>
    );
  }

  return (
    <div className="ledger">
      {bookings.map((b) => {
        const thumb = b.eventId?.images?.[0] ? getImageUrl(b.eventId.images[0]) : null;
        return (
          <Link
            key={b._id}
            href={`/admin/events/${b.eventId?._id}`}
            className="ledger-row group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-2 py-4"
            style={{ textDecoration: 'none' }}
          >
            <div className="flex items-start gap-3 min-w-0">
              {thumb && (
                <img src={thumb} alt="" className="h-10 w-10 shrink-0 rounded-[2px] object-cover border border-line-2" />
              )}
              <div className="min-w-0">
                <p className="m-0 truncate font-display text-sm font-bold text-paper">
                  {b.eventId?.title ?? 'Unknown event'}
                </p>
                <p className="m-0 font-mono text-[10px] tracking-[.04em] text-dim">
                  {b.eventId?.date ? formatDate(b.eventId.date) : '—'}
                  {b.eventId?.locationName ? ` · ${b.eventId.locationName}` : ''}
                </p>
                {b.tierLabel && (
                  <p className="m-0 font-mono text-[10px] uppercase tracking-[.06em] text-dim">{b.tierLabel}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Badge variant={bookingStatusVariant(b.status)}>{bookingStatusLabel(b.status)}</Badge>
              {b.amount > 0 && (
                <span className="font-mono text-[10px] tracking-[.04em] text-cream">{formatPrice(b.amount)}</span>
              )}
              <span className="font-mono text-[9px] tracking-[.04em] text-dim opacity-0 transition-opacity group-hover:opacity-100">→</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Posts tab ────────────────────────────────────────────────────────────────

function PostsTab({ posts }: { posts: AdminUserPost[] }) {
  if (posts.length === 0) {
    return (
      <div className="ledger px-1 py-12">
        <p className="m-0 font-display text-xl font-bold tracking-[-0.02em] text-paper">No posts yet.</p>
      </div>
    );
  }

  return (
    <div className="ledger">
      {posts.map((p) => (
        <div key={p._id} className="ledger-row grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-1 px-2 py-4">
          <div className="min-w-0">
            {p.text && (
              <p className="m-0 line-clamp-2 font-display text-sm text-paper">{p.text}</p>
            )}
            {!p.text && p.mediaType !== 'none' && (
              <p className="m-0 font-display text-sm italic text-dim">[{p.mediaType} post]</p>
            )}
            <p className="m-0 mt-1 font-mono text-[10px] tracking-[.04em] text-dim">
              {formatDate(p.createdAt)} · {p.likeCount} likes · {p.commentCount} comments · {p.visibility}
            </p>
          </div>
          <div className="shrink-0">
            {p.status !== 'active' && (
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em',
                color: 'var(--hot)', border: '1px solid var(--hot)', borderRadius: 3, padding: '1px 5px',
              }}>
                {p.status}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Reports tab ──────────────────────────────────────────────────────────────

function ReportsTab({ reports }: { reports: AdminUserReport[] }) {
  if (reports.length === 0) {
    return (
      <div className="ledger px-1 py-12">
        <p className="m-0 font-display text-xl font-bold tracking-[-0.02em] text-paper">No reports filed against this user.</p>
      </div>
    );
  }

  return (
    <div className="ledger">
      {reports.map((r) => (
        <div key={r._id} className="ledger-row grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-1 px-2 py-4">
          <div className="min-w-0">
            <p className="m-0 font-display text-sm font-medium text-paper capitalize">{r.reason.replace(/_/g, ' ')}</p>
            {r.description && (
              <p className="m-0 mt-0.5 line-clamp-2 font-mono text-[11px] tracking-[.04em] text-dim">{r.description}</p>
            )}
            <p className="m-0 mt-1 font-mono text-[10px] tracking-[.04em] text-dim">{formatDate(r.createdAt)}</p>
          </div>
          <div className="shrink-0">
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em',
              color: r.status === 'open' ? 'var(--gold)' : r.status === 'resolved' ? 'var(--lime)' : 'var(--dim)',
              border: `1px solid ${r.status === 'open' ? 'var(--gold)' : r.status === 'resolved' ? 'var(--lime)' : 'var(--dim)'}`,
              borderRadius: 3, padding: '1px 5px',
            }}>
              {r.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const [data, setData]         = useState<UserDetailData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [working, setWorking]   = useState(false);
  const [toast, setToast]       = useState('');
  const [toastType, setToastType] = useState<'ok' | 'err'>('ok');

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(''), 3500);
  }

  useEffect(() => {
    api.get(`/admin/users/${userId}`)
      .then(({ data: res }) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  async function handleBan() {
    if (!data) return;
    setWorking(true);
    try {
      await api.patch(`/admin/users/${userId}/ban`);
      setData((prev) => prev ? { ...prev, user: { ...prev.user, isBanned: true } } : prev);
      showToast('User banned and sessions revoked.', 'ok');
    } catch {
      showToast('Failed to ban user.', 'err');
    } finally { setWorking(false); }
  }

  async function handleUnban() {
    if (!data) return;
    setWorking(true);
    try {
      await api.patch(`/admin/users/${userId}/unban`);
      setData((prev) => prev ? { ...prev, user: { ...prev.user, isBanned: false } } : prev);
      showToast('User unbanned.', 'ok');
    } catch {
      showToast('Failed to unban user.', 'err');
    } finally { setWorking(false); }
  }

  if (loading) return <PageSpinner />;
  if (!data) {
    return (
      <div className="py-24 text-center">
        <div className="font-display text-[28px] font-bold tracking-[-0.02em]">User not found.</div>
        <Link href="/admin/users" className="clique-label mt-4 inline-block hover:text-paper">← Admin / Users</Link>
      </div>
    );
  }

  const { user } = data;
  const avatar = user.profileImage ? getImageUrl(user.profileImage) : null;

  const tabsWithCount: { key: TabKey; label: string; count?: number }[] = [
    { key: 'profile',  label: 'Profile' },
    { key: 'bookings', label: 'Bookings', count: data.bookings.length },
    { key: 'posts',    label: 'Posts',    count: data.posts.length },
    { key: 'reports',  label: 'Reports',  count: data.reports.length },
  ];

  return (
    <div className="mx-auto max-w-3xl animate-rise">
      <Link href="/admin/users" className="clique-label mb-6 inline-block transition-colors hover:text-paper">
        ← Admin / Users
      </Link>

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

      {/* User identity header */}
      <div className="mb-8 flex items-start gap-4 border-b border-line pb-7">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-line font-display text-2xl font-bold text-cream">
          {avatar
            ? <img src={avatar} alt={user.name} className="h-full w-full object-cover" />
            : (user.name?.[0] ?? '?').toUpperCase()
          }
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="m-0 font-display text-[clamp(24px,4vw,38px)] font-bold leading-[0.95] tracking-[-0.025em] text-paper">
              {user.name}
            </h1>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em',
              color: roleBadgeColor(user.role),
              border: `1px solid ${roleBadgeColor(user.role)}`,
              borderRadius: 3, padding: '2px 6px',
            }}>
              {user.role}
            </span>
            {user.isBanned && (
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em',
                color: 'var(--hot)', border: '1px solid var(--hot)', borderRadius: 3, padding: '2px 6px',
              }}>
                Banned
              </span>
            )}
          </div>
          <p className="m-0 mt-1 font-mono text-[12px] tracking-[.04em] text-dim">
            @{user.username}
            {user.city ? ` · ${user.city}` : ''}
            {user.cliquescore != null ? ` · ★ ${user.cliquescore}` : ''}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex overflow-x-auto border-b border-line" role="tablist">
        {tabsWithCount.map(({ key, label, count }, i) => {
          const on = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              role="tab"
              aria-selected={on}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 font-mono text-[11px] uppercase tracking-[.1em] transition-colors ${
                on ? 'border-lime text-paper' : 'border-transparent text-dim hover:text-cream'
              }`}
            >
              <span className={`mr-2 text-[9px] ${on ? 'text-lime' : ''}`}>{String(i + 1).padStart(2, '0')}</span>
              {label}
              {count != null && count > 0 && (
                <span className="ml-1.5 rounded-full bg-line px-1.5 py-0.5 text-[9px] text-dim">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'profile'  && <ProfileTab data={data} onBan={handleBan} onUnban={handleUnban} working={working} />}
      {activeTab === 'bookings' && <BookingsTab bookings={data.bookings} />}
      {activeTab === 'posts'    && <PostsTab posts={data.posts} />}
      {activeTab === 'reports'  && <ReportsTab reports={data.reports} />}
    </div>
  );
}
