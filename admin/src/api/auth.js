import apiClient from './client'
import axios from 'axios'

export const authApi = {
  async logout(capturedAccessToken, capturedRefreshToken) {
    // Capture credentials before local cleanup; shared auth interceptors must not
    // attach a newer login or clear it if an expired session's revocation fails.
    const res = await axios.post('/auth/logout', { refresh_token: capturedRefreshToken || null }, {
      baseURL: apiClient.defaults.baseURL,
      timeout: 5000,
      adapter: apiClient.defaults.adapter,
      headers: { 'Content-Type': 'application/json', ...(capturedAccessToken ? { Authorization: `Bearer ${capturedAccessToken}` } : {}) }
    })
    return res.data
  },
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
