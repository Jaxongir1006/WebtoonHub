import apiClient, { mockDb } from './client'

export const shopApi = {
  async getItems() {
    try {
      const res = await apiClient.get('/shop/items')
      return res.data
    } catch {
      return {
        success: true,
        data: mockDb.shopItems
      }
    }
  },

  async createItem(formData) {
    try {
      const res = await apiClient.post('/shop/items', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return res.data
    } catch {
      const name = formData.get ? formData.get('name') : formData.name
      const item_type = formData.get ? formData.get('item_type') : formData.item_type
      const price_coins = Number(formData.get ? formData.get('price_coins') : formData.price_coins)
      const asset_url = formData.asset_url || (item_type === 'frame' 
        ? 'https://api.iconify.design/solar:star-circle-bold.svg?color=%23f59e0b'
        : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80')
      const border_style = formData.border_style || (item_type === 'frame' ? 'ring-4 ring-amber-400' : 'bg-gradient-to-r from-emerald-900 to-teal-950')

      const newId = (mockDb.shopItems[mockDb.shopItems.length - 1]?.id || 0) + 1
      const newItem = {
        id: newId,
        name,
        item_type,
        price_coins,
        asset_url,
        border_style,
        is_available: true,
        created_at: new Date().toISOString()
      }

      mockDb.shopItems.unshift(newItem)
      mockDb.save('shopItems')

      return {
        success: true,
        data: newItem,
        message: 'Do\'konga yangi buyum muvaffaqiyatli joylandi'
      }
    }
  },

  async updateItem(id, data) {
    try {
      const res = await apiClient.patch(`/shop/items/${id}`, data)
      return res.data
    } catch {
      const item = mockDb.shopItems.find((i) => i.id === Number(id))
      if (!item) throw new Error('Buyum topilmadi')

      if (data.name !== undefined) item.name = data.name
      if (data.item_type !== undefined) item.item_type = data.item_type
      if (data.price_coins !== undefined) item.price_coins = Number(data.price_coins)
      if (data.asset_url !== undefined) item.asset_url = data.asset_url
      if (data.border_style !== undefined) item.border_style = data.border_style
      if (data.is_available !== undefined) item.is_available = data.is_available

      mockDb.save('shopItems')

      return {
        success: true,
        data: item,
        message: 'Buyum muvaffaqiyatli tahrirlandi'
      }
    }
  },

  async toggleAvailability(id) {
    try {
      const res = await apiClient.patch(`/shop/items/${id}/toggle`)
      return res.data
    } catch {
      const item = mockDb.shopItems.find((i) => i.id === Number(id))
      if (!item) throw new Error('Buyum topilmadi')
      item.is_available = !item.is_available
      mockDb.save('shopItems')
      return {
        success: true,
        data: item,
        message: `Buyum holati o'zgartirildi: ${item.is_available ? 'Sotuvda' : 'Nofaol'}`
      }
    }
  },

  async deleteItem(id) {
    try {
      const res = await apiClient.delete(`/shop/items/${id}`)
      return res.data
    } catch {
      mockDb.shopItems = mockDb.shopItems.filter((i) => i.id !== Number(id))
      mockDb.save('shopItems')
      return {
        success: true,
        data: null,
        message: 'Buyum do\'kondan o\'chirildi'
      }
    }
  }
}
