import React, { useState, useEffect, useCallback } from 'react';
import { shopApi } from '../api/shop';
import { useAuth } from '../context/AuthContext';
import { useDailyBonus } from '../context/DailyBonusContext';
import { useLanguage } from '../context/LanguageContext';
import { ShopItem } from '../types';
import { ShopItemCard } from '../components/shop/ShopItemCard';
import { AvatarFrame } from '../components/common/AvatarFrame';
import { Zap, ShoppingBag, Sparkles, Gift, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { getApiErrorMessage } from '../api/client';

export const ShopPage: React.FC = () => {
  const { user, isAuthenticated, refreshProfile, updateCoinsLocally, openAuthModal } = useAuth();
  const { openModal: openDailyBonusModal, isClaimedToday } = useDailyBonus();
  const { t } = useLanguage();

  const [items, setItems] = useState<ShopItem[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'frame' | 'background'>('all');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const typeParam = filterType === 'all' ? undefined : filterType;
      const data = await shopApi.listItems(typeParam);
      setItems(data || []);
    } catch (err) {
      console.error("Failed to load shop items", err);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleBuy = async (itemId: number): Promise<boolean> => {
    try {
      const res = await shopApi.buyItem(itemId);
      if (res.data) {
        updateCoinsLocally(res.data.remaining_coins);
      }
      showToast('success', res.message || t('shop.buySuccess'));
      await fetchItems();
      await refreshProfile();
      return true;
    } catch (err) {
      showToast('error', getApiErrorMessage(err, t('common.error')));
      return false;
    }
  };

  const handleEquip = async (itemId: number): Promise<boolean> => {
    try {
      const res = await shopApi.equipItem(itemId);
      showToast('success', res.message || t('shop.equipSuccess'));
      await refreshProfile();
      return true;
    } catch (err) {
      showToast('error', getApiErrorMessage(err, t('common.error')));
      return false;
    }
  };

  const handleUnequip = async (itemId: number): Promise<boolean> => {
    try {
      const res = await shopApi.unequipItem(itemId);
      showToast('success', res.message || t('shop.unequipSuccess'));
      await refreshProfile();
      return true;
    } catch (err) {
      showToast('error', getApiErrorMessage(err, t('common.error')));
      return false;
    }
  };

  return (
    <div className="min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* Hero Header with Wallet and Avatar visualizer */}
        <div className="relative rounded-3xl bg-studio-900 border border-studio-800 p-6 sm:p-10 mb-10 overflow-hidden shadow-2xl">
          {/* Radial amber glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('shop.title')}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {t('shop.tabFrames')} &amp; {t('shop.tabBackgrounds')}
              </h1>
              <p className="text-xs sm:text-sm text-studio-400 max-w-lg leading-relaxed">
                {t('shop.subtitle')}
              </p>
            </div>

            {/* Wallet & Active Preview Box */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-studio-950/80 border border-studio-800 p-5 rounded-2xl shadow-inner">
              {isAuthenticated && user ? (
                <>
                  <div className="flex items-center gap-3">
                    <AvatarFrame
                      username={user.username}
                      frameUrl={user.active_frame?.asset_url}
                      size="lg"
                    />
                    <div>
                      <div className="text-xs text-studio-400">{t('shop.currentBalance')}:</div>
                      <div className="text-2xl font-black text-white flex items-center gap-1.5">
                        <Zap className="w-6 h-6 text-brand-400 fill-brand-400" />
                        <span>{user.lightning_coins}</span>
                        <span className="text-xs font-semibold text-brand-400">⚡ {t('common.coins')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-8 w-px bg-studio-800 hidden sm:block" />

                  {!isClaimedToday ? (
                    <button
                      onClick={openDailyBonusModal}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold bg-gradient-to-r from-brand-500 to-amber-400 text-studio-950 text-xs hover:from-brand-400 hover:to-amber-300 shadow-glow-brand transition-all flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <Gift className="w-4 h-4" />
                      <span>{t('shop.dailyBonusBtn')}</span>
                    </button>
                  ) : (
                    <div className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t('shop.dailyBonusClaimed')}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-2 px-4">
                  <div className="text-sm font-bold text-white mb-2">{t('shop.loginToView')}</div>
                  <button
                    onClick={() => openAuthModal('login')}
                    className="px-5 py-2 rounded-xl font-bold bg-brand-500 text-studio-950 text-xs hover:bg-brand-400 shadow-glow-brand"
                  >
                    {t('shop.loginOrRegister')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-8 select-none">
          {[
            { label: t('shop.tabAll'), value: 'all' },
            { label: t('shop.tabFrames'), value: 'frame' },
            { label: t('shop.tabBackgrounds'), value: 'background' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterType(tab.value as any)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                filterType === tab.value
                  ? 'bg-brand-500 text-studio-950 shadow-glow-brand'
                  : 'bg-studio-900 border border-studio-800 text-studio-400 hover:text-white hover:border-studio-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-studio-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            <span className="text-sm">{t('common.loading')}</span>
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center bg-studio-900/40 border border-studio-800 rounded-3xl p-8 max-w-md mx-auto">
            <ShoppingBag className="w-12 h-12 mx-auto text-studio-600 mb-3" />
            <h3 className="font-bold text-white text-base mb-1">{t('catalog.emptyTitle')}</h3>
            <p className="text-xs text-studio-400">
              {t('shop.empty')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map((item) => {
              const isEquipped =
                (item.item_type === 'frame' && user?.active_frame?.id === item.id) ||
                (item.item_type === 'background' && user?.active_background?.id === item.id);

              return (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  isEquipped={!!isEquipped}
                  onBuy={handleBuy}
                  onEquip={handleEquip}
                  onUnequip={handleUnequip}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
