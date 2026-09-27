import { apiClient } from './client';
import { ApiResponse, ShopItem } from '../types';

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
  async listItems(itemType?: 'frame' | 'background') {
    const res = await apiClient.get<ApiResponse<ShopItem[]>>('/shop/items', {
      params: itemType ? { item_type: itemType } : undefined
    });
    return res.data.data;
  },

  async buyItem(itemId: number) {
    const res = await apiClient.post<ApiResponse<BuyResponseData>>(`/shop/buy/${itemId}`);
    return res.data;
  },

  async equipItem(itemId: number) {
    const res = await apiClient.post<ApiResponse<EquipResponseData>>(`/shop/equip/${itemId}`);
    return res.data;
  },

  async unequipItem(itemId: number) {
    const res = await apiClient.post<ApiResponse<null>>(`/shop/unequip/${itemId}`);
    return res.data;
  }
};
