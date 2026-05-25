'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import api from '@/lib/api';

const VIBES = ['Techno', 'Hip-Hop', 'EDM', 'House', 'R&B', 'Pop', 'Afrobeats', 'Latin', 'Jazz'];
const INTERESTS = ['Dancing', 'Live Music', 'Rooftop Parties', 'House Parties', 'Clubbing', 'Networking', 'Art Nights', 'Open Mic'];

export default function SetupPage() {
  const router = useRouter();
  const { user, updateUser, token } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  const toggleTag = (tag: string, list: string[], setList: (l: string[]) => void) => {
    setList(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.put('/users/profile', {
        name, username, bio, city, dob, gender,
        vibeTags: selectedVibes,
        interests: selectedInterests,
        hasCompletedSetup: true,
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

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Set up your profile</h1>
          <p className="text-muted text-sm mt-1">Let people know who you are</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-dark-card border border-dark-border rounded-2xl p-8 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" />
            <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="@username" />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-300 block mb-1.5">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell people about yourself..."
              rows={2}
              className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-white placeholder:text-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Mumbai" />
            <Input label="Date of Birth" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-300 block mb-2">Gender</label>
            <div className="flex gap-2 flex-wrap">
              {([['Male', 'male'], ['Female', 'female'], ['Non-binary', 'other'], ['Prefer not to say', 'prefer_not_to_say']] as [string, string][]).map(([label, value]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setGender(value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors border ${gender === value ? 'bg-primary border-primary text-white' : 'border-dark-border text-muted hover:text-white'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-300 block mb-2">Your Vibe Tags</label>
            <div className="flex flex-wrap gap-2">
              {VIBES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => toggleTag(v, selectedVibes, setSelectedVibes)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors border ${selectedVibes.includes(v) ? 'bg-primary border-primary text-white' : 'border-dark-border text-muted hover:text-white'}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-300 block mb-2">Interests</label>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleTag(i, selectedInterests, setSelectedInterests)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors border ${selectedInterests.includes(i) ? 'bg-primary border-primary text-white' : 'border-dark-border text-muted hover:text-white'}`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
            Complete Setup
          </Button>
        </form>
      </div>
    </div>
  );
}
