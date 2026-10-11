'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, Plus } from 'lucide-react';
import api from '@/lib/api';

const CATEGORIES = [
  { value: 'house_party', label: 'House Party' },
  { value: 'club',        label: 'Club Night' },
  { value: 'college',     label: 'College Party' },
  { value: 'private',     label: 'Invite Only' },
  { value: 'secret',      label: 'Secret' },
  { value: 'concert',     label: 'Concert' },
  { value: 'other',       label: 'Other' },
];

const VIBE_TAGS  = ['chill', 'techno', 'indie', 'rooftop', 'late', 'loud', 'dance', 'food', 'ambient', 'bass', 'desi', 'bollywood'];
const MUSIC_TAGS = ['Live DJ', 'Live Band', 'Playlist', 'Open Mic', 'Acoustic'];

type TicketType = { id: string; label: string; price: string; description: string; capacity: string };
type VerifiedHost = { _id: string; name: string; username: string };

function uid() { return Math.random().toString(36).slice(2, 9); }

function Spinner() {
  return <div style={{ width: 14, height: 14, border: '2px solid var(--ink)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />;
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{
      background: on ? 'var(--lime)' : 'transparent',
      color: on ? 'var(--ink)' : 'var(--cream)',
      border: `1px solid ${on ? 'var(--lime)' : 'var(--line-2)'}`,
      padding: '9px 14px', borderRadius: 999,
      fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase',
      cursor: 'pointer', transition: 'all .15s ease',
    }}>
      {children}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0B0907', border: '1px solid var(--line-2)',
  color: 'var(--paper)', padding: '14px 16px', borderRadius: 3,
  fontFamily: 'var(--display)', fontSize: 16, outline: 'none',
  transition: 'border-color .15s ease', boxSizing: 'border-box',
};

const smallInput: React.CSSProperties = { ...inputStyle, padding: '10px 12px', fontSize: 14 };

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em',
  color: 'var(--dim)', textTransform: 'uppercase',
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={labelStyle}>{label}</span>
        {hint && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.06em' }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function TicketTypeBuilder({
  tickets, onAdd, onRemove, onUpdate,
}: {
  tickets: TicketType[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof TicketType, val: string) => void;
}) {
  return (
    <Field label="TICKETS">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tickets.map((t, idx) => (
          <div key={t.id} style={{ background: '#0E0C09', border: '1px solid var(--line-2)', borderRadius: 6, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.1em' }}>{String(idx + 1).padStart(2, '0')}</span>
              <input value={t.label} onChange={(e) => onUpdate(t.id, 'label', e.target.value)}
                placeholder="e.g. General, VIP, Couple"
                style={{ ...smallInput, flex: 1 }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
              />
              {tickets.length > 1 && (
                <button type="button" onClick={() => onRemove(t.id)} style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,61,110,0.12)', border: '1px solid rgba(255,61,110,0.25)', color: 'var(--hot)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <X size={11} />
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ ...labelStyle, fontSize: 9, marginBottom: 5 }}>PRICE (₹)</div>
                <input type="number" min="0" value={t.price} onChange={(e) => onUpdate(t.id, 'price', e.target.value)}
                  placeholder="0" style={smallInput}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                />
              </div>
              <div>
                <div style={{ ...labelStyle, fontSize: 9, marginBottom: 5 }}>SPOTS (OPTIONAL)</div>
                <input type="number" min="1" value={t.capacity} onChange={(e) => onUpdate(t.id, 'capacity', e.target.value)}
                  placeholder="∞" style={smallInput}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                />
              </div>
            </div>
            <input value={t.description} onChange={(e) => onUpdate(t.id, 'description', e.target.value)}
              placeholder="Description (optional)"
              style={smallInput}
              onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
            />
          </div>
        ))}
        <button type="button" onClick={onAdd} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: '1px dashed var(--line-2)', color: 'var(--cream)', padding: '10px 16px', borderRadius: 6, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
          <Plus size={12} /> Add ticket type
        </button>
      </div>
    </Field>
  );
}

export default function AdminCreateEventPage() {
  const router = useRouter();

  const [hostSearch, setHostSearch]   = useState('');
  const [hostResults, setHostResults] = useState<VerifiedHost[]>([]);
  const [selectedHost, setSelectedHost] = useState<VerifiedHost | null>(null);
  const [hostSearching, setHostSearching] = useState(false);

  const [images, setImages]               = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [ticketTypes, setTicketTypes]     = useState<TicketType[]>([
    { id: uid(), label: 'General', price: '0', description: '', capacity: '' },
  ]);

  const [form, setForm] = useState({
    title: '', description: '', category: 'house_party',
    date: '', startTime: '', endTime: '',
    locationName: '', address: '', locationLink: '',
    capacity: '100',
    privacy: 'public', approvalRequired: false,
    ageLimit: '', refundPolicy: '', rules: '',
    exactAddressHiddenBeforeBooking: false,
    status: 'published',
    vibeTags: [] as string[], musicTags: [] as string[],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState(false);

  const set = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));
  const toggleTag = (field: 'vibeTags' | 'musicTags', tag: string) => {
    const current = form[field];
    set(field, current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]);
  };

  const searchHosts = useCallback(async (q: string) => {
    if (!q.trim()) { setHostResults([]); return; }
    setHostSearching(true);
    try {
      const { data } = await api.get(`/admin/hosts/verified?q=${encodeURIComponent(q)}&limit=8`);
      setHostResults(data.data?.hosts ?? []);
    } catch {
      setHostResults([]);
    } finally {
      setHostSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchHosts(hostSearch), 300);
    return () => clearTimeout(t);
  }, [hostSearch, searchHosts]);

  const handleImages = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, 5 - images.length);
    setImages((prev) => [...prev, ...newFiles].slice(0, 5));
    newFiles.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) => setImagePreviews((prev) => [...prev, e.target?.result as string].slice(0, 5));
      reader.readAsDataURL(f);
    });
  };

  const removeImage = (i: number) => {
    setImages(images.filter((_, idx) => idx !== i));
    setImagePreviews(imagePreviews.filter((_, idx) => idx !== i));
  };

  const addTicket    = () => setTicketTypes((t) => [...t, { id: uid(), label: '', price: '0', description: '', capacity: '' }]);
  const removeTicket = (id: string) => setTicketTypes((t) => t.filter((x) => x.id !== id));
  const updateTicket = (id: string, field: keyof TicketType, val: string) =>
    setTicketTypes((t) => t.map((x) => x.id === id ? { ...x, [field]: val } : x));

  const handleSubmit = async (publish: boolean) => {
    if (!selectedHost) { setError('Please select a host'); return; }
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('hostId', selectedHost._id);
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'date') {
          const d = new Date(v as string);
          fd.append(k, isNaN(d.getTime()) ? '' : d.toISOString());
        } else if (Array.isArray(v)) {
          v.forEach((item) => fd.append(k, item));
        } else {
          fd.append(k, String(v));
        }
      });
      const basePrice = ticketTypes[0]?.price ?? '0';
      fd.set('price', basePrice);
      fd.append('pricingData', JSON.stringify({
        mode: 'common', tiers: [], groups: [],
        ticketTypes: ticketTypes.map((t) => ({
          label: t.label, price: Number(t.price) || 0,
          description: t.description || undefined,
          capacity: t.capacity ? Number(t.capacity) : undefined,
        })),
      }));
      if (publish) fd.set('status', 'published');
      images.forEach((img) => fd.append('images', img));

      const { data } = await api.post('/admin/events', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setDone(true);
      setTimeout(() => router.push(`/admin/events/${data.data.event._id}`), 1500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; errors?: { field: string; message: string }[] } } };
      const fieldErrors = e.response?.data?.errors;
      setError(fieldErrors?.length
        ? fieldErrors.map((fe) => `${fe.field}: ${fe.message}`).join(' · ')
        : (e.response?.data?.message ?? 'Failed to create event'));
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div style={{ padding: '80px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span className="stamp" style={{ color: 'var(--lime)', fontSize: 18, padding: '14px 20px 12px', animation: 'stickIn .5s cubic-bezier(.5, 1.6, .4, 1) both' }}>
        ✓ EVENT CREATED
      </span>
      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 'clamp(40px,5vw,64px)', lineHeight: 0.95, letterSpacing: '-0.03em', marginTop: 28 }}>
        On the board.
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 760 }}>
      <Link href="/admin/events" style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', color: 'var(--dim)', textTransform: 'uppercase', textDecoration: 'none', display: 'inline-block', padding: '8px 0' }}>
        ← Admin / Events
      </Link>

      <div style={{ marginTop: 16, marginBottom: 36, paddingBottom: 24, borderBottom: '1px solid var(--line)' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)', marginBottom: 8 }}>ADMIN / CREATE EVENT</div>
        <h1 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 'clamp(36px,5vw,56px)', lineHeight: 0.95, letterSpacing: '-0.03em', margin: 0 }}>
          New Event.
        </h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Host selector */}
        <Field label="HOST">
          {selectedHost ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'color-mix(in srgb, var(--lime) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--lime) 30%, transparent)', borderRadius: 3, padding: '12px 16px' }}>
              <div>
                <span style={{ fontFamily: 'var(--display)', fontSize: 15, color: 'var(--paper)', fontWeight: 600 }}>{selectedHost.name}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', marginLeft: 10 }}>@{selectedHost.username}</span>
              </div>
              <button type="button" onClick={() => { setSelectedHost(null); setHostSearch(''); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--dim)', cursor: 'pointer', padding: 4, display: 'flex' }}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <input
                value={hostSearch}
                onChange={(e) => setHostSearch(e.target.value)}
                placeholder="Search verified hosts by name or username…"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
              />
              {(hostSearching || hostResults.length > 0) && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1A1613', border: '1px solid var(--line-2)', borderRadius: 3, zIndex: 10, marginTop: 2, overflow: 'hidden' }}>
                  {hostSearching && (
                    <div style={{ padding: '12px 16px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)' }}>Searching…</div>
                  )}
                  {!hostSearching && hostResults.map((h) => (
                    <button key={h._id} type="button"
                      onClick={() => { setSelectedHost(h); setHostSearch(''); setHostResults([]); }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--line-2)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ fontFamily: 'var(--display)', fontSize: 14, color: 'var(--paper)', fontWeight: 600 }}>{h.name}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', marginLeft: 8 }}>@{h.username}</span>
                    </button>
                  ))}
                  {!hostSearching && hostResults.length === 0 && hostSearch.trim() && (
                    <div style={{ padding: '12px 16px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)' }}>No verified hosts found.</div>
                  )}
                </div>
              )}
            </div>
          )}
        </Field>

        <Field label="TITLE">
          <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Sunset on the Roof" style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')} onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')} />
        </Field>

        <Field label="CATEGORY">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CATEGORIES.map(({ value, label }) => (
              <Pill key={value} on={form.category === value} onClick={() => set('category', value)}>{label}</Pill>
            ))}
          </div>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="VENUE">
            <input value={form.locationName} onChange={(e) => set('locationName', e.target.value)} placeholder="The Rooftop · Nungambakkam" style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')} onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')} />
          </Field>
          <Field label="ADDRESS">
            <input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="14 Khader Nawaz Khan Rd" style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')} onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')} />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 14 }}>
          <Field label="DATE">
            <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')} onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')} />
          </Field>
          <Field label="DOORS">
            <input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')} onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')} />
          </Field>
          <Field label="CLOSE">
            <input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')} onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')} />
          </Field>
        </div>

        <Field label="DESCRIPTION">
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
            placeholder="Top floor, low BPM, golden hour…" rows={4}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 100, lineHeight: 1.4 } as React.CSSProperties}
            onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')} onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')} />
        </Field>

        <Field label="VIBES">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {VIBE_TAGS.map((v) => <Pill key={v} on={form.vibeTags.includes(v)} onClick={() => toggleTag('vibeTags', v)}>{v}</Pill>)}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {MUSIC_TAGS.map((v) => <Pill key={v} on={form.musicTags.includes(v)} onClick={() => toggleTag('musicTags', v)}>{v}</Pill>)}
          </div>
        </Field>

        <Field label="TOTAL SPOTS">
          <input type="number" min="1" value={form.capacity} onChange={(e) => set('capacity', e.target.value)} style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')} onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')} />
        </Field>

        <TicketTypeBuilder tickets={ticketTypes} onAdd={addTicket} onRemove={removeTicket} onUpdate={updateTicket} />

        <Field label="PRIVACY">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <Pill on={form.privacy === 'public'}  onClick={() => { set('privacy', 'public'); set('approvalRequired', false); }}>Public</Pill>
            <Pill on={form.privacy === 'private'} onClick={() => { set('privacy', 'private'); set('approvalRequired', true); }}>Invite Only</Pill>
            <Pill on={form.privacy === 'secret'}  onClick={() => { set('privacy', 'secret'); set('approvalRequired', false); }}>Secret</Pill>
          </div>
        </Field>

        <Field label="IMAGES" hint={`${imagePreviews.length}/5`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
            {imagePreviews.map((src, i) => (
              <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: 'var(--line-2)' }}>
                <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button type="button" onClick={() => removeImage(i)}
                  style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={11} />
                </button>
              </div>
            ))}
            {imagePreviews.length < 5 && (
              <label style={{ aspectRatio: '1', borderRadius: 10, border: '2px dashed var(--line-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--dim)', letterSpacing: '.1em' }}>ADD</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display: 'none' }} onChange={(e) => { handleImages(e.target.files); e.target.value = ''; }} />
              </label>
            )}
          </div>
        </Field>

        <Field label="RULES">
          <textarea value={form.rules} onChange={(e) => set('rules', e.target.value)} placeholder="e.g. No outside alcohol, smart casual…" rows={2}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.4 } as React.CSSProperties}
            onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')} onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')} />
        </Field>

        <Field label="TERMS AND CONDITIONS">
          <textarea value={form.refundPolicy} onChange={(e) => set('refundPolicy', e.target.value)} placeholder="e.g. No refunds after 24 hours…" rows={2}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.4 } as React.CSSProperties}
            onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')} onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')} />
        </Field>

        {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--hot)' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingBottom: 48 }}>
          <button type="button" onClick={() => handleSubmit(false)} disabled={loading}
            style={{ background: 'transparent', color: 'var(--paper)', border: '1px solid var(--line-2)', padding: '14px 22px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {loading && <Spinner />} Save draft
          </button>
          <button type="button" onClick={() => handleSubmit(true)} disabled={loading || !form.title || !form.description || !selectedHost}
            style={{ background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '14px 22px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', cursor: (loading || !form.title || !form.description || !selectedHost) ? 'not-allowed' : 'pointer', opacity: (loading || !form.title || !form.description || !selectedHost) ? 0.45 : 1, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {loading && <Spinner />} Publish Event →
          </button>
        </div>
      </div>
    </div>
  );
}
