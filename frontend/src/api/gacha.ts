import { apiClient } from './client';
import { ApiResponse, CardRarity, ShopItem } from '../types';

export interface GachaRarityRate { rarity: CardRarity; weight: number; probability_percent: number }
export interface GachaPool {
  id: number; title: string; description?: string | null; cost_coins: number; is_active: boolean;
  version: number; cards_count: number; rarity_rates: GachaRarityRate[]; duplicate_refund: 'full_cost';
}
export interface GachaPoolDetail extends GachaPool {
  cards: (ShopItem & { weight: number; probability_percent: number })[];
}
export interface GachaRollResult {
  roll_id: number; pool_id: number; winning_card: ShopItem; animation_cards: ShopItem[];
  winning_index: number; new_balance: number; cost_paid: number; is_duplicate: boolean; refund_coins: number;
}
export interface GachaHistoryItem {
  id: number; pool_id: number; pool_title: string; winning_card: ShopItem; cost_paid: number;
  is_duplicate: boolean; refund_coins: number; created_at: string;
}
export const gachaApi = {
  async listPools(signal?: AbortSignal) {
    return (await apiClient.get<ApiResponse<GachaPool[]>>('/gacha/pools', { signal })).data.data;
  },
  async getPool(id: number, signal?: AbortSignal) {
    return (await apiClient.get<ApiResponse<GachaPoolDetail>>(`/gacha/pools/${id}`, { signal })).data.data;
  },
  async roll(id: number, intent: { expected_cost: number; expected_version: number; operation_key: string }) {
    return (await apiClient.post<ApiResponse<GachaRollResult>>(`/gacha/pools/${id}/roll`, intent)).data.data;
  },
  async history(signal?: AbortSignal) {
    return (await apiClient.get<ApiResponse<GachaHistoryItem[]>>('/gacha/history', { signal })).data.data;
  }
};
