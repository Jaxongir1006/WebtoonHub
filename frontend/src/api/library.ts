import { apiClient } from './client';
import { ApiResponse, BookmarkItem, BookmarkStatus } from '../types';

export const libraryApi = {
  async getLibrary(status?: BookmarkStatus) {
    const res = await apiClient.get<ApiResponse<BookmarkItem[]>>('/users/library', {
      params: status ? { status } : undefined
    });
    return res.data.data;
  },

  async updateBookmark(webtoonId: number, status: BookmarkStatus) {
    const res = await apiClient.post<ApiResponse<{ webtoon_id: number; status: BookmarkStatus }>>(
      `/users/library/${webtoonId}`,
      { status }
    );
    return res.data;
  },

  async removeBookmark(webtoonId: number) {
    const res = await apiClient.delete<ApiResponse<null>>(`/users/library/${webtoonId}`);
    return res.data;
  }
};
