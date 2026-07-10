'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

// ─── Nav items ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/events',         label: 'Tonight',   match: ['/events'],         icon: NavIconEvents  },
  { to: '/passes',         label: 'My passes', match: ['/passes'],         icon: NavIconPasses  },
  { to: '/host/dashboard', label: 'Host',      match: ['/host'],           icon: NavIconHost    },
  { to: '/profile',        label: 'Profile',   match: ['/profile'],        icon: NavIconProfile },
];

// ─── Inline SVG icons (no lucide dependency) ─────────────────────────────────
function NavIconEvents({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="3" width="12" height="11" rx="2" />
      <path d="M5 1v3M11 1v3M2 7h12" />
    </svg>
  );
}
function NavIconPasses({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="1" y="4" width="14" height="8" rx="2" />
      <path d="M10 4v8M6 7h-.01M6 9h-.01" />
    </svg>
  );
}
function NavIconHost({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M8 1l1.8 3.6L14 5.4l-3 2.9.7 4.1L8 10.4l-3.7 2 .7-4.1L2 5.4l4.2-.8L8 1z" />
    </svg>
  );
}
function NavIconProfile({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="5" r="3" />
      <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    </svg>
  );
}
function IconMenu({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M3 5h14M3 10h14M3 15h14" />
    </svg>
  );
}
function IconChevronLeft({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3L5 8l5 5" />
    </svg>
  );
}
function IconChevronRight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3l5 5-5 5" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
      {name?.[0]?.toUpperCase() ?? 'C'}
    </span>
  );
}

// ─── Breakpoint hook ──────────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

// ─── Sidebar nav list (shared between desktop sidebar + mobile drawer) ────────
function SidebarNav({
  collapsed,
  pathname,
  user,
  logout,
  onLinkClick,
}: {
  collapsed: boolean;
  pathname: string;
  user: { name: string; username: string; city?: string } | null;
  logout: () => void;
  onLinkClick?: () => void;
}) {
  return (
    <>
      {/* Logo */}
      <Link
        href="/events"
        onClick={onLinkClick}
        style={{
          display: 'flex', alignItems: 'center',
          gap: collapsed ? 0 : 10,
          overflow: 'hidden',
          flexShrink: 0,
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0 4px' : '0 2px',
        }}
      >
        <span style={{ width: 9, height: 9, background: 'var(--lime)', borderRadius: '50%', boxShadow: '0 0 18px var(--lime)', animation: 'pulse 2s ease-in-out infinite', display: 'inline-block', flexShrink: 0 }} />
        {!collapsed && (
          <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 20, letterSpacing: '-0.04em', whiteSpace: 'nowrap', overflow: 'hidden' }}>CLIQUE</span>
        )}
      </Link>

      {/* Nav links — numbered like a ledger index */}
      <nav className="ledger" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {NAV_ITEMS.map((item, i) => {
          const active = item.match.some((m) => pathname === m || pathname.startsWith(m + '/'));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              href={item.to}
              onClick={onLinkClick}
              title={collapsed ? item.label : undefined}
              className="ledger-row"
              style={{
                display: 'flex', alignItems: 'center',
                gap: collapsed ? 0 : 12,
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '14px 0' : '14px 6px',
                fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase',
                color: active ? 'var(--paper)' : 'var(--dim)',
                transition: 'color .15s ease, background .15s ease',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {collapsed ? (
                <span style={{
                  flexShrink: 0,
                  color: active ? 'var(--lime)' : 'var(--dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'color .15s ease',
                }}>
                  <Icon size={16} />
                </span>
              ) : (
                <>
                  <span style={{ fontSize: 10, letterSpacing: '.08em', color: active ? 'var(--lime)' : 'var(--dim)', width: 20, flexShrink: 0, transition: 'color .15s ease' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', flex: 1 }}>{item.label}</span>
                  {active && <span aria-hidden style={{ color: 'var(--lime)', fontSize: 11, flexShrink: 0 }}>●</span>}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User card + logout */}
      {user && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
          {!collapsed && (
            <Link
              href="/profile"
              onClick={onLinkClick}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 6px 0', borderTop: '1px dashed var(--line-2)', overflow: 'hidden' }}
            >
              <AvatarInitial name={user.name || 'C'} size={34} />
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: 13, fontWeight: 600, lineHeight: 1.1, color: 'var(--paper)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.08em', marginTop: 3, whiteSpace: 'nowrap' }}>@{user.username}</div>
              </div>
            </Link>
          )}
          {collapsed && (
            <Link href="/profile" onClick={onLinkClick} style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
              <AvatarInitial name={user.name || 'C'} size={30} />
            </Link>
          )}
          <button
            onClick={() => { logout(); onLinkClick?.(); }}
            style={{
              background: 'transparent', border: 'none',
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', color: 'var(--dim)',
              textTransform: 'uppercase', padding: collapsed ? '4px 0' : '4px 6px',
              cursor: 'pointer', textAlign: collapsed ? 'center' : 'left',
              whiteSpace: 'nowrap', overflow: 'hidden',
            }}
          >
            {collapsed ? '↗' : '↗ Log out'}
          </button>
        </div>
      )}
    </>
  );
}

// ─── Root layout ──────────────────────────────────────────────────────────────
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();

  // Sidebar collapsed state (desktop only), persisted
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
    if (!isLoading && user)  router.replace('/confirmed');
  }, [isLoading, user, router]);

  useEffect(() => {
    const saved = localStorage.getItem('clique_sidebar_collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => {
      localStorage.setItem('clique_sidebar_collapsed', String(!c));
      return !c;
    });
  }, []);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  if (isLoading) return <Spinner />;
  if (!user) return null;

  const handleLogout = () => { logout(); router.push('/'); };
  const sidebarW = collapsed ? 64 : 240;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--ink)' }}>

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      {!isMobile && (
        <aside style={{
          width: sidebarW,
          flexShrink: 0,
          borderRight: '1px solid var(--line)',
          padding: '28px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
          background: '#0E0C09',
          overflow: 'hidden',
          position: 'relative',
          transition: 'width .25s cubic-bezier(.4,0,.2,1)',
        }}>
          <SidebarNav
            collapsed={collapsed}
            pathname={pathname}
            user={user}
            logout={handleLogout}
          />

          {/* Collapse toggle button */}
          <button
            onClick={toggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              position: 'absolute',
              bottom: 24,
              right: collapsed ? '50%' : 16,
              transform: collapsed ? 'translateX(50%)' : 'none',
              width: 28, height: 28,
              background: 'transparent', border: '1px solid var(--line-2)',
              borderRadius: 3,
              color: 'var(--dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all .25s ease',
              zIndex: 1,
            }}
          >
            {collapsed ? <IconChevronRight size={13} /> : <IconChevronLeft size={13} />}
          </button>
        </aside>
      )}

      {/* ── Mobile: slide-out drawer overlay ────────────────────────────── */}
      {isMobile && drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setDrawerOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(11,9,7,0.75)',
              backdropFilter: 'blur(4px)',
              zIndex: 40,
              animation: 'fadeIn .2s ease-out',
            }}
          />
          {/* Drawer */}
          <aside style={{
            position: 'fixed', left: 0, top: 0, bottom: 0,
            width: 260,
            zIndex: 50,
            background: '#0E0C09',
            borderRight: '1px solid var(--line)',
            padding: '28px 16px',
            display: 'flex', flexDirection: 'column', gap: 28,
            animation: 'slideInLeft .22s cubic-bezier(.4,0,.2,1)',
            overflow: 'hidden',
          }}>
            <SidebarNav
              collapsed={false}
              pathname={pathname}
              user={user}
              logout={handleLogout}
              onLinkClick={() => setDrawerOpen(false)}
            />
          </aside>
        </>
      )}

      {/* ── Main content area ────────────────────────────────────────────── */}
      <main style={{
        flex: 1,
        minWidth: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Mobile top bar */}
        {isMobile && (
          <div style={{
            position: 'sticky', top: 0, zIndex: 30,
            height: 52,
            background: 'rgba(11,9,7,0.96)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--line)',
            display: 'flex', alignItems: 'center',
            padding: '0 16px',
            gap: 14,
            flexShrink: 0,
          }}>
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              style={{ background: 'transparent', border: 'none', color: 'var(--cream)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
            >
              <IconMenu size={20} />
            </button>
            <Link href="/events" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <span style={{ width: 8, height: 8, background: 'var(--lime)', borderRadius: '50%', boxShadow: '0 0 12px var(--lime)', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
              <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.04em' }}>CLIQUE</span>
            </Link>
            <Link href="/profile" style={{ display: 'flex', alignItems: 'center' }}>
              <AvatarInitial name={user.name || 'C'} size={30} />
            </Link>
          </div>
        )}

        {/* Page content */}
        <div style={{
          flex: 1,
          padding: isMobile ? '20px 16px 88px' : '36px 40px 60px',
          overflowY: 'auto',
        }}>
          {children}
        </div>
      </main>

      {/* ── Mobile bottom navigation bar ─────────────────────────────────── */}
      {isMobile && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          zIndex: 30,
          height: 64,
          background: 'rgba(14,12,9,0.97)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid var(--line)',
          display: 'flex', alignItems: 'stretch',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {NAV_ITEMS.map((item) => {
            const active = item.match.some((m) => pathname === m || pathname.startsWith(m + '/'));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                href={item.to}
                style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 4,
                  color: active ? 'var(--lime)' : 'var(--dim)',
                  transition: 'color .15s ease',
                  position: 'relative',
                  textDecoration: 'none',
                }}
              >
                <Icon size={18} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                  {item.label === 'My passes' ? 'Passes' : item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      )}

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
