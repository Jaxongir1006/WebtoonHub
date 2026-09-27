import apiClient from './client'

export const rbacApi = {
  async getRoles() {
    const res = await apiClient.get('/roles')
    return res.data
  },

  async getPermissions() {
    const res = await apiClient.get('/permissions')
    return res.data
  },

  async createRole(data) {
    const res = await apiClient.post('/roles', data)
    return res.data
  },

  async updateRole(id, data) {
    const res = await apiClient.patch(`/roles/${id}`, data)
    return res.data
  },

  async deleteRole(id) {
    const res = await apiClient.delete(`/roles/${id}`)
    return res.data
  },

  async getStaffUsers() {
    const res = await apiClient.get('/users')
    return res.data
  },

  async createStaffUser(data) {
    const res = await apiClient.post('/users', data)
    return res.data
  },

  async updateStaffUser(id, data) {
    const res = await apiClient.patch(`/users/${id}`, data)
    return res.data
  },

  async updateStaffRole(staffId, roleId) {
    const res = await apiClient.patch(`/users/${staffId}/role`, { role_id: roleId })
    return res.data
  },

  async deleteStaffUser(id) {
    const res = await apiClient.delete(`/users/${id}`)
    return res.data
  }
}
