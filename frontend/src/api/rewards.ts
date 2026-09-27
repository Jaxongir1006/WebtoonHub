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

export const rewardsApi = {
  async claimDailyCheckin() {
    const res = await apiClient.post<ApiResponse<DailyCheckinResult>>('/rewards/daily-checkin');
    return res.data;
  },

  async claimChapterReward(chapterId: number) {
    const res = await apiClient.post<ApiResponse<ChapterRewardResult>>(`/chapters/${chapterId}/reward`);
    return res.data;
  }
};
