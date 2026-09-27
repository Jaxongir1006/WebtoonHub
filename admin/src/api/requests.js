import apiClient from './client'

export const requestsApi = {
  async getRequests() {
    const res = await apiClient.get('/creator-requests')
    return res.data
  },

  async reviewRequest(id, status, feedback = '') {
    const res = await apiClient.patch(`/creator-requests/${id}`, {
      status,
      admin_feedback: feedback || (status === 'approved' ? 'Arizangiz ma\'qullandi' : 'Arizangiz rad etildi')
    })
    return res.data
  }
}
