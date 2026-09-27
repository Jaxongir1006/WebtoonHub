import apiClient, { mockDb } from './client'

export const commentsApi = {
  async getComments() {
    try {
      const res = await apiClient.get('/comments')
      return res.data
    } catch {
      return {
        success: true,
        data: mockDb.comments
      }
    }
  },

  async deleteComment(id) {
    try {
      const res = await apiClient.delete(`/comments/${id}`)
      return res.data
    } catch {
      mockDb.comments = mockDb.comments.filter((c) => c.id !== Number(id))
      mockDb.save('comments')
      return {
        success: true,
        data: null,
        message: 'Sharh muvaffaqiyatli o\'chirildi'
      }
    }
  }
}
