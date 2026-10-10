import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, CheckCircle, Loader2, Sparkles, Zap } from 'lucide-react';
import { clansApi } from '../../api/clans';
import { getApiErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ClanDetail, InventoryItem, ShopItem } from '../../types';
import { AvatarFrame } from '../common/AvatarFrame';
import { Modal } from '../common/Modal';

interface ClanShopPanelProps {
  clan: ClanDetail;
  onAppearanceChange: () => Promise<void>;
}

/** Clan ownership is intentionally independent from a reader's personal inventory. */
export const ClanShopPanel: React.FC<ClanShopPanelProps> = ({ clan, onAppearanceChange }) => {
  const { user, updateCoinsLocally, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const [catalog, setCatalog] = useState<ShopItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [purchase, setPurchase] = useState<ShopItem | null>(null);
  const identity = useRef('');
  identity.current = `${clan.id}:${user?.id ?? 'guest'}:${clan.my_role ?? 'visitor'}`;
  const mounted = useRef(true);
  const catalogRequest = useRef(0);
  const inventoryRequest = useRef(0);
  const mutationRequest = useRef(0);
  const actionLock = useRef(false);
  const canManage = Boolean(user && (clan.my_role === 'leader' || clan.my_role === 'co_leader'));
  const balance = user?.lightning_coins ?? 0;
  const currentOffer = purchase ? catalog.find(item => item.id === purchase.id) : undefined;
  const isCurrent = (scope: string) => mounted.current && identity.current === scope;

  const loadCatalog = async () => {
    const scope = identity.current;
    const request = ++catalogRequest.current;
    setCatalogLoading(true); setCatalogError(null);
    try {
      const result = await clansApi.getShop(clan.id);
      if (isCurrent(scope) && request === catalogRequest.current) setCatalog((result.data || []).filter(item => item.item_type === 'frame' || item.item_type === 'background'));
    } catch (error) {
      if (isCurrent(scope) && request === catalogRequest.current) setCatalogError(getApiErrorMessage(error, t('socialFix.loadFailed')));
    } finally {
      if (isCurrent(scope) && request === catalogRequest.current) setCatalogLoading(false);
    }
  };

  const loadInventory = async () => {
    const scope = identity.current;
    const request = ++inventoryRequest.current;
    setInventoryLoading(true); setInventoryError(null);
    try {
      const result = await clansApi.getInventory(clan.id);
      if (isCurrent(scope) && request === inventoryRequest.current) setInventory((result.data || []).filter(item => item.item_type === 'frame' || item.item_type === 'background'));
    } catch (error) {
      if (isCurrent(scope) && request === inventoryRequest.current) setInventoryError(getApiErrorMessage(error, t('socialFix.loadFailed')));
    } finally {
      if (isCurrent(scope) && request === inventoryRequest.current) setInventoryLoading(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    actionLock.current = false;
    setCatalog([]); setInventory([]); setPurchase(null); setActionError(null); setSuccess(null); setBusy(false);
    void loadCatalog(); void loadInventory();
    return () => { mounted.current = false; catalogRequest.current++; inventoryRequest.current++; mutationRequest.current++; };
  }, [clan.id, user?.id, clan.my_role]);

  const handleMutation = async (kind: 'buy' | 'equip' | 'unequip', item: ShopItem | InventoryItem) => {
    if (!canManage || actionLock.current) return;
    if (kind === 'buy' && (balance < item.price_coins || catalogLoading || catalogError)) return;
    if (kind !== 'buy' && (inventoryLoading || inventoryError)) return;
    const scope = identity.current;
    const request = ++mutationRequest.current;
    actionLock.current = true; setBusy(true); setActionError(null); setSuccess(null);
    try {
      if (kind === 'buy') {
        const result = await clansApi.buyDecoration(clan.id, item.id, item.price_coins);
        if (!isCurrent(scope)) return;
        updateCoinsLocally(result.data.new_balance);
        setPurchase(null);
        setSuccess(t('clanShop.bought', { name: result.data.item_name }));
        await refreshProfile().catch(() => undefined);
      } else {
        if (kind === 'equip') await clansApi.equipDecoration(clan.id, item.id);
        else await clansApi.unequipDecoration(clan.id, item.id);
        if (!isCurrent(scope)) return;
        setSuccess(t(kind === 'equip' ? 'clanShop.equipped' : 'clanShop.unequipped'));
      }
      if (!isCurrent(scope)) return;
      await Promise.all([loadCatalog(), loadInventory()]);
      if (!isCurrent(scope)) return;
      await onAppearanceChange();
    } catch (error) {
      if (!isCurrent(scope)) return;
      setActionError(getApiErrorMessage(error, t('common.error')));
      if (kind === 'buy') setPurchase(null);
      // A changed price, another manager's purchase, or a lost receipt must be recoverable.
      await Promise.all([loadCatalog(), loadInventory(), refreshProfile().catch(() => undefined)]);
      if (!isCurrent(scope)) return;
      // A co-leader may have been demoted or removed while this view was open.
      await onAppearanceChange();
    } finally {
      if (isCurrent(scope) && request === mutationRequest.current) { actionLock.current = false; setBusy(false); }
    }
  };

  const renderPreview = (item: ShopItem | InventoryItem) => (
    <div className="relative mb-4 flex h-36 items-center justify-center overflow-hidden rounded-2xl border border-studio-700 bg-studio-950 p-4">
      {item.item_type === 'frame' ? <AvatarFrame username={clan.name} avatarUrl={clan.avatar_url} frameUrl={item.asset_url} size="lg" /> : <>
        <img src={item.asset_preview_url || (item.asset_animated ? undefined : item.asset_url)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-studio-950/40" />
        <span className="relative text-xs font-bold text-white">{t('shop.preview')}</span>
      </>}
    </div>
  );

  const renderLoadFeedback = (loading: boolean, error: string | null, retry: () => Promise<void>) => (
    <>
      {loading && <p role="status" className="mb-4 flex items-center gap-2 text-sm text-studio-300"><Loader2 className="h-4 w-4 animate-spin" />{t('common.loading')}</p>}
      {error && <div className="mb-4 rounded-xl border border-rose-500/30 bg-studio-950/80 p-4"><p role="alert" className="mb-2 text-sm text-rose-300">{error}</p><button type="button" disabled={loading || busy} onClick={() => void retry()} className="rounded-lg border border-studio-600 px-3 text-sm text-white disabled:opacity-50">{t('socialFix.retry')}</button></div>}
    </>
  );

  return (
    <section aria-label={t('clanShop.tab')} className="space-y-6">
      <div className="profile-panel rounded-2xl border border-studio-700 bg-studio-900 p-5 sm:p-6">
        <h2 className="mb-2 text-xl font-bold text-white">{t('clanShop.tab')}</h2>
        <p className="max-w-3xl text-sm leading-relaxed text-studio-200">{t('clanShop.hint')}</p>
        {canManage ? <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-brand-300"><Zap className="h-4 w-4" />{t('socialFix.balance')}: {balance} ⚡</p> : <p className="mt-3 text-sm text-studio-300">{t('clanShop.memberHint')}</p>}
        {actionError && <p role="alert" className="mt-4 flex items-start gap-2 text-sm text-rose-300"><AlertCircle className="h-4 w-4 shrink-0" />{actionError}</p>}
        {success && <p role="status" className="mt-4 flex items-start gap-2 text-sm text-emerald-300"><CheckCircle className="h-4 w-4 shrink-0" />{success}</p>}
      </div>

      <section aria-labelledby="clan-inventory-title" className="profile-panel rounded-3xl border border-studio-800 bg-studio-900 p-5 sm:p-6">
        <h3 id="clan-inventory-title" className="mb-4 text-lg font-bold text-white">{t('clanShop.inventory')}</h3>
        {renderLoadFeedback(inventoryLoading, inventoryError, loadInventory)}
        {!inventoryLoading && !inventoryError && inventory.length === 0 && <p className="text-sm text-studio-300">{t('clanShop.emptyInventory')}</p>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {inventory.map(item => <article key={item.id} data-clan-inventory-item={item.id} className="min-w-0 rounded-2xl border border-studio-700 bg-studio-950/80 p-4">
            {renderPreview(item)}
            <h4 className="mb-1 break-words font-bold text-white">{item.name}</h4>
            <p className="mb-3 text-xs text-studio-300">{t(item.item_type === 'frame' ? 'shop.itemFrame' : 'clanShop.background')}</p>
            {item.is_active && <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-brand-300"><Sparkles className="h-3.5 w-3.5" />{t('shop.equipped')}</p>}
            {canManage && <button type="button" disabled={busy || inventoryLoading || Boolean(inventoryError)} onClick={() => void handleMutation(item.is_active ? 'unequip' : 'equip', item)} className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold disabled:opacity-50 ${item.is_active ? 'border border-studio-600 bg-studio-800 text-rose-300' : 'bg-emerald-400 text-studio-950'}`}><Check className="h-4 w-4" />{t(item.is_active ? 'shop.unequip' : 'shop.equip')}</button>}
          </article>)}
        </div>
      </section>

      <section aria-labelledby="clan-catalog-title" className="profile-panel rounded-3xl border border-studio-800 bg-studio-900 p-5 sm:p-6">
        <h3 id="clan-catalog-title" className="mb-4 text-lg font-bold text-white">{t('clanShop.catalog')}</h3>
        {renderLoadFeedback(catalogLoading, catalogError, loadCatalog)}
        {!catalogLoading && !catalogError && catalog.length === 0 && <p className="text-sm text-studio-300">{t('socialFix.shopEmpty')}</p>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.map(item => <article key={item.id} data-clan-shop-item={item.id} className="min-w-0 rounded-2xl border border-studio-700 bg-studio-950/80 p-4">
            {renderPreview(item)}
            <h4 className="mb-1 break-words font-bold text-white">{item.name}</h4>
            <p className="mb-3 text-xs text-studio-300">{t(item.item_type === 'frame' ? 'shop.itemFrame' : 'clanShop.background')}</p>
            {item.is_owned ? <p className="flex min-h-11 items-center gap-2 text-sm text-emerald-300"><Check className="h-4 w-4" />{t('clanShop.owns')}</p> : <>
              <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-brand-300"><Zap className="h-4 w-4" />{item.price_coins} ⚡</p>
              {canManage && <button type="button" disabled={busy || catalogLoading || Boolean(catalogError) || balance < item.price_coins} onClick={() => { setActionError(null); setPurchase(item); }} className="w-full rounded-xl bg-brand-400 px-4 text-sm font-bold text-studio-950 disabled:opacity-50">{t('shop.buy')}</button>}
              {canManage && balance < item.price_coins && <p className="mt-2 text-xs text-studio-300">{t('socialFix.needCoins', { amount: item.price_coins - balance })}</p>}
            </>}
          </article>)}
        </div>
      </section>

      <Modal isOpen={Boolean(purchase)} title={t('clanShop.confirmTitle')} dismissible={!busy} onClose={() => { if (!busy) setPurchase(null); }}>
        {purchase && <>
          <p className="mb-4 text-sm leading-relaxed text-studio-200">{t('clanShop.confirmBody', { name: purchase.name, cost: purchase.price_coins, clan: clan.name })}</p>
          <p className="mb-4 text-sm text-brand-300">{t('socialFix.balance')}: {balance} ⚡</p>
          {actionError && <p role="alert" className="mb-4 text-sm text-rose-300">{actionError}</p>}
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" disabled={busy} onClick={() => setPurchase(null)} className="rounded-xl border border-studio-600 px-4 text-sm text-studio-200 disabled:opacity-50">{t('common.cancel')}</button>
            <button type="button" disabled={busy || !canManage || balance < purchase.price_coins || catalogLoading || Boolean(catalogError) || !currentOffer || currentOffer.is_owned || currentOffer.price_coins !== purchase.price_coins} onClick={() => void handleMutation('buy', purchase)} className="flex items-center gap-2 rounded-xl bg-brand-400 px-4 text-sm font-bold text-studio-950 disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{t('clanShop.confirmBuy', { cost: purchase.price_coins })}</button>
          </div>
        </>}
      </Modal>
    </section>
  );
};
