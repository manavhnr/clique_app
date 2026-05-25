'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const NAV_ITEMS = [
  { to: '/events',         label: 'Tonight',      match: ['/events'] },
  { to: '/passes',         label: 'My passes',    match: ['/passes'] },
  { to: '/host/dashboard', label: 'Host',         match: ['/host'] },
  { to: '/profile',        label: 'Profile',      match: ['/profile'] },
];

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--ink)' }}>
      <div style={{ width: 32, height: 32, border: '2px solid var(--line-2)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );
}

function AvatarInitial({ name, size = 36 }: { name: string; size?: number }) {
  const colors = ['#C9F36E', '#FF3D6E', '#7DB4FF', '#E8C46E', '#E8E1D2'];
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) { h ^= name.charCodeAt(i); h = Math.imul(h, 16777619); }
  const color = colors[Math.abs(h) % colors.length];
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontWeight: 700, fontSize: size * 0.42, color: 'var(--ink)', flexShrink: 0 }}>
      ME
    </span>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [isLoading, user, router]);

  if (isLoading) return <Spinner />;
  if (!user) return null;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar — never scrolls */}
      <aside style={{
        width: 240, flexShrink: 0,
        borderRight: '1px solid var(--line)', padding: '28px 22px',
        display: 'flex', flexDirection: 'column', gap: 38,
        background: '#0E0C09', overflow: 'hidden',
      }}>
        <Link href="/events" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 9, height: 9, background: 'var(--lime)', borderRadius: '50%', boxShadow: '0 0 18px var(--lime)', animation: 'pulse 2s ease-in-out infinite', display: 'inline-block' }} />
          <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 20, letterSpacing: '-0.04em' }}>CLIQUE</span>
        </Link>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {NAV_ITEMS.map((item) => {
            const active = item.match.some((m) => pathname === m || pathname.startsWith(m + '/'));
            return (
              <Link key={item.to} href={item.to} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10,
                fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase',
                color: active ? 'var(--paper)' : 'var(--cream)',
                background: active ? 'var(--line)' : 'transparent',
                transition: 'all .15s ease', whiteSpace: 'nowrap',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? 'var(--lime)' : 'var(--line-2)', transform: active ? 'scale(1.3)' : 'none', boxShadow: active ? '0 0 10px var(--lime)' : 'none', flexShrink: 0, transition: 'all .15s ease' }} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 10, border: '1px solid var(--line-2)', transition: 'background .15s ease' }}>
            <AvatarInitial name={user.name} size={36} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--display)', fontSize: 14, fontWeight: 600, lineHeight: 1.1, color: 'var(--paper)' }}>{user.name}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.08em', marginTop: 3 }}>@{user.username} · {user.city ?? ''}</div>
            </div>
          </Link>
          <button onClick={logout} style={{ background: 'transparent', border: 'none', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', color: 'var(--dim)', textTransform: 'uppercase', padding: '4px 8px', cursor: 'pointer', textAlign: 'left' }}>
            ↗ Log out
          </button>
        </div>
      </aside>

      {/* Main content — only this scrolls */}
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '36px 40px 80px' }}>
        {children}
      </main>

      <style>{`
        @media (max-width: 860px) {
          [data-app-grid] { grid-template-columns: 1fr !important; }
          [data-app-aside] { position: sticky; top: 0; z-index: 30; height: auto !important; flex-direction: row !important; align-items: center !important; border-right: none !important; border-bottom: 1px solid var(--line) !important; padding: 14px 20px !important; gap: 20px !important; overflow-x: auto; }
        }
      `}</style>
    </div>
  );
}
