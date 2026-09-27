import apiClient, { mockDb } from './client'

export const requestsApi = {
  async getRequests() {
    try {
      const res = await apiClient.get('/creator-requests')
      return res.data
    } catch {
      return {
        success: true,
        data: mockDb.creatorRequests
      }
    }
  },

  async reviewRequest(id, status, reviewerName = 'superadmin') {
    try {
      const res = await apiClient.patch(`/creator-requests/${id}`, { status })
      return res.data
    } catch {
      const req = mockDb.creatorRequests.find((r) => r.id === Number(id))
      if (!req) throw new Error('Ariza topilmadi')

      req.status = status
      req.reviewed_by = reviewerName
      req.reviewed_at = new Date().toISOString()
      mockDb.save('creatorRequests')

      // If approved, create a staff user with role 'creator'
      if (status === 'approved') {
        const existingStaff = mockDb.staffUsers.find((s) => s.email === req.email)
        if (!existingStaff) {
          const newStaffId = (mockDb.staffUsers[mockDb.staffUsers.length - 1]?.id || 0) + 1
          mockDb.staffUsers.push({
            id: newStaffId,
            username: req.username,
            email: req.email,
            role_id: 2, // creator
            role_name: 'creator',
            is_active: true,
            created_at: new Date().toISOString()
          })
          mockDb.save('staffUsers')
        }
      }

      return {
        success: true,
        data: req,
        message:
          status === 'approved'
            ? 'Creatorlik arizasi tasdiqlandi va foydalanuvchiga Creator huquqi berildi!'
            : 'Ariza rad etildi.'
      }
    }
  }
}
