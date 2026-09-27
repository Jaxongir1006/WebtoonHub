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

  async updateComment(id, content) {
    try {
      const res = await apiClient.patch(`/comments/${id}`, { content })
      return res.data
    } catch {
      const comment = mockDb.comments.find((c) => c.id === Number(id))
      if (!comment) throw new Error('Sharh topilmadi')

      comment.content = content
      mockDb.save('comments')

      return {
        success: true,
        data: comment,
        message: 'Sharh muvaffaqiyatli tahrirlandi'
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
