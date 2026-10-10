import React, { useState } from 'react';
import { ShopItem } from '../../types';
import { AvatarFrame } from '../common/AvatarFrame';
import { Zap, Check, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Link } from 'react-router-dom';
import { CharacterCard } from '../cards/CharacterCard';

interface ShopItemCardProps {
  item: ShopItem;
  isEquipped: boolean;
  actionBusy?: boolean;
  onBuy: (itemId: number) => Promise<boolean>;
  onEquip: (itemId: number) => Promise<boolean>;
  onUnequip: (itemId: number) => Promise<boolean>;
}

export const ShopItemCard: React.FC<ShopItemCardProps> = ({
  item,
  isEquipped,
  actionBusy = false,
  onBuy,
  onEquip,
  onUnequip
}) => {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const canAfford = (user?.lightning_coins || 0) >= item.price_coins;

  const handleAction = async () => {
    if (item.item_type === 'card') return;
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }

    if (loading || actionBusy) return;
    setLoading(true);
    try {
      if (!item.is_owned) {
        await onBuy(item.id);
      } else if (isEquipped) {
        await onUnequip(item.id);
      } else {
        await onEquip(item.id);
      }
    } finally {
      setLoading(false);
    }
  };

  if (item.item_type === 'card') return <CharacterCard item={item} owned={item.is_owned}>
    {item.is_owned ? <Link to="/inventory?type=card" className="flex min-h-11 items-center justify-center rounded-xl border border-emerald-500/40 px-3 text-xs font-bold text-emerald-400">{t('cards.viewCollection')}</Link> : <><p className="mb-3 text-xs leading-relaxed text-studio-300">{t('gacha.exclusiveCard')}</p><Link to="/wheel?category=gacha" className="flex min-h-11 items-center justify-center rounded-xl border border-violet-400/40 px-3 text-xs font-bold text-violet-200">{t('gacha.open')}</Link></>}
  </CharacterCard>;

  return (
    <div className="flex flex-col bg-studio-900 border border-studio-800 rounded-3xl p-5 hover:border-brand-500/40 transition-all duration-300 hover:-translate-y-1 shadow-xl relative overflow-hidden group">
      {/* Background radial highlight */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Item Type Badge */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-studio-800 text-studio-400 border border-studio-700">
          {item.item_type === 'frame' ? t('shop.itemFrame') : t('shop.itemBackground')}
        </span>

        {isEquipped ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center gap-1 shadow-glow-brand">
            <Sparkles className="w-3 h-3" />
            <span>{t('shop.equipped')}</span>
          </span>
        ) : item.is_owned ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <Check className="w-3 h-3" />
            <span>{t('shop.owned')}</span>
          </span>
        ) : null}
      </div>

      {/* Visual Preview */}
      <div className="h-36 rounded-2xl bg-studio-950 border border-studio-800/80 flex items-center justify-center p-4 relative overflow-hidden mb-4">
        {item.item_type === 'frame' ? (
          <div className="relative">
            <AvatarFrame
              username={user?.username || "You"}
              avatarUrl={user?.avatar_url}
              frameUrl={item.asset_url}
              size="lg"
            />
          </div>
        ) : (
          <div className="w-full h-full rounded-xl overflow-hidden relative">
            <img src={item.asset_preview_url || item.asset_url} alt={item.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-studio-950/40" />
            <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-white">
              {t('shop.preview')}
            </div>
          </div>
        )}
      </div>

      {/* Item Name */}
      <h3 className="font-bold text-white text-base mb-1 truncate" title={item.name}>
        {item.name}
      </h3>

      {/* Price or Ownership Status */}
      <div className="flex flex-wrap gap-2 items-center justify-between mt-auto pt-3">
        {!item.is_owned ? (
          <div className="flex items-center gap-1 text-sm font-bold text-brand-400">
            <Zap className="w-4 h-4 fill-brand-400" />
            <span>{item.price_coins} {t('common.coins')}</span>
          </div>
        ) : (
          <div className="text-xs font-semibold text-studio-400">
            {t('shop.inventory')}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleAction}
          disabled={loading || actionBusy || (isAuthenticated && !item.is_owned && !canAfford)}
          aria-label={!isAuthenticated ? t('socialFix.signInToBuy') : undefined}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${
            !item.is_owned
              ? 'bg-brand-500 text-studio-950 hover:bg-brand-400 shadow-glow-brand'
              : isEquipped
              ? 'bg-studio-800 text-rose-400 hover:bg-rose-500/10 border border-studio-700'
              : 'bg-emerald-500 text-studio-950 hover:bg-emerald-400'
          }`}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : !item.is_owned ? (
            <>
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{!isAuthenticated ? t('socialFix.signInToBuy') : t('shop.buy')}</span>
            </>
          ) : isEquipped ? (
            <span>{t('shop.unequip')}</span>
          ) : (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>{t('shop.equip')}</span>
            </>
          )}
        </button>
      </div>
      {isAuthenticated && !item.is_owned && !canAfford && (
        <p className="mt-3 text-xs text-studio-300">{t('socialFix.needCoins', { amount: item.price_coins - (user?.lightning_coins || 0) })}</p>
      )}
    </div>
  );
};
