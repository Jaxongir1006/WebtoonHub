import apiClient from './client'

export const authApi = {
  async login(email, password) {
    const res = await apiClient.post('/auth/login', { email, password })
    return res.data
  },

  async getMe() {
    const res = await apiClient.get('/auth/me')
    return res.data
  },

  async getSessions() {
    const res = await apiClient.get('/auth/sessions')
    return res.data
  },

  async revokeSession(id) {
    const res = await apiClient.delete(`/auth/sessions/${id}`)
    return res.data
  },

  async revokeOtherSessions() {
    const res = await apiClient.delete('/auth/sessions/other')
    return res.data
  }
}
