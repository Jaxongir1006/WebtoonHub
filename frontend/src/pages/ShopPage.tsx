import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { shopApi } from '../api/shop';
import { useAuth } from '../context/AuthContext';
import { useDailyBonus } from '../context/DailyBonusContext';
import { useLanguage } from '../context/LanguageContext';
import { ShopItem, ShopItemType, CardRarity } from '../types';
import { ShopItemCard } from '../components/shop/ShopItemCard';
import { AvatarFrame } from '../components/common/AvatarFrame';
import { Zap, ShoppingBag, Sparkles, Gift, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { getApiErrorMessage } from '../api/client';
import { useSearchParams } from 'react-router-dom';
import { CARD_RARITIES, cardRarity } from '../utils/cards';

export const ShopPage: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading, refreshProfile, updateCoinsLocally, openAuthModal } = useAuth();
  const { openModal: openDailyBonusModal, isClaimedToday } = useDailyBonus();
  const { t } = useLanguage();
  const actorIdentity = useRef(user?.id);
  actorIdentity.current = user?.id;

  const [items, setItems] = useState<ShopItem[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialType = searchParams.get('type');
  const [filterType, setFilterType] = useState<'all' | ShopItemType>(initialType === 'card' || initialType === 'frame' || initialType === 'background' ? initialType : 'all');
  const [rarity, setRarity] = useState<CardRarity | 'all'>('all');
  useEffect(() => {
    const type = searchParams.get('type');
    setFilterType(type === 'card' || type === 'frame' || type === 'background' ? type : 'all');
  }, [searchParams]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const requestId = useRef(0);
  const actionLock = useRef(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchItems = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setLoadError(false);
    try {
      const typeParam = filterType === 'all' ? undefined : filterType;
      const data = await shopApi.listItems(typeParam);
      if (request === requestId.current) setItems(data || []);
    } catch (err) {
      console.error("Failed to load shop items", err);
      if (request === requestId.current) setLoadError(true);
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [filterType, user?.id]);

  useEffect(() => {
    if (!authLoading) { setItems([]); fetchItems(); }
    return () => { requestId.current++; };
  }, [fetchItems, authLoading]);

  const handleBuy = async (itemId: number): Promise<boolean> => {
    if (actionLock.current) return false;
    const actor = actorIdentity.current;
    const offer = items.find(item => item.id === itemId);
    if (!actor || !offer) return false;
    actionLock.current = true; setActionBusy(true);
    const isCardPurchase = items.some(item => item.id === itemId && item.item_type === 'card');
    try {
      const res = await shopApi.buyItem(itemId, offer.price_coins);
      if (actor !== actorIdentity.current) return false;
      if (res.data) {
        updateCoinsLocally(res.data.remaining_coins);
      }
      setItems(previous => previous.map(item => item.id === itemId ? { ...item, is_owned: true } : item));
      showToast('success', `${isCardPurchase ? t('cards.collectSuccess') + ' ' : ''}${t('shop.receipt', { name: res.data.item_name, price: res.data.price_paid })}`);
      await fetchItems();
      if (actor !== actorIdentity.current) return true;
      await refreshProfile().catch(() => undefined);
      return true;
    } catch (err) {
      if (actor === actorIdentity.current) {
        showToast('error', axios.isAxiosError(err) && err.response?.status === 409 ? t('shop.priceChanged') : getApiErrorMessage(err, t('common.error')));
        await fetchItems();
      }
      return false;
    } finally { actionLock.current = false; setActionBusy(false); }
  };

  const handleEquip = async (itemId: number): Promise<boolean> => {
    const actor = actorIdentity.current;
    if (actionLock.current) return false;
    actionLock.current = true; setActionBusy(true);
    try {
      const res = await shopApi.equipItem(itemId);
      if (actor !== actorIdentity.current) return false;
      if (actor === actorIdentity.current) showToast('success', t('shop.equipSuccess'));
      if (actor !== actorIdentity.current) return false;
      await refreshProfile().catch(() => undefined);
      return true;
    } catch (err) {
      if (actor === actorIdentity.current) showToast('error', getApiErrorMessage(err, t('common.error')));
      return false;
    } finally { actionLock.current = false; setActionBusy(false); }
  };

  const handleUnequip = async (itemId: number): Promise<boolean> => {
    const actor = actorIdentity.current;
    if (actionLock.current) return false;
    actionLock.current = true; setActionBusy(true);
    try {
      const res = await shopApi.unequipItem(itemId);
      if (actor !== actorIdentity.current) return false;
      if (actor === actorIdentity.current) showToast('success', t('shop.unequipSuccess'));
      if (actor !== actorIdentity.current) return false;
      await refreshProfile().catch(() => undefined);
      return true;
    } catch (err) {
      if (actor === actorIdentity.current) showToast('error', getApiErrorMessage(err, t('common.error')));
      return false;
    } finally { actionLock.current = false; setActionBusy(false); }
  };

  if (authLoading) return <div role="status" className="py-24 text-center">{t('common.loading')}</div>;
  const visibleItems = items.filter(item => item.item_type !== 'card' || rarity === 'all' || cardRarity(item.rarity) === rarity);
  return (
    <div className="min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Floating Toast Notification */}
        {toast && (
          <div role="status" className="fixed bottom-6 right-6 left-6 sm:left-auto z-50 animate-in slide-in-from-bottom duration-300">
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
                {t('cards.shopTitle')}
              </h1>
              <p className="text-xs sm:text-sm text-studio-400 max-w-lg leading-relaxed">
                {t('cards.shopSubtitle')}
              </p>
            </div>

            {/* Wallet & Active Preview Box */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-studio-950/80 border border-studio-800 p-5 rounded-2xl shadow-inner">
              {isAuthenticated && user ? (
                <>
                  <div className="flex items-center gap-3">
                    <AvatarFrame
                      username={user.username}
                      avatarUrl={user.avatar_url}
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
        <div className="flex flex-wrap items-center gap-2 mb-5 select-none">
          {[
            { label: t('shop.tabAll'), value: 'all' },
            { label: t('shop.tabFrames'), value: 'frame' },
            { label: t('shop.tabBackgrounds'), value: 'background' },
            { label: t('cards.title'), value: 'card' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setFilterType(tab.value as 'all' | ShopItemType); setRarity('all'); const next = new URLSearchParams(searchParams); if (tab.value === 'all') next.delete('type'); else next.set('type', tab.value); setSearchParams(next, { replace: true }); }}
              aria-pressed={filterType === tab.value}
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
        {filterType === 'card' && <div className="mb-8 space-y-3"><p className="max-w-2xl text-xs leading-relaxed text-studio-300">{t('cards.description')}</p><div className="flex flex-wrap gap-2" aria-label={t('cards.all')}>{(['all', ...CARD_RARITIES] as const).map(value => <button type="button" key={value} aria-pressed={rarity === value} onClick={() => setRarity(value)} className={`min-h-11 rounded-xl border px-3 text-xs font-bold ${rarity === value ? 'border-brand-500 bg-brand-500 text-studio-950' : 'border-studio-700 text-studio-300'}`}>{t(value === 'all' ? 'cards.all' : 'cards.rarity.' + value)}</button>)}</div></div>}

        {/* Items Grid */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-studio-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            <span className="text-sm">{t('common.loading')}</span>
          </div>
        ) : loadError ? (
          <div role="alert" className="py-16 text-center space-y-4">
            <p>{t('socialFix.loadFailed')}</p>
            <button onClick={fetchItems} className="px-5 py-3 rounded-xl bg-brand-500 text-studio-950">{t('socialFix.retry')}</button>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="py-20 text-center bg-studio-900/40 border border-studio-800 rounded-3xl p-8 max-w-md mx-auto">
            <ShoppingBag className="w-12 h-12 mx-auto text-studio-600 mb-3" />
            <h3 className="font-bold text-white text-base mb-1">{t('socialFix.shopEmpty')}</h3>
            <p className="text-xs text-studio-400">
              {t(filterType === 'card' && items.length ? 'cards.emptyFilter' : 'shop.empty')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {visibleItems.map((item) => {
              const isEquipped =
                (item.item_type === 'frame' && user?.active_frame?.id === item.id) ||
                (item.item_type === 'background' && user?.active_background?.id === item.id);

              return (
                <ShopItemCard
                  key={item.id}
                  actionBusy={actionBusy}
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
