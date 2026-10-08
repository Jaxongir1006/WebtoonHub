import { apiClient } from './client';
import { ApiResponse, ReadingProgress } from '../types';

export const progressApi = {
  async list() {
    const response = await apiClient.get<ApiResponse<ReadingProgress[]>>('/users/reading-progress');
    return response.data.data;
  },
  async save(webtoonId: number, progress: ReadingProgress) {
    const { chapter_id, page_index, anchor, progress_percent, completed } = progress;
    const response = await apiClient.put<ApiResponse<ReadingProgress>>(`/users/reading-progress/${webtoonId}`, {
      chapter_id, page_index, anchor, progress_percent, completed
    });
    return response.data.data;
  }
};
