import apiClient from './client'

export const shopApi = {
  async getItems() {
    const res = await apiClient.get('/shop/items')
    return res.data
  },

  async createItem(formData) {
    let body = formData
    if (!(formData instanceof FormData)) {
      const fd = new FormData()
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== undefined && formData[key] !== null) {
          fd.append(key, formData[key])
        }
      })
      body = fd
    }
    const res = await apiClient.post('/shop/items', body, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return res.data
  },

  async updateItem(id, data) {
    const res = await apiClient.patch(`/shop/items/${id}`, data)
    return res.data
  },

  async toggleAvailability(id, isAvailable) {
    const res = await apiClient.patch(`/shop/items/${id}`, {
      is_available: isAvailable
    })
    return res.data
  },

  async deleteItem(id) {
    const res = await apiClient.delete(`/shop/items/${id}`)
    return res.data
  }
}
