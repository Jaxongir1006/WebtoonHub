import apiClient, { mockDb } from './client'

export const usersApi = {
  async getUsers(params = {}) {
    try {
      const res = await apiClient.get('/readers', { params })
      return res.data
    } catch {
      let items = [...mockDb.users]
      if (params.search) {
        const q = params.search.toLowerCase()
        items = items.filter(
          (u) =>
            u.username.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q)
        )
      }
      return {
        success: true,
        data: {
          items,
          total: items.length
        }
      }
    }
  },

  async updateUser(userId, data) {
    try {
      const res = await apiClient.patch(`/readers/${userId}`, data)
      return res.data
    } catch {
      const user = mockDb.users.find((u) => u.id === Number(userId))
      if (!user) throw new Error('Foydalanuvchi topilmadi')

      if (data.username !== undefined) user.username = data.username
      if (data.email !== undefined) user.email = data.email
      if (data.lightning_coins !== undefined) user.lightning_coins = Number(data.lightning_coins)
      if (data.equipped_frame !== undefined) user.equipped_frame = data.equipped_frame
      if (data.equipped_background !== undefined) user.equipped_background = data.equipped_background
      if (data.is_active !== undefined) user.is_active = data.is_active

      mockDb.save('users')

      return {
        success: true,
        data: user,
        message: 'Foydalanuvchi ma\'lumotlari muvaffaqiyatli yangilandi'
      }
    }
  },

  async adjustCoins(userId, amount, reason = 'Admin balansi tuzatishi') {
    try {
      const res = await apiClient.post(`/readers/${userId}/coins`, { amount, reason })
      return res.data
    } catch {
      const user = mockDb.users.find((u) => u.id === Number(userId))
      if (!user) throw new Error('Foydalanuvchi topilmadi')

      user.lightning_coins += Number(amount)
      if (user.lightning_coins < 0) user.lightning_coins = 0
      mockDb.save('users')

      return {
        success: true,
        data: user,
        message: `Foydalanuvchi balansi muvaffaqiyatli yangilandi: ${user.lightning_coins} ⚡`
      }
    }
  },

  async toggleStatus(userId) {
    try {
      const res = await apiClient.patch(`/readers/${userId}/status`)
      return res.data
    } catch {
      const user = mockDb.users.find((u) => u.id === Number(userId))
      if (!user) throw new Error('Foydalanuvchi topilmadi')

      user.is_active = !user.is_active
      mockDb.save('users')

      return {
        success: true,
        data: user,
        message: user.is_active ? 'Foydalanuvchi hisobi faollashtirildi' : 'Foydalanuvchi bloklandi'
      }
    }
  }
}
