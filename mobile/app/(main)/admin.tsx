import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  TextInput,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const PRIMARY = '#2563EB';
const CARD = '#111827';
const BORDER = '#1F2937';
const RED = '#ef4444';
const GREEN = '#22c55e';

type AdminTab = 'overview' | 'users' | 'events' | 'hosts' | 'reports';

type StatCard = { label: string; value: number; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap; color: string };

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [hosts, setHosts] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');

  const fetchStats = useCallback(async () => {
    const { data } = await api.get('/admin/stats');
    setStats(data.data);
  }, []);

  const fetchUsers = useCallback(async (q?: string) => {
    const { data } = await api.get('/admin/users', { params: { limit: 50, q } });
    setUsers(data.data?.users ?? []);
  }, []);

  const fetchEvents = useCallback(async () => {
    const { data } = await api.get('/admin/events', { params: { limit: 50 } });
    setEvents(data.data?.events ?? []);
  }, []);

  const fetchHosts = useCallback(async () => {
    const { data } = await api.get('/admin/hosts', { params: { limit: 50 } });
    setHosts(data.data?.verifications ?? []);
  }, []);

  const fetchReports = useCallback(async () => {
    const { data } = await api.get('/admin/reports', { params: { limit: 50 } });
    setReports(data.data?.reports ?? []);
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      await Promise.all([fetchStats(), fetchUsers(), fetchEvents(), fetchHosts(), fetchReports()]);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [fetchStats, fetchUsers, fetchEvents, fetchHosts, fetchReports]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const handleBanUser = async (userId: string, isBanned: boolean) => {
    const action = isBanned ? 'unban' : 'ban';
    Alert.alert(
      `${isBanned ? 'Unban' : 'Ban'} User`,
      `Are you sure you want to ${action} this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isBanned ? 'Unban' : 'Ban',
          style: isBanned ? 'default' : 'destructive',
          onPress: async () => {
            setActionLoading(userId);
            try {
              await api.patch(`/admin/users/${userId}/${action}`);
              setUsers((prev) =>
                prev.map((u) => (u._id === userId ? { ...u, isBanned: !isBanned } : u))
              );
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message ?? 'Action failed');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleBlockEvent = async (eventId: string, isBlocked: boolean) => {
    const action = isBlocked ? 'unblock' : 'block';
    Alert.alert(
      `${isBlocked ? 'Unblock' : 'Block'} Event`,
      `Are you sure you want to ${action} this event?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isBlocked ? 'Unblock' : 'Block',
          style: isBlocked ? 'default' : 'destructive',
          onPress: async () => {
            setActionLoading(eventId);
            try {
              await api.patch(`/admin/events/${eventId}/${action}`);
              setEvents((prev) =>
                prev.map((e) =>
                  e._id === eventId ? { ...e, status: isBlocked ? 'published' : 'blocked' } : e
                )
              );
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message ?? 'Action failed');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleApproveHost = async (userId: string) => {
    Alert.alert('Approve Host', 'Approve this host application?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setActionLoading(userId);
          try {
            await api.patch(`/admin/hosts/${userId}/approve`);
            setHosts((prev) =>
              prev.map((h) =>
                h.userId?._id === userId ? { ...h, status: 'approved' } : h
              )
            );
            await fetchStats();
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message ?? 'Approval failed');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const handleRejectHost = async (userId: string) => {
    Alert.alert('Reject Application', 'Reject this host application?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(userId);
          try {
            await api.patch(`/admin/hosts/${userId}/reject`, {
              rejectionReason: 'Application rejected by admin',
            });
            setHosts((prev) =>
              prev.map((h) =>
                h.userId?._id === userId ? { ...h, status: 'rejected' } : h
              )
            );
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message ?? 'Rejection failed');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const handleResolveReport = async (reportId: string, resolution: 'resolved' | 'dismissed') => {
    setActionLoading(reportId);
    try {
      await api.patch(`/admin/reports/${reportId}/resolve`, { resolution });
      setReports((prev) =>
        prev.map((r) => (r._id === reportId ? { ...r, status: resolution } : r))
      );
      await fetchStats();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  const TABS: { id: AdminTab; label: string; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap }[] = [
    { id: 'overview', label: 'Overview', icon: 'grid-outline' },
    { id: 'users', label: 'Users', icon: 'people-outline' },
    { id: 'events', label: 'Events', icon: 'calendar-outline' },
    { id: 'hosts', label: 'Hosts', icon: 'star-outline' },
    { id: 'reports', label: 'Reports', icon: 'flag-outline' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0F' }}>
      {/* Header */}
      <View
        style={{
          paddingTop: 56,
          paddingBottom: 14,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: BORDER,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: '#1e3a5f',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Ionicons name="shield-checkmark" size={20} color={PRIMARY} />
        </View>
        <View>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Admin Panel</Text>
          <Text style={{ color: '#6B7280', fontSize: 12 }}>@{user?.username}</Text>
        </View>
      </View>

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ borderBottomWidth: 1, borderBottomColor: BORDER, maxHeight: 52 }}
        contentContainerStyle={{ paddingHorizontal: 12 }}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 14,
              paddingVertical: 14,
              gap: 6,
              borderBottomWidth: 2,
              borderBottomColor: activeTab === tab.id ? PRIMARY : 'transparent',
            }}
          >
            <Ionicons
              name={tab.icon}
              size={15}
              color={activeTab === tab.id ? '#fff' : '#6B7280'}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: activeTab === tab.id ? '#fff' : '#6B7280',
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        contentContainerStyle={{ padding: 16 }}
      >
        {activeTab === 'overview' && <OverviewTab stats={stats} />}

        {activeTab === 'users' && (
          <UsersTab
            users={users}
            search={userSearch}
            onSearch={(q) => {
              setUserSearch(q);
              fetchUsers(q);
            }}
            actionLoading={actionLoading}
            onBan={handleBanUser}
          />
        )}

        {activeTab === 'events' && (
          <EventsTab events={events} actionLoading={actionLoading} onBlock={handleBlockEvent} />
        )}

        {activeTab === 'hosts' && (
          <HostsTab
            hosts={hosts}
            actionLoading={actionLoading}
            onApprove={handleApproveHost}
            onReject={handleRejectHost}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsTab reports={reports} actionLoading={actionLoading} onResolve={handleResolveReport} />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Sub-tabs ─────────────────────────────────────────────────────────────────

function OverviewTab({ stats }: { stats: any }) {
  const cards: StatCard[] = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: 'people', color: PRIMARY },
    { label: 'Live Events', value: stats?.totalEvents ?? 0, icon: 'calendar', color: '#22c55e' },
    { label: 'Open Reports', value: stats?.openReports ?? 0, icon: 'flag', color: '#ef4444' },
    { label: 'Bookings', value: stats?.totalBookings ?? 0, icon: 'ticket', color: '#F59E0B' },
  ];

  return (
    <View>
      <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 14 }}>
        PLATFORM OVERVIEW
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {cards.map((c) => (
          <View
            key={c.label}
            style={{
              width: '47%',
              backgroundColor: CARD,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: BORDER,
              padding: 16,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: c.color + '22',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Ionicons name={c.icon} size={18} color={c.color} />
            </View>
            <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800' }}>{c.value}</Text>
            <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>{c.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function UsersTab({
  users,
  search,
  onSearch,
  actionLoading,
  onBan,
}: {
  users: any[];
  search: string;
  onSearch: (q: string) => void;
  actionLoading: string | null;
  onBan: (id: string, banned: boolean) => void;
}) {
  return (
    <View>
      <TextInput
        value={search}
        onChangeText={onSearch}
        placeholder="Search by name, username, phone..."
        placeholderTextColor="#4B5563"
        style={{
          backgroundColor: CARD,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: BORDER,
          color: '#fff',
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 14,
          marginBottom: 14,
        }}
      />
      {users.length === 0 && (
        <Text style={{ color: '#6B7280', textAlign: 'center', marginTop: 40 }}>No users found</Text>
      )}
      {users.map((u) => (
        <View
          key={u._id}
          style={{
            backgroundColor: CARD,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: BORDER,
            padding: 14,
            marginBottom: 10,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
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
            {u.profileImage ? (
              <Image source={{ uri: u.profileImage }} style={{ width: 42, height: 42 }} resizeMode="cover" />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="person" size={20} color="#6B7280" />
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>{u.name}</Text>
              {u.isVerifiedHost && (
                <Ionicons name="checkmark-circle" size={14} color={PRIMARY} />
              )}
              {u.isBanned && (
                <View style={{ backgroundColor: '#450a0a', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 }}>
                  <Text style={{ color: RED, fontSize: 10, fontWeight: '600' }}>BANNED</Text>
                </View>
              )}
            </View>
            <Text style={{ color: '#6B7280', fontSize: 12 }}>@{u.username} · {u.role}</Text>
            <Text style={{ color: '#4B5563', fontSize: 11, marginTop: 1 }}>Score: {u.cliquescore ?? 0}</Text>
          </View>
          {u.role !== 'admin' && (
            <TouchableOpacity
              onPress={() => onBan(u._id, u.isBanned)}
              disabled={actionLoading === u._id}
              style={{
                backgroundColor: u.isBanned ? '#14532d' : '#450a0a',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 7,
                opacity: actionLoading === u._id ? 0.5 : 1,
              }}
            >
              {actionLoading === u._id ? (
                <ActivityIndicator size="small" color={u.isBanned ? GREEN : RED} />
              ) : (
                <Text style={{ color: u.isBanned ? GREEN : RED, fontSize: 12, fontWeight: '600' }}>
                  {u.isBanned ? 'Unban' : 'Ban'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
}

function EventsTab({
  events,
  actionLoading,
  onBlock,
}: {
  events: any[];
  actionLoading: string | null;
  onBlock: (id: string, blocked: boolean) => void;
}) {
  const statusColors: Record<string, string> = {
    published: GREEN,
    draft: '#F59E0B',
    cancelled: RED,
    completed: '#6B7280',
    blocked: RED,
  };

  return (
    <View>
      {events.length === 0 && (
        <Text style={{ color: '#6B7280', textAlign: 'center', marginTop: 40 }}>No events found</Text>
      )}
      {events.map((ev) => (
        <View
          key={ev._id}
          style={{
            backgroundColor: CARD,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: BORDER,
            padding: 14,
            marginBottom: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }} numberOfLines={1}>
                {ev.title}
              </Text>
              <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>
                Host: {ev.hostId?.name ?? '—'} (@{ev.hostId?.username ?? '—'})
              </Text>
              <Text style={{ color: '#4B5563', fontSize: 12, marginTop: 2 }}>
                {ev.date ? new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                {' · '}{ev.privacy} · {ev.bookedCount ?? 0}/{ev.capacity ?? 0} booked
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <View
                style={{
                  backgroundColor: (statusColors[ev.status] ?? '#6B7280') + '22',
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text
                  style={{
                    color: statusColors[ev.status] ?? '#6B7280',
                    fontSize: 11,
                    fontWeight: '600',
                    textTransform: 'capitalize',
                  }}
                >
                  {ev.status}
                </Text>
              </View>
              {ev.status !== 'cancelled' && ev.status !== 'completed' && (
                <TouchableOpacity
                  onPress={() => onBlock(ev._id, ev.status === 'blocked')}
                  disabled={actionLoading === ev._id}
                  style={{
                    backgroundColor: ev.status === 'blocked' ? '#14532d' : '#450a0a',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    opacity: actionLoading === ev._id ? 0.5 : 1,
                  }}
                >
                  {actionLoading === ev._id ? (
                    <ActivityIndicator size="small" color={ev.status === 'blocked' ? GREEN : RED} />
                  ) : (
                    <Text
                      style={{
                        color: ev.status === 'blocked' ? GREEN : RED,
                        fontSize: 12,
                        fontWeight: '600',
                      }}
                    >
                      {ev.status === 'blocked' ? 'Unblock' : 'Block'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function HostsTab({
  hosts,
  actionLoading,
  onApprove,
  onReject,
}: {
  hosts: any[];
  actionLoading: string | null;
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
}) {
  const statusStyle: Record<string, { bg: string; text: string }> = {
    approved: { bg: '#14532d', text: GREEN },
    rejected: { bg: '#450a0a', text: RED },
    pending: { bg: '#1e3a5f', text: '#60a5fa' },
  };

  return (
    <View>
      {hosts.length === 0 && (
        <Text style={{ color: '#6B7280', textAlign: 'center', marginTop: 40 }}>No host applications</Text>
      )}
      {hosts.map((h) => {
        const u = h.userId;
        const s = statusStyle[h.status] ?? statusStyle.pending;
        const isLoading = actionLoading === u?._id;
        return (
          <View
            key={h._id}
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
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#1F2937',
                  overflow: 'hidden',
                  marginRight: 12,
                }}
              >
                {u?.profileImage ? (
                  <Image source={{ uri: u.profileImage }} style={{ width: 44, height: 44 }} resizeMode="cover" />
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="person" size={22} color="#6B7280" />
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>{u?.name ?? '—'}</Text>
                <Text style={{ color: '#6B7280', fontSize: 12 }}>@{u?.username ?? '—'} · {u?.phone ?? '—'}</Text>
                {u?.city && <Text style={{ color: '#4B5563', fontSize: 11 }}>{u.city}</Text>}
              </View>
              <View style={{ backgroundColor: s.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: s.text, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' }}>
                  {h.status}
                </Text>
              </View>
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10, marginTop: 2 }}>
              <Text style={{ color: '#4B5563', fontSize: 12 }}>
                Doc type: <Text style={{ color: '#9CA3AF' }}>{h.documentType ?? '—'}</Text>
              </Text>
              {h.rejectionReason && (
                <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 4 }}>
                  Reason: <Text style={{ color: RED }}>{h.rejectionReason}</Text>
                </Text>
              )}
              <Text style={{ color: '#4B5563', fontSize: 11, marginTop: 4 }}>
                Applied: {h.createdAt ? new Date(h.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
              </Text>
            </View>

            {h.status === 'pending' && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => onApprove(u?._id)}
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
                    <ActivityIndicator size="small" color={GREEN} />
                  ) : (
                    <Text style={{ color: GREEN, fontWeight: '600', fontSize: 13 }}>Approve</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onReject(u?._id)}
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
                    <ActivityIndicator size="small" color={RED} />
                  ) : (
                    <Text style={{ color: RED, fontWeight: '600', fontSize: 13 }}>Reject</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function ReportsTab({
  reports,
  actionLoading,
  onResolve,
}: {
  reports: any[];
  actionLoading: string | null;
  onResolve: (id: string, resolution: 'resolved' | 'dismissed') => void;
}) {
  const statusStyle: Record<string, { bg: string; text: string }> = {
    open: { bg: '#450a0a', text: RED },
    resolved: { bg: '#14532d', text: GREEN },
    dismissed: { bg: '#1F2937', text: '#6B7280' },
  };

  return (
    <View>
      {reports.length === 0 && (
        <Text style={{ color: '#6B7280', textAlign: 'center', marginTop: 40 }}>No reports</Text>
      )}
      {reports.map((r) => {
        const s = statusStyle[r.status] ?? statusStyle.open;
        const isLoading = actionLoading === r._id;
        return (
          <View
            key={r._id}
            style={{
              backgroundColor: CARD,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: BORDER,
              padding: 14,
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14, textTransform: 'capitalize' }}>
                    {r.targetType} Report
                  </Text>
                  <View style={{ backgroundColor: s.bg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: s.text, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' }}>
                      {r.status}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>
                  By: {r.reporterId?.name ?? '—'} (@{r.reporterId?.username ?? '—'})
                </Text>
              </View>
            </View>

            <Text style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 4 }}>
              <Text style={{ color: '#6B7280' }}>Reason: </Text>{r.reason}
            </Text>
            {r.description && (
              <Text style={{ color: '#6B7280', fontSize: 12, fontStyle: 'italic', marginBottom: 8 }}>
                "{r.description}"
              </Text>
            )}
            <Text style={{ color: '#4B5563', fontSize: 11 }}>
              {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
            </Text>

            {r.status === 'open' && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => onResolve(r._id, 'resolved')}
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
                    <ActivityIndicator size="small" color={GREEN} />
                  ) : (
                    <Text style={{ color: GREEN, fontWeight: '600', fontSize: 13 }}>Resolve</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onResolve(r._id, 'dismissed')}
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    backgroundColor: '#1F2937',
                    borderRadius: 10,
                    paddingVertical: 10,
                    alignItems: 'center',
                    opacity: isLoading ? 0.6 : 1,
                  }}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#6B7280" />
                  ) : (
                    <Text style={{ color: '#9CA3AF', fontWeight: '600', fontSize: 13 }}>Dismiss</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
