import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { authApi } from '../api/auth';
import { UserProfile } from '../types';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, clearReaderSession, getApiErrorMessage } from '../api/client';
import { useLanguage } from './LanguageContext';

interface AuthContextType {
  user: UserProfile | null; isAuthenticated: boolean; isLoading: boolean; profileError: string | null;
  authModalOpen: boolean; authModalTab: 'login' | 'register';
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (email: string, username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void; refreshProfile: () => Promise<void>;
  updateCoinsLocally: (balance: number) => void;
  openAuthModal: (tab?: 'login' | 'register') => void; closeAuthModal: () => void;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useLanguage();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const version = useRef(0);
  const profileSequence = useRef(0);
  const alive = useRef(true);
  const refreshProfile = useCallback(async () => {
    const requestVersion = version.current;
    const requestSequence = ++profileSequence.current;
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) { setUser(null); setProfileError(null); return; }
    try {
      const profile = await authApi.getProfile();
      if (alive.current && version.current === requestVersion && profileSequence.current === requestSequence && localStorage.getItem(ACCESS_TOKEN_KEY)) {
        setUser(profile); setProfileError(null);
      }
    } catch (error) {
      if (alive.current && version.current === requestVersion && profileSequence.current === requestSequence) {
        if (axios.isAxiosError(error) && [401, 403].includes(error.response?.status || 0)) clearReaderSession();
        else setProfileError('readerFix.profileError');
      }
      throw error;
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    const ended = () => { version.current++; setUser(null); setIsLoading(false); setProfileError(null); };
    const sync = (event: StorageEvent) => {
      if (event.key !== ACCESS_TOKEN_KEY) return;
      version.current++;
      if (!event.newValue) ended();
      else {
        const capturedVersion = version.current;
        setUser(null); setProfileError(null); setIsLoading(true);
        refreshProfile().catch(() => {}).finally(() => { if (capturedVersion === version.current) setIsLoading(false); });
      }
    };
    window.addEventListener('webtoonhub:auth-ended', ended);
    window.addEventListener('storage', sync);
    const startupVersion = version.current;
    refreshProfile().catch(() => {}).finally(() => { if (startupVersion === version.current) setIsLoading(false); });
    return () => { alive.current = false; window.removeEventListener('webtoonhub:auth-ended', ended); window.removeEventListener('storage', sync); };
  }, [refreshProfile]);

  const login = async (email: string, password: string) => {
    setIsLoading(true); setProfileError(null); version.current++;
    setUser(null);
    const capturedVersion = version.current;
    try {
      const response = await authApi.login({ email, password });
      if (capturedVersion !== version.current) return { success: false, message: t('readerFix.apiSession') };
      localStorage.setItem(ACCESS_TOKEN_KEY, response.data.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refresh_token);
      await refreshProfile();
      if (capturedVersion !== version.current) return { success: false, message: t('readerFix.apiSession') };
      setAuthModalOpen(false);
      return { success: true };
    } catch (error) {
      return { success: false, message: profileError ? t(profileError) : (localStorage.getItem(ACCESS_TOKEN_KEY) ? t('readerFix.profileError') : getApiErrorMessage(error, t('common.error'))) };
    } finally { if (capturedVersion === version.current) setIsLoading(false); }
  };
  const register = async (email: string, username: string, password: string) => {
    const capturedVersion = version.current;
    try { await authApi.register({ email, username, password }); if (capturedVersion !== version.current) return { success: false, message: t('readerFix.apiSession') }; const result = await login(email, password); if (!result.success) { setAuthModalTab('login'); return { ...result, message: `${t('ux.registered')} ${result.message || ''}` }; } return result; }
    catch (error) { return { success: false, message: getApiErrorMessage(error, t('common.error')) }; }
  };
  const logout = () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (token || refreshToken) authApi.logout(token, refreshToken).catch(() => {});
    clearReaderSession(); setAuthModalOpen(false);
  };
  return <AuthContext.Provider value={{
    user, isAuthenticated: !!user, isLoading, profileError: profileError ? t(profileError) : null,
    authModalOpen, authModalTab, login, register, logout, refreshProfile,
    updateCoinsLocally: balance => setUser(previous => previous ? { ...previous, lightning_coins: balance } : previous),
    openAuthModal: (tab = 'login') => { setAuthModalTab(tab); setAuthModalOpen(true); },
    closeAuthModal: () => setAuthModalOpen(false)
  }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
