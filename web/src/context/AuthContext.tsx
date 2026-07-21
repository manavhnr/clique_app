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
    if (!storedToken) { setIsLoading(false); return; }

    setToken(storedToken);

    // 1. Full user in localStorage — instant restore (normal path).
    const fullUser = storage.getUser();
    if (fullUser) {
      setUser(fullUser as User);
      setIsLoading(false);
      return;
    }

    // 2. Compact user in session cookie — instant restore for iOS PWA first launch.
    //    The session cookie is shared between Safari and the homescreen app; localStorage is not.
    //    We restore immediately from the compact user so the auth gate passes without an API round-trip,
    //    then background-refresh to get the full user into this context's localStorage.
    const sessionUser = storage.getSessionUser();
    if (sessionUser) {
      setUser(sessionUser as User);
      setIsLoading(false);
      api.get('/auth/me')
        .then(({ data }) => {
          const full = data.data.user as User;
          storage.setUser(full);
          setUser(full);
        })
        .catch(() => { /* compact user already set — app still works */ });
      return;
    }

    // 3. No user anywhere — must fetch from API (e.g. after storage wipe).
    api.get('/auth/me')
      .then(({ data }) => {
        const fetchedUser = data.data.user as User;
        storage.setUser(fetchedUser);
        setUser(fetchedUser);
      })
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403) {
          storage.clear();
          setToken(null);
        }
        // Network / server errors: keep token so next reload can retry.
      })
      .finally(() => setIsLoading(false));
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
