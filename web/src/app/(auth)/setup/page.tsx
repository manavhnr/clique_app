'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

const ALL_VIBES     = ['chill', 'techno', 'indie', 'rooftop', 'late', 'loud', 'dance', 'food', 'ambient', 'bass', 'desi', 'bollywood'];
const ALL_INTERESTS = ['Techno', 'Hip-Hop', 'EDM', 'House', 'R&B', 'Pop', 'Bollywood', 'Afrobeats', 'Punjabi', 'Latin', 'Jazz', 'K-Pop', 'Reggaeton', 'Dancing', 'Live Music', 'House Parties', 'Clubbing', 'Art Nights', 'Rooftop Bars', 'Warehouse Raves'];
const VIBE_LOWER    = new Set(ALL_VIBES.map(v => v.toLowerCase()));
const SCENE         = [...ALL_VIBES, ...ALL_INTERESTS.filter(i => !VIBE_LOWER.has(i.toLowerCase()))];
const CITIES        = ['Chennai', 'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Kolkata', 'Pune', 'Goa', 'Jaipur', 'Ahmedabad', 'Chandigarh', 'Kochi', 'Indore', 'Lucknow', 'Coimbatore', 'Surat', 'Nagpur', 'Vizag', 'Bhopal', 'Vadodara'];
const GENDERS       = [['Male', 'male'], ['Female', 'female'], ['Prefer not to say', 'prefer_not_to_say']] as [string, string][];

function AuthShell({ children, step }: { children: React.ReactNode; step?: number }) {
  const steps = ['PHONE', 'VERIFY', 'PROFILE'];
  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px 72px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', background: 'var(--ink)' }}>
      <Link href="/" style={{ position: 'absolute', top: 24, left: 24, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--dim)' }}>
        ← Back
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', margin: '40px 0 32px' }}>
        <span style={{ width: 9, height: 9, background: 'var(--lime)', borderRadius: '50%', marginRight: 10, boxShadow: '0 0 18px var(--lime)', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
        <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.04em' }}>CLIQUE</span>
      </div>
      <div style={{ width: '100%', maxWidth: 520, animation: 'riseIn .35s ease-out both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26 }}>
          <span className="clique-label" style={{ whiteSpace: 'nowrap' }}>FORM № 01</span>
          <span aria-hidden style={{ height: 1, flex: 1, background: 'var(--line-2)' }} />
          {step && (
            <span style={{ display: 'inline-flex', gap: 14 }}>
              {steps.map((s, i) => {
                const active = i + 1 === step;
                const done   = i + 1 < step;
                return (
                  <span key={s} style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: active ? 'var(--lime)' : done ? 'var(--cream)' : 'var(--dim)' }}>
                    {String(i + 1).padStart(2, '0')} {s}
                  </span>
                );
              })}
            </span>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return <div style={{ width: 14, height: 14, border: '2px solid var(--line-2)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />;
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} style={{ background: on ? 'var(--lime)' : 'transparent', color: on ? 'var(--ink)' : 'var(--cream)', border: `1px solid ${on ? 'var(--lime)' : 'var(--line-2)'}`, padding: '8px 14px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all .15s ease' }}>
      {children}
    </button>
  );
}

export default function SetupPage() {
  const router = useRouter();
  const { user, updateUser, token } = useAuth();
  const [name, setName]           = useState(user?.name ?? '');
  const [username, setUsername]   = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [bio, setBio]             = useState('');
  const [city, setCity]           = useState('');
  const [dob, setDob]             = useState('');
  const [gender, setGender]       = useState('');
  const [scene, setScene]         = useState<string[]>([]);
  const [instagram, setInstagram] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => { if (!token) router.replace('/login'); }, [token, router]);

  function toggle(tag: string, list: string[], setList: (l: string[]) => void, max?: number) {
    if (list.includes(tag)) { setList(list.filter((t) => t !== tag)); return; }
    if (max && list.length >= max) return;
    setList([...list, tag]);
  }

  function handleUsernameChange(val: string) {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleaned);
    setUsernameError('');
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    if (!cleaned) return;
    usernameTimer.current = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const { data } = await api.get(`/users/check-username?username=${encodeURIComponent(cleaned)}`);
        if (!data.data.available) setUsernameError('Username already taken.');
      } catch { /* silent */ } finally {
        setCheckingUsername(false);
      }
    }, 500);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim())          { setError('Please enter your name.'); return; }
    if (!username.trim())      { setError('Please enter a username.'); return; }
    if (usernameError)         { setError(usernameError); return; }
    if (!dob)                  { setError('Please enter your date of birth.'); return; }
    if (!gender)               { setError('Please select your gender.'); return; }
    if (!city)                 { setError('Please select your city.'); return; }
    if (!instagram.trim())     { setError('Please connect your Instagram.'); return; }

    setLoading(true);
    try {
      const selectedVibes     = scene.filter(s => VIBE_LOWER.has(s.toLowerCase()));
      const selectedInterests = scene.filter(s => ALL_INTERESTS.some(i => i.toLowerCase() === s.toLowerCase()));

      const { data } = await api.put('/users/profile', {
        name, username, bio, city, dob, gender,
        vibeTags: selectedVibes,
        interests: selectedInterests,
        hasCompletedSetup: true,
        connectedSocials: { instagram: instagram.trim().replace(/^@/, '') },
      });
      updateUser(data.data.user);
      router.push('/home');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8 };
  const labelStyle: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' };

  return (
    <AuthShell step={3}>
      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 42, lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: 12 }}>
        Set up your{' '}
        <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: 400, color: 'var(--lime)' }}>face.</span>
      </div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 16, color: 'var(--cream)', lineHeight: 1.4, marginBottom: 32 }}>
        Hosts see this. Other guests see this. Keep it real.
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <label style={fieldStyle}>
            <span style={labelStyle}>01 — NAME</span>
            <input className="clique-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoFocus required />
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle}>02 — USERNAME</span>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--mono)', color: 'var(--dim)' }}>@</span>
              <input
                className={`clique-input${usernameError ? ' input-error' : ''}`}
                style={{ paddingLeft: 32, paddingRight: 40 }}
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="username"
              />
              {checkingUsername && (
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, border: '2px solid var(--line-2)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              )}
            </div>
            {usernameError && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--hot)', letterSpacing: '.04em' }}>{usernameError}</span>}
          </label>
        </div>

        <label style={fieldStyle}>
          <span style={labelStyle}>03 — BIO</span>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="One line, make it count" rows={2} maxLength={140}
            className="clique-input"
            style={{ resize: 'vertical', minHeight: 70, lineHeight: 1.4 }}
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <label style={fieldStyle}>
            <span style={labelStyle}>04 — CITY</span>
            <select value={city} onChange={(e) => setCity(e.target.value)} className="clique-input" style={{ cursor: 'pointer', appearance: 'none', paddingRight: 36 }}>
              <option value="">Select city</option>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle}>05 — DATE OF BIRTH</span>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="clique-input" />
          </label>
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>06 — GENDER</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {GENDERS.map(([label, value]) => (
              <Pill key={value} on={gender === value} onClick={() => setGender(value)}>{label}</Pill>
            ))}
          </div>
        </div>

        <div style={fieldStyle}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={labelStyle}>07 — WHAT&apos;S YOUR SCENE?</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.08em', color: scene.length >= 5 ? 'var(--lime)' : 'var(--dim)' }}>{scene.length}/5</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SCENE.map((v) => (
              <Pill key={v} on={scene.includes(v)} onClick={() => toggle(v, scene, setScene, 5)}>
                {v}
              </Pill>
            ))}
          </div>
        </div>

        <label style={fieldStyle}>
          <span style={labelStyle}>08 — INSTAGRAM</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <defs>
                <linearGradient id="ig-setup" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#FEDA75" />
                  <stop offset="25%"  stopColor="#FA7E1E" />
                  <stop offset="50%"  stopColor="#D62976" />
                  <stop offset="75%"  stopColor="#962FBF" />
                  <stop offset="100%" stopColor="#4F5BD5" />
                </linearGradient>
              </defs>
              <path fill="url(#ig-setup)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--dim)', textTransform: 'uppercase' }}>Required — hosts can view your handle</span>
          </div>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--mono)', color: 'var(--dim)' }}>@</span>
            <input
              className="clique-input"
              style={{ paddingLeft: 36 }}
              value={instagram}
              onChange={(e) => setInstagram(e.target.value.replace(/^@/, ''))}
              placeholder="yourhandle"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
        </label>

        {error &&<div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--hot)' }}>{error}</div>}

        <button type="submit" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '16px 22px', borderRadius: 3, fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 8 }}>
          {loading && <Spinner />}
          {loading ? 'Building you…' : 'Open the door →'}
        </button>
      </form>
    </AuthShell>
  );
}
