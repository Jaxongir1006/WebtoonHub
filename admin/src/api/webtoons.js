import apiClient from './client'
import { webtoonFormData, chapterFormData } from '../utils/forms'

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
    const res = await apiClient.patch(`/webtoons/${id}`, webtoonFormData(data), { headers: { 'Content-Type': 'multipart/form-data' } })
    return res.data
  },

  async deleteWebtoon(id) {
    const res = await apiClient.delete(`/webtoons/${id}`)
    return res.data
  },

  async uploadChapter(formData, onProgress) {
    const res = await apiClient.post('/chapters', chapterFormData(formData), {
      timeout: 120000,
      onUploadProgress: (event) => onProgress?.(event.total ? Math.round(event.loaded / event.total * 100) : null),
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return res.data
  },

  async updateChapter(id, data) {
    const { id: chapterId, newFiles, uploadBatchKey, images, image_ids, ...fields } = data
    const body = new FormData()
    const allowed = ['chapter_number', 'title', 'reward_coins', 'content_text', 'status']
    const chapterUpdate = Object.fromEntries(allowed.filter(key => fields[key] !== undefined).map(key => [key, fields[key]]))
    body.append('chapter_update', JSON.stringify(chapterUpdate))
    for (const file of newFiles || []) body.append('images', file)
    if (image_ids !== undefined) body.append('retained_image_ids', JSON.stringify(image_ids))
    // Metadata, retained ordering and new files commit together, including text-only edits.
    const res = await apiClient.post(`/chapters/${id}/images`, body, { timeout: 120000, headers: { 'Content-Type': 'multipart/form-data', 'Idempotency-Key': uploadBatchKey } })
    return res.data
  },

  async deleteChapter(id) {
    const res = await apiClient.delete(`/chapters/${id}`)
    return res.data
  }
}
