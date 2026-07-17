'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, Film, Image as ImageIcon, Plus, MapPin } from 'lucide-react';
import api from '@/lib/api';

const CATEGORIES = [
  { value: 'house_party', label: 'House Party', color: '#C9F36E' },
  { value: 'club',        label: 'Club Night',   color: '#FF3D6E' },
  { value: 'college',     label: 'College Party', color: '#E8C46E' },
  { value: 'private',     label: 'Invite Only',  color: '#E8C46E' },
  { value: 'secret',      label: 'Secret',       color: '#9D7FEA' },
  { value: 'concert',     label: 'Concert',      color: '#7DB4FF' },
  { value: 'other',       label: 'Other',        color: '#E8E1D2' },
];

const VIBE_TAGS  = ['chill', 'techno', 'indie', 'rooftop', 'late', 'loud', 'dance', 'food', 'ambient', 'bass', 'desi', 'bollywood'];
const MUSIC_TAGS = ['Live DJ', 'Live Band', 'Playlist', 'Open Mic', 'Acoustic'];

const PREVIEW_COLORS: Record<string, string> = {
  house_party: '#C9F36E',
  warehouse:   '#FF3D6E',
  club:        '#FF3D6E',
  college:     '#E8C46E',
  private:     '#E8C46E',
  secret:      '#9D7FEA',
  concert:     '#7DB4FF',
  other:       '#E8E1D2',
};

type PricingTier = { id: string; label: string; commonPrice: string; malePrice: string; femalePrice: string; capacity: string };
type GroupPrice  = { id: string; label: string; size: string; price: string };

function uid() { return Math.random().toString(36).slice(2, 9); }

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

function Spinner() {
  return <div style={{ width: 14, height: 14, border: '2px solid var(--ink)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />;
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: on ? 'var(--lime)' : 'transparent',
        color: on ? 'var(--ink)' : 'var(--cream)',
        border: `1px solid ${on ? 'var(--lime)' : 'var(--line-2)'}`,
        padding: '9px 14px', borderRadius: 999,
        fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase',
        cursor: 'pointer', transition: 'all .15s ease',
        WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
      }}
    >
      {children}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0B0907', border: '1px solid var(--line-2)',
  color: 'var(--paper)', padding: '14px 16px', borderRadius: 3,
  fontFamily: 'var(--display)', fontSize: 16, outline: 'none',
  transition: 'border-color .15s ease', boxSizing: 'border-box',
  WebkitAppearance: 'none', appearance: 'none',
};

const smallInput: React.CSSProperties = {
  ...inputStyle, padding: '10px 12px', fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em',
  color: 'var(--dim)', textTransform: 'uppercase',
};

export default function NewEventPage() {
  const router   = useRouter();
  const isMobile = useIsMobile();
  const [step, setStep]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [done, setDone]     = useState(false);

  const [images, setImages]               = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videos, setVideos]               = useState<File[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);

  // Pricing state
  const [pricingMode, setPricingMode] = useState<'common' | 'split'>('common');
  const [tiers, setTiers] = useState<PricingTier[]>([
    { id: uid(), label: 'General', commonPrice: '0', malePrice: '0', femalePrice: '0', capacity: '' },
  ]);
  const [groupPricing, setGroupPricing] = useState<GroupPrice[]>([]);

  const [form, setForm] = useState({
    title: '', description: '', category: 'house_party',
    date: '', startTime: '', endTime: '',
    locationName: '', address: '', locationLink: '',
    capacity: '100',
    privacy: 'public', approvalRequired: false,
    ageLimit: '', refundPolicy: '', rules: '',
    exactAddressHiddenBeforeBooking: false,
    status: 'draft',
    vibeTags: [] as string[], musicTags: [] as string[],
  });

  const set = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  const toggleTag = (field: 'vibeTags' | 'musicTags', tag: string) => {
    const current = form[field];
    set(field, current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]);
  };

  // Tier helpers
  const addTier    = () => setTiers((t) => [...t, { id: uid(), label: '', commonPrice: '0', malePrice: '0', femalePrice: '0', capacity: '' }]);
  const removeTier = (id: string) => setTiers((t) => t.filter((x) => x.id !== id));
  const updateTier = (id: string, field: keyof PricingTier, val: string) =>
    setTiers((t) => t.map((x) => x.id === id ? { ...x, [field]: val } : x));

  // Group helpers
  const addGroup    = () => setGroupPricing((g) => [...g, { id: uid(), label: 'Group of 5', size: '5', price: '0' }]);
  const removeGroup = (id: string) => setGroupPricing((g) => g.filter((x) => x.id !== id));
  const updateGroup = (id: string, field: keyof GroupPrice, val: string) =>
    setGroupPricing((g) => g.map((x) => x.id === id ? { ...x, [field]: val } : x));

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
      setVideoPreviews((prev) => [...prev, URL.createObjectURL(f)].slice(0, 3));
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

      // Pricing — send base price for backend compat + full structure
      const basePrice = pricingMode === 'common'
        ? (tiers[0]?.commonPrice ?? '0')
        : (tiers[0]?.malePrice ?? '0');
      fd.set('price', basePrice);
      fd.append('pricingData', JSON.stringify({ mode: pricingMode, tiers, groups: groupPricing }));

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
      setError(fieldErrors?.length
        ? fieldErrors.map((fe) => `${fe.field}: ${fe.message}`).join(' · ')
        : (e.response?.data?.message ?? 'Failed to create event'));
    } finally {
      setLoading(false);
    }
  };

  const previewColor = PREVIEW_COLORS[form.category] ?? '#E8E1D2';

  if (done) return (
    <div style={{ padding: '80px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span className="stamp" style={{ color: 'var(--lime)', fontSize: 18, padding: '14px 20px 12px', animation: 'stickIn .5s cubic-bezier(.5, 1.6, .4, 1) both' }}>✓ ON THE BOARD</span>
      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 'clamp(40px,5vw,64px)', lineHeight: 0.95, letterSpacing: '-0.03em', marginTop: 28 }}>You&apos;re live.</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--cream)', letterSpacing: '.08em', marginTop: 12 }}>YOUR EVENT IS UP. WE&apos;LL NOTIFY YOUR FOLLOWERS.</div>
    </div>
  );

  return (
    <div style={{ maxWidth: '100%' }}>
      <Link
        href="/host/dashboard"
        style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', color: 'var(--dim)', textTransform: 'uppercase', textDecoration: 'none', display: 'inline-block', padding: '8px 0' }}
      >
        ← Host dashboard
      </Link>

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'flex-end',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 8 : 24,
        marginTop: 16, marginBottom: isMobile ? 24 : 36,
        paddingBottom: isMobile ? 20 : 24, borderBottom: '1px solid var(--line)',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--dim)', marginBottom: 8 }}>NEW EVENT</div>
          <h1 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: isMobile ? 'clamp(36px,10vw,52px)' : 'clamp(40px, 5vw, 64px)', lineHeight: 0.95, letterSpacing: '-0.03em', margin: 0 }}>
            Throw something<br />
            <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--lime)' }}>tonight.</span>
          </h1>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)', alignSelf: 'flex-end' }}>STEP {step} OF 2</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: isMobile ? 0 : 40, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 18 : 22 }}>

          {/* ── STEP 1 ── */}
          {step === 1 ? (
            <>
              <Field label="TITLE" hint="short, evocative, no buzzwords">
                <input
                  value={form.title} onChange={(e) => set('title', e.target.value)}
                  placeholder="e.g. Sunset on the Roof" autoFocus={!isMobile}
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

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 14 }}>
                <Field label="VENUE">
                  <input
                    value={form.locationName} onChange={(e) => set('locationName', e.target.value)}
                    placeholder="The Rooftop · Nungambakkam"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                  />
                </Field>
                <Field label="ADDRESS" hint="hidden until they book">
                  <input
                    value={form.address} onChange={(e) => set('address', e.target.value)}
                    placeholder="14 Khader Nawaz Khan Rd, Chennai"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                  />
                </Field>
              </div>

              <Field label="MAPS LINK" hint="paste Google Maps or Apple Maps URL">
                <div style={{ position: 'relative' }}>
                  <MapPin size={14} color="var(--dim)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    value={form.locationLink} onChange={(e) => set('locationLink', e.target.value)}
                    placeholder="https://maps.google.com/..."
                    style={{ ...inputStyle, paddingLeft: 36 }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                  />
                </div>
                {form.locationLink && (
                  <a
                    href={form.locationLink} target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--lime)', letterSpacing: '.08em', marginTop: 4, display: 'inline-block' }}
                  >
                    ↗ Preview link
                  </a>
                )}
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr 1fr', gap: isMobile ? 12 : 14 }}>
                <Field label="DATE">
                  <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                  />
                </Field>
                <div style={isMobile ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, gridColumn: '1' } : { display: 'contents' }}>
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
              </div>

              {isMobile && form.title && <LivePreview form={form} previewColor={previewColor} tiers={tiers} pricingMode={pricingMode} />}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: isMobile ? 4 : 8 }}>
                <button
                  onClick={() => setStep(2)}
                  disabled={!form.title || !form.locationName}
                  style={{
                    background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)',
                    padding: isMobile ? '16px 28px' : '14px 22px', borderRadius: 3,
                    fontFamily: 'var(--mono)', fontSize: isMobile ? 14 : 13, letterSpacing: '.08em', textTransform: 'uppercase',
                    cursor: (!form.title || !form.locationName) ? 'not-allowed' : 'pointer',
                    opacity: (!form.title || !form.locationName) ? 0.45 : 1,
                    width: isMobile ? '100%' : 'auto', WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Continue →
                </button>
              </div>
            </>
          ) : (

          /* ── STEP 2 ── */
            <>
              <Field label="DESCRIPTION" hint="one paragraph. tell them why">
                <textarea
                  value={form.description} onChange={(e) => set('description', e.target.value)}
                  placeholder="Top floor, low BPM, golden hour…"
                  rows={isMobile ? 4 : 5}
                  style={{ ...inputStyle, resize: 'vertical' as const, minHeight: isMobile ? 100 : 120, lineHeight: 1.4 }}
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

              <Field label="TOTAL SPOTS">
                <input
                  type="number" min="1" inputMode="numeric"
                  value={form.capacity} onChange={(e) => set('capacity', e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                />
              </Field>

              <PricingBuilder
                isMobile={isMobile}
                mode={pricingMode} onModeChange={setPricingMode}
                tiers={tiers} onAddTier={addTier} onRemoveTier={removeTier} onUpdateTier={updateTier}
                groups={groupPricing} onAddGroup={addGroup} onRemoveGroup={removeGroup} onUpdateGroup={updateGroup}
              />

              <Field label="PRIVACY">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <Pill on={form.privacy === 'public'}  onClick={() => set('privacy', 'public')}>Public</Pill>
                  <Pill on={form.privacy === 'private'} onClick={() => set('privacy', 'private')}>Invite Only · approval needed</Pill>
                  <Pill on={form.privacy === 'secret'}  onClick={() => set('privacy', 'secret')}>Secret · hidden from search</Pill>
                </div>
              </Field>

              <Field label="IMAGES" hint={`${imagePreviews.length}/5`}>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '80px' : '100px'}, 1fr))`, gap: isMobile ? 8 : 10 }}>
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
                    <label
                      style={{ aspectRatio: '1', borderRadius: 10, border: '2px dashed var(--line-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', transition: 'border-color .15s ease' }}
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

              <Field label="VIDEOS" hint={`${videoPreviews.length}/3 · MP4 / MOV / WebM`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {videoPreviews.map((src, i) => (
                    <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#0B0907', border: '1px solid var(--line-2)' }}>
                      <video src={src} style={{ width: '100%', maxHeight: isMobile ? 140 : 180, objectFit: 'cover', display: 'block' }} muted playsInline />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px solid var(--line-2)' }}>
                        <Film size={12} color="var(--dim)" />
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{videos[i]?.name}</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)' }}>{(videos[i]?.size / 1024 / 1024).toFixed(1)} MB</span>
                        <button type="button" onClick={() => removeVideo(i)}
                          style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,61,110,0.15)', border: '1px solid rgba(255,61,110,0.3)', color: 'var(--hot)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {videoPreviews.length < 3 && (
                    <label
                      style={{ borderRadius: 10, border: '2px dashed var(--line-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: isMobile ? '16px' : '18px 20px', cursor: 'pointer', transition: 'border-color .15s ease' }}
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
                <textarea value={form.rules} onChange={(e) => set('rules', e.target.value)}
                  placeholder="e.g. No outside alcohol, smart casual dress code…" rows={2}
                  style={{ ...inputStyle, resize: 'vertical' as const, lineHeight: 1.4 }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                />
              </Field>

              <Field label="REFUND POLICY">
                <textarea value={form.refundPolicy} onChange={(e) => set('refundPolicy', e.target.value)}
                  placeholder="e.g. No refunds after 24 hours…" rows={2}
                  style={{ ...inputStyle, resize: 'vertical' as const, lineHeight: 1.4 }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                />
              </Field>

              {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--hot)' }}>{error}</div>}

              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', gap: isMobile ? 10 : 0, marginTop: isMobile ? 4 : 8 }}>
                <button type="button" onClick={() => setStep(1)}
                  style={{ background: 'transparent', color: 'var(--paper)', border: '1px solid var(--line-2)', padding: isMobile ? '15px' : '14px 22px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: isMobile ? 14 : 13, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', order: isMobile ? 3 : 0, WebkitTapHighlightColor: 'transparent' }}>
                  ← Back
                </button>
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10, flex: isMobile ? 1 : 'none' }}>
                  <button type="button" onClick={() => handleSubmit(false)} disabled={loading}
                    style={{ background: 'transparent', color: 'var(--paper)', border: '1px solid var(--line-2)', padding: isMobile ? '15px' : '14px 22px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: isMobile ? 14 : 13, letterSpacing: '.08em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, WebkitTapHighlightColor: 'transparent' }}>
                    {loading && <Spinner />} Save draft
                  </button>
                  <button type="button" onClick={() => handleSubmit(true)} disabled={loading || !form.description}
                    style={{ background: 'var(--lime)', color: 'var(--ink)', border: '1px solid var(--lime)', padding: isMobile ? '16px' : '14px 22px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: isMobile ? 14 : 13, letterSpacing: '.08em', textTransform: 'uppercase', cursor: (loading || !form.description) ? 'not-allowed' : 'pointer', opacity: (loading || !form.description) ? 0.45 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, WebkitTapHighlightColor: 'transparent' }}>
                    {loading && <Spinner />} Publish &amp; open the list →
                  </button>
                </div>
              </div>

              {isMobile && <div style={{ height: 24 }} />}
            </>
          )}
        </div>

        {!isMobile && (
          <div style={{ position: 'sticky', top: 36 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.14em', marginBottom: 12 }}>LIVE PREVIEW</div>
            <LivePreview form={form} previewColor={previewColor} tiers={tiers} pricingMode={pricingMode} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Pricing Builder ─────────────────────────────────────────────────────── */

function PricingBuilder({
  isMobile, mode, onModeChange,
  tiers, onAddTier, onRemoveTier, onUpdateTier,
  groups, onAddGroup, onRemoveGroup, onUpdateGroup,
}: {
  isMobile: boolean;
  mode: 'common' | 'split';
  onModeChange: (m: 'common' | 'split') => void;
  tiers: PricingTier[];
  onAddTier: () => void;
  onRemoveTier: (id: string) => void;
  onUpdateTier: (id: string, field: keyof PricingTier, val: string) => void;
  groups: GroupPrice[];
  onAddGroup: () => void;
  onRemoveGroup: (id: string) => void;
  onUpdateGroup: (id: string, field: keyof GroupPrice, val: string) => void;
}) {
  const card: React.CSSProperties = {
    background: '#0E0C09', border: '1px solid var(--line-2)', borderRadius: 6,
    padding: isMobile ? '14px' : '16px 18px', display: 'flex', flexDirection: 'column', gap: 10,
  };

  const addBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'transparent', border: '1px dashed var(--line-2)',
    color: 'var(--cream)', padding: '10px 16px', borderRadius: 6,
    fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase',
    cursor: 'pointer', transition: 'border-color .15s ease, color .15s ease',
  };

  const removeBtn: React.CSSProperties = {
    width: 26, height: 26, borderRadius: '50%',
    background: 'rgba(255,61,110,0.12)', border: '1px solid rgba(255,61,110,0.25)',
    color: 'var(--hot)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0,
  };

  return (
    <Field label="PRICING">
      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
        <Pill on={mode === 'common'} onClick={() => onModeChange('common')}>Common pricing</Pill>
        <Pill on={mode === 'split'}  onClick={() => onModeChange('split')}>Split M / F</Pill>
      </div>
      {mode === 'split' && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.08em', marginBottom: 4 }}>
          DIFFERENT PRICE FOR GUYS AND GIRLS PER TIER
        </div>
      )}

      {/* Tiers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tiers.map((tier, idx) => (
          <div key={tier.id} style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.1em', whiteSpace: 'nowrap' }}>
                TIER {String(idx + 1).padStart(2, '0')}
              </span>
              <input
                value={tier.label} onChange={(e) => onUpdateTier(tier.id, 'label', e.target.value)}
                placeholder="e.g. Early Bird"
                style={{ ...smallInput, flex: 1 }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
              />
              {tiers.length > 1 && (
                <button type="button" onClick={() => onRemoveTier(tier.id)} style={removeBtn}>
                  <X size={11} />
                </button>
              )}
            </div>

            {mode === 'common' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ ...labelStyle, fontSize: 9, marginBottom: 5 }}>PRICE (₹)</div>
                  <input type="number" min="0" inputMode="numeric"
                    value={tier.commonPrice} onChange={(e) => onUpdateTier(tier.id, 'commonPrice', e.target.value)}
                    placeholder="0" style={smallInput}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                  />
                </div>
                <div>
                  <div style={{ ...labelStyle, fontSize: 9, marginBottom: 5 }}>SPOTS (OPTIONAL)</div>
                  <input type="number" min="1" inputMode="numeric"
                    value={tier.capacity} onChange={(e) => onUpdateTier(tier.id, 'capacity', e.target.value)}
                    placeholder="∞" style={smallInput}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ ...labelStyle, fontSize: 9, marginBottom: 5 }}>GUYS (₹)</div>
                  <input type="number" min="0" inputMode="numeric"
                    value={tier.malePrice} onChange={(e) => onUpdateTier(tier.id, 'malePrice', e.target.value)}
                    placeholder="0" style={smallInput}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                  />
                </div>
                <div>
                  <div style={{ ...labelStyle, fontSize: 9, marginBottom: 5 }}>GIRLS (₹)</div>
                  <input type="number" min="0" inputMode="numeric"
                    value={tier.femalePrice} onChange={(e) => onUpdateTier(tier.id, 'femalePrice', e.target.value)}
                    placeholder="0" style={smallInput}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                  />
                </div>
                <div>
                  <div style={{ ...labelStyle, fontSize: 9, marginBottom: 5 }}>SPOTS</div>
                  <input type="number" min="1" inputMode="numeric"
                    value={tier.capacity} onChange={(e) => onUpdateTier(tier.id, 'capacity', e.target.value)}
                    placeholder="∞" style={smallInput}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        <button type="button" onClick={onAddTier} style={addBtn}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--lime)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--lime)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--line-2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--cream)'; }}
        >
          <Plus size={12} /> Add pricing tier
        </button>
      </div>

      {/* Group pricing */}
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--line-2)' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.12em', marginBottom: 8 }}>GROUP DEALS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {groups.length === 0 && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.06em' }}>
              No group deals yet — e.g. group of 5 at a discount.
            </div>
          )}
          {groups.map((g) => (
            <div key={g.id} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 100px 28px', gap: 8, alignItems: 'center' }}>
              <input
                value={g.label} onChange={(e) => onUpdateGroup(g.id, 'label', e.target.value)}
                placeholder="Group of 5" style={smallInput}
                onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
              />
              <input type="number" min="2" inputMode="numeric"
                value={g.size} onChange={(e) => onUpdateGroup(g.id, 'size', e.target.value)}
                placeholder="5" style={{ ...smallInput, textAlign: 'center' }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
              />
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--dim)', pointerEvents: 'none' }}>₹</span>
                <input type="number" min="0" inputMode="numeric"
                  value={g.price} onChange={(e) => onUpdateGroup(g.id, 'price', e.target.value)}
                  placeholder="0" style={{ ...smallInput, paddingLeft: 24 }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--line-2)')}
                />
              </div>
              <button type="button" onClick={() => onRemoveGroup(g.id)} style={removeBtn}>
                <X size={11} />
              </button>
            </div>
          ))}
          <button type="button" onClick={onAddGroup} style={addBtn}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--lime)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--lime)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--line-2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--cream)'; }}
          >
            <Plus size={12} /> Add group deal
          </button>
        </div>
      </div>
    </Field>
  );
}

/* ── Live preview card ───────────────────────────────────────────────────── */

function LivePreview({ form, previewColor, tiers, pricingMode }: {
  form: { title: string; category: string; locationName: string; locationLink: string; date: string; startTime: string; endTime: string; capacity: string; vibeTags: string[] };
  previewColor: string;
  tiers: PricingTier[];
  pricingMode: 'common' | 'split';
}) {
  const firstTier = tiers[0];
  const priceLabel = firstTier
    ? pricingMode === 'common'
      ? (Number(firstTier.commonPrice) === 0 ? 'FREE' : `₹${firstTier.commonPrice}`)
      : `₹${firstTier.malePrice} / ₹${firstTier.femalePrice}`
    : 'FREE';

  return (
    <div style={{ border: '1px solid var(--line-2)', borderRadius: 6, overflow: 'hidden', background: form.title ? '#14110E' : '#0E0C09', transition: 'background .3s' }}>
      <div style={{ background: previewColor, padding: 18, minHeight: 110, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(11,9,7,0.7)', letterSpacing: '.14em' }}>
          {form.category.replace('_', ' ').toUpperCase()}
        </div>
        <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 24, color: 'var(--ink)', lineHeight: 1, letterSpacing: '-0.02em' }}>
          {form.title || 'Your title here'}
        </div>
      </div>
      <div style={{ padding: 16 }}>
        {form.locationLink ? (
          <a href={form.locationLink} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: 'var(--display)', fontSize: 14, color: 'var(--lime)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={12} />
            {form.locationName || "Where it's at"}
            {form.date ? ` · ${new Date(form.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
          </a>
        ) : (
          <div style={{ fontFamily: 'var(--display)', fontSize: 14, color: 'var(--cream)' }}>
            {form.locationName || "Where it's at"}{form.date ? ` · ${new Date(form.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
          </div>
        )}
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', letterSpacing: '.06em', marginTop: 6 }}>
          {form.startTime || '??:??'} → {form.endTime || '??:??'} · {priceLabel} · {form.capacity} spots
        </div>
        {tiers.length > 1 && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--dim)', letterSpacing: '.06em', marginTop: 4 }}>
            {tiers.length} pricing tiers
          </div>
        )}
        {form.vibeTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 12 }}>
            {form.vibeTags.map((v) => (
              <span key={v} style={{ fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 7px', border: '1px solid var(--line-2)', borderRadius: 999, color: 'var(--cream)' }}>{v}</span>
            ))}
          </div>
        )}
        <div className="barcode" aria-hidden style={{ height: 16, color: 'var(--line-2)', marginTop: 14 }} />
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
