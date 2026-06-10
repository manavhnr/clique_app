import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
  Linking,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const { width } = Dimensions.get('window');
const BANNER_HEIGHT = 210;
const AVATAR_SIZE = 88;

export default function ProfileScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'events'>('posts');
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      api.get('/users/profile')
        .then(({ data }) => setProfile(data.data?.user))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [])
  );


  if (loading) {
    return (
      <View className="flex-1 bg-dark items-center justify-center">
        <ActivityIndicator color="#2563EB" />
      </View>
    );
  }

  const u = profile ?? user;

  return (
    <ScrollView className="flex-1 bg-dark" showsVerticalScrollIndicator={false}>

      {/* Banner */}
      <View style={{ height: BANNER_HEIGHT }} className="relative overflow-hidden">
        {u?.bannerImage ? (
          <Image
            source={{ uri: u.bannerImage }}
            style={{ width, height: BANNER_HEIGHT }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ height: BANNER_HEIGHT }} className="bg-dark-card" />
        )}
        {/* Settings icon */}
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          className="absolute top-12 right-4 w-9 h-9 rounded-full bg-black/50 items-center justify-center"
        >
          <Ionicons name="settings-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Avatar overlapping banner */}
      <View className="items-center" style={{ marginTop: -(AVATAR_SIZE / 2) }}>
        <View
          style={{
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            borderRadius: AVATAR_SIZE / 2,
            borderWidth: 3,
            borderColor: '#2563EB',
          }}
          className="bg-dark-card items-center justify-center overflow-hidden"
        >
          {u?.profileImage ? (
            <Image
              source={{ uri: u.profileImage }}
              style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="person" size={36} color="#6B7280" />
          )}
        </View>
      </View>

      {/* Stats row */}
      <View className="flex-row justify-around px-10 mt-5">
        <View className="items-center">
          <Text className="text-white font-bold text-xl">{u?.followerCount ?? 0}</Text>
          <Text className="text-muted text-xs mt-0.5">Followers</Text>
        </View>
        <View className="items-center">
          <Text className="text-white font-bold text-xl">{u?.cliquescore ?? 0}</Text>
          <Text className="text-muted text-xs mt-0.5">Cliquescore</Text>
        </View>
        <View className="items-center">
          <Text className="text-white font-bold text-xl">{u?.followingCount ?? 0}</Text>
          <Text className="text-muted text-xs mt-0.5">Following</Text>
        </View>
      </View>

      {/* Name, username, bio */}
      <View className="items-center px-8 mt-4">
        <Text className="text-white text-2xl font-bold">{u?.name ?? '—'}</Text>
        <Text className="text-muted text-sm mt-0.5">@{u?.username ?? '—'}</Text>
        {u?.bio ? (
          <Text className="text-muted text-sm mt-2 text-center leading-5">{u.bio}</Text>
        ) : null}
        {u?.isVerifiedHost && (
          <View className="flex-row items-center mt-2 bg-primary/20 px-3 py-1 rounded-full gap-1">
            <Ionicons name="checkmark-circle" size={12} color="#2563EB" />
            <Text className="text-primary text-xs font-semibold">Verified Host</Text>
          </View>
        )}

        {/* Instagram link */}
        {u?.connectedSocials?.instagram ? (
          <TouchableOpacity
            onPress={() => Linking.openURL(`https://instagram.com/${u.connectedSocials.instagram}`)}
            activeOpacity={0.75}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 12,
              backgroundColor: '#1a0a1a',
              borderWidth: 1,
              borderColor: '#3d1230',
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              gap: 7,
            }}
          >
            <FontAwesome5 name="instagram" size={15} color="#E1306C" />
            <Text style={{ color: '#E1306C', fontSize: 13, fontWeight: '600' }}>
              @{u.connectedSocials.instagram}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Action buttons */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginTop: 24 }}>
        <TouchableOpacity
          onPress={() => router.push('/edit-profile')}
          style={{ flex: 1, backgroundColor: '#2563EB', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}
          activeOpacity={0.85}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Edit Profile</Text>
        </TouchableOpacity>
        {u?.isVerifiedHost ? (
          <TouchableOpacity
            onPress={() => router.push('/host-dashboard')}
            style={{ flex: 1, borderWidth: 1, borderColor: '#1F2937', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Host Dashboard</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => router.push('/become-host')}
            style={{ flex: 1, borderWidth: 1, borderColor: '#1F2937', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Become a Host</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Admin Panel — only visible for admin role */}
      {u?.role === 'admin' && (
        <TouchableOpacity
          onPress={() => router.push('/admin')}
          style={{
            marginHorizontal: 24,
            marginTop: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: '#1e3a5f',
            borderWidth: 1,
            borderColor: '#2563EB',
            borderRadius: 16,
            paddingVertical: 14,
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="shield-checkmark" size={16} color="#60a5fa" />
          <Text style={{ color: '#60a5fa', fontWeight: '600', fontSize: 14 }}>Admin Panel</Text>
        </TouchableOpacity>
      )}

      {/* Tabs */}
      <View style={{ flexDirection: 'row', marginTop: 36, marginHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#1F2937' }}>
        {(['posts', 'events'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{ flex: 1, alignItems: 'center', paddingBottom: 12 }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: activeTab === tab ? '#ffffff' : '#6B7280' }}>
              {tab === 'posts' ? 'Posts' : 'Events'}
            </Text>
            {activeTab === tab && (
              <View style={{ position: 'absolute', bottom: 0, left: '50%', marginLeft: -16, width: 32, height: 2, backgroundColor: '#2563EB', borderRadius: 2 }} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab empty state */}
      <View className="items-center py-16">
        <Ionicons
          name={activeTab === 'posts' ? 'grid-outline' : 'calendar-outline'}
          size={40}
          color="#374151"
        />
        <Text className="text-muted text-sm mt-3">
          {activeTab === 'posts' ? 'No posts yet' : 'No events yet'}
        </Text>
      </View>

      <View className="h-20" />
    </ScrollView>
  );
}
