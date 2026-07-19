'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '@/types';
import { storage } from '@/lib/storage';

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
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    }
    setIsLoading(false);
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
