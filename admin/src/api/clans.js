import apiClient from './client'

export const clansApi = {
  async getClanSettings() {
    const res = await apiClient.get('/clans/settings')
    return res.data
  },

  async updateClanCreationCost(cost) {
    const res = await apiClient.patch('/clans/settings/cost', { cost: Number(cost) })
    return res.data
  },

  async saveLevelConfig(data) {
    const res = await apiClient.post('/clans/levels', {
      level: Number(data.level),
      required_xp: Number(data.required_xp),
      upgrade_cost_coins: Number(data.upgrade_cost_coins),
      max_members: Number(data.max_members),
      perks_description: data.perks_description || null
    })
    return res.data
  },

  async deleteLevelConfig(level) {
    const res = await apiClient.delete(`/clans/levels/${level}`)
    return res.data
  },

  async getClans() {
    const res = await apiClient.get('/clans')
    return res.data
  },

  async deleteClan(clanId) {
    const res = await apiClient.delete(`/clans/${clanId}`)
    return res.data
  }
}
