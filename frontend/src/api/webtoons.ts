import { apiClient } from './client';
import { ApiResponse, ChapterReaderData, Genre, WebtoonCatalogResponse, WebtoonDetail } from '../types';

export const webtoonsApi = {
  async listGenres() {
    const res = await apiClient.get<ApiResponse<Genre[]>>('/genres');
    return res.data.data;
  },

  async listCatalog(params: {
    page?: number;
    limit?: number;
    type?: 'manhwa' | 'manga' | 'novel';
    genre?: string;
    status?: 'ongoing' | 'completed';
    search?: string;
  } = {}) {
    const res = await apiClient.get<ApiResponse<WebtoonCatalogResponse>>('/webtoons', {
      params: {
        page: params.page || 1,
        limit: params.limit || 20,
        type: params.type || undefined,
        genre: params.genre || undefined,
        status: params.status || undefined,
        search: params.search || undefined,
      }
    });
    return res.data.data;
  },

  async getWebtoon(idOrSlug: string | number) {
    const res = await apiClient.get<ApiResponse<WebtoonDetail>>(`/webtoons/${idOrSlug}`);
    return res.data.data;
  },

  async readChapter(chapterId: number) {
    const res = await apiClient.get<ApiResponse<ChapterReaderData>>(`/chapters/${chapterId}`);
    return res.data.data;
  }
};
