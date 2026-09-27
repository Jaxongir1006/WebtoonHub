import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '../api/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('webtoonhub_staff_token') || null)
  const staff = ref(JSON.parse(localStorage.getItem('webtoonhub_current_staff') || 'null'))
  const sessions = ref([])
  const isLoading = ref(false)

  const isAuthenticated = computed(() => !!token.value && !!staff.value)
  const userRole = computed(() => staff.value?.role?.name || 'viewer')
  const permissions = computed(() => {
    if (!staff.value) return []
    if (staff.value.permissions) return staff.value.permissions
    if (staff.value.role?.permissions) {
      return staff.value.role.permissions.map((p) => (typeof p === 'string' ? p : p.code))
    }
    return []
  })

  function hasPermission(code) {
    if (!staff.value) return false
    if (staff.value.role?.name === 'superadmin') return true
    return permissions.value.includes(code)
  }

  async function login(email, password) {
    isLoading.value = true
    try {
      const res = await authApi.login(email, password)
      token.value = res.data.access_token
      staff.value = res.data.staff
      localStorage.setItem('webtoonhub_staff_token', token.value)
      localStorage.setItem('webtoonhub_current_staff', JSON.stringify(staff.value))
      return res
    } finally {
      isLoading.value = false
    }
  }

  function logout() {
    token.value = null
    staff.value = null
    localStorage.removeItem('webtoonhub_staff_token')
    localStorage.removeItem('webtoonhub_current_staff')
  }

  async function checkAuth() {
    if (!token.value) {
      logout()
      return false
    }
    try {
      const res = await authApi.getMe()
      staff.value = res.data
      localStorage.setItem('webtoonhub_current_staff', JSON.stringify(staff.value))
      return true
    } catch {
      logout()
      return false
    }
  }

  async function fetchSessions() {
    const res = await authApi.getSessions()
    sessions.value = res.data || []
  }

  async function revokeSession(id) {
    await authApi.revokeSession(id)
    await fetchSessions()
  }

  async function revokeOtherSessions() {
    await authApi.revokeOtherSessions()
    await fetchSessions()
  }

  return {
    token,
    staff,
    sessions,
    isLoading,
    isAuthenticated,
    userRole,
    permissions,
    hasPermission,
    login,
    logout,
    checkAuth,
    fetchSessions,
    revokeSession,
    revokeOtherSessions
  }
})
