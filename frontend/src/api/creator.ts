import { apiClient } from './client';
import { ApiResponse, CreatorRequest } from '../types';

export const creatorApi = {
  async submitRequest(message: string) {
    const res = await apiClient.post<ApiResponse<{ id: number; status: string; created_at: string }>>(
      '/creator-requests',
      { message }
    );
    return res.data;
  },

  async getMyRequest() {
    const res = await apiClient.get<ApiResponse<CreatorRequest | null>>('/creator-requests/my');
    return res.data.data;
  }
};
