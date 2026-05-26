'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

const ALL_VIBES     = ['chill', 'techno', 'indie', 'queer', 'rooftop', 'late', 'loud', 'dance', 'food', 'ambient'];
const INTERESTS     = ['Techno', 'Hip-Hop', 'EDM', 'House', 'R&B', 'Pop', 'Afrobeats', 'Latin', 'Jazz', 'Dancing', 'Live Music', 'House Parties', 'Clubbing', 'Art Nights'];
const CITIES        = ['NYC', 'LA', 'SF', 'CHI', 'ATL', 'MIA', 'BER', 'LDN', 'PAR', 'TYO', 'MEX', 'SEA', 'BOS', 'AUS', 'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata'];
const GENDERS       = [['Male', 'male'], ['Female', 'female'], ['Non-binary', 'other'], ['Prefer not to say', 'prefer_not_to_say']] as [string, string][];

function AuthShell({ children, step }: { children: React.ReactNode; step?: number }) {
  const steps = ['PHONE', 'VERIFY', 'PROFILE'];
  return (
    <div style={{ minHeight: '100vh', padding: '60px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', position: 'relative', background: 'var(--ink)' }}>
      <Link href="/" style={{ position: 'absolute', top: 24, left: 24, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--dim)' }}>
        ← Back
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <span style={{ width: 9, height: 9, background: 'var(--lime)', borderRadius: '50%', marginRight: 10, boxShadow: '0 0 18px var(--lime)', display: 'inline-block' }} />
        <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.04em' }}>CLIQUE</span>
      </div>
      {step && (
        <div style={{ display: 'flex', gap: 18, marginBottom: 24 }}>
          {steps.map((s, i) => {
            const active = i + 1 === step;
            const done   = i + 1 < step;
            return (
              <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: active ? 'var(--paper)' : 'var(--dim)' }}>
                <span style={{ padding: '3px 6px', border: `1px solid ${active ? 'var(--lime)' : done ? 'var(--line)' : 'var(--line-2)'}`, borderRadius: 4, background: active ? 'var(--lime)' : done ? 'var(--line)' : 'transparent', color: active ? 'var(--ink)' : done ? 'var(--cream)' : 'var(--dim)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {s}
              </span>
            );
          })}
        </div>
      )}
      <div style={{ width: '100%', maxWidth: 520, background: '#14110E', border: '1px solid var(--line-2)', borderRadius: 18, padding: 36, boxShadow: '0 30px 60px -20px rgba(0,0,0,0.6)', animation: 'riseIn .35s ease-out both' }}>
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
    <button type="button" onClick={onClick} style={{ background: on ? 'var(--lime)' : 'transparent', color: on ? 'var(--ink)' : 'var(--cream)', border: `1px solid ${on ? 'var(--lime)' : 'var(--line-2)'}`, padding: '8px 14px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all .15s ease' }}>
      {children}
    </button>
  );
}

export default function SetupPage() {
  const router = useRouter();
  const { user, updateUser, token } = useAuth();
  const [name, setName]           = useState(user?.name ?? '');
  const [username, setUsername]   = useState(user?.username ?? '');
  const [bio, setBio]             = useState('');
  const [city, setCity]           = useState('');
  const [dob, setDob]             = useState('');
  const [gender, setGender]       = useState('');
  const [vibes, setVibes]         = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [password, setPassword]   = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => { if (!token) router.replace('/login'); }, [token, router]);

  function toggle(tag: string, list: string[], setList: (l: string[]) => void) {
    setList(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim())     { setError('Please enter your name.'); return; }
    if (!username.trim()) { setError('Please enter a username.'); return; }
    if (!dob)             { setError('Please enter your date of birth.'); return; }
    if (!gender)          { setError('Please select your gender.'); return; }
    if (!city)            { setError('Please select your city.'); return; }
    if (!password)        { setError('Please set a password.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPw) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const { data } = await api.put('/users/profile', {
        name, username, bio, city, dob, gender,
        vibeTags: vibes,
        interests,
        hasCompletedSetup: true,
        password,
      });
      updateUser(data.data.user);
      router.push('/events');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#0B0907', border: '1px solid var(--line-2)', color: 'var(--paper)',
    padding: '14px 16px', borderRadius: 12, fontFamily: 'var(--display)', fontSize: 16,
    outline: 'none', transition: 'border-color .15s ease',
  };

  const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8 };
  const labelStyle: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase' };

  return (
    <AuthShell step={3}>
      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 38, lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: 10 }}>
        Set up your{' '}
        <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--lime)' }}>face.</span>
      </div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 16, color: 'var(--cream)', lineHeight: 1.4, marginBottom: 28 }}>
        Hosts see this. Other guests see this. Keep it real.
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <label style={fieldStyle}>
            <span style={labelStyle}>NAME</span>
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoFocus required
              onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
            />
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle}>USERNAME</span>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--mono)', color: 'var(--dim)' }}>@</span>
              <input style={{ ...inputStyle, paddingLeft: 32 }} value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="username" required
                onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
              />
            </div>
          </label>
        </div>

        <label style={fieldStyle}>
          <span style={labelStyle}>BIO</span>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="One line, make it count" rows={2} maxLength={140}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 70, lineHeight: 1.4 }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <label style={fieldStyle}>
            <span style={labelStyle}>CITY</span>
            <select value={city} onChange={(e) => setCity(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', paddingRight: 36 }}>
              <option value="">Select city</option>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle}>DATE OF BIRTH</span>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
            />
          </label>
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>GENDER</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {GENDERS.map(([label, value]) => (
              <Pill key={value} on={gender === value} onClick={() => setGender(value)}>{label}</Pill>
            ))}
          </div>
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>WHAT&apos;S YOUR SCENE?</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ALL_VIBES.map((v) => <Pill key={v} on={vibes.includes(v)} onClick={() => toggle(v, vibes, setVibes)}>{v}</Pill>)}
          </div>
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>INTERESTS</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {INTERESTS.map((i) => <Pill key={i} on={interests.includes(i)} onClick={() => toggle(i, interests, setInterests)}>{i}</Pill>)}
          </div>
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>PASSWORD</span>
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              style={{ ...inputStyle, paddingRight: 50 }}
              autoComplete="new-password"
              onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
            />
            <button type="button" onClick={() => setShowPw((v) => !v)}
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--dim)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.08em' }}>
              {showPw ? 'HIDE' : 'SHOW'}
            </button>
          </div>
          <input
            type={showPw ? 'text' : 'password'}
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="Confirm password"
            style={{ ...inputStyle, borderColor: confirmPw && confirmPw !== password ? 'var(--hot)' : 'var(--line-2)' }}
            autoComplete="new-password"
            onFocus={(e) => (e.target.style.borderColor = confirmPw && confirmPw !== password ? 'var(--hot)' : 'var(--lime)')}
            onBlur={(e) => (e.target.style.borderColor = confirmPw && confirmPw !== password ? 'var(--hot)' : 'var(--line-2)')}
          />
        </div>

        {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--hot)' }}>{error}</div>}

        <button type="submit" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '16px 22px', borderRadius: 999, fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 8 }}>
          {loading && <Spinner />}
          {loading ? 'Building you…' : 'Open the door →'}
        </button>
      </form>
    </AuthShell>
  );
}
