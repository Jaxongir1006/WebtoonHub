import apiClient from './client'

export const gachaApi = {
  async getPools() { return (await apiClient.get('/gacha/pools')).data },
  async createPool(data) { return (await apiClient.post('/gacha/pools', data)).data },
  async updatePool(id, data) { return (await apiClient.patch(`/gacha/pools/${id}`, data)).data },
  async archivePool(id) { return (await apiClient.delete(`/gacha/pools/${id}`)).data },
  async getHistory(id) { return (await apiClient.get(`/gacha/pools/${id}/history`)).data }
}
