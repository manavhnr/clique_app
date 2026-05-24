import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';

export default function CreateScreen() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <View className="flex-1 bg-dark px-6 justify-center">
      <Text className="text-white text-2xl font-bold mb-2">Create</Text>
      <Text className="text-muted text-sm mb-10">What do you want to share?</Text>

      <TouchableOpacity
        onPress={() => router.push('/create/post')}
        className="bg-dark-card border border-dark-border rounded-2xl p-5 mb-4"
      >
        <Ionicons name="camera-outline" size={32} color="#7C3AED" style={{ marginBottom: 12 }} />
        <Text className="text-white text-lg font-semibold">Create Post</Text>
        <Text className="text-muted text-sm mt-1">Share a photo, video or update with your followers</Text>
      </TouchableOpacity>

      {user?.isVerifiedHost ? (
        <TouchableOpacity
          onPress={() => router.push('/create/event')}
          className="bg-dark-card border border-primary/40 rounded-2xl p-5"
        >
          <Ionicons name="calendar-outline" size={32} color="#7C3AED" style={{ marginBottom: 12 }} />
          <Text className="text-white text-lg font-semibold">Create Event</Text>
          <Text className="text-muted text-sm mt-1">Publish an event and start getting bookings</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={() => router.push('/become-host')}
          className="bg-dark-card border border-dark-border rounded-2xl p-5"
        >
          <Ionicons name="star-outline" size={32} color="#6B7280" style={{ marginBottom: 12 }} />
          <Text className="text-white text-lg font-semibold">Become a Host</Text>
          <Text className="text-muted text-sm mt-1">Get verified to create and manage events</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
