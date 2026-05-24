import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

type Message = {
  _id: string;
  senderId: string;
  text: string;
  createdAt: string;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateHeader(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ConversationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id: conversationId, name, avatar } = useLocalSearchParams<{
    id: string; name: string; avatar: string;
  }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMessages = useCallback(async () => {
    try {
      const { data } = await api.get(`/messages/conversations/${conversationId}?limit=50`);
      setMessages(data.data?.messages ?? []);
    } catch {}
  }, [conversationId]);

  const markRead = useCallback(async () => {
    try { await api.patch(`/messages/conversations/${conversationId}/read`); } catch {}
  }, [conversationId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([loadMessages(), markRead()]).finally(() => setLoading(false));

      // Poll every 3s while screen is focused
      pollRef.current = setInterval(() => {
        loadMessages();
      }, 3000);

      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }, [loadMessages, markRead])
  );

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setText('');
    setSending(true);
    try {
      const { data } = await api.post(`/messages/conversations/${conversationId}`, { text: trimmed });
      setMessages((prev) => [...prev, data.data.message]);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
    } catch {
      setText(trimmed); // restore on failure
    } finally {
      setSending(false);
    }
  };

  // Group messages by date for date headers
  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.senderId === user?._id;
    const prev = index > 0 ? messages[index - 1] : null;
    const showDate =
      !prev || formatDateHeader(item.createdAt) !== formatDateHeader(prev.createdAt);

    return (
      <>
        {showDate && (
          <Text style={{ textAlign: 'center', color: '#6B7280', fontSize: 12, marginVertical: 12 }}>
            {formatDateHeader(item.createdAt)}
          </Text>
        )}
        <View
          style={{
            alignSelf: isMe ? 'flex-end' : 'flex-start',
            maxWidth: '75%',
            marginBottom: 4,
            marginHorizontal: 16,
          }}
        >
          <View
            style={{
              backgroundColor: isMe ? '#2563EB' : '#1F2937',
              borderRadius: 18,
              borderBottomRightRadius: isMe ? 4 : 18,
              borderBottomLeftRadius: isMe ? 18 : 4,
              paddingHorizontal: 14,
              paddingVertical: 9,
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 15, lineHeight: 21 }}>{item.text}</Text>
          </View>
          <Text style={{ color: '#4B5563', fontSize: 11, marginTop: 2, alignSelf: isMe ? 'flex-end' : 'flex-start', marginHorizontal: 4 }}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0A0A0F' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#111827' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center', marginRight: 10, overflow: 'hidden' }}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={{ width: 38, height: 38 }} resizeMode="cover" />
          ) : (
            <Ionicons name="person" size={18} color="#6B7280" />
          )}
        </View>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: '#ffffff' }} numberOfLines={1}>
          {name}
        </Text>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#2563EB" />
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
              <Ionicons name="chatbubble-outline" size={44} color="#374151" />
              <Text style={{ color: '#6B7280', fontSize: 14, marginTop: 12 }}>No messages yet. Say hi!</Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#111827', gap: 10 }}>
        <TextInput
          style={{
            flex: 1,
            backgroundColor: '#111827',
            borderRadius: 22,
            paddingHorizontal: 16,
            paddingVertical: 10,
            color: '#ffffff',
            fontSize: 15,
            maxHeight: 120,
            borderWidth: 1,
            borderColor: '#1F2937',
          }}
          placeholder="Message..."
          placeholderTextColor="#4B5563"
          value={text}
          onChangeText={setText}
          multiline
          returnKeyType="default"
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim() || sending}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: text.trim() ? '#2563EB' : '#1F2937',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color={text.trim() ? '#ffffff' : '#4B5563'} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
