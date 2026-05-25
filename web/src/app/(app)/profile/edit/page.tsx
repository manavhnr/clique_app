'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import api from '@/lib/api';

const VIBES = ['Techno', 'Hip-Hop', 'EDM', 'House', 'R&B', 'Pop', 'Afrobeats', 'Latin', 'Jazz'];
const INTERESTS = ['Dancing', 'Live Music', 'Rooftop Parties', 'House Parties', 'Clubbing', 'Networking', 'Art Nights', 'Open Mic'];

export default function EditProfilePage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [selectedVibes, setSelectedVibes] = useState<string[]>(user?.vibeTags ?? []);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(user?.interests ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const toggleTag = (tag: string, list: string[], setList: (l: string[]) => void) => {
    setList(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { data } = await api.put('/users/profile', {
        name, username, bio, city,
        vibeTags: selectedVibes,
        interests: selectedInterests,
      });
      updateUser(data.data.user);
      setSuccess('Profile updated!');
      setTimeout(() => router.push('/profile'), 1000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-muted hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft size={16} />
        Back
      </button>

      <h1 className="text-2xl font-bold text-white mb-6">Edit Profile</h1>

      <form onSubmit={handleSubmit} className="bg-dark-card border border-dark-border rounded-2xl p-6 flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-300 block mb-1.5">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people about yourself..."
            rows={3}
            className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-white placeholder:text-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Mumbai" />

        <div>
          <label className="text-sm font-medium text-zinc-300 block mb-2">Vibe Tags</label>
          <div className="flex flex-wrap gap-2">
            {VIBES.map((v) => (
              <button key={v} type="button" onClick={() => toggleTag(v, selectedVibes, setSelectedVibes)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors border ${selectedVibes.includes(v) ? 'bg-primary border-primary text-white' : 'border-dark-border text-muted hover:text-white'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-300 block mb-2">Interests</label>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => (
              <button key={i} type="button" onClick={() => toggleTag(i, selectedInterests, setSelectedInterests)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors border ${selectedInterests.includes(i) ? 'bg-primary border-primary text-white' : 'border-dark-border text-muted hover:text-white'}`}>
                {i}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-green-400">{success}</p>}

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" className="flex-1" type="button" onClick={() => router.back()}>Cancel</Button>
          <Button className="flex-1" loading={loading} type="submit">Save Changes</Button>
        </div>
      </form>
    </div>
  );
}
