import apiClient, { mockDb } from './client'

export const authApi = {
  async login(email, password) {
    try {
      const res = await apiClient.post('/auth/login', { email, password })
      return res.data
    } catch {
      // Mock Fallback
      const staff = mockDb.staffUsers.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      )
      if (!staff) {
        throw new Error('Kiritilgan email yoki parol xodimlar ro\'yxatida topilmadi')
      }
      const role = mockDb.roles.find((r) => r.id === staff.role_id) || mockDb.roles[0]
      const permissions = mockDb.permissions
        .filter((p) => role.permission_ids.includes(p.id))
        .map((p) => p.code)

      const mockResponse = {
        success: true,
        data: {
          access_token: 'mock_jwt_token_' + staff.username + '_' + Date.now(),
          refresh_token: 'mock_refresh_' + staff.id,
          token_type: 'bearer',
          staff: {
            id: staff.id,
            username: staff.username,
            email: staff.email,
            role: {
              id: role.id,
              name: role.name,
              description: role.description
            },
            permissions
          }
        },
        message: 'Boshqaruv paneliga xush kelibsiz'
      }
      return mockResponse
    }
  },

  async getMe() {
    try {
      const res = await apiClient.get('/auth/me')
      return res.data
    } catch {
      // Mock Fallback
      const savedUser = JSON.parse(localStorage.getItem('webtoonhub_current_staff') || 'null')
      if (!savedUser) throw new Error('Not authenticated')
      
      const role = mockDb.roles.find((r) => r.id === savedUser.role.id) || savedUser.role
      const permissions = mockDb.permissions
        .filter((p) => role.permission_ids?.includes(p.id))
        .map((p) => p.code)

      return {
        success: true,
        data: {
          ...savedUser,
          role,
          permissions: permissions.length ? permissions : savedUser.permissions
        }
      }
    }
  },

  async getSessions() {
    try {
      const res = await apiClient.get('/auth/sessions')
      return res.data
    } catch {
      return {
        success: true,
        data: mockDb.sessions
      }
    }
  },

  async revokeSession(id) {
    try {
      const res = await apiClient.delete(`/auth/sessions/${id}`)
      return res.data
    } catch {
      mockDb.sessions = mockDb.sessions.filter((s) => s.id !== id)
      mockDb.save('sessions')
      return {
        success: true,
        data: null,
        message: 'Seans muvaffaqiyatli yakunlandi'
      }
    }
  },

  async revokeOtherSessions() {
    try {
      const res = await apiClient.delete('/auth/sessions/other')
      return res.data
    } catch {
      mockDb.sessions = mockDb.sessions.filter((s) => s.is_current)
      mockDb.save('sessions')
      return {
        success: true,
        data: null,
        message: 'Boshqa barcha qurilmalardagi seanslar bekor qilindi'
      }
    }
  }
}
