'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, X, Music } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LocationPicker, { PickedLocation } from '@/components/map/LocationPicker';
import api from '@/lib/api';

const CATEGORIES = [
  { value: 'house_party', label: 'House Party' },
  { value: 'club', label: 'Club Night' },
  { value: 'college', label: 'College Party' },
  { value: 'private', label: 'Private Event' },
  { value: 'concert', label: 'Concert' },
  { value: 'other', label: 'Other' },
];

const VIBE_TAGS = ['Techno', 'Hip-Hop', 'EDM', 'House', 'R&B', 'Afrobeats', 'Latin', 'Pop', 'Jazz', 'Chill', 'Party', 'Exclusive'];
const MUSIC_TAGS = ['Live DJ', 'Live Band', 'Playlist', 'Open Mic', 'Acoustic'];

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

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
      latitude: loc.lat,
      longitude: loc.lng,
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
    const newFiles = Array.from(files).slice(0, 5);
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

  const handleSubmit = async (e: React.FormEvent, publish = false) => {
    e.preventDefault();
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

      const { data } = await api.post('/events', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (publish && data.data.event?.status !== 'published') {
        await api.patch(`/events/${data.data.event._id}/publish`);
      }

      router.push(`/host/events/${data.data.event._id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; errors?: { field: string; message: string }[] } } };
      const fieldErrors = e.response?.data?.errors;
      if (fieldErrors?.length) {
        setError(fieldErrors.map((fe) => `${fe.field}: ${fe.message}`).join(' · '));
      } else {
        setError(e.response?.data?.message ?? 'Failed to create event');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-muted hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft size={16} />
        Back
      </button>

      <h1 className="text-2xl font-bold text-white mb-6">Create New Event</h1>

      <form className="space-y-6">
        <Section title="Event Details">
          <Input label="Event Title *" value={form.title} onChange={(e) => set('title', e.target.value)} required placeholder="e.g. Saturday Night Rooftop Party" />
          <div>
            <label className="text-sm font-medium text-zinc-300 block mb-1.5">Description *</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} required placeholder="Tell guests what to expect..." rows={3}
              className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-white placeholder:text-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-300 block mb-2">Category *</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(({ value, label }) => (
                <button key={value} type="button" onClick={() => set('category', value)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border ${form.category === value ? 'bg-primary border-primary text-white' : 'border-dark-border text-muted hover:text-white'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Date & Time">
          <div className="grid grid-cols-3 gap-3">
            <Input label="Date *" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
            <Input label="Start Time *" type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} required />
            <Input label="End Time *" type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} required />
          </div>
        </Section>

        <Section title="Location">
          <LocationPicker
            lat={form.latitude}
            lng={form.longitude}
            locationName={form.locationName}
            address={form.address}
            onChange={handleLocationPicked}
          />
          <Input
            label="Venue Name *"
            value={form.locationName}
            onChange={(e) => set('locationName', e.target.value)}
            required
            placeholder="e.g. Skyline Rooftop, Bandra"
          />
          <Input
            label="Full Address *"
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            required
            placeholder="Auto-filled from map, or type manually"
          />
          <div className="flex items-center gap-3">
            <input type="checkbox" id="hideAddr" checked={form.exactAddressHiddenBeforeBooking} onChange={(e) => set('exactAddressHiddenBeforeBooking', e.target.checked)} className="accent-primary" />
            <label htmlFor="hideAddr" className="text-sm text-zinc-300">Hide exact address until after booking</label>
          </div>
        </Section>

        <Section title="Tickets & Capacity">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Entry Price (₹) *" type="number" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} />
            <Input label="Capacity *" type="number" min="1" value={form.capacity} onChange={(e) => set('capacity', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-300 block mb-2">Privacy</label>
            <div className="flex gap-2">
              {['public', 'private'].map((p) => (
                <button key={p} type="button" onClick={() => set('privacy', p)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors border ${form.privacy === p ? 'bg-primary border-primary text-white' : 'border-dark-border text-muted hover:text-white'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          {form.privacy === 'private' && (
            <div className="flex items-center gap-3">
              <input type="checkbox" id="approvalReq" checked={form.approvalRequired} onChange={(e) => set('approvalRequired', e.target.checked)} className="accent-primary" />
              <label htmlFor="approvalReq" className="text-sm text-zinc-300">Require approval for bookings</label>
            </div>
          )}
          <Input label="Age Limit (optional)" type="number" min="18" value={form.ageLimit} onChange={(e) => set('ageLimit', e.target.value)} placeholder="e.g. 21" />
        </Section>

        <Section title="Vibe Tags">
          <div className="flex flex-wrap gap-2">
            {VIBE_TAGS.map((tag) => (
              <button key={tag} type="button" onClick={() => toggleTag('vibeTags', tag)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${form.vibeTags.includes(tag) ? 'bg-primary border-primary text-white' : 'border-dark-border text-muted hover:text-white'}`}>
                {tag}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {MUSIC_TAGS.map((tag) => (
              <button key={tag} type="button" onClick={() => toggleTag('musicTags', tag)}
                className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors duration-150 ${form.musicTags.includes(tag) ? 'bg-violet-600 border-violet-600 text-white' : 'border-dark-border text-muted hover:text-white'}`}>
                <Music size={11} />
                {tag}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Images">
          <div className="grid grid-cols-3 gap-3">
            {imagePreviews.map((src, i) => (
              <div key={i} className="relative aspect-video rounded-xl overflow-hidden bg-dark-border">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(i)} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80">
                  <X size={12} className="text-white" />
                </button>
              </div>
            ))}
            {imagePreviews.length < 5 && (
              <label className="aspect-video rounded-xl border-2 border-dashed border-dark-border hover:border-primary/50 cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors">
                <Upload size={20} className="text-muted" />
                <span className="text-xs text-muted">Add image</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImages(e.target.files)} />
              </label>
            )}
          </div>
        </Section>

        <Section title="Rules & Policy">
          <div>
            <label className="text-sm font-medium text-zinc-300 block mb-1.5">Event Rules</label>
            <textarea value={form.rules} onChange={(e) => set('rules', e.target.value)} placeholder="e.g. No outside alcohol, smart casual dress code..." rows={2}
              className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-white placeholder:text-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-300 block mb-1.5">Refund Policy</label>
            <textarea value={form.refundPolicy} onChange={(e) => set('refundPolicy', e.target.value)} placeholder="e.g. No refunds after 24 hours of event..." rows={2}
              className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-white placeholder:text-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>
        </Section>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3 pb-6">
          <Button type="button" variant="secondary" className="flex-1" loading={loading} onClick={(e) => handleSubmit(e, false)}>
            Save as Draft
          </Button>
          <Button type="button" className="flex-1" loading={loading} onClick={(e) => handleSubmit(e, true)}>
            Publish Event
          </Button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-white border-b border-dark-border pb-3">{title}</h2>
      {children}
    </div>
  );
}
