import apiClient from './client'

export const webtoonsApi = {
  async getGenres() {
    const res = await apiClient.get('/genres')
    return res.data
  },

  async createGenre(data) {
    const res = await apiClient.post('/genres', data)
    return res.data
  },

  async updateGenre(id, data) {
    const res = await apiClient.patch(`/genres/${id}`, data)
    return res.data
  },

  async deleteGenre(id) {
    const res = await apiClient.delete(`/genres/${id}`)
    return res.data
  },

  async getWebtoons(params = {}) {
    const res = await apiClient.get('/webtoons', { params })
    return res.data
  },

  async getWebtoon(id) {
    const res = await apiClient.get(`/webtoons/${id}`)
    return res.data
  },

  async createWebtoon(formData) {
    const res = await apiClient.post('/webtoons', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return res.data
  },

  async updateWebtoon(id, data) {
    const res = await apiClient.patch(`/webtoons/${id}`, data)
    return res.data
  },

  async deleteWebtoon(id) {
    const res = await apiClient.delete(`/webtoons/${id}`)
    return res.data
  },

  async uploadChapter(formData) {
    const res = await apiClient.post('/chapters', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return res.data
  },

  async updateChapter(id, data) {
    const res = await apiClient.patch(`/chapters/${id}`, data)
    return res.data
  },

  async deleteChapter(id) {
    const res = await apiClient.delete(`/chapters/${id}`)
    return res.data
  }
}
