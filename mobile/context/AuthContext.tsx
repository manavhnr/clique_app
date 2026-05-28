import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_BASE_URL } from '@/constants/api';

export type User = {
  _id: string;
  name: string;
  username: string;
  phone: string;
  profileImage?: string;
  bio?: string;
  city?: string;
  role: 'attendee' | 'host' | 'admin';
  isVerifiedHost: boolean;
  hasCompletedSetup: boolean;
  vibeTags: string[];
  interests: string[];
  followerCount: number;
  followingCount: number;
  postCount: number;
  cliquescore: number;
  isPrivate: boolean;
  pushNotificationsEnabled: boolean;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  login: (token: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const storedToken = await SecureStore.getItemAsync('auth_token');
      const storedRefresh = await SecureStore.getItemAsync('auth_refresh_token');
      const storedUser = await SecureStore.getItemAsync('auth_user');
      if (storedToken && storedUser) {
        // Set cached values immediately so the app can render
        setToken(storedToken);
        setRefreshToken(storedRefresh);
        setUser(JSON.parse(storedUser));
        // Refresh user + token from server to pick up role/status changes (e.g. admin, host approval)
        try {
          const { data } = await axios.get(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          const freshUser: User = data.data?.user;
          const freshToken: string | undefined = data.data?.token;
          if (freshUser) {
            await SecureStore.setItemAsync('auth_user', JSON.stringify(freshUser));
            setUser(freshUser);
          }
          if (freshToken) {
            await SecureStore.setItemAsync('auth_token', freshToken);
            setToken(freshToken);
          }
        } catch {
          // Network failure or token expired — keep cached values, let other flows handle expiry
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const login = async (newToken: string, newRefreshToken: string, newUser: User) => {
    await SecureStore.setItemAsync('auth_token', newToken);
    await SecureStore.setItemAsync('auth_refresh_token', newRefreshToken);
    await SecureStore.setItemAsync('auth_user', JSON.stringify(newUser));
    setToken(newToken);
    setRefreshToken(newRefreshToken);
    setUser(newUser);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('auth_refresh_token');
    await SecureStore.deleteItemAsync('auth_user');
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  const updateUser = async (updated: User) => {
    await SecureStore.setItemAsync('auth_user', JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, token, refreshToken, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
