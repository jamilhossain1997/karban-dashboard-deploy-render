'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, AuthUser } from './api';

interface AuthContextValue {
  user: AuthUser | null;
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const storedUser = window.localStorage.getItem('kanban_user');
    const storedToken = window.localStorage.getItem('kanban_token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    setInitializing(false);
  }, []);

  const persist = (accessToken: string, authedUser: AuthUser) => {
    window.localStorage.setItem('kanban_token', accessToken);
    window.localStorage.setItem('kanban_user', JSON.stringify(authedUser));
    setUser(authedUser);
  };

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    persist(data.accessToken, data.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    persist(data.accessToken, data.user);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem('kanban_token');
    window.localStorage.removeItem('kanban_user');
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, initializing, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
