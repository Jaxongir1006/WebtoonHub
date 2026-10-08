import { apiClient } from './client';
import { ApiResponse, ChapterReaderData, ChapterSummary, Genre, WebtoonCatalogResponse, WebtoonDetail } from '../types';

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
    sort?: 'popular' | 'updated' | 'newest';
    signal?: AbortSignal;
  } = {}) {
    const res = await apiClient.get<ApiResponse<WebtoonCatalogResponse>>('/webtoons', {
      params: {
        page: params.page || 1,
        limit: params.limit || 20,
        type: params.type || undefined,
        genre: params.genre || undefined,
        status: params.status || undefined,
        search: params.search || undefined,
        sort: params.sort || 'popular',
      }
      , signal: params.signal
    });
    return res.data.data;
  },

  async getWebtoon(idOrSlug: string | number, signal?: AbortSignal) {
    const res = await apiClient.get<ApiResponse<WebtoonDetail>>(`/webtoons/${idOrSlug}`, { signal });
    return res.data.data;
  },

  async readChapter(chapterId: number, signal?: AbortSignal) {
    const res = await apiClient.get<ApiResponse<ChapterReaderData>>(`/chapters/${chapterId}`, { signal });
    return res.data.data;
  },

  async listChapters(webtoonId: number, offset = 0, limit = 100, signal?: AbortSignal) {
    const res = await apiClient.get<ApiResponse<ChapterSummary[] | { items: ChapterSummary[] }>>(`/webtoons/${webtoonId}/chapters`, { params: { offset, limit }, signal });
    return Array.isArray(res.data.data) ? res.data.data : res.data.data.items;
  }
};
