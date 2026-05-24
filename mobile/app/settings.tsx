import { View, Text, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

type RowProps = {
  icon: string;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  destructive?: boolean;
  right?: React.ReactNode;
  last?: boolean;
};

function Row({ icon, label, sublabel, onPress, destructive, right, last }: RowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: '#1F2937',
      }}
    >
      <Ionicons name={icon as any} size={20} color={destructive ? '#f87171' : '#6B7280'} style={{ marginRight: 14 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, color: destructive ? '#f87171' : '#ffffff' }}>{label}</Text>
        {sublabel ? <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{sublabel}</Text> : null}
      </View>
      {right ?? (onPress && !destructive && <Ionicons name="chevron-forward" size={16} color="#374151" />)}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7280', marginTop: 28, marginBottom: 6, paddingHorizontal: 20, letterSpacing: 1, textTransform: 'uppercase' }}>
      {title}
    </Text>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();

  const [pushEnabled, setPushEnabled] = useState(user?.pushNotificationsEnabled ?? true);
  const [privateAccount, setPrivateAccount] = useState(user?.isPrivate ?? false);
  const [savingPush, setSavingPush] = useState(false);
  const [savingPrivate, setSavingPrivate] = useState(false);

  const handleTogglePush = async (value: boolean) => {
    setPushEnabled(value);
    setSavingPush(true);
    try {
      const { data } = await api.patch('/users/settings', { pushNotificationsEnabled: value });
      await updateUser(data.data.user);
    } catch {
      setPushEnabled(!value); // revert on failure
      Alert.alert('Error', 'Failed to update notification setting.');
    } finally {
      setSavingPush(false);
    }
  };

  const handleTogglePrivate = async (value: boolean) => {
    setPrivateAccount(value);
    setSavingPrivate(true);
    try {
      const { data } = await api.patch('/users/settings', { isPrivate: value });
      await updateUser(data.data.user);
    } catch {
      setPrivateAccount(!value); // revert on failure
      Alert.alert('Error', 'Failed to update privacy setting.');
    } finally {
      setSavingPrivate(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/users/account');
              await logout();
              router.replace('/(auth)/welcome');
            } catch {
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/welcome');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0F' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#ffffff' }}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Account */}
        <SectionHeader title="Account" />
        <View style={{ backgroundColor: '#111827', borderRadius: 14, marginHorizontal: 16, overflow: 'hidden' }}>
          <Row
            icon="person-outline"
            label="Edit Profile"
            onPress={() => router.push('/edit-profile')}
          />
          <Row
            icon="call-outline"
            label="Change Phone Number"
            sublabel={user?.phone ? `Current: +91 ${user.phone}` : undefined}
            onPress={() => router.push('/change-phone')}
          />
          <Row
            icon="star-outline"
            label={user?.isVerifiedHost ? 'Host Dashboard' : 'Become a Host'}
            onPress={() => router.push(user?.isVerifiedHost ? '/host-dashboard' : '/become-host')}
            last
          />
        </View>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <View style={{ backgroundColor: '#111827', borderRadius: 14, marginHorizontal: 16, overflow: 'hidden' }}>
          <Row
            icon="notifications-outline"
            label="Push Notifications"
            sublabel={pushEnabled ? 'You will receive alerts for activity' : 'All push alerts are muted'}
            last
            right={
              <Switch
                value={pushEnabled}
                onValueChange={handleTogglePush}
                disabled={savingPush}
                trackColor={{ false: '#374151', true: '#2563EB' }}
                thumbColor="#ffffff"
              />
            }
          />
        </View>

        {/* Privacy */}
        <SectionHeader title="Privacy" />
        <View style={{ backgroundColor: '#111827', borderRadius: 14, marginHorizontal: 16, overflow: 'hidden' }}>
          <Row
            icon="lock-closed-outline"
            label="Private Account"
            sublabel={privateAccount ? 'Only approved followers can see your posts' : 'Anyone can view your profile and posts'}
            right={
              <Switch
                value={privateAccount}
                onValueChange={handleTogglePrivate}
                disabled={savingPrivate}
                trackColor={{ false: '#374151', true: '#2563EB' }}
                thumbColor="#ffffff"
              />
            }
          />
          <Row
            icon="ban-outline"
            label="Blocked Users"
            onPress={() => router.push('/blocked-users')}
            last
          />
        </View>

        {/* Support */}
        <SectionHeader title="Support" />
        <View style={{ backgroundColor: '#111827', borderRadius: 14, marginHorizontal: 16, overflow: 'hidden' }}>
          <Row
            icon="help-circle-outline"
            label="Help & Support"
            onPress={() => Alert.alert('Support', 'Reach us at support@clique.app')}
          />
          <Row
            icon="document-text-outline"
            label="Terms of Service"
            onPress={() => Alert.alert('Terms', 'Terms of Service will open here.')}
          />
          <Row
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => Alert.alert('Privacy', 'Privacy Policy will open here.')}
          />
          <Row
            icon="information-circle-outline"
            label="About Clique"
            onPress={() => Alert.alert('Clique', 'Version 1.0.0 — Social nightlife, reimagined.')}
            last
          />
        </View>

        {/* Danger zone */}
        <SectionHeader title="Account Actions" />
        <View style={{ backgroundColor: '#111827', borderRadius: 14, marginHorizontal: 16, overflow: 'hidden' }}>
          <Row
            icon="log-out-outline"
            label="Log Out"
            destructive
            onPress={handleLogout}
          />
          <Row
            icon="trash-outline"
            label="Delete Account"
            destructive
            last
            onPress={handleDeleteAccount}
          />
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}
