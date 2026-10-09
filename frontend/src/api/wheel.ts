import { apiClient } from './client';
import { ApiResponse } from '../types';

export interface WheelItem {
  id: number;
  wheel_id: number;
  reward_type: 'coins';
  reward_coins: number;
  label: string;
  color: string;
  text_color: string;
  icon: string;
  weight: number;
  probability_percent: number;
  is_jackpot: boolean;
  order_index: number;
}

export interface WheelSummary {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  cost_coins: number;
  has_daily_free_spin: boolean;
  is_free_spin_available: boolean;
  icon: string;
  color: string;
  is_active: boolean;
  items_count: number;
}

export interface WheelDetail extends WheelSummary {
  items: WheelItem[];
  total_spins_count: number;
}

export interface SpinResult {
  spin_id: number;
  winning_item: WheelItem;
  winning_index: number;
  new_balance: number;
  is_free_spin: boolean;
  message: string;
  outcome?: 'coins';
  reward_coins?: number;
}

export interface SpinHistoryItem {
  id: number;
  wheel_id: number;
  wheel_title: string;
  user_id: number;
  user_name: string;
  reward_label: string;
  reward_type: string;
  reward_coins: number;
  is_free_spin: boolean;
  cost_paid: number;
  created_at: string;
}

export const wheelApi = {
  async listWheels(): Promise<WheelSummary[]> {
    const res = await apiClient.get<ApiResponse<WheelSummary[]>>('/wheels');
    return res.data.data;
  },

  async getWheel(wheelId: number): Promise<WheelDetail> {
    const res = await apiClient.get<ApiResponse<WheelDetail>>(`/wheels/${wheelId}`);
    return res.data.data;
  },

  async spinWheel(wheelId: number, intent: { expected_mode: 'free' | 'paid'; expected_cost: number; operation_key: string }): Promise<SpinResult> {
    const res = await apiClient.post<ApiResponse<SpinResult>>(`/wheels/${wheelId}/spin`, intent);
    return res.data.data;
  },

  async getWheelHistory(wheelId: number, limit = 20): Promise<SpinHistoryItem[]> {
    const res = await apiClient.get<ApiResponse<SpinHistoryItem[]>>(`/wheels/${wheelId}/history`, {
      params: { limit }
    });
    return res.data.data;
  },

  async getMyHistory(limit = 20): Promise<SpinHistoryItem[]> {
    const res = await apiClient.get<ApiResponse<SpinHistoryItem[]>>('/wheels/user/history', {
      params: { limit }
    });
    return res.data.data;
  }
};
