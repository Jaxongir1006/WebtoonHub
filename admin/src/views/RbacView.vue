<template>
  <div class="space-y-8">
    <LoadState :error="loadError" @retry="loadRbacData" />
    <!-- Top Action Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <svg class="w-6 h-6 text-brand-700 dark:text-brand-500 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          {{ $t('rbac.title') }}
        </h2>
        <p class="text-xs text-slate-500 dark:text-studio-400 mt-1">
          {{ $t('rbac.subtitle') }}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <Button
          v-if="authStore.hasPermission('roles:manage')"
          variant="primary"
          size="md"
          @click="openCreateRoleModal"
        >
          {{ $t('rbac.btn_new_role') }}
        </Button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center p-16 space-y-4">
      <div class="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-xs text-slate-500 dark:text-studio-400 font-medium"> {{ $t('staff.s423') }} </p>
    </div>

    <template v-else>
      <!-- Roles Grid Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="role in roles"
          :key="role.id"
          class="glass-card rounded-2xl p-5 border border-slate-200 dark:border-white/5 hover:border-brand-500/30 transition-all flex flex-col justify-between"
        >
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-mono font-bold uppercase text-brand-700 dark:text-brand-400 tracking-wider"> {{ $t('staff.s424') }} {{ role.id }}
              </span>
              <Badge :variant="isSystemRole(role, 'superadmin') ? 'primary' : 'default'">
                {{ role.permissions_count || role.permission_ids?.length || 0 }} {{ $t('rbac.permissions_count') }}
              </Badge>
            </div>

            <h3 class="font-extrabold text-base text-slate-900 dark:text-white font-mono">
              {{ role.name }}
            </h3>
            <p class="mt-1 text-xs text-slate-600 dark:text-studio-300">{{ $t('studioFixes.scope') }}: {{ $t('studioFixes.' + (role.scope || 'global')) }}</p>
            <p class="text-xs text-slate-500 dark:text-studio-400 mt-1 line-clamp-2">
              {{ role.description || $t('staff.s425') }}
            </p>
          </div>

          <div class="pt-4 mt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
            <span class="text-[11px] text-slate-600 dark:text-studio-400 dark:text-studio-500 font-mono">
              {{ getRoleStaffCount(role.id) }} {{ $t('staff.s426') }} </span>
            <div class="flex items-center gap-2">
              <button
                v-if="authStore.hasPermission('roles:manage')"
                class="text-xs text-brand-700 dark:text-brand-400 hover:underline font-semibold"
                @click="openEditRoleModal(role)"
              >
                {{ $t('common.edit') }}
              </button>
              <button
                v-if="!isSystemRole(role, 'superadmin') && authStore.hasPermission('roles:manage')"
                class="text-xs text-rose-700 dark:text-rose-500 hover:underline font-semibold"
                @click="deleteRole(role.id)"
              >
                {{ $t('common.delete') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Interactive RBAC Permission Matrix Table -->
      <div v-if="authStore.hasPermission('roles:manage')" class="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5">
        <div class="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div>
            <h3 class="font-bold text-slate-900 dark:text-white text-base">{{ $t('rbac.matrix_title') }}</h3>
            <p class="text-xs text-slate-500 dark:text-studio-400 mt-0.5">
              {{ $t('rbac.matrix_sub') }}
            </p>
          </div>
          <Badge variant="primary"> {{ $t('staff.s427') }} </Badge>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-100 dark:bg-studio-900/80 text-xs font-mono text-slate-600 dark:text-studio-400 border-b border-slate-200 dark:border-white/5">
              <tr>
                <th class="px-6 py-3.5">{{ $t('rbac.matrix_perm_code') }}</th>
                <th class="px-6 py-3.5">{{ $t('rbac.matrix_desc') }}</th>
                <th
                  v-for="role in roles"
                  :key="role.id"
                  class="px-4 py-3.5 text-center font-bold"
                  :class="isSystemRole(role, 'superadmin') ? 'text-brand-700 dark:text-brand-400' : 'text-slate-700 dark:text-studio-200'"
                >
                  {{ role.name }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-white/5 font-mono text-xs">
              <tr
                v-for="perm in permissions"
                :key="perm.id"
                class="hover:bg-slate-50 dark:hover:bg-studio-850/40 transition-colors"
              >
                <td class="px-6 py-3.5 font-bold text-brand-700 dark:text-brand-300">
                  {{ perm.code }}
                </td>
                <td class="px-6 py-3.5 text-slate-600 dark:text-studio-400 font-sans text-xs">
                  {{ perm.description }}
                </td>
                <td
                  v-for="role in roles"
                  :key="role.id"
                  class="px-4 py-3.5 text-center"
                >
                  <!-- Checkbox -->
                  <input
                    type="checkbox"
                    :checked="isSystemRole(role, 'superadmin') || role.permission_ids?.includes(perm.id)"
                    :aria-label="$t('staff.s030', { value0: role.name, value1: perm.description || perm.code })"
                    :disabled="pendingRoles.has(role.id) || isSystemRole(role, 'superadmin') || !authStore.hasPermission('roles:manage')"
                    class="accent-brand-500 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    @change="toggleRolePerm(role, perm.id, $event)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Staff Users Table -->
      <div v-if="authStore.hasPermission('staff:manage')" class="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5">
        <div class="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 class="font-bold text-slate-900 dark:text-white text-base">{{ $t('rbac.staff_table_title') }}</h3>
            <p class="text-xs text-slate-500 dark:text-studio-400 mt-0.5">{{ $t('rbac.staff_table_sub') }}</p>
          </div>
          <div class="flex items-center gap-3">
            <Button
              v-if="authStore.hasPermission('staff:manage')"
              variant="primary"
              size="xs"
              @click="openCreateStaffModal"
            > {{ $t('staff.s428') }} </Button>
            <Badge variant="primary">{{ staffUsers.length }} {{ $t('staff.s426') }} </Badge>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-100 dark:bg-studio-900/80 text-xs uppercase font-bold text-slate-600 dark:text-studio-400 border-b border-slate-200 dark:border-white/5">
              <tr>
                <th class="px-6 py-3.5">{{ $t('rbac.staff_header') }}</th>
                <th class="px-6 py-3.5"> {{ $t('staff.s429') }} </th>
                <th class="px-6 py-3.5">{{ $t('rbac.role_header') }}</th>
                <th class="px-6 py-3.5">{{ $t('rbac.status_header') }}</th>
                <th class="px-6 py-3.5 text-right">{{ $t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-white/5">
              <tr
                v-for="staff in staffUsers"
                :key="staff.id"
                class="hover:bg-slate-50 dark:hover:bg-studio-850/40 transition-colors"
              >
                <td class="px-6 py-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span class="w-7 h-7 rounded-lg bg-brand-500/10 text-brand-700 dark:text-brand-400 font-bold text-xs flex items-center justify-center border border-brand-500/20">
                    {{ (staff.username || 'S').charAt(0).toUpperCase() }}
                  </span>
                  {{ staff.username }}
                </td>
                <td class="px-6 py-3 font-mono text-xs text-slate-600 dark:text-studio-300">{{ staff.email }}</td>
                <td class="px-6 py-3">
                  <Badge :variant="isSystemRole(staff.role, 'superadmin') ? 'primary' : 'default'">
                    {{ staff.role_name }}
                  </Badge>
                </td>
                <td class="px-6 py-3">
                  <Badge :variant="staff.is_active ? 'success' : 'danger'" :dot="true">
                    {{ staff.is_active ? $t('staff.s075') : $t('staff.s076') }}
                  </Badge>
                </td>
                <td class="px-6 py-3 text-right">
                  <div class="inline-flex items-center gap-2">
                    <select
                      :value="staff.role_id"
                      :disabled="pendingStaff.has(staff.id) || isSystemRole(staff.role, 'superadmin') || !authStore.hasPermission('staff:manage')"
                      :aria-label="$t('staff.s449', { value0: staff.username, value1: staff.role_name })"
                      class="px-2.5 py-1 text-xs bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-studio-100 disabled:opacity-50"
                      @change="changeStaffRole(staff, $event.target.value, $event)"
                    >
                      <option v-for="r in roles" :key="r.id" :value="r.id">
                        {{ r.name }}
                      </option>
                    </select>

                    <button
                      v-if="!isSystemRole(staff.role, 'superadmin') && authStore.hasPermission('staff:manage')"
                      :disabled="pendingStaff.has(staff.id)"
                      class="p-1.5 rounded-lg text-slate-500 hover:text-brand-700 dark:text-studio-400 dark:hover:text-brand-400 transition-colors"
                      :title="$t('staff.s164')" :aria-label="$t('staff.s164')"
                      @click="openEditStaffModal(staff)"
                    >
                      ✏️
                    </button>

                    <button
                      v-if="!isSystemRole(staff.role, 'superadmin') && authStore.hasPermission('staff:manage')"
                      :disabled="pendingStaff.has(staff.id)"
                      class="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:text-studio-400 dark:hover:text-rose-400 transition-colors"
                      :title="$t('staff.s132')" :aria-label="$t('staff.s132')"
                      @click="deleteStaff(staff.id)"
                    >
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Role Form Modal -->
    <RoleFormModal
      v-model="showRoleModal"
      :role="selectedRole"
      :permissions="permissions"
      :on-save="onRoleSaved"
    />

    <!-- Staff User Form Modal -->
    <StaffUserModal
      v-model="showStaffModal"
      :staff="selectedStaff"
      :roles="roles"
      :on-save="onStaffSaved"
    />
  </div>
</template>

<script setup>
import i18n from '../i18n/index.js'
const tr = (...args) => i18n.global.t(...args)

import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { isSystemRole } from '../utils/permissions'
import LoadState from '../components/common/LoadState.vue'
import { getErrorMessage } from '../utils/forms'
import { useSystemStore } from '../stores/system'
import { rbacApi } from '../api/rbac'
import Badge from '../components/common/Badge.vue'
import Button from '../components/common/Button.vue'
import RoleFormModal from '../components/rbac/RoleFormModal.vue'
import StaffUserModal from '../components/rbac/StaffUserModal.vue'

const authStore = useAuthStore()
const systemStore = useSystemStore()

const loading = ref(false)
const roles = ref([])
const loadError = ref('')
const pendingRoles = ref(new Set())
const pendingStaff = ref(new Set())
const permissions = ref([])
const staffUsers = ref([])

const showRoleModal = ref(false)
const selectedRole = ref(null)

const showStaffModal = ref(false)
const selectedStaff = ref(null)

async function loadRbacData() {
  loading.value = true
  loadError.value = ''
  try {
    const results = await Promise.allSettled([
      rbacApi.getRoles(),
      authStore.hasPermission('roles:manage') ? rbacApi.getPermissions() : Promise.resolve({data: []}),
      authStore.hasPermission('staff:manage') ? rbacApi.getStaffUsers() : Promise.resolve({data: []})
    ])

    loadError.value = results.filter(result => result.status === 'rejected').map(result => getErrorMessage(result.reason)).join('; ')
    const [rolesRes, permsRes, staffRes] = results.map((result, index) => result.status === 'fulfilled' ? result.value : { data: [roles.value, permissions.value, staffUsers.value][index] })
    const rawRoles = rolesRes.data || []
    roles.value = rawRoles.map((r) => ({
      ...r,
      permission_ids: r.permissions ? r.permissions.map((p) => p.id) : (r.permission_ids || []),
      permissions_count: r.permissions ? r.permissions.length : (r.permission_ids?.length || 0)
    }))

    permissions.value = permsRes.data || []

    const rawStaff = staffRes.data || []
    staffUsers.value = rawStaff.map((s) => ({
      ...s,
      role_id: s.role?.id || s.role_id,
      role_name: s.role?.name || s.role_name || i18n.global.t('common.unknown')
    }))
  } catch (err) {
    loadError.value = getErrorMessage(err)
    systemStore.addToast({
      type: 'error',
      title: tr('staff.s024'),
      message: tr('staff.s430')
    })
  } finally {
    loading.value = false
  }
}

function getRoleStaffCount(roleId) {
  if (!authStore.hasPermission('staff:manage')) return i18n.global.t('common.unavailable')
  return staffUsers.value.filter((s) => s.role_id === roleId).length
}

function openCreateRoleModal() {
  selectedRole.value = null
  showRoleModal.value = true
}

function openEditRoleModal(role) {
  selectedRole.value = { ...role }
  showRoleModal.value = true
}

async function deleteRole(roleId) {
  const role = roles.value.find((r) => r.id === roleId)
  if (!role) return
  if (confirm(tr('staff.s431', { value0: role.name }))) {
    try {
      await rbacApi.deleteRole(roleId)
      roles.value = roles.value.filter((r) => r.id !== roleId)
      systemStore.addToast({
        type: 'info',
        title: tr('staff.s432'),
        message: tr('staff.s433', { value0: role.name })
      })
    } catch (err) {
      systemStore.addToast({
        type: 'error',
        title: tr('staff.s024'),
        message: err.response?.data?.detail || err.message
      })
    }
  }
}

async function toggleRolePerm(role, permId, event) {
  const previous = isSystemRole(role, 'superadmin') || !!role.permission_ids?.includes(permId)
  if (isSystemRole(role, 'superadmin') || pendingRoles.value.has(role.id)) {
    if (event?.target) event.target.checked = previous
    return
  }
  pendingRoles.value.add(role.id)

  if (!role.permission_ids) role.permission_ids = []
  const currentIds = [...role.permission_ids]
  const idx = currentIds.indexOf(permId)
  if (idx> -1) {
    currentIds.splice(idx, 1)
  } else {
    currentIds.push(permId)
  }

  try {
    await rbacApi.updateRole(role.id, {
      name: role.name,
      description: role.description,
      permission_ids: currentIds
    })
    role.permission_ids = currentIds
    role.permissions_count = currentIds.length
    await authStore.checkAuth()

    systemStore.addToast({
      type: 'success',
      title: tr('staff.s434'),
      message: tr('staff.s435', { value0: role.name })
    })
  } catch (err) {
    if (event?.target) event.target.checked = !!role.permission_ids?.includes(permId)
    systemStore.addToast({
      type: 'error',
      title: tr('staff.s024'),
      message: err.response?.data?.detail || tr('staff.s436')
    })
  } finally { pendingRoles.value.delete(role.id) }
}

async function onRoleSaved(savedRole) {
  try {
    if (savedRole.id) {
      await rbacApi.updateRole(savedRole.id, {
        name: savedRole.name,
        description: savedRole.description,
        permission_ids: savedRole.permission_ids
      })
      systemStore.addToast({
        type: 'success',
        title: tr('staff.s437'),
        message: tr('staff.s438', { value0: savedRole.name })
      })
    } else {
      await rbacApi.createRole({
        name: savedRole.name,
        description: savedRole.description,
        permission_ids: savedRole.permission_ids
      })
      systemStore.addToast({
        type: 'success',
        title: tr('staff.s439'),
        message: tr('staff.s440', { value0: savedRole.name })
      })
    }
    await loadRbacData()
    await authStore.checkAuth()
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: tr('staff.s024'),
      message: err.response?.data?.detail || err.message
    })
    throw err
  }
}

function openCreateStaffModal() {
  selectedStaff.value = null
  showStaffModal.value = true
}

function openEditStaffModal(staff) {
  selectedStaff.value = staff
  showStaffModal.value = true
}

async function onStaffSaved(formData) {
  try {
    if (selectedStaff.value) {
      await rbacApi.updateStaffUser(selectedStaff.value.id, {
        username: formData.username,
        email: formData.email,
        password: formData.password || undefined,
        role_id: formData.role_id,
        is_active: formData.is_active
      })

      systemStore.addToast({
        type: 'success',
        title: tr('staff.s441'),
        message: tr('staff.s442', { value0: formData.username })
      })
    } else {
      await rbacApi.createStaffUser({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role_id: formData.role_id
      })
      systemStore.addToast({
        type: 'success',
        title: tr('staff.s443'),
        message: tr('staff.s444', { value0: formData.username })
      })
    }
    await loadRbacData()
    await authStore.checkAuth()
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: tr('staff.s024'),
      message: err.response?.data?.detail || err.message
    })
    throw err
  }
}

async function deleteStaff(staffId) {
  const staff = staffUsers.value.find((s) => s.id === staffId)
  if (!staff) return
  if (confirm(tr('staff.s445', { value0: staff.username }))) {
    try {
      await rbacApi.deleteStaffUser(staffId)
      staffUsers.value = staffUsers.value.filter((s) => s.id !== staffId)
      systemStore.addToast({
        type: 'info',
        title: tr('staff.s446'),
        message: tr('staff.s447', { value0: staff.username })
      })
    } catch (err) {
      systemStore.addToast({
        type: 'error',
        title: tr('staff.s024'),
        message: err.response?.data?.detail || err.message
      })
    }
  }
}

async function changeStaffRole(staff, newRoleId, event) {
  if (pendingStaff.value.has(staff.id)) {
    if (event?.target) event.target.value = staff.role_id
    return
  }
  pendingStaff.value.add(staff.id)
  try {
    await rbacApi.updateStaffRole(staff.id, Number(newRoleId))
    const role = roles.value.find((r) => r.id === Number(newRoleId))
    staff.role_id = Number(newRoleId)
    staff.role_name = role?.name || ''
    await authStore.checkAuth()
    systemStore.addToast({
      type: 'success',
      title: tr('staff.s448'),
      message: tr('staff.s449', { value0: staff.username, value1: role?.name })
    })
  } catch (err) {
    if (event?.target) event.target.value = staff.role_id
    systemStore.addToast({
      type: 'error',
      title: tr('staff.s024'),
      message: err.response?.data?.detail || err.message
    })
  } finally { pendingStaff.value.delete(staff.id) }
}

onMounted(() => {
  loadRbacData()
})
</script>
