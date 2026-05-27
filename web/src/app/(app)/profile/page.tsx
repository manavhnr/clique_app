'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { User, Pass, Event } from '@/types';
import { getImageUrl, formatDate } from '@/lib/utils';
import api from '@/lib/api';

const ALL_VIBES = ['chill', 'techno', 'indie', 'queer', 'rooftop', 'late', 'loud', 'dance', 'food', 'ambient'];
const CITIES = ['NYC', 'LA', 'SF', 'CHI', 'ATL', 'MIA', 'BER', 'LDN', 'PAR', 'TYO', 'MEX', 'SEA', 'BOS', 'AUS', 'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata'];

const SOCIALS: { key: string; label: string; icon: string; urlFn: (h: string) => string }[] = [
  { key: 'instagram', label: 'Instagram',  icon: '📷', urlFn: (h) => `https://instagram.com/${h}` },
  { key: 'twitter',   label: 'Twitter / X', icon: '𝕏',  urlFn: (h) => `https://twitter.com/${h}` },
  { key: 'snapchat',  label: 'Snapchat',   icon: '👻', urlFn: (h) => `https://snapchat.com/add/${h}` },
  { key: 'facebook',  label: 'Facebook',   icon: '📘', urlFn: (h) => `https://facebook.com/${h}` },
  { key: 'linkedin',  label: 'LinkedIn',   icon: '💼', urlFn: (h) => `https://linkedin.com/in/${h}` },
];

const CAT_COLORS: Record<string, string> = {
  house_party: '#C9F36E',
  warehouse: '#FF3D6E',
  club: '#FF3D6E',
  college: '#E8C46E',
  private: '#E8C46E',
  concert: '#7DB4FF',
  other: '#E8E1D2',
};

function Spinner() {
  return <div style={{ width: 32, height: 32, border: '2px solid var(--line-2)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}

function AvatarBig({ name, size = 140 }: { name: string; size?: number }) {
  const colors = ['#C9F36E', '#FF3D6E', '#7DB4FF', '#E8C46E', '#E8E1D2'];
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) { h ^= name.charCodeAt(i); h = Math.imul(h, 16777619); }
  const color = colors[Math.abs(h) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontWeight: 800, fontSize: size * 0.3, color: 'var(--ink)', flexShrink: 0 }}>
      {name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
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

function SocialsSection({ profile, onSaved }: { profile: User; onSaved: (updated: User) => void }) {
  const [editing, setEditing] = useState<string | null>(null); // platform key being edited
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
    // Merge: keep all existing socials, update this one (or remove if blank)
    const updated: Record<string, string> = {};
    SOCIALS.forEach(({ key: k }) => {
      const existing = (socials as Record<string, string | undefined>)[k];
      if (k === key) { if (handle) updated[k] = handle; }
      else if (existing) updated[k] = existing;
    });
    try {
      const { data } = await api.put('/users/profile', { connectedSocials: updated });
      onSaved(data.data.user);
      cancelEdit();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDisconnect = async (key: string) => {
    setSaving(true);
    const updated: Record<string, string> = {};
    SOCIALS.forEach(({ key: k }) => {
      if (k === key) return; // omit this one
      const existing = (socials as Record<string, string | undefined>)[k];
      if (existing) updated[k] = existing;
    });
    try {
      const { data } = await api.put('/users/profile', { connectedSocials: updated });
      onSaved(data.data.user);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const row: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '14px 0', borderBottom: '1px solid var(--line)',
  };
  const mono11: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em' };
  const inlineSt: React.CSSProperties = {
    flex: 1, background: '#0B0907', border: '1px solid var(--lime)', color: 'var(--paper)',
    padding: '9px 14px', borderRadius: 10, fontFamily: 'var(--display)', fontSize: 15,
    outline: 'none',
  };

  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)', marginBottom: 4 }}>
        CONNECTED SOCIALS
      </div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 13, color: 'var(--dim)', marginBottom: 18 }}>
        Hosts can view these when you register for events.
      </div>

      <div style={{ background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 14, padding: '0 20px' }}>
        {SOCIALS.map(({ key, label, icon, urlFn }, idx) => {
          const handle = (socials as Record<string, string | undefined>)[key];
          const isEditing = editing === key;
          const isLast = idx === SOCIALS.length - 1;

          return (
            <div key={key} style={{ ...row, borderBottom: isLast ? 'none' : '1px solid var(--line)' }}>
              {/* Icon + label */}
              <div style={{ width: 130, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{icon}</span>
                <span style={{ ...mono11, color: 'var(--cream)', textTransform: 'uppercase' }}>{label}</span>
              </div>

              {isEditing ? (
                /* ── Edit mode ── */
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--dim)' }}>@</span>
                    <input
                      style={{ ...inlineSt, paddingLeft: 30 }}
                      value={input}
                      onChange={(e) => setInput(e.target.value.replace(/^@/, ''))}
                      placeholder="yourhandle"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSave(key); if (e.key === 'Escape') cancelEdit(); }}
                    />
                  </div>
                  <button
                    onClick={() => handleSave(key)}
                    disabled={saving}
                    style={{ padding: '9px 16px', background: 'var(--lime)', color: 'var(--ink)', border: 'none', borderRadius: 999, ...mono11, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, whiteSpace: 'nowrap' }}
                  >
                    {saving ? '…' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    style={{ padding: '9px 14px', background: 'transparent', color: 'var(--dim)', border: '1px solid var(--line-2)', borderRadius: 999, ...mono11, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Cancel
                  </button>
                  {error && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--hot)' }}>{error}</span>}
                </div>
              ) : handle ? (
                /* ── Connected ── */
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--lime)', boxShadow: '0 0 8px var(--lime)', flexShrink: 0 }} />
                  <a
                    href={urlFn(handle)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontFamily: 'var(--display)', fontSize: 16, color: 'var(--paper)', textDecoration: 'none', flex: 1 }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--lime)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--paper)')}
                  >
                    @{handle} ↗
                  </a>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => startEdit(key)}
                      style={{ padding: '5px 12px', background: 'transparent', color: 'var(--cream)', border: '1px solid var(--line-2)', borderRadius: 999, ...mono11, cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDisconnect(key)}
                      disabled={saving}
                      style={{ padding: '5px 12px', background: 'transparent', color: 'var(--hot)', border: '1px solid rgba(255,61,110,0.3)', borderRadius: 999, ...mono11, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1 }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Not connected ── */
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ ...mono11, color: 'var(--dim)' }}>NOT CONNECTED</span>
                  <button
                    onClick={() => startEdit(key)}
                    style={{ padding: '7px 16px', background: 'transparent', color: 'var(--lime)', border: '1px solid rgba(201,243,110,0.35)', borderRadius: 999, ...mono11, cursor: 'pointer', transition: 'background .15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(201,243,110,0.08)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    + Connect
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<User | null>(null);
  const [recentPasses, setRecentPasses] = useState<Pass[]>([]);
  const [hostedEvents, setHostedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editVibes, setEditVibes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
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
        setProfile(u);
        updateUser(u);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const passData = passResp.data.data as any;
        const allPasses: Pass[] = [...(passData.upcoming ?? []), ...(passData.past ?? [])];
        setRecentPasses(allPasses.slice(0, 4));
        setAttendedCount((passData.past ?? []).length);
        if (eventsResp) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setHostedEvents((eventsResp as any).data?.data?.events ?? []);
        }
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
      setProfile(updated);
      updateUser(updated);
      setEditing(false);
    } catch {}
    finally { setSaving(false); }
  }

  function handleSocialSaved(updated: User) {
    setProfile(updated);
    updateUser(updated);
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '96px 0' }}>
      <Spinner />
    </div>
  );

  const p = profile ?? user;
  if (!p) return null;

  return (
    <div>
      {/* Editorial header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 32, alignItems: 'center', paddingBottom: 32, borderBottom: '1px solid var(--line)', marginBottom: 36 }}>
        <div>
          {p.profileImage ? (
            <img src={getImageUrl(p.profileImage)} alt={p.name} style={{ width: 140, height: 140, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <AvatarBig name={p.name} size={140} />
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)' }}>CLIQUE MEMBER</div>
          <h1 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 'clamp(48px, 6vw, 88px)', lineHeight: 0.95, letterSpacing: '-0.03em', margin: '12px 0 0' }}>
            {p.name}.
          </h1>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--cream)', letterSpacing: '.06em', marginTop: 8 }}>
            @{p.username}{p.city ? ` · ${p.city}` : ''}
          </div>
          {p.bio && (
            <p style={{ fontFamily: 'var(--display)', fontSize: 17, color: 'var(--cream)', lineHeight: 1.4, marginTop: 20, maxWidth: 460 }}>
              {p.bio}
            </p>
          )}
        </div>
        <div>
          <button onClick={openEdit}
            style={{ background: 'transparent', color: 'var(--paper)', border: '1px solid var(--line-2)', padding: '10px 16px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', transition: 'border-color .15s ease' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--cream)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--line-2)')}
          >
            Edit profile
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, marginBottom: 40, paddingBottom: 32, borderBottom: '1px solid var(--line)' }}>
        {[
          { label: 'CLIQUESCORE', value: p.cliquescore ?? 0, sub: '' },
          { label: 'HOSTED', value: hostedEvents.length, sub: 'EVENTS' },
          { label: 'ATTENDED', value: attendedCount, sub: 'NIGHTS' },
          { label: 'FOLLOWERS', value: p.followerCount ?? 0, sub: '' },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ padding: 18, background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 12 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--dim)' }}>{label}</div>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 48, lineHeight: 1, marginTop: 6, letterSpacing: '-0.03em' }}>{value}</div>
            {sub && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.1em', marginTop: 4 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Your scene */}
      {(p.vibeTags?.length ?? 0) > 0 && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)', marginBottom: 18 }}>YOUR SCENE</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {p.vibeTags?.map((v) => (
              <span key={v} style={{ fontFamily: 'var(--display)', fontSize: 16, padding: '8px 16px', background: 'var(--line)', borderRadius: 999, color: 'var(--paper)' }}>{v}</span>
            ))}
          </div>
        </div>
      )}

      {/* Connected socials */}
      <SocialsSection profile={p} onSaved={handleSocialSaved} />

      {/* Recent passes */}
      {recentPasses.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)' }}>RECENT PASSES</div>
            <Link href="/passes" style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', color: 'var(--lime)', textTransform: 'uppercase', textDecoration: 'none' }}>All passes →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {recentPasses.map((pass) => {
              const evt = typeof pass.eventId === 'object' ? pass.eventId as Event : null;
              if (!evt) return null;
              const eventId = typeof pass.eventId === 'string' ? pass.eventId : evt._id;
              return (
                <Link key={pass._id} href={`/events/${eventId}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, border: '1px solid var(--line-2)', borderRadius: 12, cursor: 'pointer', textDecoration: 'none', transition: 'border-color .15s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--cream)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--line-2)')}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0, background: CAT_COLORS[evt.category] ?? '#E8E1D2' }} />
                  <div>
                    <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16, color: 'var(--paper)' }}>{evt.title}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.1em', marginTop: 4 }}>
                      № {pass._id.slice(-6).toUpperCase()} · {pass.status.toUpperCase()}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Hosting */}
      {hostedEvents.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)' }}>YOU&apos;RE HOSTING</div>
            <Link href="/host/dashboard" style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', color: 'var(--lime)', textTransform: 'uppercase', textDecoration: 'none' }}>Host dashboard →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
            {hostedEvents.slice(0, 4).map((e) => (
              <Link key={e._id} href={`/events/${e._id}`}
                style={{ display: 'flex', flexDirection: 'column', background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 12, overflow: 'hidden', textDecoration: 'none', transition: 'border-color .15s ease' }}
                onMouseEnter={(ev) => (ev.currentTarget.style.borderColor = 'var(--cream)')}
                onMouseLeave={(ev) => (ev.currentTarget.style.borderColor = 'var(--line-2)')}
              >
                <div style={{ height: 80, background: CAT_COLORS[e.category] ?? '#E8E1D2', padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(11,9,7,0.7)', letterSpacing: '.14em' }}>{(e.category ?? 'other').replace('_', ' ').toUpperCase()}</div>
                  <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18, color: 'var(--ink)', lineHeight: 1 }}>{e.title}</div>
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--cream)', letterSpacing: '.06em' }}>{e.locationName}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)' }}>{e.bookedCount}/{e.capacity} RSVPS</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: e.status === 'published' ? 'var(--lime)' : 'var(--dim)' }}>● {e.status.toUpperCase()}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Become host CTA */}
      {!p.isVerifiedHost && (
        <div style={{ padding: 24, background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 16, marginBottom: 40 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', marginBottom: 12 }}>WANT TO HOST?</div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 24, letterSpacing: '-0.02em', marginBottom: 8 }}>Throw something.</div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 15, color: 'var(--cream)', lineHeight: 1.4, marginBottom: 18 }}>
            Apply to become a verified host and start creating events on Clique.
          </div>
          <button onClick={() => router.push('/become-host')}
            style={{ background: 'var(--lime)', color: 'var(--ink)', border: 'none', padding: '12px 20px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
            Apply to host →
          </button>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,9,7,0.92)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setEditing(false)}>
          <div style={{ background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 20, padding: 32, maxWidth: 480, width: '100%', animation: 'riseIn .3s ease-out', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em', marginBottom: 24 }}>Edit your profile.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>NAME</span>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>BIO</span>
                <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} maxLength={140} rows={3}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 80, lineHeight: 1.4 }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' }}>CITY</span>
                <select value={editCity} onChange={(e) => setEditCity(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' as const }}>
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
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={() => setEditing(false)} style={{ flex: 1, background: 'transparent', color: 'var(--paper)', border: '1px solid var(--line-2)', padding: '14px 0', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={saveEdit} disabled={saving} style={{ flex: 1, background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '14px 0', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
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
