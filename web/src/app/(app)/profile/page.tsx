'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, Edit2, Star, Users, FileText, Zap } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { getImageUrl } from '@/lib/utils';
import api from '@/lib/api';
import { User } from '@/types';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const [freshUser, setFreshUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me')
      .then(({ data }) => {
        setFreshUser(data.data.user ?? data.data);
        updateUser(data.data.user ?? data.data);
      })
      .catch(() => setFreshUser(user))
      .finally(() => setLoading(false));
  }, []);

  const profile = freshUser ?? user;

  if (loading) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;
  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Profile</h1>
        <Button variant="secondary" size="sm" onClick={() => router.push('/profile/edit')}>
          <Edit2 size={14} /> Edit
        </Button>
      </div>

      <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-primary/30 to-violet-800/20" />

        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl border-4 border-dark-card overflow-hidden bg-primary/20">
                {profile.profileImage ? (
                  <img src={getImageUrl(profile.profileImage)} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-primary-light">
                    {profile.name?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              {profile.isVerifiedHost && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <ShieldCheck size={11} className="text-white" />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {profile.isVerifiedHost && <Badge variant="purple">Verified Host</Badge>}
              {profile.role === 'admin' && <Badge variant="blue">Admin</Badge>}
            </div>
          </div>

          <h2 className="text-xl font-bold text-white">{profile.name}</h2>
          <p className="text-sm text-muted">@{profile.username}</p>
          {profile.bio && <p className="text-sm text-zinc-300 mt-3 leading-relaxed">{profile.bio}</p>}
          {profile.city && <p className="text-xs text-muted mt-1">📍 {profile.city}</p>}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mt-4">
        {[
          { icon: Users, label: 'Followers', value: profile.followerCount ?? 0 },
          { icon: Users, label: 'Following', value: profile.followingCount ?? 0 },
          { icon: FileText, label: 'Posts', value: profile.postCount ?? 0 },
          { icon: Zap, label: 'Score', value: profile.cliquescore ?? 0 },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-dark-card border border-dark-border rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-white">{value.toLocaleString()}</p>
            <p className="text-xs text-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {(profile.vibeTags?.length ?? 0) > 0 && (
        <div className="mt-5 bg-dark-card border border-dark-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Vibes</h3>
          <div className="flex flex-wrap gap-2">
            {profile.vibeTags?.map((tag) => <Badge key={tag} variant="purple">{tag}</Badge>)}
          </div>
        </div>
      )}

      {(profile.interests?.length ?? 0) > 0 && (
        <div className="mt-3 bg-dark-card border border-dark-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Interests</h3>
          <div className="flex flex-wrap gap-2">
            {profile.interests?.map((tag) => <Badge key={tag}>{tag}</Badge>)}
          </div>
        </div>
      )}

      {!profile.isVerifiedHost && (
        <div className="mt-5 bg-gradient-to-r from-primary/10 to-violet-800/10 border border-primary/20 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Star size={18} className="text-primary-light" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Become a Host</p>
              <p className="text-xs text-muted">Create events and grow your following</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => router.push('/become-host')}
          >
            Apply to Become a Host
          </Button>
        </div>
      )}

      {profile.isVerifiedHost && (
        <div className="mt-5">
          <Button className="w-full" onClick={() => router.push('/host/dashboard')}>
            Go to Host Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}
