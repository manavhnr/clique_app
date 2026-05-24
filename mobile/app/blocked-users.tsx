import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';

type BlockedUser = {
  _id: string;
  name: string;
  username: string;
  profileImage?: string;
};

export default function BlockedUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      api.get('/relationships/blocked')
        .then(({ data }) => setUsers(data.data?.users ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [])
  );

  const handleUnblock = (userId: string, name: string) => {
    Alert.alert(
      'Unblock User',
      `Unblock ${name}? They will be able to follow you and view your profile again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            setUnblocking(userId);
            try {
              await api.delete(`/relationships/block/${userId}`);
              setUsers((prev) => prev.filter((u) => u._id !== userId));
            } catch {
              Alert.alert('Error', 'Failed to unblock user. Please try again.');
            } finally {
              setUnblocking(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0F' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#ffffff' }}>Blocked Users</Text>
          {users.length > 0 && (
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{users.length} blocked</Text>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#2563EB" />
        </View>
      ) : users.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <Ionicons name="ban-outline" size={48} color="#374151" />
          <Text style={{ color: '#6B7280', fontSize: 15, marginTop: 12, textAlign: 'center' }}>
            You haven't blocked anyone.
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4 }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#1F2937' }} />}
          renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}>
              {/* Avatar */}
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', marginRight: 12, overflow: 'hidden' }}>
                {item.profileImage ? (
                  <Image source={{ uri: item.profileImage }} style={{ width: 44, height: 44 }} resizeMode="cover" />
                ) : (
                  <Ionicons name="person" size={20} color="#6B7280" />
                )}
              </View>

              {/* Name */}
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 15 }}>{item.name || item.username}</Text>
                <Text style={{ color: '#6B7280', fontSize: 13, marginTop: 1 }}>@{item.username}</Text>
              </View>

              {/* Unblock button */}
              <TouchableOpacity
                onPress={() => handleUnblock(item._id, item.name || item.username)}
                disabled={unblocking === item._id}
                style={{
                  borderWidth: 1,
                  borderColor: '#374151',
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  backgroundColor: unblocking === item._id ? '#1F2937' : 'transparent',
                }}
                activeOpacity={0.7}
              >
                {unblocking === item._id ? (
                  <ActivityIndicator size="small" color="#6B7280" />
                ) : (
                  <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '500' }}>Unblock</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}
