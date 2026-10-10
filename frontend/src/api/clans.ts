import { apiClient } from './client';
import { ApiResponse, ClanDetail, ClanMemberItem, ClanMessageItem, ClanSummary, ShopItem, InventoryItem } from '../types';

type ClanListResponse = ApiResponse<ClanSummary[]> & { pagination?: { offset: number; limit: number; total: number; has_more: boolean } };

export const clansApi = {
  getSettings: async (): Promise<ApiResponse<{ clan_creation_cost: number; levels: unknown[] }>> => {
    const response = await apiClient.get('/clans/settings');
    return response.data;
  },

  transferLeadership: async (clanId: number, userId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch(`/clans/${clanId}/members/${userId}/role`, { role: 'leader' });
    return response.data;
  },
  getClans: async (params?: { q?: string; sort?: string; offset?: number; limit?: number }): Promise<ClanListResponse> => {
    const response = await apiClient.get<ClanListResponse>('/clans', { params });
    return response.data;
  },

  getMyClan: async (): Promise<ApiResponse<ClanDetail | null>> => {
    const response = await apiClient.get<ApiResponse<ClanDetail | null>>('/clans/my-clan');
    return response.data;
  },

  getClanDetail: async (clanId: number): Promise<ApiResponse<ClanDetail>> => {
    const response = await apiClient.get<ApiResponse<ClanDetail>>(`/clans/${clanId}`);
    return response.data;
  },

  createClan: async (data: {
    name: string;
    tag: string;
    description?: string;
    avatar_url?: string;
    expected_cost: number;
  }): Promise<ApiResponse<{ id: number; name: string; tag: string; remaining_coins?: number }>> => {
    const response = await apiClient.post<ApiResponse<{ id: number; name: string; tag: string; remaining_coins?: number }>>('/clans', data);
    return response.data;
  },

  updateClan: async (
    clanId: number,
    data: { description?: string; avatar_url?: string; is_recruiting?: boolean }
  ): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch<ApiResponse<any>>(`/clans/${clanId}`, data);
    return response.data;
  },

  joinClan: async (clanId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(`/clans/${clanId}/join`);
    return response.data;
  },

  leaveClan: async (clanId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(`/clans/${clanId}/leave`);
    return response.data;
  },

  kickMember: async (clanId: number, targetUserId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(`/clans/${clanId}/kick/${targetUserId}`);
    return response.data;
  },

  upgradeClanLevel: async (
    clanId: number, expectedCost: number
  ): Promise<ApiResponse<{ level: number; xp: number; max_members: number; remaining_coins: number }>> => {
    const response = await apiClient.post<ApiResponse<{ level: number; xp: number; max_members: number; remaining_coins: number }>>(
      `/clans/${clanId}/upgrade-level`, { expected_cost: expectedCost }
    );
    return response.data;
  },

  getClanMembers: async (clanId: number): Promise<ApiResponse<ClanMemberItem[]>> => {
    const response = await apiClient.get<ApiResponse<ClanMemberItem[]>>(`/clans/${clanId}/members`);
    return response.data;
  },

  getClanMessages: async (clanId: number, limit = 50, beforeId?: number, afterId?: number): Promise<ApiResponse<ClanMessageItem[]> & { has_more?: boolean; next_after_id?: number; pagination?: { has_more: boolean } }> => {
    const response = await apiClient.get<ApiResponse<ClanMessageItem[]>>(`/clans/${clanId}/chat/messages`, {
      params: { limit, before_id: beforeId, after_id: afterId },
    });
    return response.data;
  },

  sendClanMessage: async (clanId: number, content: string, clientMessageId?: string): Promise<ApiResponse<ClanMessageItem>> => {
    const response = await apiClient.post<ApiResponse<ClanMessageItem>>(`/clans/${clanId}/chat/send`, {
      content,
      client_message_id: clientMessageId,
    });
    return response.data;
  },

  uploadClanAvatar: async (clanId: number, file: File): Promise<ApiResponse<{ avatar_url: string }>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<{ avatar_url: string }>>(`/clans/${clanId}/upload-avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getShop: async (clanId: number): Promise<ApiResponse<ShopItem[]>> => {
    const response = await apiClient.get<ApiResponse<ShopItem[]>>(`/clans/${clanId}/shop`);
    return response.data;
  },
  getInventory: async (clanId: number): Promise<ApiResponse<InventoryItem[]>> => {
    const response = await apiClient.get<ApiResponse<InventoryItem[]>>(`/clans/${clanId}/inventory`);
    return response.data;
  },
  buyDecoration: async (clanId: number, itemId: number, expectedPrice: number): Promise<ApiResponse<{ item_id: number; item_name: string; price_paid: number; new_balance: number }>> => {
    const response = await apiClient.post(`/clans/${clanId}/shop/buy/${itemId}`, { expected_price: expectedPrice });
    return response.data;
  },
  equipDecoration: async (clanId: number, itemId: number): Promise<ApiResponse<unknown>> => {
    const response = await apiClient.post(`/clans/${clanId}/shop/equip/${itemId}`);
    return response.data;
  },
  unequipDecoration: async (clanId: number, itemId: number): Promise<ApiResponse<unknown>> => {
    const response = await apiClient.post(`/clans/${clanId}/shop/unequip/${itemId}`);
    return response.data;
  },
};
