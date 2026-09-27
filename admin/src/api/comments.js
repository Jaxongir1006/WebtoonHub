import apiClient from './client'

export const commentsApi = {
  async getComments(params = {}) {
    const res = await apiClient.get('/comments', { params })
    return res.data
  },

  async updateComment(id, content) {
    const res = await apiClient.patch(`/comments/${id}`, { content })
    return res.data
  },

  async deleteComment(id) {
    const res = await apiClient.delete(`/comments/${id}`)
    return res.data
  }
}
