import apiClient from './client'

export const analyticsApi = {
  async getDashboardStats() {
    const res = await apiClient.get('/analytics/dashboard')
    return res.data
  }
}
