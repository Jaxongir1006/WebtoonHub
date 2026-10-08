import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '../api/auth'
import { isSystemRole } from '../utils/permissions'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('webtoonhub_staff_token') || null)
  const refreshToken = ref(localStorage.getItem('webtoonhub_staff_refresh_token') || null)
  const staff = ref(null)
  const verified = ref(false)
  let authCheck = null
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
    if (isSystemRole(staff.value.role, 'superadmin')) return true
    return permissions.value.includes(code)
  }

  async function login(email, password) {
    isLoading.value = true
    try {
      const res = await authApi.login(email, password)
      token.value = res.data.access_token
      refreshToken.value = res.data.refresh_token || null
      staff.value = res.data.staff
      verified.value = true
      localStorage.setItem('webtoonhub_staff_token', token.value)
      if (refreshToken.value) localStorage.setItem('webtoonhub_staff_refresh_token', refreshToken.value)
      else localStorage.removeItem('webtoonhub_staff_refresh_token')
      localStorage.setItem('webtoonhub_current_staff', JSON.stringify(staff.value))
      return res
    } finally {
      isLoading.value = false
    }
  }

  function clearSession() {
    token.value = null
    refreshToken.value = null
    staff.value = null
    verified.value = false
    localStorage.removeItem('webtoonhub_staff_token')
    localStorage.removeItem('webtoonhub_staff_refresh_token')
    localStorage.removeItem('webtoonhub_current_staff')
  }

  async function logout() {
    const capturedAccess = token.value, capturedRefresh = refreshToken.value
    try { if (capturedAccess || capturedRefresh) await authApi.logout(capturedAccess, capturedRefresh) }
    finally { if (token.value === capturedAccess && refreshToken.value === capturedRefresh) clearSession() }
  }

  window.addEventListener('staff-session-expired', () => {
    const revocation = logout()
    clearSession()
    revocation.catch(() => {})
  })
  window.addEventListener('storage', (event) => {
    if (event.key === 'webtoonhub_staff_token') {
      token.value = event.newValue
      refreshToken.value = localStorage.getItem('webtoonhub_staff_refresh_token')
      staff.value = null
      verified.value = false
      window.location.assign('/login')
    }
  })

  async function checkAuth() {
    const checkedToken = token.value
    if (!token.value) {
      clearSession()
      return false
    }
    try {
      const res = await authApi.getMe()
      if (token.value !== checkedToken) return isAuthenticated.value
      staff.value = res.data
      verified.value = true
      localStorage.setItem('webtoonhub_current_staff', JSON.stringify(staff.value))
      return true
    } catch (error) {
      if (token.value !== checkedToken) return isAuthenticated.value
      if (error.response?.status === 401) clearSession()
      staff.value = null
      verified.value = false
      return false
    }
  }

  async function ensureAuth() {
    if (verified.value && isAuthenticated.value) return true
    if (!authCheck) authCheck = checkAuth().finally(() => { authCheck = null })
    return authCheck
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
    refreshToken,
    staff,
    sessions,
    isLoading,
    isAuthenticated,
    userRole,
    permissions,
    hasPermission,
    login,
    logout,
    clearSession,
    ensureAuth,
    checkAuth,
    fetchSessions,
    revokeSession,
    revokeOtherSessions
  }
})
