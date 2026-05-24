import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';

export default function CreatePostScreen() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePost = async () => {
    if (!text.trim()) {
      Alert.alert('Add some text', 'Write something before posting');
      return;
    }
    setLoading(true);
    try {
      await api.post('/posts', { text: text.trim(), visibility: 'public' });
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-dark"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="px-5 pt-14 pb-4 flex-row items-center justify-between border-b border-dark-border">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-muted text-sm">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-white font-semibold">New Post</Text>
        <TouchableOpacity
          onPress={handlePost}
          disabled={loading}
          className={`px-4 py-2 rounded-full ${loading ? 'bg-primary/60' : 'bg-primary'}`}
        >
          <Text className="text-white text-sm font-semibold">{loading ? '...' : 'Post'}</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-5 pt-5">
        <View className="flex-row">
          <View className="w-10 h-10 rounded-full bg-dark-card border border-dark-border items-center justify-center mr-3">
            <Ionicons name="person" size={20} color="#6B7280" />
          </View>
          <TextInput
            className="flex-1 text-white text-base leading-6"
            placeholder="What's the vibe tonight?"
            placeholderTextColor="#6B7280"
            multiline
            autoFocus
            value={text}
            onChangeText={setText}
            style={{ minHeight: 120 }}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
