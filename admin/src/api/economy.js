import apiClient from './client'
import { coinRequestConfig } from '../utils/operationIntents'

export const economyApi = {
  async getSettings() {
    const res = await apiClient.get('/economy/settings')
    return res.data
  },

  async updateSettings(data) {
    const res = await apiClient.patch('/economy/settings', data)
    return res.data
  },

  async getTransactions(params = {}) {
    const res = await apiClient.get('/economy/transactions', { params })
    return res.data
  },

  async distributeCoins(data, operationKey) {
    const res = await apiClient.post('/coins/distribute', data, coinRequestConfig(operationKey))
    return res.data
  }
}
