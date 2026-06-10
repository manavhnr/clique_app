import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const { width } = Dimensions.get('window');
const COVER_H = Math.round(width * 0.56);

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    api.get(`/events/${id}`)
      .then(({ data }) => {
        setEvent(data.data?.event);
        setSaved(data.data?.event?.isSaved ?? false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleBook = async () => {
    if (!event) return;
    setBooking(true);
    try {
      await api.post('/bookings', { eventId: event._id });
      Alert.alert('Booked!', 'Your pass is confirmed.', [
        { text: 'View Pass', onPress: () => router.push('/(main)/passes') },
        { text: 'OK' },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Booking failed');
    } finally { setBooking(false); }
  };

  const handleRequest = async () => {
    if (!event) return;
    try {
      await api.post('/requests', { eventId: event._id });
      Alert.alert('Requested', 'Your access request has been sent.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Request failed');
    }
  };

  const handleSave = async () => {
    if (!event) return;
    try {
      if (saved) {
        await api.delete(`/events/${event._id}/save`);
      } else {
        await api.post(`/events/${event._id}/save`);
      }
      setSaved(s => !s);
    } catch { }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#2563EB" size="large" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Ionicons name="calendar-outline" size={48} color="#374151" />
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>Event not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#2563EB', fontSize: 14 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const spotsLeft = (event.capacity ?? 0) - (event.bookedCount ?? 0);
  const isFull = spotsLeft <= 0;
  const isOwnEvent = event.hostId?._id === user?._id;
  const isPrivate = event.privacy === 'private';
  const isBooked = event.userBookingStatus === 'confirmed';
  const dateStr = event.date
    ? new Date(event.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0F' }}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Cover image */}
        <View style={{ width, height: COVER_H, backgroundColor: '#111827' }}>
          {event.images?.[0]
            ? <Image source={{ uri: event.images[0] }} style={{ width, height: COVER_H }} resizeMode="cover" />
            : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="calendar" size={56} color="#374151" />
              </View>
          }
          {/* Gradient overlay for back/save buttons */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between', padding: 16, paddingTop: 52 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color={saved ? '#F59E0B' : '#fff'} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={{ padding: 20 }}>
          {/* Title + privacy badge */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', flex: 1, lineHeight: 28, marginRight: 12 }}>
              {event.title}
            </Text>
            <View style={{
              backgroundColor: isPrivate ? '#422006' : '#14532d',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
              marginTop: 4,
            }}>
              <Text style={{ color: isPrivate ? '#fb923c' : '#4ade80', fontSize: 11, fontWeight: '700' }}>
                {isPrivate ? 'Private' : 'Public'}
              </Text>
            </View>
          </View>

          {/* Host */}
          <TouchableOpacity
            onPress={() => router.push(`/user/${event.hostId?._id}`)}
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
            activeOpacity={0.7}
          >
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#1F2937', overflow: 'hidden', marginRight: 10 }}>
              {event.hostId?.profileImage
                ? <Image source={{ uri: event.hostId.profileImage }} style={{ width: 32, height: 32 }} resizeMode="cover" />
                : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="person" size={15} color="#6B7280" />
                  </View>
              }
            </View>
            <Text style={{ color: '#2563EB', fontSize: 14, fontWeight: '600' }}>{event.hostId?.name ?? 'Host'}</Text>
            {event.hostId?.isVerifiedHost && (
              <Ionicons name="checkmark-circle" size={14} color="#2563EB" style={{ marginLeft: 4 }} />
            )}
          </TouchableOpacity>

          {/* Info pills row */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
            {dateStr && <InfoPill icon="calendar-outline" label={dateStr} />}
            {(event.startTime || event.endTime) && (
              <InfoPill icon="time-outline" label={[event.startTime, event.endTime].filter(Boolean).join(' – ')} />
            )}
            {event.locationName && <InfoPill icon="location-outline" label={event.locationName} />}
            <InfoPill
              icon="people-outline"
              label={isFull ? 'Sold out' : `${spotsLeft} spots left`}
              accent={isFull ? '#ef4444' : undefined}
            />
            <InfoPill
              icon="cash-outline"
              label={event.price > 0 ? `₹${event.price}` : 'Free Entry'}
              accent={event.price > 0 ? '#F59E0B' : '#22c55e'}
            />
          </View>

          {/* Description */}
          {event.description ? (
            <Section title="About">
              <Text style={{ color: '#9CA3AF', fontSize: 14, lineHeight: 22 }}>{event.description}</Text>
            </Section>
          ) : null}

          {/* Vibe tags */}
          {event.vibeTags?.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {event.vibeTags.map((tag: string) => (
                <View key={tag} style={{ backgroundColor: '#1e3a5f', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ color: '#60a5fa', fontSize: 12, fontWeight: '500' }}>#{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Rules */}
          {event.rules ? (
            <Section title="Rules">
              <Text style={{ color: '#9CA3AF', fontSize: 14, lineHeight: 22 }}>{event.rules}</Text>
            </Section>
          ) : null}

          {/* Refund */}
          {event.refundPolicy ? (
            <Section title="Refund Policy">
              <Text style={{ color: '#9CA3AF', fontSize: 14, lineHeight: 22 }}>{event.refundPolicy}</Text>
            </Section>
          ) : null}
        </View>
      </ScrollView>

      {/* CTA */}
      {!isOwnEvent && (
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: '#0A0A0F',
          borderTopWidth: 1, borderTopColor: '#1F2937',
          padding: 16, paddingBottom: 32,
        }}>
          {isBooked ? (
            <View style={{ backgroundColor: '#111827', borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              <Text style={{ color: '#22c55e', fontWeight: '700', fontSize: 15 }}>You're going!</Text>
            </View>
          ) : isPrivate && !event.userBookingStatus ? (
            <TouchableOpacity
              onPress={handleRequest}
              style={{ backgroundColor: '#F59E0B', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#000', fontWeight: '700', fontSize: 15 }}>Request Access</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleBook}
              disabled={isFull || booking}
              style={{
                backgroundColor: isFull ? '#1F2937' : booking ? '#1D4ED8' : '#2563EB',
                borderRadius: 14, paddingVertical: 16, alignItems: 'center',
              }}
              activeOpacity={0.85}
            >
              {booking
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: isFull ? '#6B7280' : '#fff', fontWeight: '700', fontSize: 15 }}>
                    {isFull ? 'Sold Out' : event.price > 0 ? `Book · ₹${event.price}` : 'Get Free Pass'}
                  </Text>
              }
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function InfoPill({ icon, label, accent }: { icon: keyof typeof Ionicons.glyphMap; label: string; accent?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 6, borderWidth: 1, borderColor: '#1F2937' }}>
      <Ionicons name={icon} size={13} color={accent ?? '#6B7280'} />
      <Text style={{ color: accent ?? '#D1D5DB', fontSize: 13, fontWeight: '500' }} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 8 }}>{title}</Text>
      {children}
    </View>
  );
}
