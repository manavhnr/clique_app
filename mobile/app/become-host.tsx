import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { useState } from 'react';

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; title: string; desc: string }[] = [
  { icon: 'calendar-outline',    title: 'Create Events',    desc: 'Publish house parties, club nights, and more' },
  { icon: 'people-outline',      title: 'Manage Guests',    desc: 'View bookings, approve private requests' },
  { icon: 'qr-code-outline',     title: 'Scan QR Passes',   desc: 'Control entry with the built-in scanner' },
  { icon: 'cash-outline',        title: 'Accept Payments',  desc: 'Get paid directly via Razorpay' },
];

export default function BecomeHostScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    setLoading(true);
    try {
      await api.post('/host-verifications/apply', {
        documentType: 'id',
        address: 'Pending upload',
      });
      Alert.alert('Application Submitted', 'We\'ll review your request within 24-48 hours.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Application failed');
    } finally {
      setLoading(false);
    }
  };

  if (user?.isVerifiedHost) {
    return (
      <View className="flex-1 bg-dark items-center justify-center px-6">
        <Ionicons name="checkmark-circle" size={64} color="#22c55e" style={{ marginBottom: 16 }} />
        <Text className="text-white text-xl font-bold mb-2">You're a verified host</Text>
        <Text className="text-muted text-sm text-center">You can create and manage events on Clique</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-8 bg-primary rounded-xl px-8 py-4">
          <Text className="text-white font-semibold">Got it</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-dark">
      <TouchableOpacity onPress={() => router.back()} className="px-5 pt-14 mb-6">
        <Text className="text-muted text-sm">← Back</Text>
      </TouchableOpacity>

      <View className="px-6">
        <Ionicons name="star" size={56} color="#7C3AED" style={{ marginBottom: 16 }} />
        <Text className="text-white text-2xl font-bold mb-2">Become a Host</Text>
        <Text className="text-muted text-sm mb-8 leading-5">
          Hosts can create events, manage guest lists, accept bookings, and scan entry passes. Get verified to unlock host features.
        </Text>

        <View className="gap-4 mb-8">
          {FEATURES.map((item) => (
            <View key={item.title} className="flex-row items-start bg-dark-card border border-dark-border rounded-xl p-4">
              <Ionicons name={item.icon} size={22} color="#7C3AED" style={{ marginRight: 14, marginTop: 1 }} />
              <View className="flex-1">
                <Text className="text-white font-semibold text-sm">{item.title}</Text>
                <Text className="text-muted text-xs mt-0.5">{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleApply}
          disabled={loading}
          className={`rounded-xl py-4 items-center mb-12 ${loading ? 'bg-primary/60' : 'bg-primary'}`}
        >
          <Text className="text-white font-semibold text-base">
            {loading ? 'Submitting...' : 'Apply to Become a Host'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
