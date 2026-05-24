import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    api.get(`/events/${id}`)
      .then(({ data }) => setEvent(data.data?.event))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleBook = async () => {
    if (!event) return;
    setBooking(true);
    try {
      await api.post('/bookings', { eventId: event._id });
      Alert.alert('Booked!', 'Your booking is confirmed. Check your passes.', [
        { text: 'View Pass', onPress: () => router.push('/(main)/passes') },
        { text: 'OK' },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  const handleRequest = async () => {
    if (!event) return;
    try {
      await api.post('/requests', { eventId: event._id });
      Alert.alert('Requested', 'Your access request has been sent to the host.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Request failed');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-dark items-center justify-center">
        <ActivityIndicator color="#7C3AED" />
      </View>
    );
  }

  if (!event) {
    return (
      <View className="flex-1 bg-dark items-center justify-center px-6">
        <Text className="text-white text-lg">Event not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-primary">← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const spotsLeft = (event.capacity ?? 0) - (event.bookedCount ?? 0);
  const isFull = spotsLeft <= 0;
  const isOwnEvent = event.hostId?._id === user?._id;

  return (
    <View className="flex-1 bg-dark">
      <ScrollView showsVerticalScrollIndicator={false}>
        {event.images?.[0] ? (
          <Image source={{ uri: event.images[0] }} className="w-full h-64" resizeMode="cover" />
        ) : (
          <View className="w-full h-64 bg-primary/20 items-center justify-center">
            <Ionicons name="calendar" size={80} color="#7C3AED" />
          </View>
        )}

        <TouchableOpacity onPress={() => router.back()} className="absolute top-12 left-5 bg-black/40 rounded-full p-2">
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        <View className="px-5 pt-5 pb-32">
          <View className="flex-row items-start justify-between mb-3">
            <Text className="text-white text-2xl font-bold flex-1 mr-3">{event.title}</Text>
            <View className={`flex-row items-center gap-1 px-3 py-1 rounded-full ${event.privacy === 'private' ? 'bg-yellow-400/20' : 'bg-green-400/20'}`}>
              {event.privacy === 'private' && <Ionicons name="lock-closed" size={10} color="#facc15" />}
              <Text className={`text-xs font-medium ${event.privacy === 'private' ? 'text-yellow-400' : 'text-green-400'}`}>
                {event.privacy === 'private' ? 'Private' : 'Public'}
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={() => router.push(`/user/${event.hostId?._id}`)} className="flex-row items-center mb-5">
            <View className="w-8 h-8 rounded-full bg-dark-card border border-dark-border items-center justify-center mr-2 overflow-hidden">
              {event.hostId?.profileImage ? (
                <Image source={{ uri: event.hostId.profileImage }} style={{ width: 32, height: 32 }} />
              ) : (
                <Ionicons name="person" size={16} color="#6B7280" />
              )}
            </View>
            <Text className="text-primary text-sm font-medium">{event.hostId?.name ?? 'Host'}</Text>
            {event.hostId?.isVerifiedHost && (
              <Ionicons name="checkmark-circle" size={14} color="#7C3AED" style={{ marginLeft: 4 }} />
            )}
          </TouchableOpacity>

          <View className="bg-dark-card border border-dark-border rounded-2xl p-4 mb-4 gap-3">
            <InfoRow
              icon="calendar-outline"
              label={event.date ? new Date(event.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
            />
            <InfoRow icon="time-outline" label={`${event.startTime} – ${event.endTime}`} />
            <InfoRow icon="location-outline" label={event.locationName} />
            <InfoRow icon="people-outline" label={isFull ? 'Sold out' : `${spotsLeft} spots left`} highlight={isFull} />
            <InfoRow icon="cash-outline" label={event.price > 0 ? `₹${event.price}` : 'Free Entry'} />
          </View>

          {event.description ? (
            <View className="mb-4">
              <Text className="text-white font-semibold mb-2">About</Text>
              <Text className="text-muted text-sm leading-5">{event.description}</Text>
            </View>
          ) : null}

          {event.vibeTags?.length ? (
            <View className="flex-row flex-wrap gap-2 mb-4">
              {event.vibeTags.map((tag: string) => (
                <View key={tag} className="bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                  <Text className="text-primary text-xs">{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {event.rules ? (
            <View className="mb-4">
              <Text className="text-white font-semibold mb-2">Rules</Text>
              <Text className="text-muted text-sm leading-5">{event.rules}</Text>
            </View>
          ) : null}

          {event.refundPolicy ? (
            <View className="mb-4">
              <Text className="text-white font-semibold mb-2">Refund Policy</Text>
              <Text className="text-muted text-sm leading-5">{event.refundPolicy}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {!isOwnEvent && (
        <View className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-dark border-t border-dark-border">
          {event.privacy === 'private' && !event.userBookingStatus ? (
            <TouchableOpacity onPress={handleRequest} className="bg-accent rounded-xl py-4 items-center">
              <Text className="text-dark font-semibold text-base">Request Access</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleBook}
              disabled={isFull || booking || event.userBookingStatus === 'confirmed'}
              className={`rounded-xl py-4 items-center ${
                isFull || event.userBookingStatus === 'confirmed' ? 'bg-dark-card' : booking ? 'bg-primary/60' : 'bg-primary'
              }`}
            >
              {event.userBookingStatus === 'confirmed' ? (
                <View className="flex-row items-center gap-2">
                  <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                  <Text className="text-white font-semibold text-base">Booked</Text>
                </View>
              ) : (
                <Text className="text-white font-semibold text-base">
                  {isFull ? 'Sold Out' : booking ? 'Booking...' : event.price > 0 ? `Book for ₹${event.price}` : 'Book Free Pass'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function InfoRow({ icon, label, highlight }: { icon: keyof typeof Ionicons.glyphMap; label: string; highlight?: boolean }) {
  return (
    <View className="flex-row items-center">
      <Ionicons name={icon} size={16} color="#6B7280" style={{ marginRight: 10, width: 18 }} />
      <Text className={`text-sm flex-1 ${highlight ? 'text-red-400' : 'text-white'}`}>{label}</Text>
    </View>
  );
}
