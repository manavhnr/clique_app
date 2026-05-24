import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';

const STATUS_COLOR: Record<string, string> = {
  active: 'text-green-400',
  used: 'text-muted',
  expired: 'text-muted',
  cancelled: 'text-red-400',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  used: 'Used',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export default function PassesScreen() {
  const [passes, setPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      api.get('/passes/my')
        .then(({ data }) => setPasses(data.data?.passes ?? []))
        .catch(() => setPasses([]))
        .finally(() => setLoading(false));
    }, [])
  );

  if (loading) {
    return (
      <View className="flex-1 bg-dark items-center justify-center">
        <ActivityIndicator color="#7C3AED" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-dark">
      <View className="px-5 pt-14 pb-4">
        <Text className="text-white text-2xl font-bold">My Passes</Text>
        <Text className="text-muted text-sm mt-1">Your event QR passes</Text>
      </View>

      <FlatList
        data={passes}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/pass/${item._id}`)}
            className="bg-dark-card border border-dark-border rounded-2xl p-4 mb-3"
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-white font-semibold text-base" numberOfLines={1}>
                  {item.eventId?.title ?? 'Event'}
                </Text>
                <Text className="text-muted text-sm mt-1">
                  {item.eventId?.date ? new Date(item.eventId.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                </Text>
              </View>
              <View className={`px-3 py-1 rounded-full border ${item.status === 'active' ? 'border-green-400/30 bg-green-400/10' : 'border-dark-border'}`}>
                <Text className={`text-xs font-medium ${STATUS_COLOR[item.status] ?? 'text-muted'}`}>
                  {STATUS_LABEL[item.status] ?? item.status}
                </Text>
              </View>
            </View>
            {item.status === 'active' && (
              <View className="mt-3 flex-row items-center gap-1">
                <Text className="text-primary text-sm font-medium">Show QR</Text>
                <Ionicons name="chevron-forward" size={14} color="#7C3AED" />
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center pt-16">
            <Ionicons name="ticket-outline" size={48} color="#6B7280" style={{ marginBottom: 12 }} />
            <Text className="text-white text-lg font-semibold">No passes yet</Text>
            <Text className="text-muted text-sm mt-1">Book an event to get your pass</Text>
          </View>
        }
      />
    </View>
  );
}
