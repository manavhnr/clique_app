'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { User, Pass, Event } from '@/types';
import { getImageUrl, formatDate } from '@/lib/utils';
import api from '@/lib/api';

const ALL_VIBES = ['chill', 'techno', 'indie', 'rooftop', 'late', 'loud', 'dance', 'food', 'ambient', 'bass', 'desi', 'bollywood'];
const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Goa', 'Chandigarh', 'Kochi', 'Indore', 'Lucknow', 'Surat', 'Nagpur', 'Coimbatore', 'Vizag', 'Bhopal', 'Vadodara'];

const CAT_COLORS: Record<string, string> = {
  house_party: '#C9F36E', warehouse: '#FF3D6E', club: '#FF3D6E',
  college: '#E8C46E', private: '#E8C46E', concert: '#7DB4FF', other: '#E8E1D2',
};

// ─── Breakpoint ───────────────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Spinner() {
  return <div style={{ width: 32, height: 32, border: '2px solid var(--line-2)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}

function AvatarBig({ name, size = 120 }: { name: string; size?: number }) {
  const colors = ['#C9F36E', '#FF3D6E', '#7DB4FF', '#E8C46E', '#E8E1D2'];
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) { h ^= name.charCodeAt(i); h = Math.imul(h, 16777619); }
  const color = colors[Math.abs(h) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontWeight: 800, fontSize: size * 0.3, color: 'var(--ink)', flexShrink: 0 }}>
      {name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'}
    </div>
  );
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{ background: on ? 'var(--lime)' : 'transparent', color: on ? 'var(--ink)' : 'var(--cream)', border: `1px solid ${on ? 'var(--lime)' : 'var(--line-2)'}`, padding: '8px 14px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all .15s ease' }}>
      {children}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0B0907', border: '1px solid var(--line-2)', color: 'var(--paper)',
  padding: '14px 16px', borderRadius: 12, fontFamily: 'var(--display)', fontSize: 16,
  outline: 'none', transition: 'border-color .15s ease', boxSizing: 'border-box',
};

// ─── Instagram icon ───────────────────────────────────────────────────────────
function InstagramLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#FEDA75" />
          <stop offset="25%"  stopColor="#FA7E1E" />
          <stop offset="50%"  stopColor="#D62976" />
          <stop offset="75%"  stopColor="#962FBF" />
          <stop offset="100%" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>
      <path fill="url(#ig-grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

const SOCIALS = [
  { key: 'instagram', label: 'Instagram', urlFn: (h: string) => `https://instagram.com/${h}` },
];

// ─── Socials section ──────────────────────────────────────────────────────────
function SocialsSection({ profile, onSaved, isMobile }: { profile: User; onSaved: (u: User) => void; isMobile: boolean }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [input, setInput]     = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const socials = profile.connectedSocials ?? {};

  const startEdit = (key: string) => {
    setEditing(key);
    setInput((socials as Record<string, string | undefined>)[key] ?? '');
    setError('');
  };
  const cancelEdit = () => { setEditing(null); setInput(''); setError(''); };

  const handleSave = async (key: string) => {
    setSaving(true); setError('');
    const handle = input.trim().replace(/^@/, '');
    const updated: Record<string, string> = {};
    SOCIALS.forEach(({ key: k }) => {
      const existing = (socials as Record<string, string | undefined>)[k];
      if (k === key) { if (handle) updated[k] = handle; }
      else if (existing) updated[k] = existing;
    });
    try {
      const { data } = await api.put('/users/profile', { connectedSocials: updated });
      onSaved(data.data.user); cancelEdit();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDisconnect = async (key: string) => {
    setSaving(true);
    const updated: Record<string, string> = {};
    SOCIALS.forEach(({ key: k }) => {
      if (k === key) return;
      const existing = (socials as Record<string, string | undefined>)[k];
      if (existing) updated[k] = existing;
    });
    try {
      const { data } = await api.put('/users/profile', { connectedSocials: updated });
      onSaved(data.data.user);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)', marginBottom: 4 }}>
        CONNECTED SOCIALS
      </div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 13, color: 'var(--dim)', marginBottom: 18 }}>
        Hosts can view these when you register for events.
      </div>

      <div style={{ background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 14, padding: '0 16px', overflow: 'hidden' }}>
        {SOCIALS.map(({ key, label, urlFn }, idx) => {
          const handle = (socials as Record<string, string | undefined>)[key];
          const isEditing = editing === key;
          const isLast = idx === SOCIALS.length - 1;

          return (
            <div key={key} style={{ padding: '14px 0', borderBottom: isLast ? 'none' : '1px solid var(--line)' }}>
              {/* Platform label row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: isEditing ? 12 : 0 }}>
                <InstagramLogo size={18} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', color: 'var(--cream)', textTransform: 'uppercase', flex: 1 }}>{label}</span>
                {/* Action buttons (not editing) */}
                {!isEditing && !handle && (
                  <button onClick={() => startEdit(key)}
                    style={{ padding: '6px 14px', background: 'transparent', color: 'var(--lime)', border: '1px solid rgba(201,243,110,0.35)', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', cursor: 'pointer', flexShrink: 0 }}>
                    + Connect
                  </button>
                )}
                {!isEditing && handle && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => startEdit(key)}
                      style={{ padding: '5px 10px', background: 'transparent', color: 'var(--cream)', border: '1px solid var(--line-2)', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.08em', cursor: 'pointer' }}>
                      Edit
                    </button>
                    <button onClick={() => handleDisconnect(key)} disabled={saving}
                      style={{ padding: '5px 10px', background: 'transparent', color: 'var(--hot)', border: '1px solid rgba(255,61,110,0.3)', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.08em', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1 }}>
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Connected handle (not editing) */}
              {!isEditing && handle && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--lime)', boxShadow: '0 0 7px var(--lime)', flexShrink: 0 }} />
                  <a href={urlFn(handle)} target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: 'var(--display)', fontSize: 15, color: 'var(--paper)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    @{handle} ↗
                  </a>
                </div>
              )}

              {/* Edit mode — stacks on mobile */}
              {isEditing && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--dim)', pointerEvents: 'none' }}>@</span>
                    <input
                      style={{ ...inputStyle, paddingLeft: 30, fontSize: 15 }}
                      value={input}
                      onChange={(e) => setInput(e.target.value.replace(/^@/, ''))}
                      placeholder="yourhandle"
                      autoFocus
                      onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                      onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSave(key); if (e.key === 'Escape') cancelEdit(); }}
                    />
                  </div>
                  {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--hot)' }}>{error}</div>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleSave(key)} disabled={saving}
                      style={{ flex: 1, padding: '10px 0', background: 'var(--lime)', color: 'var(--ink)', border: 'none', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                      {saving ? '…' : 'Save'}
                    </button>
                    <button onClick={cancelEdit}
                      style={{ flex: 1, padding: '10px 0', background: 'transparent', color: 'var(--dim)', border: '1px solid var(--line-2)', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();

  const [profile, setProfile]         = useState<User | null>(null);
  const [recentPasses, setRecentPasses] = useState<Pass[]>([]);
  const [hostedEvents, setHostedEvents] = useState<Event[]>([]);
  const [loading, setLoading]         = useState(true);
  const [editing, setEditing]         = useState(false);
  const [editName, setEditName]       = useState('');
  const [editBio, setEditBio]         = useState('');
  const [editCity, setEditCity]       = useState('');
  const [editVibes, setEditVibes]     = useState<string[]>([]);
  const [saving, setSaving]           = useState(false);
  const [attendedCount, setAttendedCount] = useState(0);

  useEffect(() => {
    Promise.all([
      api.get('/auth/me'),
      api.get('/passes/my'),
      user?.isVerifiedHost ? api.get('/events/mine') : Promise.resolve(null),
    ])
      .then(([meResp, passResp, eventsResp]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u: User = (meResp.data.data as any).user ?? meResp.data.data;
        setProfile(u); updateUser(u);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const passData = passResp.data.data as any;
        const allPasses: Pass[] = [...(passData.upcoming ?? []), ...(passData.past ?? [])];
        setRecentPasses(allPasses.slice(0, 4));
        setAttendedCount((passData.past ?? []).length);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (eventsResp) setHostedEvents((eventsResp as any).data?.data?.events ?? []);
      })
      .catch(() => setProfile(user))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function openEdit() {
    if (!profile) return;
    setEditName(profile.name);
    setEditBio(profile.bio ?? '');
    setEditCity(profile.city ?? '');
    setEditVibes(profile.vibeTags ?? []);
    setEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const { data } = await api.put('/users/profile', { name: editName, bio: editBio, city: editCity, vibeTags: editVibes });
      const updated = data.data.user;
      setProfile(updated); updateUser(updated); setEditing(false);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  function handleSocialSaved(updated: User) { setProfile(updated); updateUser(updated); }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '96px 0' }}>
      <Spinner />
    </div>
  );

  const p = profile ?? user;
  if (!p) return null;

  const avatarSize = isMobile ? 80 : 120;

  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden' }}>

      {/* ── Profile header ──────────────────────────────────────────────── */}
      <div style={{
        paddingBottom: isMobile ? 24 : 32,
        borderBottom: '1px solid var(--line)',
        marginBottom: isMobile ? 24 : 36,
      }}>
        {/* Avatar + name row */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: isMobile ? 16 : 28,
        }}>
          {/* Avatar */}
          <div style={{ flexShrink: 0 }}>
            {p.profileImage ? (
              <img src={getImageUrl(p.profileImage)} alt={p.name} style={{ width: avatarSize, height: avatarSize, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <AvatarBig name={p.name || '?'} size={avatarSize} />
            )}
          </div>

          {/* Name / username / bio */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)' }}>CLIQUE MEMBER</div>
            <h1 style={{
              fontFamily: 'var(--display)', fontWeight: 700,
              fontSize: isMobile ? 'clamp(32px, 10vw, 48px)' : 'clamp(40px, 5vw, 72px)',
              lineHeight: 0.95, letterSpacing: '-0.03em',
              margin: '8px 0 0',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
            }}>
              {p.name || 'No name set'}.
            </h1>
            <div style={{ fontFamily: 'var(--mono)', fontSize: isMobile ? 11 : 13, color: 'var(--cream)', letterSpacing: '.06em', marginTop: 8 }}>
              @{p.username}{p.city ? ` · ${p.city}` : ''}
            </div>
            {p.bio && (
              <p style={{ fontFamily: 'var(--display)', fontSize: isMobile ? 14 : 16, color: 'var(--cream)', lineHeight: 1.4, marginTop: 12, maxWidth: 460, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                {p.bio}
              </p>
            )}
          </div>

          {/* Edit button — right side on desktop, below on mobile */}
          <div style={{ flexShrink: 0, alignSelf: isMobile ? 'flex-start' : 'flex-start', marginTop: isMobile ? 0 : 4 }}>
            <button onClick={openEdit}
              style={{ background: 'transparent', color: 'var(--paper)', border: '1px solid var(--line-2)', padding: isMobile ? '9px 14px' : '10px 16px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
              Edit profile
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: isMobile ? 10 : 18,
        marginBottom: isMobile ? 28 : 40,
        paddingBottom: isMobile ? 24 : 32,
        borderBottom: '1px solid var(--line)',
      }}>
        {[
          { label: 'CLIQUESCORE', value: p.cliquescore ?? 0, sub: '' },
          { label: 'HOSTED',      value: hostedEvents.length, sub: 'EVENTS' },
          { label: 'ATTENDED',    value: attendedCount,       sub: 'NIGHTS' },
          { label: 'FOLLOWERS',   value: p.followerCount ?? 0, sub: '' },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ padding: isMobile ? 14 : 18, background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 12, minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: isMobile ? 9 : 10, letterSpacing: '.12em', color: 'var(--dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: isMobile ? 32 : 44, lineHeight: 1, marginTop: 4, letterSpacing: '-0.03em' }}>{value}</div>
            {sub && <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--dim)', letterSpacing: '.1em', marginTop: 4 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Your scene ───────────────────────────────────────────────────── */}
      {(p.vibeTags?.length ?? 0) > 0 && (
        <div style={{ marginBottom: isMobile ? 28 : 40 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)', marginBottom: 14 }}>YOUR SCENE</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {p.vibeTags?.map((v) => (
              <span key={v} style={{ fontFamily: 'var(--display)', fontSize: isMobile ? 13 : 15, padding: isMobile ? '6px 12px' : '8px 16px', background: 'var(--line)', borderRadius: 999, color: 'var(--paper)', flexShrink: 0 }}>{v}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Connected socials ─────────────────────────────────────────────── */}
      <SocialsSection profile={p} onSaved={handleSocialSaved} isMobile={isMobile} />

      {/* ── Recent passes ─────────────────────────────────────────────────── */}
      {recentPasses.length > 0 && (
        <div style={{ marginBottom: isMobile ? 28 : 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)' }}>RECENT PASSES</div>
            <Link href="/passes" style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', color: 'var(--lime)', textTransform: 'uppercase', textDecoration: 'none', flexShrink: 0 }}>All →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentPasses.map((pass) => {
              const evt = typeof pass.eventId === 'object' ? pass.eventId as Event : null;
              if (!evt) return null;
              const eventId = typeof pass.eventId === 'string' ? pass.eventId : evt._id;
              return (
                <Link key={pass._id} href={`/events/${eventId}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--line-2)', borderRadius: 12, cursor: 'pointer', textDecoration: 'none', background: '#14110E', overflow: 'hidden' }}>
                  {/* Colour swatch */}
                  <div style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0, background: CAT_COLORS[evt.category] ?? '#E8E1D2' }} />
                  {/* Text — clamped to prevent bleed */}
                  <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15, color: 'var(--paper)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{evt.title}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.08em', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      № {pass._id.slice(-6).toUpperCase()} · {pass.status.toUpperCase()}
                    </div>
                  </div>
                  {/* Status dot */}
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: pass.status === 'active' ? 'var(--lime)' : 'var(--dim)', flexShrink: 0 }} />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Hosting ───────────────────────────────────────────────────────── */}
      {hostedEvents.length > 0 && (
        <div style={{ marginBottom: isMobile ? 28 : 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)' }}>YOU&apos;RE HOSTING</div>
            <Link href="/host/dashboard" style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', color: 'var(--lime)', textTransform: 'uppercase', textDecoration: 'none', flexShrink: 0 }}>Dashboard →</Link>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: isMobile ? 10 : 16,
          }}>
            {hostedEvents.slice(0, 4).map((e) => (
              <Link key={e._id} href={`/events/${e._id}`}
                style={{ display: 'flex', flexDirection: 'column', background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 12, overflow: 'hidden', textDecoration: 'none' }}>
                {/* Colour header */}
                <div style={{ height: 70, background: CAT_COLORS[e.category] ?? '#E8E1D2', padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'rgba(11,9,7,0.7)', letterSpacing: '.12em' }}>{(e.category ?? 'other').replace('_', ' ').toUpperCase()}</div>
                  <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16, color: 'var(--ink)', lineHeight: 1.1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{e.title}</div>
                </div>
                {/* Card body */}
                <div style={{ padding: '10px 12px', minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--cream)', letterSpacing: '.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.locationName}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, gap: 8 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.bookedCount}/{e.capacity} RSVPS</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: e.status === 'published' ? 'var(--lime)' : 'var(--dim)', whiteSpace: 'nowrap', flexShrink: 0 }}>● {e.status.toUpperCase()}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Become host CTA ───────────────────────────────────────────────── */}
      {!p.isVerifiedHost && (
        <div style={{ padding: isMobile ? 18 : 24, background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 16, marginBottom: 40 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', marginBottom: 10 }}>WANT TO HOST?</div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: isMobile ? 20 : 24, letterSpacing: '-0.02em', marginBottom: 6 }}>Throw something.</div>
          <div style={{ fontFamily: 'var(--display)', fontSize: isMobile ? 13 : 15, color: 'var(--cream)', lineHeight: 1.4, marginBottom: 16 }}>
            Apply to become a verified host and start creating events on Clique.
          </div>
          <button onClick={() => router.push('/become-host')}
            style={{ background: 'var(--lime)', color: 'var(--ink)', border: 'none', padding: isMobile ? '11px 18px' : '12px 20px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
            Apply to host →
          </button>
        </div>
      )}

      {/* ── Edit modal ────────────────────────────────────────────────────── */}
      {editing && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(11,9,7,0.92)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24 }}
          onClick={() => setEditing(false)}
        >
          <div
            style={{ background: '#14110E', border: '1px solid var(--line-2)', borderRadius: isMobile ? '20px 20px 0 0' : 20, padding: isMobile ? '24px 20px 32px' : 32, width: '100%', maxWidth: isMobile ? '100%' : 480, animation: 'riseIn .3s ease-out', maxHeight: isMobile ? '92vh' : '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle on mobile */}
            {isMobile && (
              <div style={{ width: 36, height: 4, background: 'var(--line-2)', borderRadius: 999, margin: '0 auto 20px' }} />
            )}

            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: isMobile ? 24 : 28, letterSpacing: '-0.02em', marginBottom: 22 }}>Edit your profile.</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>NAME</span>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')} />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>BIO</span>
                <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} maxLength={140} rows={3}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 80, lineHeight: 1.4 }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')} />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>CITY</span>
                <select value={editCity} onChange={(e) => setEditCity(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' as const }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}>
                  <option value="">Select city</option>
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>YOUR SCENE</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ALL_VIBES.map((v) => (
                    <Pill key={v} on={editVibes.includes(v)} onClick={() => setEditVibes((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])}>{v}</Pill>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setEditing(false)}
                  style={{ flex: 1, background: 'transparent', color: 'var(--paper)', border: '1px solid var(--line-2)', padding: '14px 0', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={saveEdit} disabled={saving}
                  style={{ flex: 1, background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '14px 0', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
