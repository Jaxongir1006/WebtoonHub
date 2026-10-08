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

  async moderateChapter(id, status, feedback = '') {
    const res = await apiClient.patch(`/chapters/${id}/status`, { status, feedback })
    return res.data
  }
}
