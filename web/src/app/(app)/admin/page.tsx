'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface Stats {
  totalUsers: number;
  totalEvents: number;
  openReports: number;
  totalBookings: number;
  pendingHosts: number;
  pendingPayments: number;
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--line-2)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );
}

function Alert({ type, children, href }: { type: 'warn' | 'info'; children: React.ReactNode; href: string }) {
  const bg    = type === 'warn' ? 'var(--hot)'  : 'var(--gold)';
  const alpha = type === 'warn' ? '0.08'        : '0.07';
  return (
    <Link
      href={href}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12,
        background: `color-mix(in srgb, ${bg} 8%, transparent)`,
        border: `1px solid color-mix(in srgb, ${bg} 25%, transparent)`,
        borderRadius: 6,
        padding: '12px 16px',
        textDecoration: 'none',
      }}
    >
      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.06em', color: 'var(--paper)' }}>
        {children}
      </span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', flexShrink: 0 }}>Review →</span>
    </Link>
  );
}

const SECTIONS = [
  { num: '01', label: 'Host Applications',  sub: 'Verify and approve host requests',     href: '/admin/hosts'      },
  { num: '02', label: 'Payment Review',      sub: 'Verify UPI proof screenshots',         href: '/admin/payments'   },
  { num: '03', label: 'Events',              sub: 'View, block, and unblock events',       href: '/admin/events'     },
  { num: '04', label: 'Users',               sub: 'Search, ban, and manage accounts',      href: '/admin/users'      },
  { num: '05', label: 'Compliance',          sub: 'About, flow of funds, test credentials', href: '/admin/compliance' },
];

export default function AdminDashboardPage() {
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats')
      .then(({ data }) => setStats(data.data as Stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const STAT_ITEMS = stats
    ? [
        { label: 'USERS',    value: stats.totalUsers.toLocaleString('en-IN')   },
        { label: 'EVENTS',   value: stats.totalEvents.toLocaleString('en-IN')  },
        { label: 'BOOKINGS', value: stats.totalBookings.toLocaleString('en-IN')},
        { label: 'REPORTS',  value: stats.openReports.toLocaleString('en-IN'), accent: stats.openReports > 0 },
      ]
    : [];

  return (
    <div>
      {/* Page head */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 8 }}>
          ADMIN CONSOLE
        </div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, lineHeight: 0.92, letterSpacing: '-0.035em', margin: 0, marginBottom: 4 }}>
          Platform operations.
        </h1>
        <p style={{ fontFamily: 'var(--display)', fontSize: 16, color: 'var(--cream)', margin: '8px 0 0' }}>
          Everything at once.
        </p>
      </div>

      {/* Alerts for pending items */}
      {stats && (stats.pendingHosts > 0 || stats.pendingPayments > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
          {stats.pendingHosts > 0 && (
            <Alert type="warn" href="/admin/hosts">
              {stats.pendingHosts} host application{stats.pendingHosts > 1 ? 's' : ''} awaiting review
            </Alert>
          )}
          {stats.pendingPayments > 0 && (
            <Alert type="warn" href="/admin/payments">
              {stats.pendingPayments} payment proof{stats.pendingPayments > 1 ? 's' : ''} awaiting verification
            </Alert>
          )}
        </div>
      )}

      {/* Platform stats */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 16 }}>
          PLATFORM STATS
        </div>
        {loading ? (
          <Spinner />
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px 40px', paddingBottom: 24, borderBottom: '1px solid var(--line)' }}>
            {STAT_ITEMS.map(({ label, value, accent }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{
                  fontFamily: 'var(--display)', fontSize: 'clamp(32px, 5vw, 44px)', fontWeight: 700,
                  lineHeight: 1, letterSpacing: '-0.03em',
                  color: accent ? 'var(--hot)' : 'var(--paper)',
                }}>
                  {value}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--dim)' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section links — ledger style */}
      <div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 12 }}>
          SECTIONS
        </div>
        <div className="ledger">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="ledger-row"
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '16px 6px',
                textDecoration: 'none',
              }}
            >
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--lime)', width: 24, flexShrink: 0, letterSpacing: '.08em' }}>
                {s.num}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 600, color: 'var(--paper)', letterSpacing: '-0.01em' }}>
                  {s.label}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', marginTop: 2, letterSpacing: '.04em' }}>
                  {s.sub}
                </div>
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--dim)' }}>→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
