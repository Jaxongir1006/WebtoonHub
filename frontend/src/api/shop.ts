import { apiClient } from './client';
import { ApiResponse, ShopItem, InventoryItem, ShopItemType, CardCollection, CardCollectionSummary } from '../types';

export interface BuyResponseData {
  item_id: number;
  item_name: string;
  price_paid: number;
  remaining_coins: number;
}

export interface EquipResponseData {
  item_id: number;
  item_type: string;
  is_active: boolean;
}

export const shopApi = {
  async listItems(itemType?: ShopItemType) {
    const res = await apiClient.get<ApiResponse<ShopItem[]>>('/shop/items', {
      params: itemType ? { item_type: itemType } : undefined
    });
    return res.data.data;
  },

  async getMyInventory(itemType?: ShopItemType) {
    const res = await apiClient.get<ApiResponse<InventoryItem[]>>('/shop/inventory', {
      params: itemType ? { item_type: itemType } : undefined
    });
    return res.data.data;
  },

  async buyItem(itemId: number, expectedPrice: number) {
    const res = await apiClient.post<ApiResponse<BuyResponseData>>(`/shop/buy/${itemId}`, { expected_price: expectedPrice });
    return res.data;
  },

  async equipItem(itemId: number) {
    const res = await apiClient.post<ApiResponse<EquipResponseData>>(`/shop/equip/${itemId}`);
    return res.data;
  },

  async unequipItem(itemId: number) {
    const res = await apiClient.post<ApiResponse<null>>(`/shop/unequip/${itemId}`);
    return res.data;
  },

  async getMyCollection(signal?: AbortSignal) {
    const res = await apiClient.get<ApiResponse<CardCollection>>('/shop/collection', { signal });
    return res.data.data;
  },

  async updateFeaturedCards(itemIds: number[], signal?: AbortSignal) {
    const res = await apiClient.put<ApiResponse<CardCollectionSummary>>('/shop/collection/featured', { item_ids: itemIds }, { signal });
    return res.data.data;
  }
};
