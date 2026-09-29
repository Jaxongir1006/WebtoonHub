import apiClient from './client'

export const wheelApi = {
  async getStaffWheels() {
    const res = await apiClient.get('/wheels')
    return res.data
  },

  async createWheel(data) {
    const res = await apiClient.post('/wheels', data)
    return res.data
  },

  async updateWheel(id, data) {
    const res = await apiClient.patch(`/wheels/${id}`, data)
    return res.data
  },

  async deleteWheel(id) {
    const res = await apiClient.delete(`/wheels/${id}`)
    return res.data
  },

  async createWheelItem(wheelId, data) {
    const res = await apiClient.post(`/wheels/${wheelId}/items`, data)
    return res.data
  },

  async populatePresetItems(wheelId) {
    const res = await apiClient.post(`/wheels/${wheelId}/preset-items`)
    return res.data
  },

  async updateWheelItem(itemId, data) {
    const res = await apiClient.patch(`/wheels/items/${itemId}`, data)
    return res.data
  },

  async deleteWheelItem(itemId) {
    const res = await apiClient.delete(`/wheels/items/${itemId}`)
    return res.data
  },

  async getWheelSpins(wheelId, limit = 50) {
    const res = await apiClient.get(`/wheels/${wheelId}/spins?limit=${limit}`)
    return res.data
  }
}
