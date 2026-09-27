import apiClient, { mockDb } from './client'

export const rbacApi = {
  async getRoles() {
    try {
      const res = await apiClient.get('/roles')
      return res.data
    } catch {
      return {
        success: true,
        data: mockDb.roles
      }
    }
  },

  async getPermissions() {
    try {
      const res = await apiClient.get('/permissions')
      return res.data
    } catch {
      return {
        success: true,
        data: mockDb.permissions
      }
    }
  },

  async createRole(data) {
    try {
      const res = await apiClient.post('/roles', data)
      return res.data
    } catch {
      const existing = mockDb.roles.find(
        (r) => r.name.toLowerCase() === data.name.toLowerCase()
      )
      if (existing) {
        throw new Error(`'${data.name}' nomli rol allaqachon mavjud`)
      }

      const newId = (mockDb.roles[mockDb.roles.length - 1]?.id || 0) + 1
      const newRole = {
        id: newId,
        name: data.name,
        description: data.description || '',
        permission_ids: data.permission_ids || [],
        permissions_count: (data.permission_ids || []).length
      }

      mockDb.roles.push(newRole)
      mockDb.save('roles')

      return {
        success: true,
        data: newRole,
        message: 'Yangi rol muvaffaqiyatli yaratildi'
      }
    }
  },

  async updateRole(id, data) {
    try {
      const res = await apiClient.patch(`/roles/${id}`, data)
      return res.data
    } catch {
      const role = mockDb.roles.find((r) => r.id === Number(id))
      if (!role) throw new Error('Rol topilmadi')

      if (data.name) role.name = data.name
      if (data.description !== undefined) role.description = data.description
      if (data.permission_ids) {
        role.permission_ids = data.permission_ids
        role.permissions_count = data.permission_ids.length
      }

      mockDb.save('roles')

      return {
        success: true,
        data: role,
        message: 'Rol huquqlari muvaffaqiyatli yangilandi'
      }
    }
  },

  async getStaffUsers() {
    try {
      const res = await apiClient.get('/users')
      return res.data
    } catch {
      const populated = mockDb.staffUsers.map((s) => {
        const role = mockDb.roles.find((r) => r.id === s.role_id)
        return {
          ...s,
          role_name: role ? role.name : 'Noma\'lum'
        }
      })
      return {
        success: true,
        data: populated
      }
    }
  },

  async updateStaffRole(staffId, roleId) {
    try {
      const res = await apiClient.patch(`/users/${staffId}/role`, { role_id: roleId })
      return res.data
    } catch {
      const staff = mockDb.staffUsers.find((s) => s.id === Number(staffId))
      if (!staff) throw new Error('Xodim topilmadi')
      const role = mockDb.roles.find((r) => r.id === Number(roleId))
      if (!role) throw new Error('Rol topilmadi')

      staff.role_id = role.id
      staff.role_name = role.name
      mockDb.save('staffUsers')

      return {
        success: true,
        data: staff,
        message: 'Xodim roli muvaffaqiyatli o\'zgartirildi'
      }
    }
  },

  async deleteRole(id) {
    try {
      const res = await apiClient.delete(`/roles/${id}`)
      return res.data
    } catch {
      const idx = mockDb.roles.findIndex((r) => r.id === Number(id))
      if (idx === -1) throw new Error('Rol topilmadi')
      if (mockDb.roles[idx].name === 'superadmin') {
        throw new Error('Superadmin rolini o\'chirib bo\'lmaydi')
      }
      mockDb.roles.splice(idx, 1)
      mockDb.save('roles')
      return {
        success: true,
        data: null,
        message: 'Rol muvaffaqiyatli o\'chirildi'
      }
    }
  },

  async createStaffUser(data) {
    try {
      const res = await apiClient.post('/users', data)
      return res.data
    } catch {
      const existing = mockDb.staffUsers.find(
        (s) => s.email.toLowerCase() === data.email.toLowerCase() || s.username.toLowerCase() === data.username.toLowerCase()
      )
      if (existing) {
        throw new Error('Bunday email yoki username bilan xodim allaqachon mavjud')
      }
      const role = mockDb.roles.find((r) => r.id === Number(data.role_id))
      const newId = (mockDb.staffUsers[mockDb.staffUsers.length - 1]?.id || 0) + 1
      const newStaff = {
        id: newId,
        username: data.username,
        email: data.email,
        role_id: Number(data.role_id),
        role_name: role ? role.name : 'creator',
        is_active: true,
        created_at: new Date().toISOString()
      }
      mockDb.staffUsers.push(newStaff)
      mockDb.save('staffUsers')
      return {
        success: true,
        data: newStaff,
        message: 'Yangi xodim muvaffaqiyatli qo\'shildi'
      }
    }
  },

  async updateStaffUser(id, data) {
    try {
      const res = await apiClient.patch(`/users/${id}`, data)
      return res.data
    } catch {
      const staff = mockDb.staffUsers.find((s) => s.id === Number(id))
      if (!staff) throw new Error('Xodim topilmadi')
      if (data.username) staff.username = data.username
      if (data.email) staff.email = data.email
      if (data.role_id) {
        staff.role_id = Number(data.role_id)
        const role = mockDb.roles.find((r) => r.id === staff.role_id)
        if (role) staff.role_name = role.name
      }
      if (data.is_active !== undefined) staff.is_active = data.is_active
      mockDb.save('staffUsers')
      return {
        success: true,
        data: staff,
        message: 'Xodim ma\'lumotlari muvaffaqiyatli yangilandi'
      }
    }
  },

  async deleteStaffUser(id) {
    try {
      const res = await apiClient.delete(`/users/${id}`)
      return res.data
    } catch {
      const idx = mockDb.staffUsers.findIndex((s) => s.id === Number(id))
      if (idx === -1) throw new Error('Xodim topilmadi')
      if (mockDb.staffUsers[idx].username === 'superadmin') {
        throw new Error('Superadmin hisobini o\'chirib bo\'lmaydi')
      }
      mockDb.staffUsers.splice(idx, 1)
      mockDb.save('staffUsers')
      return {
        success: true,
        data: null,
        message: 'Xodim hisobi muvaffaqiyatli o\'chirildi'
      }
    }
  }
}
