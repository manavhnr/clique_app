import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import api from '@/lib/api';

const CATEGORIES = ['house_party', 'club', 'college', 'private', 'concert', 'other'];
const VIBES = ['Party', 'Live Music', 'Dance', 'EDM', 'Hip-Hop', 'Cocktails', 'Late Night', 'Wild'];

export default function CreateEventScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '', description: '', category: 'house_party',
    locationName: '', address: '', date: '',
    startTime: '', endTime: '', price: '', capacity: '',
    privacy: 'public', rules: '', refundPolicy: '',
    vibeTags: [] as string[],
  });
  const [loading, setLoading] = useState(false);

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const toggleVibe = (v: string) => {
    setForm((p) => ({
      ...p,
      vibeTags: p.vibeTags.includes(v) ? p.vibeTags.filter((x) => x !== v) : [...p.vibeTags, v],
    }));
  };

  const handleCreate = async () => {
    if (!form.title || !form.locationName || !form.date || !form.startTime || !form.capacity) {
      Alert.alert('Missing fields', 'Fill in title, location, date, start time and capacity');
      return;
    }
    setLoading(true);
    try {
      await api.post('/events', {
        ...form,
        price: parseFloat(form.price) || 0,
        capacity: parseInt(form.capacity),
      });
      Alert.alert('Created!', 'Your event is live.', [
        { text: 'OK', onPress: () => router.replace('/(main)/events') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to create event');
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
        <Text className="text-white font-semibold">Create Event</Text>
        <TouchableOpacity
          onPress={handleCreate}
          disabled={loading}
          className={`px-4 py-2 rounded-full ${loading ? 'bg-primary/60' : 'bg-primary'}`}
        >
          <Text className="text-white text-sm font-semibold">{loading ? '...' : 'Publish'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5 pt-5" showsVerticalScrollIndicator={false}>
        <Field label="Title *" value={form.title} onChangeText={(v) => set('title', v)} placeholder="Event name" />
        <Field label="Description" value={form.description} onChangeText={(v) => set('description', v)} placeholder="Tell people what to expect..." multiline />
        <Field label="Location *" value={form.locationName} onChangeText={(v) => set('locationName', v)} placeholder="Venue name" />
        <Field label="Address" value={form.address} onChangeText={(v) => set('address', v)} placeholder="Full address" />
        <Field label="Date * (YYYY-MM-DD)" value={form.date} onChangeText={(v) => set('date', v)} placeholder="2025-12-31" keyboardType="numbers-and-punctuation" />
        <Field label="Start Time *" value={form.startTime} onChangeText={(v) => set('startTime', v)} placeholder="10:00 PM" />
        <Field label="End Time" value={form.endTime} onChangeText={(v) => set('endTime', v)} placeholder="2:00 AM" />
        <Field label="Capacity *" value={form.capacity} onChangeText={(v) => set('capacity', v)} placeholder="100" keyboardType="number-pad" />
        <Field label="Price (₹, 0 for free)" value={form.price} onChangeText={(v) => set('price', v)} placeholder="500" keyboardType="number-pad" />

        <Text className="text-white text-sm font-medium mb-2">Privacy</Text>
        <View className="flex-row gap-3 mb-5">
          {['public', 'private'].map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => set('privacy', p)}
              className={`flex-1 py-3 rounded-xl border items-center ${form.privacy === p ? 'bg-primary border-primary' : 'border-dark-border'}`}
            >
              <Text className={form.privacy === p ? 'text-white text-sm font-semibold' : 'text-muted text-sm capitalize'}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-white text-sm font-medium mb-2">Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5 -mx-1">
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => set('category', cat)}
              className={`mx-1 px-4 py-2 rounded-full border ${form.category === cat ? 'bg-primary border-primary' : 'border-dark-border'}`}
            >
              <Text className={form.category === cat ? 'text-white text-xs font-medium' : 'text-muted text-xs'}>
                {cat.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text className="text-white text-sm font-medium mb-2">Vibe Tags</Text>
        <View className="flex-row flex-wrap gap-2 mb-5">
          {VIBES.map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => toggleVibe(v)}
              className={`px-3 py-1.5 rounded-full border ${form.vibeTags.includes(v) ? 'bg-primary border-primary' : 'border-dark-border'}`}
            >
              <Text className={form.vibeTags.includes(v) ? 'text-white text-xs' : 'text-muted text-xs'}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field label="Rules" value={form.rules} onChangeText={(v) => set('rules', v)} placeholder="Dress code, age limit..." multiline />
        <Field label="Refund Policy" value={form.refundPolicy} onChangeText={(v) => set('refundPolicy', v)} placeholder="No refunds / 48hr cancellation..." multiline />

        <View className="h-12" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FieldProps = {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; multiline?: boolean; keyboardType?: any;
};
function Field({ label, value, onChangeText, placeholder, multiline, keyboardType }: FieldProps) {
  return (
    <View className="mb-4">
      <Text className="text-white text-sm font-medium mb-2">{label}</Text>
      <TextInput
        className={`bg-dark-card border border-dark-border rounded-xl px-4 text-white text-sm ${multiline ? 'py-3 min-h-20' : 'py-4'}`}
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}
