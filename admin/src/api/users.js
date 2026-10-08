import apiClient from './client'
import { coinRequestConfig } from '../utils/operationIntents'

export const usersApi = {
  async getUsers(params = {}) {
    const res = await apiClient.get('/readers', { params })
    return res.data
  },

  async updateUser(userId, data) {
    const res = await apiClient.patch(`/readers/${userId}`, data)
    return res.data
  },

  async adjustCoins(userId, amount, reason = 'Admin balansi tuzatishi', operationKey) {
    const res = await apiClient.post(`/readers/${userId}/coins`, {
      amount: Number(amount),
      amount_delta: Number(amount),
      reason
    }, coinRequestConfig(operationKey))
    return res.data
  },

  async toggleStatus(userId) {
    const res = await apiClient.patch(`/readers/${userId}/status`)
    return res.data
  },

  async toggleUserStatus(userId) {
    return this.toggleStatus(userId)
  },

  async terminateReaderSessions(userId) {
    const res = await apiClient.delete(`/readers/${userId}/sessions`)
    return res.data
  }
}
