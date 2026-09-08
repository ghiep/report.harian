import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken } from '../api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch {
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, pass: string) => {
    const res = await api.login({ email, password: pass });
    setToken(res.token);
    setUser(res.user);
  };

  const register = async (name: string, email: string, pass: string) => {
    const res = await api.register({ name, email, password: pass });
    setToken(res.token);
    setUser(res.user);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    const res = await api.updateProfile(data);
    setUser(res.user);
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
