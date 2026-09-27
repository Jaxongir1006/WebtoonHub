import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '../api/auth'
import { mockDb } from '../api/client'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('webtoonhub_staff_token') || null)
  const staff = ref(
    JSON.parse(localStorage.getItem('webtoonhub_current_staff') || 'null') || {
      id: 1,
      username: 'superadmin',
      email: 'admin@webtoonhub.uz',
      role: {
        id: 1,
        name: 'superadmin',
        description: 'To\'liq boshqaruv huquqiga ega tizim rahbari'
      },
      permissions: [
        'webtoons:create',
        'webtoons:edit',
        'chapters:create',
        'chapters:approve',
        'shop:manage',
        'users:manage',
        'roles:manage',
        'comments:moderate'
      ]
    }
  )

  const sessions = ref([])
  const isLoading = ref(false)

  const isAuthenticated = computed(() => !!staff.value)
  const userRole = computed(() => staff.value?.role?.name || 'viewer')
  const permissions = computed(() => staff.value?.permissions || [])

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

  function switchRole(roleName) {
    const role = mockDb.roles.find((r) => r.name.toLowerCase() === roleName.toLowerCase())
    if (!role) return

    const rolePerms = mockDb.permissions
      .filter((p) => role.permission_ids.includes(p.id))
      .map((p) => p.code)

    staff.value = {
      ...staff.value,
      role: {
        id: role.id,
        name: role.name,
        description: role.description
      },
      permissions: rolePerms
    }
    localStorage.setItem('webtoonhub_current_staff', JSON.stringify(staff.value))
  }

  async function fetchSessions() {
    const res = await authApi.getSessions()
    sessions.value = res.data
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
    switchRole,
    fetchSessions,
    revokeSession,
    revokeOtherSessions
  }
})
