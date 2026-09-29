import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';
import { UserProfile } from '../types';
import { getApiErrorMessage } from '../api/client';
import axios from 'axios';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authModalOpen: boolean;
  authModalTab: 'login' | 'register';
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (email: string, username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateCoinsLocally: (newBalance: number) => void;
  openAuthModal: (tab?: 'login' | 'register') => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await authApi.getProfile();
      setUser(profile);
    } catch (err) {
      console.warn("Could not load user profile:", err);
      // A temporary network or server error must not discard a valid session.
      if (axios.isAxiosError(err) && [401, 403].includes(err.response?.status || 0)) {
        localStorage.removeItem('webtoonhub_access_token');
        localStorage.removeItem('webtoonhub_refresh_token');
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('webtoonhub_access_token');
    if (token) {
      refreshProfile().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [refreshProfile]);

  const login = async (email: string, password: string, closeOnSuccess = true) => {
    try {
      const response = await authApi.login({ email, password });
      const { access_token, refresh_token } = response.data;
      localStorage.setItem('webtoonhub_access_token', access_token);
      localStorage.setItem('webtoonhub_refresh_token', refresh_token);
      await refreshProfile();
      if (closeOnSuccess) {
        setAuthModalOpen(false);
      }
      return { success: true, message: response.message };
    } catch (err) {
      return { success: false, message: getApiErrorMessage(err, "Kirishda xatolik yuz berdi") };
    }
  };

  const register = async (email: string, username: string, password: string) => {
    try {
      const response = await authApi.register({ email, username, password });
      // After registration, auto-login without immediately dismissing the modal
      const loginResult = await login(email, password, false);
      if (!loginResult.success) return loginResult;
      return {
        success: true,
        message: response.message || "Ro'yxatdan muvaffaqiyatli o'tdingiz. Hisobingizga 50 Chaqmoq qo'shildi!"
      };
    } catch (err) {
      return { success: false, message: getApiErrorMessage(err, "Ro'yxatdan o'tishda xatolik yuz berdi") };
    }
  };

  const logout = () => {
    localStorage.removeItem('webtoonhub_access_token');
    localStorage.removeItem('webtoonhub_refresh_token');
    setUser(null);
  };

  const updateCoinsLocally = (newBalance: number) => {
    setUser((prev) => (prev ? { ...prev, lightning_coins: newBalance } : null));
  };

  const openAuthModal = (tab: 'login' | 'register' = 'login') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        authModalOpen,
        authModalTab,
        login,
        register,
        logout,
        refreshProfile,
        updateCoinsLocally,
        openAuthModal,
        closeAuthModal
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
