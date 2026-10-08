import { apiClient } from './client';
import { ApiResponse, PublicProfileData, UserProfile } from '../types';

export const usersApi = {
  uploadAvatarDraft: async (file: File): Promise<ApiResponse<{ avatar_url: string }>> => {
    const formData = new FormData(); formData.append('file', file);
    const response = await apiClient.post<ApiResponse<{ avatar_url: string }>>('/users/avatar/draft', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  },
  uploadAvatar: async (file: File): Promise<ApiResponse<{ avatar_url: string }>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<{ avatar_url: string }>>('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateProfile: async (data: { bio?: string; username?: string; avatar_url?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch<ApiResponse<any>>('/users/profile', data);
    return response.data;
  },

  getPublicProfile: async (identifier: string | number): Promise<ApiResponse<PublicProfileData>> => {
    const path = typeof identifier === 'number' ? `/users/id/${identifier}/public-profile` : `/users/${encodeURIComponent(identifier)}/public-profile`;
    const response = await apiClient.get<ApiResponse<PublicProfileData>>(path);
    return response.data;
  },
};
