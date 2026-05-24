import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';

export default function PassScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pass, setPass] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api.get(`/passes/${id}`)
      .then(({ data }) => setPass(data.data?.pass))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 bg-dark items-center justify-center">
        <ActivityIndicator color="#7C3AED" />
      </View>
    );
  }

  if (!pass) {
    return (
      <View className="flex-1 bg-dark items-center justify-center px-6">
        <Text className="text-white text-lg">Pass not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-primary">← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isActive = pass.status === 'active';

  return (
    <View className="flex-1 bg-dark px-6 justify-center">
      <TouchableOpacity onPress={() => router.back()} className="absolute top-14 left-5">
        <Text className="text-muted text-sm">← Back</Text>
      </TouchableOpacity>

      <View className="bg-dark-card border border-dark-border rounded-3xl p-6 items-center">
        <Text className="text-white text-xl font-bold mb-1 text-center">
          {pass.eventId?.title ?? 'Event Pass'}
        </Text>
        <Text className="text-muted text-sm mb-6 text-center">
          {pass.eventId?.date ? new Date(pass.eventId.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
        </Text>

        {isActive ? (
          <View className="bg-white rounded-2xl p-4 mb-6">
            <View className="w-52 h-52 bg-dark items-center justify-center rounded-xl">
              <Ionicons name="qr-code-outline" size={64} color="#6B7280" />
              <Text className="text-muted text-xs mt-2 text-center px-4">
                QR rendering requires{'\n'}expo-barcode-scanner
              </Text>
            </View>
          </View>
        ) : (
          <View className="w-52 h-52 bg-dark-border rounded-2xl items-center justify-center mb-6">
            <Ionicons name="close-circle-outline" size={48} color="#6B7280" style={{ marginBottom: 8 }} />
            <Text className="text-muted text-sm capitalize">{pass.status}</Text>
          </View>
        )}

        <View className={`px-4 py-2 rounded-full mb-6 ${isActive ? 'bg-green-400/20' : 'bg-dark-border'}`}>
          <Text className={`text-sm font-semibold capitalize ${isActive ? 'text-green-400' : 'text-muted'}`}>
            {pass.status}
          </Text>
        </View>

        <Text className="text-muted text-xs text-center">
          {pass.eventId?.locationName ?? ''}
        </Text>
        {pass.eventId?.startTime && (
          <Text className="text-muted text-xs text-center mt-1">
            {pass.eventId.startTime} – {pass.eventId.endTime}
          </Text>
        )}
      </View>
    </View>
  );
}
