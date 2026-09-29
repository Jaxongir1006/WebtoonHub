import { apiClient } from './client';
import { ApiResponse, FriendRequestItem, FriendUserSummary } from '../types';

export const friendsApi = {
  getFriends: async (): Promise<ApiResponse<FriendUserSummary[]>> => {
    const response = await apiClient.get<ApiResponse<FriendUserSummary[]>>('/friends');
    return response.data;
  },

  getFriendRequests: async (): Promise<ApiResponse<{ incoming: FriendRequestItem[]; outgoing: FriendRequestItem[] }>> => {
    const response = await apiClient.get<ApiResponse<{ incoming: FriendRequestItem[]; outgoing: FriendRequestItem[] }>>('/friends/requests');
    return response.data;
  },

  sendFriendRequest: async (data: { user_id?: number; username?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>('/friends/request', data);
    return response.data;
  },

  acceptFriendRequest: async (requestId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(`/friends/requests/${requestId}/accept`);
    return response.data;
  },

  rejectFriendRequest: async (requestId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(`/friends/requests/${requestId}/reject`);
    return response.data;
  },

  removeFriend: async (targetId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete<ApiResponse<any>>(`/friends/${targetId}`);
    return response.data;
  },

  searchUsers: async (q: string): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get<ApiResponse<any[]>>(`/friends/search`, {
      params: { q },
    });
    return response.data;
  },
};
