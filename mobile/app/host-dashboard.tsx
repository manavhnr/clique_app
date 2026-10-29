import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  StatusBar,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';

type JoinRequest = {
  _id: string;
  userId: { _id: string; name: string; username: string; profileImage?: string; cliquescore?: number };
  eventId: { _id: string; title: string; date?: string };
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
  price?: number;
};

export default function HostDashboardScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'events' | 'requests'>('events');
  const [requestFilter, setRequestFilter] = useState<'pending' | 'all'>('pending');

  const [events, setEvents] = useState<HostEvent[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const { data } = await api.get('/events/mine');
      setEvents(data.data?.events ?? []);
    } catch { } finally { setLoadingEvents(false); }
  }, []);

  const fetchRequests = useCallback(async (filter: 'pending' | 'all' = 'pending') => {
    setLoadingRequests(true);
    try {
      const status = filter === 'all' ? 'all' : 'requested';
      const { data } = await api.get('/requests/host', { params: { status, limit: 50 } });
      setRequests(data.data?.requests ?? []);
    } catch { } finally { setLoadingRequests(false); }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
      fetchRequests(requestFilter);
    }, [fetchEvents, fetchRequests, requestFilter])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchEvents(), fetchRequests(requestFilter)]);
    setRefreshing(false);
  }, [fetchEvents, fetchRequests, requestFilter]);

  const handleApprove = async (requestId: string) => {
    setActioning(requestId);
    try {
      await api.patch(`/requests/${requestId}/approve`);
      setRequests(prev => prev.map(r => r._id === requestId ? { ...r, status: 'approved' } : r));
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to approve');
    } finally { setActioning(null); }
  };

  const handleReject = async (requestId: string) => {
    setActioning(requestId);
    try {
      await api.patch(`/requests/${requestId}/reject`, { rejectionReason: 'Declined by host' });
      setRequests(prev => prev.map(r => r._id === requestId ? { ...r, status: 'rejected' } : r));
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to reject');
    } finally { setActioning(null); }
  };

  const pendingCount = requests.filter(r => r.status === 'requested').length;

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0F' }}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1F2937' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14, padding: 4 }}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', flex: 1 }}>Host Dashboard</Text>
          <TouchableOpacity
            onPress={() => router.push('/create/event')}
            style={{ backgroundColor: '#2563EB', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}
          >
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>+ Event</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab bar */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1F2937' }}>
        {(['events', 'requests'] as const).map(tab => {
          const active = activeTab === tab;
          const label = tab === 'events' ? 'My Events' : `Requests${pendingCount > 0 ? ` · ${pendingCount}` : ''}`;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 14,
                alignItems: 'center',
                borderBottomWidth: 2,
                borderBottomColor: active ? '#2563EB' : 'transparent',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: active ? '#fff' : '#6B7280' }}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'events' ? (
          loadingEvents
            ? <ActivityIndicator color="#2563EB" style={{ marginTop: 48 }} />
            : events.length === 0
              ? <EmptyState icon="calendar-outline" title="No events yet" sub="Create your first event to start hosting" action={() => router.push('/create/event')} actionLabel="Create Event" />
              : events.map(ev => <EventRow key={ev._id} event={ev} onPress={() => router.push(`/event/${ev._id}`)} />)
        ) : (
          <>
            {/* Pending / All toggle */}
            <View style={{ flexDirection: 'row', backgroundColor: '#111827', borderRadius: 12, padding: 4, marginBottom: 16 }}>
              {(['pending', 'all'] as const).map(f => (
                <TouchableOpacity
                  key={f}
                  onPress={() => { setRequestFilter(f); fetchRequests(f); }}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    alignItems: 'center',
                    borderRadius: 10,
                    backgroundColor: requestFilter === f ? '#1F2937' : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: requestFilter === f ? '#fff' : '#6B7280', textTransform: 'capitalize' }}>
                    {f === 'pending' ? 'Pending' : 'All'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loadingRequests
              ? <ActivityIndicator color="#2563EB" style={{ marginTop: 48 }} />
              : requests.length === 0
                ? <EmptyState icon="people-outline" title={requestFilter === 'pending' ? 'No pending requests' : 'No requests yet'} sub="Requests to join your private events will appear here" />
                : requests.map(req => (
                    <RequestRow
                      key={req._id}
                      request={req}
                      actioning={actioning}
                      onApprove={handleApprove}
                      onReject={handleReject}
                    />
                  ))
            }
          </>
        )}
      </ScrollView>
    </View>
  );
}

function EmptyState({ icon, title, sub, action, actionLabel }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Ionicons name={icon} size={32} color="#374151" />
      </View>
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 6, textAlign: 'center' }}>{title}</Text>
      <Text style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>{sub}</Text>
      {action && actionLabel && (
        <TouchableOpacity onPress={action} style={{ marginTop: 24, backgroundColor: '#2563EB', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function EventRow({ event, onPress }: { event: HostEvent; onPress: () => void }) {
  const statusColor: Record<string, string> = { published: '#22c55e', draft: '#F59E0B', cancelled: '#ef4444', completed: '#6B7280', blocked: '#ef4444' };
  const color = statusColor[event.status] ?? '#6B7280';
  const pct = event.capacity > 0 ? Math.min(100, Math.round((event.bookedCount / event.capacity) * 100)) : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{ flexDirection: 'row', backgroundColor: '#111827', borderRadius: 14, borderWidth: 1, borderColor: '#1F2937', marginBottom: 10, overflow: 'hidden' }}
    >
      {/* Thumbnail */}
      <View style={{ width: 80, height: 80, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {event.images?.[0]
          ? <Image source={{ uri: event.images[0] }} style={{ width: 80, height: 80 }} resizeMode="cover" />
          : <Ionicons name="calendar" size={28} color="#374151" />
        }
      </View>

      <View style={{ flex: 1, padding: 12, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14, flex: 1, marginRight: 8 }} numberOfLines={1}>
            {event.title}
          </Text>
          <View style={{ backgroundColor: color + '22', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text style={{ color, fontSize: 10, fontWeight: '700', textTransform: 'capitalize' }}>{event.status}</Text>
          </View>
        </View>

        <Text style={{ color: '#6B7280', fontSize: 12, marginBottom: 8 }}>
          {event.date ? new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
          {'  ·  '}{event.privacy === 'private' ? 'Private' : 'Public'}
          {event.price ? `  ·  ₹${event.price}` : '  ·  Free'}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, height: 3, backgroundColor: '#1F2937', borderRadius: 2, overflow: 'hidden' }}>
            <View style={{ width: `${pct}%`, height: '100%', backgroundColor: '#2563EB', borderRadius: 2 }} />
          </View>
          <Text style={{ color: '#6B7280', fontSize: 11 }}>{event.bookedCount}/{event.capacity}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function RequestRow({ request, actioning, onApprove, onReject }: {
  request: JoinRequest;
  actioning: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const busy = actioning === request._id;
  const pending = request.status === 'requested';

  const badge: Record<string, { bg: string; fg: string; label: string }> = {
    requested: { bg: '#1e3a5f', fg: '#60a5fa', label: 'Pending' },
    approved:  { bg: '#14532d', fg: '#22c55e', label: 'Approved' },
    rejected:  { bg: '#450a0a', fg: '#ef4444', label: 'Rejected' },
    expired:   { bg: '#1c1917', fg: '#78716c', label: 'Expired' },
  };
  const b = badge[request.status] ?? badge.requested;

  return (
    <View style={{ backgroundColor: '#111827', borderRadius: 14, borderWidth: 1, borderColor: '#1F2937', padding: 14, marginBottom: 10 }}>
      {/* User row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#1F2937', overflow: 'hidden', marginRight: 12 }}>
          {request.userId?.profileImage
            ? <Image source={{ uri: request.userId.profileImage }} style={{ width: 40, height: 40 }} resizeMode="cover" />
            : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="person" size={18} color="#6B7280" /></View>
          }
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>{request.userId?.name ?? '—'}</Text>
          <Text style={{ color: '#6B7280', fontSize: 12 }}>@{request.userId?.username ?? '—'}</Text>
        </View>
        <View style={{ backgroundColor: b.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ color: b.fg, fontSize: 11, fontWeight: '600' }}>{b.label}</Text>
        </View>
      </View>

      {/* Event */}
      {request.eventId?.title && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 }}>
          <Ionicons name="calendar-outline" size={12} color="#6B7280" />
          <Text style={{ color: '#6B7280', fontSize: 12, flex: 1 }} numberOfLines={1}>{request.eventId.title}</Text>
        </View>
      )}

      {/* Message */}
      {request.message ? (
        <Text style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic', marginBottom: 10, lineHeight: 18 }}>
          "{request.message}"
        </Text>
      ) : null}

      <Text style={{ color: '#4B5563', fontSize: 11, marginBottom: pending ? 12 : 0 }}>
        {new Date(request.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </Text>

      {pending && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={() => onApprove(request._id)}
            disabled={busy}
            style={{ flex: 1, backgroundColor: '#14532d', borderRadius: 10, paddingVertical: 11, alignItems: 'center', opacity: busy ? 0.6 : 1 }}
          >
            {busy ? <ActivityIndicator size="small" color="#22c55e" /> : <Text style={{ color: '#22c55e', fontWeight: '700', fontSize: 13 }}>Approve</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onReject(request._id)}
            disabled={busy}
            style={{ flex: 1, backgroundColor: '#450a0a', borderRadius: 10, paddingVertical: 11, alignItems: 'center', opacity: busy ? 0.6 : 1 }}
          >
            {busy ? <ActivityIndicator size="small" color="#ef4444" /> : <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 13 }}>Reject</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
