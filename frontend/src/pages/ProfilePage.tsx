import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { UserSession } from '../types';
import { AvatarFrame } from '../components/common/AvatarFrame';
import { formatDateUz, formatRelativeTimeUz } from '../utils/date';
import { getApiErrorMessage } from '../api/client';
import {
  User,
  Zap,
  Shield,
  Laptop,
  Smartphone,
  LogOut,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Sparkles
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, logout, refreshProfile, openAuthModal } = useAuth();
  const navigate = useNavigate();

  // Sessions state
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Edit profile state
  const [newUsername, setNewUsername] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const data = await authApi.listSessions();
      setSessions(data || []);
    } catch (err) {
      console.error("Failed to load sessions", err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions();
      if (user) {
        setNewUsername(user.username);
      }
    }
  }, [isAuthenticated, user?.username, fetchSessions]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setFeedback(null);
    try {
      const payload: { username?: string; old_password?: string; new_password?: string } = {};
      if (newUsername.trim() && newUsername.trim() !== user?.username) {
        payload.username = newUsername.trim();
      }
      if (newPassword.trim()) {
        if (!oldPassword.trim()) {
          setFeedback({ type: 'error', message: "Joriy parolingizni kiriting" });
          setSavingProfile(false);
          return;
        }
        payload.old_password = oldPassword;
        payload.new_password = newPassword;
      }

      if (Object.keys(payload).length === 0) {
        setFeedback({ type: 'error', message: "Hech qanday o'zgarish kiritilmadi" });
        setSavingProfile(false);
        return;
      }

      const res = await authApi.updateProfile(payload);
      setFeedback({ type: 'success', message: res.message || "Profil yangilandi!" });
      setOldPassword('');
      setNewPassword('');
      await refreshProfile();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(err, "Profilni yangilashda xatolik yuz berdi")
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!window.confirm("Ushbu seansni bekor qilishni tasdiqlaysizmi?")) return;
    try {
      await authApi.revokeSession(sessionId);
      await fetchSessions();
    } catch (err) {
      console.error("Failed to revoke session", err);
    }
  };

  const handleRevokeOtherSessions = async () => {
    if (!window.confirm("Boshqa barcha qurilmalardagi seanslarni yakunlamoqchimisiz?")) return;
    try {
      await authApi.revokeOtherSessions();
      await fetchSessions();
    } catch (err) {
      console.error("Failed to revoke other sessions", err);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen py-24 flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 rounded-3xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-4 shadow-glow-brand">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Foydalanuvchi Profili</h2>
        <p className="text-xs text-studio-400 max-w-sm mb-6">
          Profilingizni ko'rish va sozlash uchun hisobingizga kiring.
        </p>
        <button
          onClick={() => openAuthModal('login')}
          className="px-6 py-3 rounded-xl bg-brand-500 text-studio-950 font-bold text-xs hover:bg-brand-400 shadow-glow-brand"
        >
          Kirish / Ro'yxatdan o'tish
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Profile Card Banner */}
        <div className="relative rounded-3xl bg-studio-900 border border-studio-800 p-6 sm:p-8 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            {/* Avatar with Equipped Frame */}
            <div className="relative shrink-0">
              <AvatarFrame
                username={user.username}
                frameUrl={user.active_frame?.asset_url}
                size="xl"
              />
              {user.active_frame && (
                <div className="mt-2 text-center">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30">
                    {user.active_frame.name}
                  </span>
                </div>
              )}
            </div>

            {/* User Meta */}
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white">{user.username}</h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-studio-800 text-studio-300 border border-studio-700">
                  ID: #{user.id}
                </span>
              </div>

              <p className="text-xs text-studio-400 font-medium">{user.email}</p>
              <p className="text-[11px] text-studio-500">
                A'zo bo'lgan sana: {formatDateUz(user.created_at)}
              </p>

              {/* Coin Balance Highlight */}
              <div className="pt-2 flex items-center justify-center sm:justify-start gap-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400 font-bold text-sm shadow-glow-brand">
                  <Zap className="w-4 h-4 fill-brand-400" />
                  <span>{user.lightning_coins} Chaqmoq</span>
                </div>

                <button
                  onClick={() => navigate('/shop')}
                  className="text-xs font-semibold text-studio-300 hover:text-white underline underline-offset-4"
                >
                  Do'konga o'tish →
                </button>
              </div>
            </div>

            {/* Logout Action */}
            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="sm:self-start px-4 py-2 rounded-xl bg-studio-800 hover:bg-rose-500/10 text-rose-400 border border-studio-700 hover:border-rose-500/30 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>Chiqish</span>
            </button>
          </div>
        </div>

        {/* Edit Profile Section */}
        <div className="bg-studio-900 border border-studio-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-2 pb-4 border-b border-studio-800 mb-6">
            <KeyRound className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-bold text-white">Profil Ma'lumotlarini O'zgartirish</h2>
          </div>

          {feedback && (
            <div
              className={`mb-6 p-4 rounded-xl text-xs flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold text-studio-300 mb-1.5">
                Foydalanuvchi nomi
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Foydalanuvchi nomi"
                className="w-full px-3.5 py-2.5 bg-studio-800 border border-studio-700 rounded-xl text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="pt-2 border-t border-studio-800/80">
              <span className="text-xs font-bold text-studio-400 uppercase tracking-wider block mb-3">
                Parolni o'zgartirish (ixtiyoriy)
              </span>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-studio-300 mb-1">
                    Joriy parol
                  </label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 bg-studio-800 border border-studio-700 rounded-xl text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-studio-300 mb-1">
                    Yangi parol (kamida 8 ta belgi)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 bg-studio-800 border border-studio-700 rounded-xl text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-6 py-2.5 rounded-xl font-bold bg-brand-500 text-studio-950 text-xs hover:bg-brand-400 active:scale-95 shadow-glow-brand transition-all flex items-center gap-1.5 disabled:opacity-40"
              >
                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>O'zgarishlarni saqlash</span>
              </button>
            </div>
          </form>
        </div>

        {/* Active Sessions Management */}
        <div className="bg-studio-900 border border-studio-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-studio-800 mb-6">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-brand-400" />
              <div>
                <h2 className="text-lg font-bold text-white">Faol Sessiyalar</h2>
                <p className="text-xs text-studio-400">
                  Hisobingizga ulangan qurilmalar va brauzerlar
                </p>
              </div>
            </div>

            {sessions.length > 1 && (
              <button
                onClick={handleRevokeOtherSessions}
                className="px-3.5 py-1.5 rounded-xl bg-studio-800 text-rose-400 hover:bg-rose-500/10 border border-studio-700 hover:border-rose-500/30 text-xs font-bold transition-colors"
              >
                Boshqa barcha seanslarni tugatish
              </button>
            )}
          </div>

          {loadingSessions ? (
            <div className="py-8 flex justify-center items-center text-studio-400 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
              <span className="text-xs">Sessiyalar tekshirilmoqda...</span>
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-studio-500 text-center py-4">Sessiyalar topilmadi</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((sess) => {
                const isMobile = sess.device_type?.toLowerCase().includes('mobile');
                return (
                  <div
                    key={sess.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-studio-850 border border-studio-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-studio-800 flex items-center justify-center text-studio-300">
                        {isMobile ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">
                            {sess.device_type || "Noma'lum qurilma"}
                          </span>
                          {sess.is_current && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Joriy seans
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-studio-400 mt-0.5">
                          <span>IP: {sess.ip_address || "127.0.0.1"}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-studio-500" />
                            <span>Faollik: {formatRelativeTimeUz(sess.last_active_at)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {!sess.is_current && (
                      <button
                        onClick={() => handleRevokeSession(sess.id)}
                        className="px-3 py-1.5 rounded-xl bg-studio-800 hover:bg-rose-500/10 text-rose-400 text-xs font-semibold border border-studio-700 transition-colors"
                      >
                        Yakunlash
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
