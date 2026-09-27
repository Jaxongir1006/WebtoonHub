import apiClient, { mockDb } from './client'

export const economyApi = {
  async getSettings() {
    try {
      const res = await apiClient.get('/economy/settings')
      return res.data
    } catch {
      return {
        success: true,
        data: mockDb.economySettings
      }
    }
  },

  async updateSettings(data) {
    try {
      const res = await apiClient.patch('/economy/settings', data)
      return res.data
    } catch {
      Object.assign(mockDb.economySettings, data)
      mockDb.save('economySettings')
      return {
        success: true,
        data: mockDb.economySettings,
        message: 'Chaqmoq berilishi va iqtisodiyot sozlamalari muvaffaqiyatli saqlandi'
      }
    }
  },

  async getTransactions(params = {}) {
    try {
      const res = await apiClient.get('/economy/transactions', { params })
      return res.data
    } catch {
      let items = [...mockDb.rewardTransactions]
      if (params.type && params.type !== 'all') {
        items = items.filter((tx) => tx.type === params.type)
      }
      return {
        success: true,
        data: {
          items,
          total: items.length
        }
      }
    }
  }
}
