import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = { event: any; onPress: () => void };

export default function EventCard({ event, onPress }: Props) {
  const date = event.date ? new Date(event.date) : null;
  const dateStr = date ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
  const spotsLeft = (event.capacity ?? 0) - (event.bookedCount ?? 0);

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-dark-card border border-dark-border rounded-2xl mb-3 overflow-hidden"
    >
      {event.images?.[0] ? (
        <View className="w-full h-56 bg-[#111827] items-center justify-center">
          <Image source={{ uri: event.images[0] }} className="w-full h-56" resizeMode="contain" />
        </View>
      ) : (
        <View className="w-full h-56 bg-primary/20 items-center justify-center">
          <Ionicons name="calendar" size={48} color="#7C3AED" />
        </View>
      )}

      <View className="p-4">
        <View className="flex-row items-start justify-between mb-1">
          <Text className="text-white font-semibold text-base flex-1 mr-2" numberOfLines={1}>
            {event.title}
          </Text>
          <View className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full ${event.privacy === 'private' ? 'bg-yellow-400/20' : 'bg-green-400/20'}`}>
            {event.privacy === 'private' && <Ionicons name="lock-closed" size={10} color="#facc15" />}
            <Text className={`text-xs font-medium ${event.privacy === 'private' ? 'text-yellow-400' : 'text-green-400'}`}>
              {event.privacy === 'private' ? 'Private' : 'Public'}
            </Text>
          </View>
        </View>

        <Text className="text-muted text-xs mb-3" numberOfLines={1}>{event.locationName}</Text>

        <View className="flex-row items-center justify-between">
          <View className="flex-row gap-3">
            <View className="flex-row items-center gap-1">
              <Ionicons name="calendar-outline" size={12} color="#6B7280" />
              <Text className="text-muted text-xs">{dateStr}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Ionicons name="time-outline" size={12} color="#6B7280" />
              <Text className="text-muted text-xs">{event.startTime}</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            {event.price > 0 ? (
              <Text className="text-accent text-sm font-semibold">₹{event.price}</Text>
            ) : (
              <Text className="text-green-400 text-sm font-semibold">Free</Text>
            )}
            {spotsLeft > 0 && spotsLeft <= 10 && (
              <Text className="text-orange-400 text-xs">{spotsLeft} left</Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
