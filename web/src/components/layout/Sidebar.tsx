'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Calendar, Ticket, User, Star, LayoutDashboard, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn, getImageUrl } from '@/lib/utils';

const navItems = [
  { href: '/events', label: 'Events', icon: Calendar },
  { href: '/passes', label: 'My Passes', icon: Ticket },
  { href: '/profile', label: 'Profile', icon: User },
];

const hostItems = [
  { href: '/host/dashboard', label: 'Host Dashboard', icon: LayoutDashboard },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-dark-card border-r border-dark-border flex flex-col z-40">
      <div className="px-5 py-6 border-b border-dark-border">
        <Link href="/events" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">CLIQUE</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              pathname.startsWith(href)
                ? 'bg-primary/15 text-primary-light'
                : 'text-muted hover:text-white hover:bg-dark-hover'
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}

        {user?.isVerifiedHost && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-medium text-zinc-600 uppercase tracking-wider">Host</p>
            </div>
            {hostItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  pathname.startsWith(href)
                    ? 'bg-primary/15 text-primary-light'
                    : 'text-muted hover:text-white hover:bg-dark-hover'
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </>
        )}

        {!user?.isVerifiedHost && user?.hostVerificationStatus !== 'pending' && (
          <div className="pt-4">
            <Link
              href="/become-host"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-white hover:bg-dark-hover transition-colors group"
            >
              <Star size={18} />
              <span>Become a Host</span>
              <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>
        )}

        {user?.hostVerificationStatus === 'pending' && (
          <div className="mx-3 mt-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-xs text-yellow-400 font-medium">Host application pending</p>
            <p className="text-xs text-muted mt-0.5">We'll review within 24-48 hours.</p>
          </div>
        )}
      </nav>

      <div className="px-3 pb-4 border-t border-dark-border pt-4">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-primary/20 overflow-hidden flex-shrink-0">
              {user.profileImage ? (
                <img src={getImageUrl(user.profileImage)} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-primary-light">
                  {user.name?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-muted truncate">@{user.username}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-red-400 hover:bg-red-500/5 transition-colors mt-1"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
