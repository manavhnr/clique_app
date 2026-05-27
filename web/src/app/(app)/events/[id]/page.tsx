'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Event, Squad, JoinRequest } from '@/types';
import { formatDate, formatTime, getImageUrl, categoryLabel } from '@/lib/utils';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

function Spinner({ size = 32 }: { size?: number }) {
  return <div style={{ width: size, height: size, border: '2px solid var(--line-2)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}

// ─── Squad section ────────────────────────────────────────────────────────────

function SquadSection({ eventId, userId }: { eventId: string; userId: string }) {
  const [squad, setSquad]           = useState<Squad | null>(null);
  const [pendingInvite, setPendingInvite] = useState<Squad | null>(null);
  const [loading, setLoading]       = useState(true);
  const [squadName, setSquadName]   = useState('');
  const [inviteHandle, setInviteHandle] = useState('');
  const [creating, setCreating]     = useState(false);
  const [inviting, setInviting]     = useState(false);
  const [responding, setResponding] = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  const refresh = async () => {
    try {
      const { data } = await api.get(`/squads/event/${eventId}`);
      setSquad(data.data.squad || null);
      setPendingInvite(data.data.pendingInvite || null);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, [eventId]);

  const flash = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    setCreating(true);
    try {
      await api.post('/squads', { eventId, name: squadName.trim() || undefined });
      flash('Squad created!');
      await refresh();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Failed to create squad');
    } finally { setCreating(false); }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    setInviting(true);
    try {
      await api.post(`/squads/${squad!._id}/invite`, { username: inviteHandle.trim().replace(/^@/, '') });
      setInviteHandle('');
      flash('Invite sent!');
      await refresh();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Failed to send invite');
    } finally { setInviting(false); }
  };

  const handleRespond = async (accept: boolean) => {
    if (!pendingInvite) return;
    setResponding(true); setError('');
    try {
      await api.patch(`/squads/${pendingInvite._id}/respond`, { accept });
      flash(accept ? 'Joined squad!' : 'Invite declined');
      await refresh();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Failed');
    } finally { setResponding(false); }
  };

  const handleLeave = async () => {
    if (!squad) return;
    setError('');
    try {
      await api.delete(`/squads/${squad._id}/leave`);
      flash('Left squad');
      await refresh();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Failed');
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner size={20} /></div>;

  const box: React.CSSProperties = {
    background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 14, padding: 20, marginTop: 24,
  };
  const mono11: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase' as const };
  const inputSt: React.CSSProperties = {
    flex: 1, background: '#0B0907', border: '1px solid var(--line-2)', color: 'var(--paper)',
    padding: '10px 14px', borderRadius: 10, fontFamily: 'var(--display)', fontSize: 14, outline: 'none',
  };
  const btn = (variant: 'primary' | 'secondary' | 'danger' = 'primary'): React.CSSProperties => ({
    padding: '10px 18px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 11,
    letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', border: '1px solid',
    background: variant === 'primary' ? 'var(--lime)' : variant === 'danger' ? 'rgba(255,61,110,0.15)' : 'transparent',
    color: variant === 'primary' ? 'var(--ink)' : variant === 'danger' ? 'var(--hot)' : 'var(--cream)',
    borderColor: variant === 'primary' ? 'var(--lime)' : variant === 'danger' ? 'rgba(255,61,110,0.4)' : 'var(--line-2)',
  });

  return (
    <div style={box}>
      <div style={{ ...mono11, color: 'var(--dim)', marginBottom: 14 }}>YOUR SQUAD</div>

      {error  && <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--hot)', marginBottom: 12 }}>{error}</div>}
      {success && <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--lime)', marginBottom: 12 }}>{success}</div>}

      {/* Pending invite */}
      {!squad && pendingInvite && (
        <div style={{ background: 'rgba(201,243,110,0.06)', border: '1px solid rgba(201,243,110,0.2)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
            Invite to join <span style={{ color: 'var(--lime)' }}>{pendingInvite.name}</span>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--cream)', marginBottom: 14 }}>
            {pendingInvite.members.length} member{pendingInvite.members.length !== 1 ? 's' : ''} · {pendingInvite.members.map((m) => '@' + m.username).join(', ')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => handleRespond(true)} disabled={responding} style={btn('primary')}>Accept</button>
            <button onClick={() => handleRespond(false)} disabled={responding} style={btn('secondary')}>Decline</button>
          </div>
        </div>
      )}

      {/* Already in a squad */}
      {squad && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20 }}>{squad.name}</div>
            <button onClick={handleLeave} style={btn('danger')}>
              {squad.creatorId === userId ? 'Disband' : 'Leave'}
            </button>
          </div>

          {/* Members */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {squad.members.map((m) => (
              <span key={m.userId} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px solid var(--line-2)', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--cream)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--lime)', display: 'inline-block' }} />
                @{m.username}
                {m.userId === userId && <span style={{ color: 'var(--dim)' }}> · you</span>}
              </span>
            ))}
            {squad.invites.filter((i) => i.status === 'pending').map((i) => (
              <span key={i.userId} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px dashed var(--line-2)', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)' }}>
                pending invite
              </span>
            ))}
          </div>

          {/* Invite */}
          <form onSubmit={handleInvite} style={{ display: 'flex', gap: 8 }}>
            <input
              style={inputSt}
              placeholder="@username to invite"
              value={inviteHandle}
              onChange={(e) => setInviteHandle(e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
            />
            <button type="submit" disabled={inviting || !inviteHandle.trim()} style={{ ...btn('primary'), opacity: inviting || !inviteHandle.trim() ? 0.5 : 1 }}>
              {inviting ? '…' : 'Invite'}
            </button>
          </form>
        </>
      )}

      {/* No squad yet */}
      {!squad && !pendingInvite && (
        <div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 14, color: 'var(--cream)', marginBottom: 16, lineHeight: 1.5 }}>
            Coming with friends? Create a squad so the host knows who you're rolling with.
          </div>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8 }}>
            <input
              style={inputSt}
              placeholder="Squad name (optional)"
              value={squadName}
              onChange={(e) => setSquadName(e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
            />
            <button type="submit" disabled={creating} style={{ ...btn('primary'), opacity: creating ? 0.6 : 1 }}>
              {creating ? '…' : 'Create'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const { id }     = useParams<{ id: string }>();
  const router     = useRouter();
  const { user }   = useAuth();

  const [event, setEvent]           = useState<Event | null>(null);
  const [loading, setLoading]       = useState(true);
  const [regLoading, setRegLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError]           = useState('');
  const [requestMsg, setRequestMsg] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    api.get(`/events/${id}`)
      .then(({ data }) => setEvent(data.data.event))
      .catch(() => setEvent(null))
      .finally(() => setLoading(false));
  }, [id]);

  const refreshEvent = () =>
    api.get(`/events/${id}`).then(({ data }) => setEvent(data.data.event)).catch(() => {});

  const host         = event ? (typeof event.hostId === 'object' ? event.hostId as import('@/types').User : null) : null;
  const isOwnEvent   = host?._id === user?._id;
  const isFull       = event ? event.bookedCount >= event.capacity : false;
  const spotsLeft    = event ? event.capacity - event.bookedCount : 0;
  const filled       = event ? Math.min(100, (event.bookedCount / event.capacity) * 100) : 0;

  const userRequest  = event?.userRequest as JoinRequest | null;
  const userBooking  = event?.userBooking;

  const isPending    = userRequest?.status === 'requested';
  const isApproved   = userRequest?.status === 'approved' || (userBooking && ['confirmed', 'checked_in'].includes(userBooking.status));
  const isRejected   = userRequest?.status === 'rejected';
  const isRegistered = !!(isPending || isApproved);

  // Social gate: check if user has required socials
  const missingSocials = (event?.requiresSocials && (event?.requiredSocials?.length ?? 0) > 0)
    ? (event.requiredSocials ?? []).filter((s) => !user?.connectedSocials?.[s as keyof typeof user.connectedSocials])
    : [];
  const socialGated = missingSocials.length > 0;

  const handleRegister = async () => {
    setError(''); setRegLoading(true);
    try {
      await api.post('/requests', { eventId: id, message: requestMsg || undefined });
      setConfirmOpen(false);
      await refreshEvent();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Registration failed');
    } finally { setRegLoading(false); }
  };

  const handleSave = async () => {
    if (!event) return;
    setSaveLoading(true);
    try {
      if (event.saved) await api.delete(`/events/${id}/save`);
      else await api.post(`/events/${id}/save`);
      setEvent({ ...event, saved: !event.saved });
    } catch { /* ignore */ }
    finally { setSaveLoading(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '96px 0' }}>
      <Spinner />
    </div>
  );

  if (!event) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 28 }}>Event not found.</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--dim)', letterSpacing: '.08em', marginTop: 8 }}>THE LINK MIGHT BE EXPIRED, OR THE HOST PULLED IT</div>
      <button onClick={() => router.back()} style={{ marginTop: 22, background: 'transparent', color: 'var(--paper)', border: '1px solid var(--line-2)', padding: '12px 18px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.08em', cursor: 'pointer' }}>← Back to feed</button>
    </div>
  );

  const imageUrl = event.images?.[0] ? getImageUrl(event.images[0]) : null;
  const catColors: Record<string, string> = { house_party: '#C9F36E', warehouse: '#FF3D6E', club: '#FF3D6E', college: '#E8C46E', private: '#E8C46E', concert: '#E8C46E', other: '#E8E1D2' };
  const artColor = catColors[event.category] ?? '#E8E1D2';

  const SOCIAL_LABELS: Record<string, string> = { instagram: 'Instagram', twitter: 'Twitter/X', snapchat: 'Snapchat', facebook: 'Facebook', linkedin: 'LinkedIn' };

  return (
    <div>
      <Link href="/events" style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', color: 'var(--dim)', textTransform: 'uppercase', display: 'inline-block', marginBottom: 22 }}>
        ← Tonight&apos;s feed
      </Link>

      {/* Hero */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 28, marginBottom: 40 }}>
        <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', aspectRatio: '5/3', background: imageUrl ? 'var(--line)' : artColor, display: 'flex', alignItems: 'flex-end', padding: 28 }}>
          {imageUrl && <img src={imageUrl} alt={event.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
          {!imageUrl && (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
              {Array.from({ length: 20 }).map((_, i) => <line key={i} x1={i * 6} y1="0" x2={i * 6 - 30} y2="100" stroke="rgba(11,9,7,0.16)" strokeWidth="0.5" />)}
            </svg>
          )}
          {imageUrl && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }} />}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: imageUrl ? 'rgba(255,255,255,0.7)' : 'rgba(11,9,7,0.6)', marginBottom: 12 }}>{categoryLabel(event.category).toUpperCase()}</div>
            <h1 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 'clamp(36px,5vw,64px)', lineHeight: 0.95, letterSpacing: '-0.035em', color: imageUrl ? 'var(--paper)' : 'var(--ink)', margin: 0 }}>{event.title}</h1>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 20, border: '1px solid var(--line-2)', borderRadius: 16 }}>
          {host && (
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)', marginBottom: 8 }}>HOSTED BY</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: artColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{host.name?.[0]?.toUpperCase()}</div>
                <div>
                  <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 16 }}>{host.name}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '.08em' }}>@{host.username}</div>
                </div>
              </div>
            </div>
          )}

          {/* Social requirement badge */}
          {event.requiresSocials && (event.requiredSocials?.length ?? 0) > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: 'rgba(201,243,110,0.06)', border: '1px solid rgba(201,243,110,0.2)', borderRadius: 10 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>🔗</span>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', color: 'var(--lime)', textTransform: 'uppercase', marginBottom: 4 }}>SOCIAL REQUIRED</div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 13, color: 'var(--cream)' }}>
                  {event.requiredSocials?.map((s) => SOCIAL_LABELS[s] ?? s).join(' + ')} required to register
                </div>
              </div>
            </div>
          )}

          {event.vibeTags?.length > 0 && (
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)', marginBottom: 8 }}>VIBES</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {event.vibeTags.map((v) => (
                  <span key={v} style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', color: 'var(--cream)', padding: '5px 10px', border: '1px solid var(--line-2)', borderRadius: 999 }}>{v}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 40, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)', marginBottom: 14 }}>ABOUT</div>
            <p style={{ fontFamily: 'var(--display)', fontSize: 17, lineHeight: 1.5, color: 'var(--paper)', margin: 0 }}>{event.description}</p>
          </div>

          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)', marginBottom: 14 }}>THE DETAILS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { label: 'WHEN', big: `${formatTime(event.startTime)} → ${formatTime(event.endTime)}`, sub: formatDate(event.date) },
                { label: 'WHERE', big: event.locationName, sub: event.exactAddressHiddenBeforeBooking ? 'Address after acceptance' : event.address },
                { label: 'CAPACITY', big: `${event.capacity} heads`, sub: `${event.bookedCount} on the list · ${spotsLeft} left` },
                ...(event.musicTags?.length ? [{ label: 'MUSIC', big: event.musicTags.join(' / '), sub: '' }] : []),
              ].map(({ label, big, sub }) => (
                <div key={label} style={{ padding: 16, background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 12 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--dim)' }}>{label}</div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 600, marginTop: 6, lineHeight: 1.2 }}>{big}</div>
                  {sub && <div style={{ fontSize: 13, color: 'var(--cream)', marginTop: 4 }}>{sub}</div>}
                </div>
              ))}
            </div>
          </div>

          {event.rules && (
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)', marginBottom: 14 }}>HOUSE RULES</div>
              <p style={{ fontFamily: 'var(--display)', fontSize: 15, lineHeight: 1.5, color: 'var(--cream)', margin: 0 }}>{event.rules}</p>
            </div>
          )}

          {/* Squad section — shown once registered */}
          {isRegistered && !isOwnEvent && user && (
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)', marginBottom: 4 }}>SQUADS</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 13, color: 'var(--cream)', marginBottom: 0 }}>
                Group up with friends — the host will see your squad on their guest list.
              </div>
              <SquadSection eventId={id} userId={user._id} />
            </div>
          )}
        </div>

        {/* Registration sidebar */}
        <aside style={{ position: 'sticky', top: 36, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Capacity bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--cream)' }}>{event.bookedCount} / {event.capacity} ON THE LIST</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: spotsLeft < 10 ? 'var(--hot)' : 'var(--cream)' }}>{spotsLeft} LEFT</span>
              </div>
              <div style={{ height: 4, background: 'var(--line)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${filled}%`, background: filled > 85 ? 'var(--hot)' : 'var(--lime)', transition: 'width .4s ease' }} />
              </div>
            </div>

            {/* CTA */}
            {event.status === 'cancelled' ? (
              <div style={{ background: 'rgba(255,61,110,0.1)', border: '1px solid rgba(255,61,110,0.3)', borderRadius: 12, padding: '14px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--hot)', letterSpacing: '.08em' }}>EVENT CANCELLED</div>
            ) : isOwnEvent ? (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--lime)', letterSpacing: '.1em', textAlign: 'center', padding: 14, border: '1px dashed var(--lime)', borderRadius: 10 }}>★ YOU&apos;RE HOSTING THIS</div>
            ) : isApproved ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--lime)', color: 'var(--ink)', padding: 16, borderRadius: 12, fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, letterSpacing: '.08em' }}>
                  <svg width="20" height="20" viewBox="0 0 20 20"><path d="M4 10 L8 14 L16 6" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  You&apos;re on the list
                </div>
                <button onClick={() => router.push('/passes')} style={{ width: '100%', background: 'transparent', color: 'var(--paper)', border: '1px solid var(--line-2)', padding: '12px', borderRadius: 10, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                  View QR pass →
                </button>
              </>
            ) : isPending ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(201,243,110,0.06)', border: '1px solid rgba(201,243,110,0.25)', color: 'var(--lime)', padding: 16, borderRadius: 12, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.1em' }}>
                  ⏳ AWAITING HOST ACCEPTANCE
                </div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 13, color: 'var(--dim)', textAlign: 'center', lineHeight: 1.4 }}>
                  You&apos;ll get notified when the host responds.
                </div>
              </div>
            ) : isRejected ? (
              <div style={{ background: 'rgba(255,61,110,0.08)', border: '1px solid rgba(255,61,110,0.25)', borderRadius: 12, padding: '14px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--hot)', letterSpacing: '.08em' }}>
                REGISTRATION DECLINED
                {userRequest?.rejectionReason && <div style={{ fontFamily: 'var(--display)', fontSize: 13, marginTop: 6, color: 'var(--cream)', letterSpacing: 0 }}>{userRequest.rejectionReason}</div>}
              </div>
            ) : socialGated ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: 'rgba(255,61,110,0.08)', border: '1px solid rgba(255,61,110,0.25)', borderRadius: 12, padding: '14px' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--hot)', letterSpacing: '.1em', marginBottom: 6 }}>SOCIAL ACCOUNT REQUIRED</div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 13, color: 'var(--cream)', lineHeight: 1.4 }}>
                    This event requires a connected {missingSocials.map((s) => SOCIAL_LABELS[s] ?? s).join(' and ')} account to register.
                  </div>
                </div>
                <button onClick={() => router.push('/profile')} style={{ width: '100%', background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '14px', borderRadius: 10, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                  Connect socials in profile →
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setError(''); setConfirmOpen(true); }}
                disabled={isFull || event.status !== 'published'}
                style={{ width: '100%', background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '16px', borderRadius: 10, fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, letterSpacing: '.08em', textTransform: 'uppercase', cursor: (isFull || event.status !== 'published') ? 'not-allowed' : 'pointer', opacity: (isFull || event.status !== 'published') ? 0.45 : 1 }}
              >
                {isFull ? 'SOLD OUT' : 'Request to Register →'}
              </button>
            )}

            <button onClick={handleSave} disabled={saveLoading} style={{ background: 'transparent', border: `1px solid ${event.saved ? 'var(--lime)' : 'var(--line)'}`, color: event.saved ? 'var(--lime)' : 'var(--cream)', padding: 12, borderRadius: 10, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', cursor: 'pointer', transition: 'all .15s ease' }}>
              {event.saved ? '★ Saved' : '☆ Save for later'}
            </button>

            {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--hot)', letterSpacing: '.08em', textAlign: 'center', lineHeight: 1.5 }}>{error}</div>}
          </div>

          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.12em', textAlign: 'center' }}>
            ※ HOST REVIEWS AND ACCEPTS REGISTRATIONS MANUALLY
          </div>
        </aside>
      </div>

      {/* Confirm registration modal */}
      {confirmOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', padding: 20 }} onClick={() => setConfirmOpen(false)}>
          <div style={{ background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 18, width: '100%', maxWidth: 400, boxShadow: '0 40px 80px -20px rgba(0,0,0,0.7)', animation: 'riseIn .25s cubic-bezier(.4,1.4,.5,1) both' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20 }}>Request a spot</div>
              <button onClick={() => setConfirmOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--dim)', fontSize: 28, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '.1em' }}>{categoryLabel(event.category).toUpperCase()}</div>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22 }}>{event.title}</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 14, color: 'var(--cream)' }}>{event.locationName} · {formatTime(event.startTime)}</div>

              {/* User's connected socials preview */}
              {event.requiresSocials && event.requiredSocials && event.requiredSocials.length > 0 && (
                <div style={{ padding: 12, background: 'rgba(201,243,110,0.06)', border: '1px solid rgba(201,243,110,0.2)', borderRadius: 10 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', color: 'var(--lime)', marginBottom: 8 }}>SOCIALS SHARED WITH HOST</div>
                  {event.requiredSocials.map((s) => (
                    <div key={s} style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--cream)', marginBottom: 4 }}>
                      {SOCIAL_LABELS[s] ?? s}: @{user?.connectedSocials?.[s as keyof typeof user.connectedSocials] ?? '—'}
                    </div>
                  ))}
                </div>
              )}

              <textarea
                value={requestMsg}
                onChange={(e) => setRequestMsg(e.target.value)}
                placeholder="Message to host (optional) — tell them why you want in"
                rows={3}
                style={{ width: '100%', background: '#0B0907', border: '1px solid var(--line-2)', color: 'var(--paper)', padding: '12px 16px', borderRadius: 12, fontFamily: 'var(--display)', fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box' }}
              />

              {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--hot)' }}>{error}</div>}

              <button onClick={handleRegister} disabled={regLoading} style={{ background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '16px', borderRadius: 10, fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, letterSpacing: '.08em', textTransform: 'uppercase', cursor: regLoading ? 'not-allowed' : 'pointer', opacity: regLoading ? 0.7 : 1 }}>
                {regLoading ? 'Sending…' : 'Send Request →'}
              </button>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.08em', textAlign: 'center' }}>HOST REVIEWS AND ACCEPTS YOUR REQUEST</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
