import { apiClient } from './client';
import { ApiResponse, CommentItemData, CommentReply } from '../types';
interface CreatedComment { id: number; chapter_id: number; parent_id?: number | null; content: string; created_at: string; }
export const commentsApi = {
  async listComments(chapterId: number, offset = 0, limit = 50) {
    const response = await apiClient.get<ApiResponse<CommentItemData[]>>(`/chapters/${chapterId}/comments`, { params: { offset, limit } });
    return response.data.data;
  },
  async listReplies(rootId: number, offset = 0, limit = 50) {
    const response = await apiClient.get<ApiResponse<{ items: CommentReply[]; total: number; offset: number; limit: number; has_more: boolean }>>(`/comments/${rootId}/replies`, { params: { offset, limit } });
    return response.data.data;
  },
  async createComment(chapterId: number, data: { content: string; parent_id?: number | null }) {
    const response = await apiClient.post<ApiResponse<CreatedComment>>(`/chapters/${chapterId}/comments`, { content: data.content, parent_id: data.parent_id ?? null });
    return response.data;
  },
  async deleteComment(commentId: number) {
    const response = await apiClient.delete<ApiResponse<null>>(`/comments/${commentId}`);
    return response.data;
  }
};
