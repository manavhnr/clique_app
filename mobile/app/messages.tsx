import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

type Conversation = {
  _id: string;
  otherUser: { _id: string; name: string; username: string; profileImage?: string };
  lastMessage: { text: string; senderId: string; createdAt: string } | null;
  hasUnread: boolean;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/messages/conversations');
      setConversations(data.data?.conversations ?? []);
    } catch {}
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0F' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontWeight: '700', color: '#ffffff' }}>Messages</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
          contentContainerStyle={conversations.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#111827', marginLeft: 76 }} />}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
              <Ionicons name="chatbubbles-outline" size={52} color="#374151" />
              <Text style={{ color: '#ffffff', fontSize: 17, fontWeight: '600', marginTop: 16 }}>No messages yet</Text>
              <Text style={{ color: '#6B7280', fontSize: 14, marginTop: 6, textAlign: 'center' }}>
                Visit someone's profile to start a conversation
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = item.lastMessage?.senderId === user?._id;
            return (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/conversation/[id]',
                    params: {
                      id: item._id,
                      name: item.otherUser?.name || item.otherUser?.username,
                      avatar: item.otherUser?.profileImage ?? '',
                      recipientId: item.otherUser?._id,
                    },
                  })
                }
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 }}
              >
                {/* Avatar */}
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', marginRight: 14, overflow: 'hidden' }}>
                  {item.otherUser?.profileImage ? (
                    <Image source={{ uri: item.otherUser.profileImage }} style={{ width: 48, height: 48 }} resizeMode="cover" />
                  ) : (
                    <Ionicons name="person" size={22} color="#6B7280" />
                  )}
                </View>

                {/* Text */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <Text style={{ fontSize: 15, fontWeight: item.hasUnread ? '700' : '500', color: '#ffffff' }}>
                      {item.otherUser?.name || item.otherUser?.username}
                    </Text>
                    {item.lastMessage && (
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>{timeAgo(item.lastMessage.createdAt)}</Text>
                    )}
                  </View>
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: 14, color: item.hasUnread ? '#ffffff' : '#6B7280', fontWeight: item.hasUnread ? '500' : '400' }}
                  >
                    {item.lastMessage
                      ? `${isMe ? 'You: ' : ''}${item.lastMessage.text}`
                      : 'Say hello 👋'}
                  </Text>
                </View>

                {item.hasUnread && (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB', marginLeft: 10 }} />
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
