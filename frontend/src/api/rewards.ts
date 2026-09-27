import { apiClient } from './client';
import { ApiResponse } from '../types';

export interface DailyCheckinResult {
  reward_amount: number;
  total_lightning_coins: number;
  new_balance?: number;
  claimed_at: string;
}

export interface ChapterRewardResult {
  chapter_id: number;
  reward_amount: number;
  total_lightning_coins: number;
  new_balance?: number;
}

export interface DailyStatusResult {
  claimed_today: boolean;
  reward_amount: number;
  last_daily_login?: string | null;
}

export const rewardsApi = {
  async getDailyStatus() {
    const res = await apiClient.get<ApiResponse<DailyStatusResult>>('/rewards/daily-status');
    return res.data;
  },

  async claimDailyCheckin() {
    const res = await apiClient.post<ApiResponse<DailyCheckinResult>>('/rewards/daily-checkin');
    return res.data;
  },

  async claimChapterReward(chapterId: number) {
    const res = await apiClient.post<ApiResponse<ChapterRewardResult>>(`/chapters/${chapterId}/reward`);
    return res.data;
  }
};
