import { View, Text } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

export default function SplashScreen() {
  const { user, token, isLoading, updateUser, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user || !token) {
      router.replace('/(auth)/welcome');
      return;
    }

    // Validate token and refresh user state from server
    api.get('/auth/me')
      .then(({ data }) => {
        updateUser(data.data.user);
        const fresh = data.data.user;
        if (!fresh.hasCompletedSetup) {
          router.replace('/(auth)/setup');
        } else {
          router.replace('/(main)');
        }
      })
      .catch(() => {
        // Token expired or invalid — force re-login
        logout().then(() => router.replace('/(auth)/welcome'));
      });
  }, [isLoading]);

  return (
    <View className="flex-1 bg-dark items-center justify-center">
      <View className="items-center">
        <Text className="text-white font-bold tracking-widest" style={{ fontSize: 52 }}>
          CLIQUE
        </Text>
        <Text className="text-muted text-base mt-2 tracking-wider">Your social nightlife.</Text>
      </View>
    </View>
  );
}
