import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

type JoinRequest = {
  _id: string;
  userId: { _id: string; name: string; username: string; profileImage?: string };
  eventId: { _id: string; title: string };
  message?: string;
  status: 'requested' | 'approved' | 'rejected' | 'expired';
  createdAt: string;
};

type HostEvent = {
  _id: string;
  title: string;
  date: string;
  status: string;
  bookedCount: number;
  capacity: number;
  privacy: string;
  images?: string[];
};

const PRIMARY = '#2563EB';
const CARD = '#111827';
const BORDER = '#1F2937';

export default function HostDashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'events' | 'requests'>('events');
  const [events, setEvents] = useState<HostEvent[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const { data } = await api.get('/events/mine');
      setEvents(data.data?.events ?? []);
    } catch {
      // silent
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const { data } = await api.get('/requests/host');
      setRequests(data.data?.requests ?? []);
    } catch {
      // silent
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
      fetchRequests();
    }, [fetchEvents, fetchRequests])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchEvents(), fetchRequests()]);
    setRefreshing(false);
  }, [fetchEvents, fetchRequests]);

  const handleApprove = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      await api.patch(`/requests/${requestId}/approve`);
      setRequests((prev) =>
        prev.map((r) => (r._id === requestId ? { ...r, status: 'approved' } : r))
      );
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      await api.patch(`/requests/${requestId}/reject`, { rejectionReason: 'Declined by host' });
      setRequests((prev) =>
        prev.map((r) => (r._id === requestId ? { ...r, status: 'rejected' } : r))
      );
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'requested');

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0F' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: 56,
          paddingBottom: 16,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: BORDER,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', flex: 1 }}>
          Host Dashboard
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/create/event')}
          style={{
            backgroundColor: PRIMARY,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Event</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View
        style={{
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: BORDER,
          backgroundColor: '#0A0A0F',
        }}
      >
        {(['events', 'requests'] as const).map((tab) => {
          const label = tab === 'events' ? 'My Events' : `Requests${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}`;
          const active = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 14,
                borderBottomWidth: 2,
                borderBottomColor: active ? PRIMARY : 'transparent',
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: active ? '#fff' : '#6B7280',
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        contentContainerStyle={{ padding: 16 }}
      >
        {activeTab === 'events' ? (
          loadingEvents ? (
            <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
          ) : events.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Ionicons name="calendar-outline" size={44} color="#374151" />
              <Text style={{ color: '#6B7280', marginTop: 12, fontSize: 15 }}>No events yet</Text>
              <TouchableOpacity
                onPress={() => router.push('/create/event')}
                style={{
                  marginTop: 20,
                  backgroundColor: PRIMARY,
                  borderRadius: 12,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Create Your First Event</Text>
              </TouchableOpacity>
            </View>
          ) : (
            events.map((ev) => <EventCard key={ev._id} event={ev} onPress={() => router.push(`/event/${ev._id}`)} />)
          )
        ) : loadingRequests ? (
          <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
        ) : requests.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Ionicons name="people-outline" size={44} color="#374151" />
            <Text style={{ color: '#6B7280', marginTop: 12, fontSize: 15 }}>No join requests yet</Text>
          </View>
        ) : (
          requests.map((req) => (
            <RequestCard
              key={req._id}
              request={req}
              actionLoading={actionLoading}
              onApprove={() => handleApprove(req._id)}
              onReject={() => handleReject(req._id)}
            />
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function EventCard({ event, onPress }: { event: HostEvent; onPress: () => void }) {
  const statusColors: Record<string, string> = {
    published: '#22c55e',
    draft: '#F59E0B',
    cancelled: '#ef4444',
    completed: '#6B7280',
    blocked: '#ef4444',
  };
  const fill = (event.capacity ?? 0) > 0 ? Math.min(100, Math.round(((event.bookedCount ?? 0) / event.capacity) * 100)) : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        backgroundColor: CARD,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: BORDER,
        marginBottom: 12,
        overflow: 'hidden',
      }}
    >
      {event.images?.[0] && (
        <Image
          source={{ uri: event.images[0] }}
          style={{ width: '100%', height: 120 }}
          resizeMode="cover"
        />
      )}
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, flex: 1 }} numberOfLines={1}>
            {event.title}
          </Text>
          <View
            style={{
              backgroundColor: (statusColors[event.status] ?? '#6B7280') + '22',
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 3,
              marginLeft: 8,
            }}
          >
            <Text style={{ color: statusColors[event.status] ?? '#6B7280', fontSize: 11, fontWeight: '600', textTransform: 'capitalize' }}>
              {event.status}
            </Text>
          </View>
        </View>
        <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 4 }}>
          {event.date ? new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
          {' · '}{event.privacy === 'private' ? 'Private' : 'Public'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 }}>
          <View style={{ flex: 1, height: 4, backgroundColor: '#1F2937', borderRadius: 2, overflow: 'hidden' }}>
            <View style={{ width: `${fill}%`, height: '100%', backgroundColor: '#2563EB', borderRadius: 2 }} />
          </View>
          <Text style={{ color: '#6B7280', fontSize: 12 }}>
            {event.bookedCount ?? 0}/{event.capacity ?? 0} booked
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function RequestCard({
  request,
  actionLoading,
  onApprove,
  onReject,
}: {
  request: JoinRequest;
  actionLoading: string | null;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isLoading = actionLoading === request._id;
  const isPending = request.status === 'requested';

  const statusStyle: Record<string, { bg: string; text: string; label: string }> = {
    approved: { bg: '#14532d', text: '#22c55e', label: 'Approved' },
    rejected: { bg: '#450a0a', text: '#ef4444', label: 'Rejected' },
    expired: { bg: '#1c1917', text: '#78716c', label: 'Expired' },
    requested: { bg: '#1e3a5f', text: '#60a5fa', label: 'Pending' },
  };
  const s = statusStyle[request.status] ?? statusStyle.requested;

  return (
    <View
      style={{
        backgroundColor: CARD,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: BORDER,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: '#1F2937',
            overflow: 'hidden',
            marginRight: 12,
          }}
        >
          {request.userId?.profileImage ? (
            <Image
              source={{ uri: request.userId.profileImage }}
              style={{ width: 42, height: 42 }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="person" size={20} color="#6B7280" />
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
            {request.userId?.name ?? 'Unknown'}
          </Text>
          <Text style={{ color: '#6B7280', fontSize: 12 }}>@{request.userId?.username ?? '—'}</Text>
        </View>
        <View style={{ backgroundColor: s.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ color: s.text, fontSize: 11, fontWeight: '600' }}>{s.label}</Text>
        </View>
      </View>

      {request.eventId?.title && (
        <Text style={{ color: '#6B7280', fontSize: 12, marginBottom: 6 }}>
          <Text style={{ color: '#9CA3AF' }}>Event: </Text>{request.eventId.title}
        </Text>
      )}
      {request.message ? (
        <Text style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic', marginBottom: 10 }}>
          "{request.message}"
        </Text>
      ) : null}

      <Text style={{ color: '#4B5563', fontSize: 11, marginBottom: isPending ? 12 : 0 }}>
        {new Date(request.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </Text>

      {isPending && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={onApprove}
            disabled={isLoading}
            style={{
              flex: 1,
              backgroundColor: '#14532d',
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: 'center',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#22c55e" />
            ) : (
              <Text style={{ color: '#22c55e', fontWeight: '600', fontSize: 13 }}>Approve</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onReject}
            disabled={isLoading}
            style={{
              flex: 1,
              backgroundColor: '#450a0a',
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: 'center',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Text style={{ color: '#ef4444', fontWeight: '600', fontSize: 13 }}>Reject</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
