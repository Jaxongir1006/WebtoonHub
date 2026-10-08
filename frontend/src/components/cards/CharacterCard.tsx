import React from 'react';
import { Check, Gem } from 'lucide-react';
import { CardMetadata } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { cardRarity } from '../../utils/cards';
import { CardMedia } from './CardMedia';

const rarityStyles = {
  common: 'border-slate-500/40 bg-slate-500/10 text-slate-300',
  rare: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  epic: 'border-violet-400/40 bg-violet-400/10 text-violet-300',
  legendary: 'border-amber-400/60 bg-amber-400/15 text-amber-300'
};

export const RarityBadge: React.FC<{ rarity?: string | null }> = ({ rarity }) => {
  const { t } = useLanguage();
  const value = cardRarity(rarity);
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${rarityStyles[value]}`}><Gem className="h-3 w-3" aria-hidden="true" />{t('cards.rarity.' + value)}</span>;
};

interface CharacterCardProps {
  item: CardMetadata & { id: number; name: string; asset_url: string };
  owned?: boolean;
  featured?: boolean;
  children?: React.ReactNode;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({ item, owned = false, featured = false, children }) => {
  const { t } = useLanguage();
  return <article className="flex min-w-0 flex-col rounded-3xl border border-studio-800 bg-studio-900 p-3 sm:p-4 shadow-xl">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><RarityBadge rarity={item.rarity} />{owned && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400"><Check className="h-3.5 w-3.5" aria-hidden="true" />{t('shop.owned')}</span>}</div>
    <CardMedia item={item} featured={featured} />
    <div className="mb-3 mt-3 space-y-1"><h3 className="break-words text-sm font-bold text-white">{item.name}</h3>{item.character_name && item.character_name !== item.name && <p className="break-words text-xs font-semibold text-studio-200">{item.character_name}</p>}{item.series_title && <p className="break-words text-xs text-studio-400">{item.series_title}</p>}</div>
    {children && <div className="mt-auto border-t border-studio-800 pt-3">{children}</div>}
  </article>;
};
