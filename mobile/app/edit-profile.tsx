import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const FIELDS = [
  { key: 'name',     label: 'Name',     placeholder: 'Your name',     multiline: false, capitalize: 'sentences' as const },
  { key: 'username', label: 'Username', placeholder: '@username',     multiline: false, capitalize: 'none' as const },
  { key: 'bio',      label: 'Bio',      placeholder: 'Tell the world about yourself…', multiline: true, capitalize: 'sentences' as const },
  { key: 'city',     label: 'City',     placeholder: 'Your city',     multiline: false, capitalize: 'words' as const },
];

export default function EditProfileScreen() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', username: '', bio: '', city: '' });
  const [instagram, setInstagram] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name:     user.name ?? '',
        username: user.username ?? '',
        bio:      (user as any).bio ?? '',
        city:     (user as any).city ?? '',
      });
      setInstagram((user as any).connectedSocials?.instagram ?? '');
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Strip @ if the user typed it
      const igHandle = instagram.replace(/^@/, '').trim();
      const { data } = await api.put('/users/profile', {
        ...form,
        connectedSocials: { instagram: igHandle || undefined },
      });
      await updateUser(data.data.user);
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#0A0A0F' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1F2937' }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#6B7280', fontSize: 14 }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          style={{ backgroundColor: loading ? '#1D4ED8AA' : '#2563EB', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 }}
        >
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{loading ? '…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 24 }} showsVerticalScrollIndicator={false}>
        {/* Standard fields */}
        {FIELDS.map(({ key, label, placeholder, multiline, capitalize }) => (
          <View key={key} style={{ marginBottom: 18 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '500', marginBottom: 8 }}>{label}</Text>
            <TextInput
              style={{
                backgroundColor: '#111827',
                borderWidth: 1,
                borderColor: '#1F2937',
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 14,
                color: '#fff',
                fontSize: 15,
                minHeight: multiline ? 90 : undefined,
                textAlignVertical: multiline ? 'top' : undefined,
              }}
              placeholder={placeholder}
              placeholderTextColor="#4B5563"
              value={(form as any)[key]}
              onChangeText={(v) => setForm((p) => ({ ...p, [key]: v }))}
              autoCapitalize={capitalize}
              multiline={multiline}
            />
          </View>
        ))}

        {/* Divider */}
        <View style={{ borderTopWidth: 1, borderTopColor: '#1F2937', marginBottom: 24, marginTop: 4 }} />
        <Text style={{ color: '#6B7280', fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>
          Connected Socials
        </Text>

        {/* Instagram field */}
        <View style={{ marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderWidth: 1, borderColor: '#1F2937', borderRadius: 14, overflow: 'hidden' }}>
            {/* IG logo block */}
            <View style={{ width: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a0a1a', borderRightWidth: 1, borderRightColor: '#1F2937', paddingVertical: 15 }}>
              <FontAwesome5 name="instagram" size={22} color="#E1306C" />
            </View>
            <TextInput
              style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 14, color: '#fff', fontSize: 15 }}
              placeholder="your_instagram"
              placeholderTextColor="#4B5563"
              value={instagram}
              onChangeText={setInstagram}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Text style={{ color: '#4B5563', fontSize: 12, marginTop: 6, marginLeft: 4 }}>
            Enter your Instagram username (without @)
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
