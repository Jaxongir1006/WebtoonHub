import axios from 'axios';
import { apiClient, API_BASE_URL } from './client';
import { ApiResponse, UserProfile, UserSession, UserSummary } from '../types';

export interface LoginResponseData {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserSummary;
}

export const authApi = {
  async logout(token: string | null, refreshToken: string | null) {
    await axios.post(`${API_BASE_URL}/auth/logout`, { refresh_token: refreshToken }, { timeout: 15000, headers: token ? { Authorization: `Bearer ${token}` } : {} });
  },
  async forgotPassword(email: string) {
    await apiClient.post('/auth/password/forgot', { email });
  },
  async resetPassword(token: string, new_password: string) {
    await apiClient.post('/auth/password/reset', { token, new_password });
  },
  async register(data: { email: string; username: string; password: string }) {
    const res = await apiClient.post<ApiResponse<{ user: UserSummary }>>('/auth/register', data);
    return res.data;
  },

  async login(data: { email: string; password: string }) {
    const res = await apiClient.post<ApiResponse<LoginResponseData>>('/auth/login', data);
    return res.data;
  },

  async getProfile() {
    const res = await apiClient.get<ApiResponse<UserProfile>>('/auth/me');
    return res.data.data;
  },

  async updateProfile(data: { username?: string; old_password?: string; new_password?: string }) {
    const res = await apiClient.patch<ApiResponse<{ id: number; username: string; email: string }>>('/auth/profile', data);
    return res.data;
  },

  async listSessions() {
    const res = await apiClient.get<ApiResponse<UserSession[]>>('/auth/sessions');
    return res.data.data;
  },

  async revokeSession(id: string) {
    const res = await apiClient.delete<ApiResponse<null>>(`/auth/sessions/${id}`);
    return res.data;
  },

  async revokeOtherSessions() {
    const res = await apiClient.delete<ApiResponse<null>>('/auth/sessions/other');
    return res.data;
  }
};
