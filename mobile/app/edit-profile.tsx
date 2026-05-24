import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function EditProfileScreen() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', username: '', bio: '', city: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ name: user.name ?? '', username: user.username ?? '', bio: (user as any).bio ?? '', city: (user as any).city ?? '' });
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data } = await api.put('/users/profile', form);
      await updateUser(data.data.user);
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-dark" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="px-5 pt-14 pb-4 flex-row items-center justify-between border-b border-dark-border">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-muted text-sm">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-white font-semibold">Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading} className={`px-4 py-2 rounded-full ${loading ? 'bg-primary/60' : 'bg-primary'}`}>
          <Text className="text-white text-sm font-semibold">{loading ? '...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView className="flex-1 px-5 pt-5">
        {(['name', 'username', 'bio', 'city'] as const).map((key) => (
          <View key={key} className="mb-4">
            <Text className="text-white text-sm font-medium mb-2 capitalize">{key}</Text>
            <TextInput
              className="bg-dark-card border border-dark-border rounded-xl px-4 py-4 text-white text-base"
              placeholder={key}
              placeholderTextColor="#6B7280"
              value={form[key]}
              onChangeText={(v) => setForm((p) => ({ ...p, [key]: v }))}
              autoCapitalize={key === 'username' ? 'none' : 'sentences'}
              multiline={key === 'bio'}
            />
          </View>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
