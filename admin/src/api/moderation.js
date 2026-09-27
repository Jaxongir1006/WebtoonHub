import apiClient from './client'

export const moderationApi = {
  async getChapters(params = {}) {
    const res = await apiClient.get('/chapters', { params })
    return res.data
  },

  async getChapter(id) {
    const res = await apiClient.get(`/chapters/${id}`)
    return res.data
  },

  async moderateChapter(id, status) {
    const res = await apiClient.patch(`/chapters/${id}/status`, { status })
    return res.data
  }
}
