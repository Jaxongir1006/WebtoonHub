import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { shopApi } from '../api/shop';
import { InventoryItem } from '../types';
import { AvatarFrame } from '../components/common/AvatarFrame';
import { CoinBadge } from '../components/common/CoinBadge';
import { formatDate } from '../utils/date';
import { getApiErrorMessage } from '../api/client';
import {
  Sparkles,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PackageOpen,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { user, isAuthenticated, refreshProfile, openAuthModal } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'frame' | 'background'>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchInventory = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await shopApi.getMyInventory();
      setItems(data || []);
    } catch (err) {
      console.error('Failed to load inventory', err);
      showToast('error', getApiErrorMessage(err, t('common.error')));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, t]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchInventory();
    }
  }, [isAuthenticated, fetchInventory]);

  const handleEquip = async (item: InventoryItem) => {
    setActionLoadingId(item.id);
    try {
      const res = await shopApi.equipItem(item.id);
      showToast('success', res.message || t('shop.equipSuccess'));
      // Update local state: deactivate others of same type, activate this one
      setItems((prev) =>
        prev.map((i) => {
          if (i.item_type === item.item_type) {
            return { ...i, is_active: i.id === item.id };
          }
          return i;
        })
      );
      await refreshProfile();
    } catch (err) {
      showToast('error', getApiErrorMessage(err, t('common.error')));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnequip = async (item: InventoryItem) => {
    setActionLoadingId(item.id);
    try {
      const res = await shopApi.unequipItem(item.id);
      showToast('success', res.message || t('shop.unequipSuccess'));
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_active: false } : i))
      );
      await refreshProfile();
    } catch (err) {
      showToast('error', getApiErrorMessage(err, t('common.error')));
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen py-24 flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 rounded-3xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-4 shadow-glow-brand">
          <Layers className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">{t('inventory.title')}</h2>
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

  const framesCount = items.filter((i) => i.item_type === 'frame').length;
  const backgroundsCount = items.filter((i) => i.item_type === 'background').length;
  const filteredItems = items.filter((i) => {
    if (filterType === 'all') return true;
    return i.item_type === filterType;
  });

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Floating Toast Notification */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-300">
            <div
              className={`p-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
                toast.type === 'success'
                  ? 'bg-studio-900 border-emerald-500/40 text-emerald-400'
                  : 'bg-studio-900 border-rose-500/40 text-rose-400'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <span className="text-sm font-semibold text-white">{toast.message}</span>
            </div>
          </div>
        )}

        {/* Hero Header with Active Preview Banner */}
        <div className="relative rounded-3xl bg-studio-900 border border-studio-800 p-6 sm:p-8 overflow-hidden shadow-2xl">
          {/* Active Equipped Profile Background as Wallpaper */}
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

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
              <AvatarFrame
                username={user.username}
                frameUrl={user.active_frame?.asset_url}
                size="xl"
              />
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('inventory.title')}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white">
                  {user.username} {t('inventory.title')}
                </h1>
                <p className="text-xs text-studio-400 max-w-md">
                  {t('inventory.subtitle')}
                </p>

                {/* Currently Equipped Badges */}
                <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="text-[11px] text-studio-400 font-medium">
                    {t('shop.equipped')}:
                  </span>
                  {user.active_frame ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30">
                      <span>🖼️</span>
                      <span>{user.active_frame.name}</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-studio-500 italic">
                      {t('profile.activeAvatarFrame')}: {t('profile.none')}
                    </span>
                  )}

                  {user.active_background ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      <span>🌄</span>
                      <span>{user.active_background.name}</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-studio-500 italic">
                      {t('profile.activeBackground')}: {t('profile.none')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions & Balance */}
            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <CoinBadge amount={user.lightning_coins} size="md" />
              <Link
                to="/shop"
                className="px-4 py-2.5 rounded-xl bg-brand-500 text-studio-950 font-bold text-xs hover:bg-brand-400 active:scale-95 shadow-glow-brand transition-all flex items-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{t('inventory.goToShop')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-studio-800 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                filterType === 'all'
                  ? 'bg-brand-500 text-studio-950 shadow-glow-brand'
                  : 'bg-studio-900 text-studio-400 hover:text-white hover:bg-studio-800 border border-studio-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t('inventory.tabAll')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-studio-950/40 text-current">
                {items.length}
              </span>
            </button>

            <button
              onClick={() => setFilterType('frame')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                filterType === 'frame'
                  ? 'bg-brand-500 text-studio-950 shadow-glow-brand'
                  : 'bg-studio-900 text-studio-400 hover:text-white hover:bg-studio-800 border border-studio-800'
              }`}
            >
              <span>🖼️</span>
              <span>{t('inventory.tabFrames')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-studio-950/40 text-current">
                {framesCount}
              </span>
            </button>

            <button
              onClick={() => setFilterType('background')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                filterType === 'background'
                  ? 'bg-brand-500 text-studio-950 shadow-glow-brand'
                  : 'bg-studio-900 text-studio-400 hover:text-white hover:bg-studio-800 border border-studio-800'
              }`}
            >
              <span>🌄</span>
              <span>{t('inventory.tabBackgrounds')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-studio-950/40 text-current">
                {backgroundsCount}
              </span>
            </button>
          </div>

          <div className="text-xs text-studio-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-brand-400" />
            <span>{t('inventory.lifetimeNotice')}</span>
          </div>
        </div>

        {/* Items Grid or Empty State */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-studio-400">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            <p className="text-xs">{t('common.loading')}</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 px-4 text-center rounded-3xl bg-studio-900 border border-studio-800 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-studio-800 border border-studio-700 flex items-center justify-center text-studio-400">
              <PackageOpen className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">{t('inventory.empty')}</h3>
              <p className="text-xs text-studio-400 max-w-md mx-auto">
                {t('inventory.emptyDesc')}
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500 text-studio-950 font-bold text-xs hover:bg-brand-400 shadow-glow-brand transition-all"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{t('inventory.goToShop')}</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredItems.map((item) => {
              const isActionLoading = actionLoadingId === item.id;
              const isEquipped = item.is_active;

              return (
                <div
                  key={item.id}
                  className={`flex flex-col bg-studio-900 border rounded-3xl p-5 transition-all duration-300 relative overflow-hidden group shadow-xl ${
                    isEquipped
                      ? 'border-brand-500/60 ring-2 ring-brand-500/20 shadow-glow-brand'
                      : 'border-studio-800 hover:border-brand-500/30'
                  }`}
                >
                  {/* Top Badge Row */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-studio-800 text-studio-400 border border-studio-700">
                      {item.item_type === 'frame' ? t('shop.itemFrame') : t('shop.itemBackground')}
                    </span>

                    {isEquipped && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center gap-1 shadow-glow-brand">
                        <Sparkles className="w-3 h-3" />
                        <span>{t('inventory.activeBadge')}</span>
                      </span>
                    )}
                  </div>

                  {/* Visual Preview */}
                  <div className="h-40 rounded-2xl bg-studio-950 border border-studio-800 flex items-center justify-center p-4 relative overflow-hidden mb-4 group-hover:scale-[1.02] transition-transform">
                    {item.item_type === 'frame' ? (
                      <div className="relative">
                        <AvatarFrame
                          username={user.username}
                          frameUrl={item.asset_url}
                          size="lg"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full rounded-xl overflow-hidden relative">
                        <img
                          src={item.asset_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-studio-950/30" />
                        <div className="absolute bottom-2 left-2 right-2 text-center text-[10px] font-bold text-white bg-studio-950/70 py-1 rounded-lg backdrop-blur-xs">
                          {t('shop.preview')}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Title & Details */}
                  <div className="space-y-1 mb-4">
                    <h3 className="font-bold text-white text-base truncate" title={item.name}>
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-studio-500">
                      {t('inventory.purchasedOn')}: {formatDate(item.purchased_at, language)}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-auto pt-2 border-t border-studio-800/80">
                    {isEquipped ? (
                      <button
                        onClick={() => handleUnequip(item)}
                        disabled={isActionLoading}
                        className="w-full py-2.5 rounded-xl font-bold text-xs bg-studio-800 hover:bg-rose-500/10 text-rose-400 border border-studio-700 hover:border-rose-500/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
                      >
                        {isActionLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : null}
                        <span>{t('inventory.unequip')}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEquip(item)}
                        disabled={isActionLoading}
                        className="w-full py-2.5 rounded-xl font-bold text-xs bg-brand-500 hover:bg-brand-400 text-studio-950 active:scale-95 shadow-glow-brand transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
                      >
                        {isActionLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
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
    </div>
  );
};
export default InventoryPage;
