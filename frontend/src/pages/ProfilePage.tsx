import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { authApi } from '../api/auth';
import { shopApi } from '../api/shop';
import { UserSession, InventoryItem } from '../types';
import { AvatarFrame } from '../components/common/AvatarFrame';
import { formatDate, formatRelativeTime } from '../utils/date';
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
  Sparkles,
  PackageOpen,
  Check,
  ShoppingBag,
  Layers,
  ArrowRight,
  Camera,
  Upload,
  Users,
  Edit3,
  X
} from 'lucide-react';
import { usersApi } from '../api/users';

export const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, logout, refreshProfile, openAuthModal } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  // Inventory state
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'frame' | 'background'>('all');
  const [invActionLoadingId, setInvActionLoadingId] = useState<number | null>(null);

  // Sessions state
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Edit profile state
  const [newUsername, setNewUsername] = useState('');
  const [bio, setBio] = useState(user?.bio || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const editModalAvatarInputRef = useRef<HTMLInputElement>(null);

  // Dedicated Edit Profile Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalUsername, setEditModalUsername] = useState('');
  const [editModalBio, setEditModalBio] = useState('');
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [editModalSuccess, setEditModalSuccess] = useState<string | null>(null);
  const [savingEditModal, setSavingEditModal] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [invFeedback, setInvFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleOpenEditModal = () => {
    if (user) {
      setEditModalUsername(user.username || '');
      setEditModalBio(user.bio || '');
      setEditModalError(null);
      setEditModalSuccess(null);
    }
    setIsEditModalOpen(true);
  };

  const handleSaveEditModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEditModal(true);
    setEditModalError(null);
    setEditModalSuccess(null);
    try {
      let updatedSomething = false;
      if (editModalUsername.trim() && editModalUsername.trim() !== user?.username) {
        await authApi.updateProfile({ username: editModalUsername.trim() });
        updatedSomething = true;
      }
      if (editModalBio.trim() !== (user?.bio || '')) {
        await usersApi.updateProfile({ bio: editModalBio.trim() });
        updatedSomething = true;
      }
      if (!updatedSomething) {
        setEditModalError("Hech qanday o'zgarish kiritilmadi");
        setSavingEditModal(false);
        return;
      }
      await refreshProfile();
      setEditModalSuccess("Profil ma'lumotlari muvaffaqiyatli saqlandi!");
      setTimeout(() => {
        setIsEditModalOpen(false);
      }, 900);
    } catch (err) {
      setEditModalError(getApiErrorMessage(err, "Profilni yangilashda xatolik"));
    } finally {
      setSavingEditModal(false);
    }
  };

  const handleModalAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setEditModalError(null);
    try {
      await usersApi.uploadAvatar(file);
      await refreshProfile();
      setEditModalSuccess("Yangi profil rasmi yuklandi!");
    } catch (err) {
      setEditModalError(getApiErrorMessage(err, "Avatar yuklashda xatolik yuz berdi"));
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    if (user) {
      setNewUsername(user.username || '');
      setBio(user.bio || '');
    }
  }, [user]);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setFeedback(null);
    try {
      await usersApi.uploadAvatar(file);
      await refreshProfile();
      setFeedback({ type: 'success', message: "Profil rasmi muvaffaqiyatli yuklandi!" });
    } catch (err) {
      setFeedback({ type: 'error', message: getApiErrorMessage(err, "Rasm yuklashda xatolik") });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const showInvFeedback = (type: 'success' | 'error', message: string) => {
    setInvFeedback({ type, message });
    setTimeout(() => setInvFeedback(null), 3500);
  };

  const fetchInventory = useCallback(async () => {
    setLoadingInventory(true);
    try {
      const data = await shopApi.getMyInventory();
      setInventoryItems(data || []);
    } catch (err) {
      console.error("Failed to load inventory", err);
    } finally {
      setLoadingInventory(false);
    }
  }, []);

  const handleEquipItem = async (item: InventoryItem) => {
    setInvActionLoadingId(item.id);
    try {
      const res = await shopApi.equipItem(item.id);
      showInvFeedback('success', res.message || t('shop.equipSuccess'));
      setInventoryItems((prev) =>
        prev.map((i) => {
          if (i.item_type === item.item_type) {
            return { ...i, is_active: i.id === item.id };
          }
          return i;
        })
      );
      await refreshProfile();
    } catch (err) {
      showInvFeedback('error', getApiErrorMessage(err, t('common.error')));
    } finally {
      setInvActionLoadingId(null);
    }
  };

  const handleUnequipItem = async (item: InventoryItem) => {
    setInvActionLoadingId(item.id);
    try {
      const res = await shopApi.unequipItem(item.id);
      showInvFeedback('success', res.message || t('shop.unequipSuccess'));
      setInventoryItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_active: false } : i))
      );
      await refreshProfile();
    } catch (err) {
      showInvFeedback('error', getApiErrorMessage(err, t('common.error')));
    } finally {
      setInvActionLoadingId(null);
    }
  };

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
      fetchInventory();
      if (user) {
        setNewUsername(user.username);
      }
    }
  }, [isAuthenticated, user?.username, fetchSessions, fetchInventory]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setFeedback(null);
    try {
      let updatedSomething = false;
      const payload: { username?: string; old_password?: string; new_password?: string } = {};
      if (newUsername.trim() && newUsername.trim() !== user?.username) {
        payload.username = newUsername.trim();
      }
      if (newPassword.trim()) {
        if (!oldPassword.trim()) {
          setFeedback({ type: 'error', message: t('profile.currentPassword') });
          setSavingProfile(false);
          return;
        }
        payload.old_password = oldPassword;
        payload.new_password = newPassword;
      }

      if (Object.keys(payload).length > 0) {
        await authApi.updateProfile(payload);
        updatedSomething = true;
      }

      if (bio.trim() !== (user?.bio || '')) {
        await usersApi.updateProfile({ bio: bio.trim() });
        updatedSomething = true;
      }

      if (!updatedSomething) {
        setFeedback({ type: 'error', message: "Hech qanday o'zgarish kiritilmadi" });
        setSavingProfile(false);
        return;
      }

      setFeedback({ type: 'success', message: "Profil ma'lumotlari muvaffaqiyatli saqlandi!" });
      setOldPassword('');
      setNewPassword('');
      await refreshProfile();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(err, t('common.error'))
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!window.confirm(t('profile.confirmRevoke'))) return;
    try {
      await authApi.revokeSession(sessionId);
      await fetchSessions();
    } catch (err) {
      console.error("Failed to revoke session", err);
    }
  };

  const handleRevokeOtherSessions = async () => {
    if (!window.confirm(t('profile.confirmRevokeOthers'))) return;
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
        <h2 className="text-2xl font-black text-white mb-2">{t('profile.title')}</h2>
        <p className="text-xs text-studio-400 max-w-sm mb-6">
          {t('library.loginRequired')}
        </p>
        <button
          onClick={() => openAuthModal('login')}
          className="px-6 py-3 rounded-xl bg-brand-500 text-studio-950 font-bold text-xs hover:bg-brand-400 shadow-glow-brand"
        >
          {t('library.loginBtn')}
        </button>
      </div>
    );
  }

  const framesCount = inventoryItems.filter((i) => i.item_type === 'frame').length;
  const backgroundsCount = inventoryItems.filter((i) => i.item_type === 'background').length;
  const filteredInventoryItems = inventoryItems.filter((i) => {
    if (inventoryFilter === 'all') return true;
    return i.item_type === inventoryFilter;
  });

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Profile Card Banner */}
        <div className="relative rounded-3xl bg-studio-900 border border-studio-800 p-6 sm:p-8 overflow-hidden shadow-2xl min-h-[220px]">
          {/* Active Equipped Profile Background Banner */}
          {user.active_background?.asset_url && (
            <div
              className="absolute inset-0 bg-cover bg-center transition-all duration-700 pointer-events-none"
              style={{ backgroundImage: `url(${user.active_background.asset_url})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-studio-950/95 via-studio-950/80 to-studio-950/65" />
              <div className="absolute inset-0 bg-gradient-to-t from-studio-950 via-transparent to-transparent" />
            </div>
          )}

          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            {/* Avatar with Equipped Frame & Photo Upload */}
            <div className="relative shrink-0 flex flex-col items-center">
              <div className="relative group">
                <AvatarFrame
                  username={user.username}
                  avatarUrl={user.avatar_url}
                  frameUrl={user.active_frame?.asset_url}
                  size="xl"
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  title="Profil rasmini yuklash yoki o'zgartirish"
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-brand-500 hover:bg-brand-400 text-studio-950 shadow-glow-brand transition-transform hover:scale-110 z-20 cursor-pointer"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="file"
                  ref={avatarInputRef}
                  onChange={handleAvatarFileChange}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                />
              </div>

              <div className="mt-2 text-center flex flex-col gap-1 items-center">
                {user.active_frame && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30">
                    {user.active_frame.name}
                  </span>
                )}
                {user.active_background && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                    <span>🖼️</span>
                    <span>{user.active_background.name}</span>
                  </span>
                )}
              </div>
            </div>

            {/* User Meta */}
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white">{user.username}</h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-studio-800 text-studio-300 border border-studio-700">
                  ID: #{user.id}
                </span>

                {user.clan && (
                  <Link
                    to={`/clans/${user.clan.id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-extrabold text-xs hover:bg-purple-500/30 transition-all font-mono"
                  >
                    <Shield className="w-3 h-3 text-purple-400" />
                    <span>[{user.clan.tag}] {user.clan.name}</span>
                  </Link>
                )}
              </div>

              {user.bio ? (
                <p className="text-xs text-studio-300 italic max-w-md">"{user.bio}"</p>
              ) : (
                <p className="text-xs text-studio-400 font-medium">{user.email}</p>
              )}

              <p className="text-[11px] text-studio-500">
                {t('profile.memberSince')}: {formatDate(user.created_at, language)}
              </p>

              {/* Coin Balance Highlight & Social Quick Actions */}
              <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400 font-bold text-sm shadow-glow-brand">
                  <Zap className="w-4 h-4 fill-brand-400" />
                  <span>{user.lightning_coins} {t('common.coins')}</span>
                </div>

                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-studio-950 font-black text-xs shadow-glow-brand transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Profilni tahrirlash</span>
                </button>

                <Link
                  to={`/users/${user.username}`}
                  className="px-3 py-1.5 rounded-xl bg-studio-800 hover:bg-studio-700 text-white font-bold text-xs border border-studio-700 transition-all flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5 text-brand-400" />
                  <span>Ommaviy profil</span>
                </Link>

                <Link
                  to="/clans"
                  className="px-3 py-1.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 font-bold text-xs border border-purple-500/30 transition-all flex items-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                  <span>Klanlar</span>
                </Link>

                <Link
                  to="/friends"
                  className="px-3 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 font-bold text-xs border border-emerald-500/30 transition-all flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Do'stlar</span>
                </Link>
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
              <span>{t('profile.logout')}</span>
            </button>
          </div>
        </div>

        {/* My Decorations & Inventory Section */}
        <div id="inventory" className="bg-studio-900 border border-studio-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-studio-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0 shadow-glow-brand">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{t('profile.myInventory')}</h2>
                <p className="text-xs text-studio-400">
                  {t('profile.myInventorySubtitle')}
                </p>
              </div>
            </div>

            <Link
              to="/shop"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400 hover:bg-brand-500/20 hover:text-white text-xs font-bold transition-all shrink-0"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{t('inventory.goToShop')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Toast / Feedback */}
          {invFeedback && (
            <div
              className={`p-4 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-200 ${
                invFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              }`}
            >
              {invFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{invFeedback.message}</span>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setInventoryFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                inventoryFilter === 'all'
                  ? 'bg-brand-500 text-studio-950 shadow-glow-brand'
                  : 'bg-studio-800 text-studio-400 hover:text-white border border-studio-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t('inventory.tabAll')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-studio-950/40 text-current">
                {inventoryItems.length}
              </span>
            </button>

            <button
              onClick={() => setInventoryFilter('frame')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                inventoryFilter === 'frame'
                  ? 'bg-brand-500 text-studio-950 shadow-glow-brand'
                  : 'bg-studio-800 text-studio-400 hover:text-white border border-studio-700'
              }`}
            >
              <span>🖼️</span>
              <span>{t('inventory.tabFrames')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-studio-950/40 text-current">
                {framesCount}
              </span>
            </button>

            <button
              onClick={() => setInventoryFilter('background')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                inventoryFilter === 'background'
                  ? 'bg-brand-500 text-studio-950 shadow-glow-brand'
                  : 'bg-studio-800 text-studio-400 hover:text-white border border-studio-700'
              }`}
            >
              <span>🌄</span>
              <span>{t('inventory.tabBackgrounds')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-studio-950/40 text-current">
                {backgroundsCount}
              </span>
            </button>
          </div>

          {/* Items Grid */}
          {loadingInventory ? (
            <div className="py-12 flex justify-center items-center text-studio-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
              <span className="text-xs">{t('common.loading')}</span>
            </div>
          ) : filteredInventoryItems.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-2xl bg-studio-850 border border-studio-800 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-studio-800 border border-studio-700 flex items-center justify-center text-studio-400">
                <PackageOpen className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{t('inventory.empty')}</h4>
                <p className="text-xs text-studio-400 max-w-sm mx-auto mt-1">
                  {t('inventory.emptyDesc')}
                </p>
              </div>
              <Link
                to="/shop"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 text-studio-950 font-bold text-xs hover:bg-brand-400 shadow-glow-brand transition-all"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{t('inventory.goToShop')}</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredInventoryItems.map((item) => {
                const isItemActionLoading = invActionLoadingId === item.id;
                const isEquipped = item.is_active;

                return (
                  <div
                    key={item.id}
                    className={`flex flex-col bg-studio-850 border rounded-2xl p-4 transition-all duration-300 relative overflow-hidden group ${
                      isEquipped
                        ? 'border-brand-500/60 ring-1 ring-brand-500/30'
                        : 'border-studio-800 hover:border-brand-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-studio-800 text-studio-400 border border-studio-700">
                        {item.item_type === 'frame' ? t('shop.itemFrame') : t('shop.itemBackground')}
                      </span>

                      {isEquipped && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>{t('inventory.activeBadge')}</span>
                        </span>
                      )}
                    </div>

                    <div className="h-32 rounded-xl bg-studio-900 border border-studio-800 flex items-center justify-center p-3 relative overflow-hidden mb-3">
                      {item.item_type === 'frame' ? (
                        <AvatarFrame
                          username={user.username}
                          frameUrl={item.asset_url}
                          size="md"
                        />
                      ) : (
                        <div className="w-full h-full rounded-lg overflow-hidden relative">
                          <img
                            src={item.asset_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-studio-950/20" />
                        </div>
                      )}
                    </div>

                    <h4 className="font-bold text-white text-sm truncate mb-3" title={item.name}>
                      {item.name}
                    </h4>

                    <div className="mt-auto">
                      {isEquipped ? (
                        <button
                          onClick={() => handleUnequipItem(item)}
                          disabled={isItemActionLoading}
                          className="w-full py-2 rounded-xl font-bold text-xs bg-studio-800 hover:bg-rose-500/10 text-rose-400 border border-studio-700 hover:border-rose-500/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
                        >
                          {isItemActionLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : null}
                          <span>{t('inventory.unequip')}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEquipItem(item)}
                          disabled={isItemActionLoading}
                          className="w-full py-2 rounded-xl font-bold text-xs bg-brand-500 hover:bg-brand-400 text-studio-950 active:scale-95 shadow-glow-brand transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
                        >
                          {isItemActionLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          <span>{t('inventory.equip')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Edit Profile Section */}
        <div className="bg-studio-900 border border-studio-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-2 pb-4 border-b border-studio-800 mb-6">
            <KeyRound className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-bold text-white">{t('profile.accountSettings')}</h2>
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
                {t('profile.username')}
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder={t('profile.username')}
                className="w-full px-3.5 py-2.5 bg-studio-800 border border-studio-700 rounded-xl text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-studio-300 mb-1.5 flex items-center justify-between">
                <span>Biografiya / Haqimda (Bio)</span>
                <span className="text-[10px] text-studio-500 font-mono">{bio.length}/500</span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="O'zingiz haqingizda qisqacha ma'lumot yozing..."
                className="w-full px-3.5 py-2.5 bg-studio-800 border border-studio-700 rounded-xl text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="pt-2 border-t border-studio-800/80">
              <span className="text-xs font-bold text-studio-400 uppercase tracking-wider block mb-3">
                {t('profile.changePasswordOptional')}
              </span>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-studio-300 mb-1">
                    {t('profile.currentPassword')}
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
                    {t('profile.newPasswordHint')}
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
                <span>{t('common.save')}</span>
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
                <h2 className="text-lg font-bold text-white">{t('profile.activeSessions')}</h2>
                <p className="text-xs text-studio-400">
                  {t('profile.security')}
                </p>
              </div>
            </div>

            {sessions.length > 1 && (
              <button
                onClick={handleRevokeOtherSessions}
                className="px-3.5 py-1.5 rounded-xl bg-studio-800 text-rose-400 hover:bg-rose-500/10 border border-studio-700 hover:border-rose-500/30 text-xs font-bold transition-colors"
              >
                {t('profile.revokeOtherSessions')}
              </button>
            )}
          </div>

          {loadingSessions ? (
            <div className="py-8 flex justify-center items-center text-studio-400 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
              <span className="text-xs">{t('common.loading')}</span>
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-studio-500 text-center py-4">{t('common.notFound')}</p>
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
                            {sess.device_type || t('profile.unknownDevice')}
                          </span>
                          {sess.is_current && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              {t('profile.currentSession')}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-studio-400 mt-0.5">
                          <span>IP: {sess.ip_address || "127.0.0.1"}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-studio-500" />
                            <span>{formatRelativeTime(sess.last_active_at, language)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {!sess.is_current && (
                      <button
                        onClick={() => handleRevokeSession(sess.id)}
                        className="px-3 py-1.5 rounded-xl bg-studio-800 hover:bg-rose-500/10 text-rose-400 text-xs font-semibold border border-studio-700 transition-colors"
                      >
                        {t('profile.terminate')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-studio-900 border border-studio-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-studio-800 mb-6">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-brand-400" />
                <h3 className="text-lg font-black text-white">Profilni Tahrirlash</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-xl text-studio-400 hover:text-white hover:bg-studio-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editModalError && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editModalError}</span>
              </div>
            )}

            {editModalSuccess && (
              <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{editModalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditModal} className="space-y-5">
              {/* Avatar Preview with Equipped Frame & Direct Change Button */}
              <div className="flex flex-col items-center justify-center gap-3 py-2">
                <div className="relative group cursor-pointer" onClick={() => editModalAvatarInputRef.current?.click()}>
                  <AvatarFrame
                    username={editModalUsername || user.username}
                    avatarUrl={user.avatar_url}
                    frameUrl={user.active_frame?.asset_url}
                    size="xl"
                  />
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20">
                    <Camera className="w-6 h-6 text-white drop-shadow" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => editModalAvatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="px-3 py-1.5 rounded-xl bg-studio-800 hover:bg-studio-700 text-studio-200 text-xs font-bold border border-studio-700 transition-all flex items-center gap-1.5"
                  >
                    {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5 text-brand-400" />}
                    <span>Rasmni almashtirish</span>
                  </button>
                  <input
                    type="file"
                    ref={editModalAvatarInputRef}
                    onChange={handleModalAvatarFileChange}
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                  />
                </div>

                {user.active_frame && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30">
                    Faol ramka: {user.active_frame.name}
                  </span>
                )}
              </div>

              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold text-studio-300 uppercase tracking-wider mb-1.5">
                  Taxallus (Username)
                </label>
                <input
                  type="text"
                  required
                  value={editModalUsername}
                  onChange={(e) => setEditModalUsername(e.target.value)}
                  placeholder="Taxallusingizni kiriting"
                  className="w-full px-4 py-2.5 bg-studio-950 border border-studio-800 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Bio Textarea */}
              <div>
                <label className="block text-xs font-bold text-studio-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Haqimda / Bio</span>
                  <span className="text-[10px] text-studio-500 font-mono">{editModalBio.length}/500</span>
                </label>
                <textarea
                  value={editModalBio}
                  onChange={(e) => setEditModalBio(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="O'zingiz haqingizda bir necha so'z (qiziqishlaringiz, sevimli manhvalaringiz)..."
                  className="w-full px-4 py-2.5 bg-studio-950 border border-studio-800 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              {/* Bezaklar info link */}
              <div className="p-3.5 rounded-2xl bg-studio-950 border border-studio-800 flex items-center justify-between text-xs">
                <span className="text-studio-400">Ramkalar va fonlarni almashtirish:</span>
                <Link
                  to="/inventory"
                  className="text-brand-400 hover:text-brand-300 font-bold flex items-center gap-1"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  <span>Inventarga o'tish</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-studio-400 hover:text-white"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={savingEditModal}
                  className="px-6 py-2.5 bg-brand-500 hover:bg-brand-400 text-studio-950 font-black text-xs rounded-xl shadow-glow-brand transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {savingEditModal && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>O'zgarishlarni saqlash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
