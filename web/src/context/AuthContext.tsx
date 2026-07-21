'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '@/types';
import { storage } from '@/lib/storage';
import api from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User, refreshToken?: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = storage.getToken();
    const storedUser = storage.getUser();
    if (storedToken) {
      setToken(storedToken);
      if (storedUser) {
        setUser(storedUser);
        setIsLoading(false);
      } else {
        // Token exists but user data is missing (localStorage empty or first run after
        // storage migration from cookie → localStorage). Re-fetch from the API.
        api.get('/auth/me')
          .then(({ data }) => {
            const fetchedUser = data.data.user as User;
            storage.setUser(fetchedUser);
            setUser(fetchedUser);
          })
          .catch((err: unknown) => {
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status === 401 || status === 403) {
              // Token is genuinely invalid — clear everything.
              storage.clear();
              setToken(null);
            }
            // Network errors or server down: keep the token in the cookie so
            // the next page load can retry. User will see the login redirect,
            // but their session is preserved for when the server is back up.
          })
          .finally(() => setIsLoading(false));
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((newToken: string, newUser: User, refreshToken?: string) => {
    storage.setToken(newToken);
    storage.setUser(newUser);
    if (refreshToken) storage.setRefresh(refreshToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    storage.clear();
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    storage.setUser(updatedUser);
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
