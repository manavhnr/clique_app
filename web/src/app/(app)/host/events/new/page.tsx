'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, Upload, Film, Image as ImageIcon } from 'lucide-react';
import LocationPicker, { PickedLocation } from '@/components/map/LocationPicker';
import api from '@/lib/api';

const CATEGORIES = [
  { value: 'house_party', label: 'House Party', color: '#C9F36E' },
  { value: 'club', label: 'Club Night', color: '#FF3D6E' },
  { value: 'college', label: 'College Party', color: '#E8C46E' },
  { value: 'private', label: 'Private', color: '#E8C46E' },
  { value: 'concert', label: 'Concert', color: '#7DB4FF' },
  { value: 'other', label: 'Other', color: '#E8E1D2' },
];

const VIBE_TAGS = ['chill', 'techno', 'indie', 'rooftop', 'late', 'loud', 'dance', 'food', 'ambient', 'bass', 'desi', 'bollywood'];
const MUSIC_TAGS = ['Live DJ', 'Live Band', 'Playlist', 'Open Mic', 'Acoustic'];

const PREVIEW_COLORS: Record<string, string> = {
  house_party: '#C9F36E',
  warehouse: '#FF3D6E',
  club: '#FF3D6E',
  college: '#E8C46E',
  private: '#E8C46E',
  concert: '#7DB4FF',
  other: '#E8E1D2',
};

function Spinner() {
  return <div style={{ width: 14, height: 14, border: '2px solid var(--ink)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />;
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      style={{ background: on ? 'var(--lime)' : 'transparent', color: on ? 'var(--ink)' : 'var(--cream)', border: `1px solid ${on ? 'var(--lime)' : 'var(--line-2)'}`, padding: '8px 14px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all .15s ease' }}>
      {children}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0B0907', border: '1px solid var(--line-2)', color: 'var(--paper)',
  padding: '14px 16px', borderRadius: 12, fontFamily: 'var(--display)', fontSize: 16,
  outline: 'none', transition: 'border-color .15s ease', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', textTransform: 'uppercase',
};

export default function NewEventPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [images, setImages]               = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videos, setVideos]               = useState<File[]>([]);
  // video preview = object URL so <video> can play inline thumbnail
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);

  const [form, setForm] = useState({
    title: '', description: '', category: 'house_party',
    date: '', startTime: '', endTime: '',
    locationName: '', address: '',
    latitude: 0, longitude: 0,
    price: '0', capacity: '100',
    privacy: 'public', approvalRequired: false,
    ageLimit: '', refundPolicy: '', rules: '',
    exactAddressHiddenBeforeBooking: false,
    status: 'draft',
    vibeTags: [] as string[], musicTags: [] as string[],
  });

  const set = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  const handleLocationPicked = (loc: PickedLocation) => {
    setForm((f) => ({
      ...f,
      latitude: loc.lat, longitude: loc.lng,
      locationName: f.locationName || loc.locationName,
      address: f.address || loc.address,
    }));
  };

  const toggleTag = (field: 'vibeTags' | 'musicTags', tag: string) => {
    const current = form[field];
    set(field, current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]);
  };

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

  const handleVideos = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).filter((f) => f.type.startsWith('video/')).slice(0, 3 - videos.length);
    setVideos((prev) => [...prev, ...newFiles].slice(0, 3));
    newFiles.forEach((f) => {
      const url = URL.createObjectURL(f);
      setVideoPreviews((prev) => [...prev, url].slice(0, 3));
    });
  };

  const removeVideo = (i: number) => {
    URL.revokeObjectURL(videoPreviews[i]);
    setVideos(videos.filter((_, idx) => idx !== i));
    setVideoPreviews(videoPreviews.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (publish = false) => {
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
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
      if (publish) fd.set('status', 'published');
      images.forEach((img) => fd.append('images', img));
      videos.forEach((vid) => fd.append('videos', vid));

      const { data } = await api.post('/events', fd, { headers: { 'Content-Type': 'multipart/form-data' } });

      if (publish && data.data.event?.status !== 'published') {
        await api.patch(`/events/${data.data.event._id}/publish`);
      }

      setDone(true);
      setTimeout(() => router.push(`/host/events/${data.data.event._id}`), 1500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; errors?: { field: string; message: string }[] } } };
      const fieldErrors = e.response?.data?.errors;
      setError(fieldErrors?.length ? fieldErrors.map((fe) => `${fe.field}: ${fe.message}`).join(' · ') : (e.response?.data?.message ?? 'Failed to create event'));
    } finally {
      setLoading(false);
    }
  };

  const previewColor = PREVIEW_COLORS[form.category] ?? '#E8E1D2';

  if (done) return (
    <div style={{ padding: '80px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'var(--lime)', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, fontFamily: 'var(--display)', animation: 'stickIn .5s cubic-bezier(.5, 1.6, .4, 1) both' }}>✓</div>
      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 'clamp(40px,5vw,64px)', lineHeight: 0.95, letterSpacing: '-0.03em', marginTop: 24 }}>You&apos;re live.</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--cream)', letterSpacing: '.08em', marginTop: 12 }}>YOUR EVENT IS UP. WE&apos;LL NOTIFY YOUR FOLLOWERS.</div>
    </div>
  );

  return (
    <div>
      <Link href="/host/dashboard" style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', color: 'var(--dim)', textTransform: 'uppercase', textDecoration: 'none', display: 'inline-block', padding: '8px 0' }}>
        ← Host dashboard
      </Link>

      {/* Page head */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginTop: 16, marginBottom: 36, paddingBottom: 24, borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)', marginBottom: 8 }}>NEW EVENT</div>
          <h1 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 'clamp(40px, 5vw, 64px)', lineHeight: 0.95, letterSpacing: '-0.03em', margin: 0 }}>
            Throw something<br />
            <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--lime)' }}>tonight.</span>
          </h1>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)' }}>STEP {step} OF 2</div>
      </div>

      {/* 2-col layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 40, alignItems: 'start' }}>
        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {step === 1 ? (
            <>
              <Field label="TITLE" hint="short, evocative, no buzzwords">
                <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Sunset on the Roof" autoFocus
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                />
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
                  <input value={form.locationName} onChange={(e) => set('locationName', e.target.value)} placeholder="Building 88 · LES"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                  />
                </Field>
                <Field label="ADDRESS" hint="hidden until they book">
                  <input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="88 Orchard St"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                  />
                </Field>
              </div>

              <Field label="MAP LOCATION">
                <LocationPicker lat={form.latitude} lng={form.longitude} locationName={form.locationName} address={form.address} onChange={handleLocationPicked} />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 14 }}>
                <Field label="DATE">
                  <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                  />
                </Field>
                <Field label="DOORS">
                  <input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                  />
                </Field>
                <Field label="CLOSE">
                  <input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                  />
                </Field>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={() => setStep(2)} disabled={!form.title || !form.locationName}
                  style={{ background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '14px 22px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', cursor: (!form.title || !form.locationName) ? 'not-allowed' : 'pointer', opacity: (!form.title || !form.locationName) ? 0.45 : 1 }}>
                  Continue →
                </button>
              </div>
            </>
          ) : (
            <>
              <Field label="DESCRIPTION" hint="one paragraph. tell them why">
                <textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Top floor, low BPM, golden hour…" rows={5}
                  style={{ ...inputStyle, resize: 'vertical' as const, minHeight: 120, lineHeight: 1.4 }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                />
              </Field>

              <Field label="VIBES" hint="pick a few — helps guests find you">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {VIBE_TAGS.map((v) => (
                    <Pill key={v} on={form.vibeTags.includes(v)} onClick={() => toggleTag('vibeTags', v)}>{v}</Pill>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {MUSIC_TAGS.map((v) => (
                    <Pill key={v} on={form.musicTags.includes(v)} onClick={() => toggleTag('musicTags', v)}>{v}</Pill>
                  ))}
                </div>
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="PRICE (₹)" hint="0 for free">
                  <input type="number" min="0" value={form.price} onChange={(e) => set('price', e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                  />
                </Field>
                <Field label="SPOTS">
                  <input type="number" min="1" value={form.capacity} onChange={(e) => set('capacity', e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                  />
                </Field>
              </div>

              <Field label="PRIVACY">
                <div style={{ display: 'flex', gap: 6 }}>
                  <Pill on={form.privacy === 'public'} onClick={() => set('privacy', 'public')}>Public</Pill>
                  <Pill on={form.privacy === 'private'} onClick={() => set('privacy', 'private')}>Private · approval needed</Pill>
                </div>
              </Field>

              {/* ── IMAGES ── */}
              <Field label="IMAGES" hint={`${imagePreviews.length}/5`}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
                  {imagePreviews.map((src, i) => (
                    <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: 'var(--line-2)' }}>
                      <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button type="button" onClick={() => removeImage(i)} style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                  {imagePreviews.length < 5 && (
                    <label style={{ aspectRatio: '1', borderRadius: 10, border: '2px dashed var(--line-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', transition: 'border-color .15s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--lime)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--line-2)')}
                    >
                      <ImageIcon size={18} color="var(--dim)" />
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--dim)', letterSpacing: '.1em' }}>ADD</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display: 'none' }} onChange={(e) => { handleImages(e.target.files); e.target.value = ''; }} />
                    </label>
                  )}
                </div>
              </Field>

              {/* ── VIDEOS ── */}
              <Field label="VIDEOS" hint={`${videoPreviews.length}/3 · MP4 / MOV / WebM`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {videoPreviews.map((src, i) => (
                    <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#0B0907', border: '1px solid var(--line-2)' }}>
                      <video src={src} style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }} muted playsInline />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px solid var(--line-2)' }}>
                        <Film size={12} color="var(--dim)" />
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {videos[i]?.name}
                        </span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)' }}>
                          {(videos[i]?.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                        <button type="button" onClick={() => removeVideo(i)} style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,61,110,0.15)', border: '1px solid rgba(255,61,110,0.3)', color: 'var(--hot)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {videoPreviews.length < 3 && (
                    <label style={{ borderRadius: 10, border: '2px dashed var(--line-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '18px 20px', cursor: 'pointer', transition: 'border-color .15s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--lime)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--line-2)')}
                    >
                      <Film size={18} color="var(--dim)" />
                      <div>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '.1em', display: 'block' }}>ADD VIDEO</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#555', letterSpacing: '.06em' }}>MP4 · MOV · WEBM · up to 200 MB</span>
                      </div>
                      <input type="file" accept="video/mp4,video/quicktime,video/webm" multiple style={{ display: 'none' }} onChange={(e) => { handleVideos(e.target.files); e.target.value = ''; }} />
                    </label>
                  )}
                </div>
              </Field>

              <Field label="RULES">
                <textarea value={form.rules} onChange={(e) => set('rules', e.target.value)} placeholder="e.g. No outside alcohol, smart casual dress code…" rows={2}
                  style={{ ...inputStyle, resize: 'vertical' as const, lineHeight: 1.4 }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                />
              </Field>

              <Field label="REFUND POLICY">
                <textarea value={form.refundPolicy} onChange={(e) => set('refundPolicy', e.target.value)} placeholder="e.g. No refunds after 24 hours…" rows={2}
                  style={{ ...inputStyle, resize: 'vertical' as const, lineHeight: 1.4 }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                />
              </Field>

              {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--hot)' }}>{error}</div>}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <button type="button" onClick={() => setStep(1)}
                  style={{ background: 'transparent', color: 'var(--paper)', border: '1px solid var(--line-2)', padding: '14px 22px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                  ← Back
                </button>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => handleSubmit(false)} disabled={loading}
                    style={{ background: 'transparent', color: 'var(--paper)', border: '1px solid var(--line-2)', padding: '14px 22px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {loading && <Spinner />}
                    Save draft
                  </button>
                  <button type="button" onClick={() => handleSubmit(true)} disabled={loading || !form.description}
                    style={{ background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: '14px 22px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', cursor: (loading || !form.description) ? 'not-allowed' : 'pointer', opacity: (loading || !form.description) ? 0.45 : 1, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {loading && <Spinner />}
                    Publish &amp; open the list →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Live preview */}
        <div style={{ position: 'sticky', top: 36 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.14em', marginBottom: 12 }}>LIVE PREVIEW</div>
          <div style={{ border: '1px solid var(--line-2)', borderRadius: 14, overflow: 'hidden', background: form.title ? '#14110E' : '#0E0C09', transition: 'background .3s' }}>
            <div style={{ background: previewColor, padding: 18, minHeight: 130, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(11,9,7,0.7)', letterSpacing: '.14em' }}>{form.category.replace('_', ' ').toUpperCase()}</div>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 26, color: 'var(--ink)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                {form.title || 'Your title here'}
              </div>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ fontFamily: 'var(--display)', fontSize: 14, color: 'var(--cream)' }}>
                {form.locationName || 'Where it\'s at'}{form.date ? ` · ${new Date(form.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '.06em', marginTop: 6 }}>
                {form.startTime || '??:??'} → {form.endTime || '??:??'} · {Number(form.price) === 0 ? 'FREE' : `₹${form.price}`} · {form.capacity} spots
              </div>
              {form.vibeTags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 12 }}>
                  {form.vibeTags.map((v) => (
                    <span key={v} style={{ fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 7px', border: '1px solid var(--line-2)', borderRadius: 999, color: 'var(--cream)' }}>{v}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
