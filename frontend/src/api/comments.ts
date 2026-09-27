import { apiClient } from './client';
import { ApiResponse, CommentItemData } from '../types';

export const commentsApi = {
  async listComments(chapterId: number) {
    const res = await apiClient.get<ApiResponse<CommentItemData[]>>(`/chapters/${chapterId}/comments`);
    return res.data.data;
  },

  async createComment(chapterId: number, data: { content: string; parent_id?: number | null }) {
    const res = await apiClient.post<ApiResponse<any>>(`/chapters/${chapterId}/comments`, {
      content: data.content,
      parent_id: data.parent_id || null
    });
    return res.data;
  },

  async deleteComment(commentId: number) {
    const res = await apiClient.delete<ApiResponse<null>>(`/comments/${commentId}`);
    return res.data;
  }
};
