import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken } from '../api';
import { User } from '../types';

export const DEFAULT_USER: User = {
  id: 'default_user',
  name: 'ghiepp',
  email: 'ghiep865@gmail.com',
  avatar_url: '',
  timezone: 'Asia/Jakarta (WIB)',
  working_hours_start: '09:00',
  working_hours_end: '17:00',
  work_days: 'Senin - Jumat',
  notifications_enabled: true,
  created_at: new Date().toISOString(),
};

interface AuthContextType {
  user: User;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(DEFAULT_USER);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await api.getMe();
      if (res?.user) {
        setUser(res.user);
      }
    } catch {
      // Fall back seamlessly to default user
      setUser(DEFAULT_USER);
    }
  };

  const login = async (email: string, pass: string) => {
    try {
      const res = await api.login({ email, password: pass });
      if (res.token) setToken(res.token);
      if (res.user) setUser(res.user);
    } catch {
      // Keep working with default user
    }
  };

  const register = async (name: string, email: string, pass: string) => {
    try {
      const res = await api.register({ name, email, password: pass });
      if (res.token) setToken(res.token);
      if (res.user) setUser(res.user);
    } catch {
      // Keep working with default user
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      setToken(null);
      // Seamlessly keep user active as default user
      checkAuth();
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      const res = await api.updateProfile(data);
      if (res?.user) {
        setUser(res.user);
      } else {
        setUser((prev) => ({ ...prev, ...data }));
      }
    } catch {
      setUser((prev) => ({ ...prev, ...data }));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
