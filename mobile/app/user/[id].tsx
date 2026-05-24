import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import PostCard from '@/components/PostCard';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: me } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/users/${id}`),
      api.get(`/posts?userId=${id}&limit=9`),
    ])
      .then(([profileRes, postsRes]) => {
        setProfile(profileRes.data.data?.user);
        setFollowing(profileRes.data.data?.isFollowing ?? false);
        setPosts(postsRes.data.data?.posts ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const toggleFollow = async () => {
    try {
      if (following) {
        await api.delete(`/relationships/follow/${id}`);
      } else {
        await api.post(`/relationships/follow/${id}`);
      }
      setFollowing(!following);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Action failed');
    }
  };

  if (loading) {
    return <View className="flex-1 bg-dark items-center justify-center"><ActivityIndicator color="#7C3AED" /></View>;
  }

  if (!profile) {
    return (
      <View className="flex-1 bg-dark items-center justify-center px-6">
        <Text className="text-white text-lg">User not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-primary">← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isMe = me?._id === id;

  return (
    <ScrollView className="flex-1 bg-dark" showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={() => router.back()} className="px-5 pt-14 mb-4">
        <Text className="text-muted text-sm">← Back</Text>
      </TouchableOpacity>

      <View className="px-5 items-center pb-5">
        <View className="w-24 h-24 rounded-full bg-dark-card border-2 border-primary items-center justify-center mb-3 overflow-hidden">
          {profile.profileImage ? (
            <Image source={{ uri: profile.profileImage }} style={{ width: 96, height: 96 }} />
          ) : (
            <Ionicons name="person" size={40} color="#6B7280" />
          )}
        </View>
        <Text className="text-white text-xl font-bold">{profile.name}</Text>
        <Text className="text-muted text-sm mt-0.5">@{profile.username}</Text>
        {profile.isVerifiedHost && (
          <View className="flex-row items-center mt-2 bg-primary/20 px-3 py-1 rounded-full gap-1">
            <Ionicons name="checkmark-circle" size={12} color="#7C3AED" />
            <Text className="text-primary text-xs font-semibold">Verified Host</Text>
          </View>
        )}
        {profile.bio ? <Text className="text-muted text-sm mt-3 text-center">{profile.bio}</Text> : null}
      </View>

      <View className="flex-row justify-around px-5 py-4 bg-dark-card border-y border-dark-border mb-5">
        <Stat label="Posts" value={profile.postCount ?? 0} />
        <Stat label="Followers" value={profile.followerCount ?? 0} />
        <Stat label="Following" value={profile.followingCount ?? 0} />
        <Stat label="Score" value={profile.cliquescore ?? 0} />
      </View>

      {!isMe && (
        <View className="px-5 mb-5 flex-row gap-3">
          <TouchableOpacity
            onPress={toggleFollow}
            className={`flex-1 py-3 rounded-xl items-center border ${following ? 'border-dark-border' : 'bg-primary border-primary'}`}
          >
            <Text className="text-white text-sm font-semibold">
              {following ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={async () => {
              try {
                const { data } = await api.post('/messages/open', { recipientId: id });
                const conv = data.data?.conversation;
                router.push({
                  pathname: '/conversation/[id]',
                  params: {
                    id: conv._id,
                    name: profile.name || profile.username,
                    avatar: profile.profileImage ?? '',
                    recipientId: id,
                  },
                });
              } catch (err: any) {
                Alert.alert('Error', err?.response?.data?.message ?? 'Cannot open chat');
              }
            }}
            className="flex-1 py-3 rounded-xl items-center border border-dark-border"
          >
            <Text className="text-white text-sm font-semibold">Message</Text>
          </TouchableOpacity>
        </View>
      )}

      <View className="px-5">
        {posts.map((post) => <PostCard key={post._id} post={post} />)}
        {posts.length === 0 && (
          <View className="items-center py-12">
            <Text className="text-muted text-sm">No posts yet</Text>
          </View>
        )}
      </View>
      <View className="h-8" />
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View className="items-center">
      <Text className="text-white font-bold text-lg">{value}</Text>
      <Text className="text-muted text-xs">{label}</Text>
    </View>
  );
}
