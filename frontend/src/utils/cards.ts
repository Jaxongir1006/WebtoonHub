import type { CardMetadata, CardRarity, InventoryItem } from '../types';

export const CARD_RARITIES: CardRarity[] = ['common', 'rare', 'epic', 'legendary'];
export const MAX_FEATURED_CARDS = 3;

export function cardMediaSources(item: CardMetadata & { asset_url: string }) {
  const rasterUrl = (value?: string | null): string | null => {
    if (!value) return null;
    try {
      const url = new URL(value, 'http://local.invalid');
      return ['http:', 'https:'].includes(url.protocol) && /\.(?:png|jpe?g|gif|webp)$/i.test(url.pathname) ? value : null;
    } catch { return null; }
  };
  return {
    poster: (item.asset_animated && item.asset_preview_url === item.asset_url ? null : rasterUrl(item.asset_preview_url)) || (!item.asset_animated ? rasterUrl(item.asset_url) : null),
    animation: item.asset_animated ? rasterUrl(item.asset_url) : null
  };
}

export function shouldPlayCardAnimation(animated: boolean, manual: boolean | null, reducedMotion: boolean, hovered: boolean, focused: boolean, featured: boolean) {
  if (!animated || manual === false) return false;
  if (manual === true) return true;
  return !reducedMotion && (hovered || focused || featured);
}

export function cardHoverRequested(target: EventTarget | null, canHover: boolean) {
  // Entering Play/Pause must preserve its current action. Moving from the
  // control to artwork can subsequently request automatic preview playback.
  return canHover && !(target as Element | null)?.closest?.('[data-card-animation-control]');
}

export function cardRarity(value?: string | null): CardRarity {
  return CARD_RARITIES.includes(value as CardRarity) ? value as CardRarity : 'common';
}

export function countCardRarities(items: Array<Pick<InventoryItem, 'item_type' | 'rarity'>>) {
  const counts: Record<CardRarity, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };
  for (const item of items) if (item.item_type === 'card') counts[cardRarity(item.rarity)]++;
  return counts;
}

export function toggleFeaturedCard(selected: number[], id: number) {
  if (selected.includes(id)) return selected.filter(value => value !== id);
  return selected.length < MAX_FEATURED_CARDS ? [...selected, id] : selected;
}
