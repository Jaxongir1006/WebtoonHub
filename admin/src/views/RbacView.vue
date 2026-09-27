<template>
  <div class="space-y-8">
    <!-- Top Action Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <svg class="w-6 h-6 text-brand-500 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      <p class="text-xs text-studio-400 font-medium">RBAC ma'lumotlari yuklanmoqda...</p>
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
              <span class="text-xs font-mono font-bold uppercase text-brand-600 dark:text-brand-400 tracking-wider">
                ID: #{{ role.id }}
              </span>
              <Badge :variant="role.name === 'superadmin' ? 'primary' : 'default'">
                {{ role.permissions_count || role.permission_ids?.length || 0 }} {{ $t('rbac.permissions_count') }}
              </Badge>
            </div>

            <h3 class="font-extrabold text-base text-slate-900 dark:text-white font-mono">
              {{ role.name }}
            </h3>
            <p class="text-xs text-slate-500 dark:text-studio-400 mt-1 line-clamp-2">
              {{ role.description || 'Tavsif kiritilmagan' }}
            </p>
          </div>

          <div class="pt-4 mt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
            <span class="text-[11px] text-slate-400 dark:text-studio-500 font-mono">
              {{ getRoleStaffCount(role.id) }} ta xodim
            </span>
            <div class="flex items-center gap-2">
              <button
                v-if="role.name !== 'superadmin' && authStore.hasPermission('roles:manage')"
                class="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold"
                @click="openEditRoleModal(role)"
              >
                {{ $t('common.edit') }}
              </button>
              <button
                v-if="role.name !== 'superadmin' && authStore.hasPermission('roles:manage')"
                class="text-xs text-rose-500 hover:underline font-semibold"
                @click="deleteRole(role.id)"
              >
                {{ $t('common.delete') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Interactive RBAC Permission Matrix Table -->
      <div class="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5">
        <div class="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div>
            <h3 class="font-bold text-slate-900 dark:text-white text-base">{{ $t('rbac.matrix_title') }}</h3>
            <p class="text-xs text-slate-500 dark:text-studio-400 mt-0.5">
              {{ $t('rbac.matrix_sub') }}
            </p>
          </div>
          <Badge variant="primary">Real-time Saqlash</Badge>
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
                  :class="role.name === 'superadmin' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-studio-200'"
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
                <td class="px-6 py-3.5 font-bold text-brand-600 dark:text-brand-300">
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
                    :checked="role.name === 'superadmin' || role.permission_ids?.includes(perm.id)"
                    :disabled="role.name === 'superadmin' || !authStore.hasPermission('roles:manage')"
                    class="accent-brand-500 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    @change="toggleRolePerm(role, perm.id)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Staff Users Table -->
      <div class="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5">
        <div class="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 class="font-bold text-slate-900 dark:text-white text-base">{{ $t('rbac.staff_table_title') }}</h3>
            <p class="text-xs text-slate-500 dark:text-studio-400 mt-0.5">{{ $t('rbac.staff_table_sub') }}</p>
          </div>
          <div class="flex items-center gap-3">
            <Button
              v-if="authStore.hasPermission('staff:manage') || authStore.hasPermission('roles:manage')"
              variant="primary"
              size="xs"
              @click="openCreateStaffModal"
            >
              + Yangi Xodim Qo'shish
            </Button>
            <Badge variant="primary">{{ staffUsers.length }} ta xodim</Badge>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-100 dark:bg-studio-900/80 text-xs uppercase font-bold text-slate-600 dark:text-studio-400 border-b border-slate-200 dark:border-white/5">
              <tr>
                <th class="px-6 py-3.5">{{ $t('rbac.staff_header') }}</th>
                <th class="px-6 py-3.5">Email</th>
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
                  <span class="w-7 h-7 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold text-xs flex items-center justify-center border border-brand-500/20">
                    {{ (staff.username || 'S').charAt(0).toUpperCase() }}
                  </span>
                  {{ staff.username }}
                </td>
                <td class="px-6 py-3 font-mono text-xs text-slate-600 dark:text-studio-300">{{ staff.email }}</td>
                <td class="px-6 py-3">
                  <Badge :variant="staff.role_name === 'superadmin' ? 'primary' : 'default'">
                    {{ staff.role_name }}
                  </Badge>
                </td>
                <td class="px-6 py-3">
                  <Badge :variant="staff.is_active ? 'success' : 'danger'" :dot="true">
                    {{ staff.is_active ? 'Faol' : 'To\'xtatilgan' }}
                  </Badge>
                </td>
                <td class="px-6 py-3 text-right">
                  <div class="inline-flex items-center gap-2">
                    <select
                      :value="staff.role_id"
                      :disabled="staff.username === 'superadmin' || !authStore.hasPermission('staff:manage')"
                      class="px-2.5 py-1 text-xs bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-studio-100 disabled:opacity-50"
                      @change="changeStaffRole(staff, $event.target.value)"
                    >
                      <option v-for="r in roles" :key="r.id" :value="r.id">
                        {{ r.name }}
                      </option>
                    </select>

                    <button
                      v-if="staff.username !== 'superadmin' && authStore.hasPermission('staff:manage')"
                      class="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 dark:text-studio-400 dark:hover:text-brand-400 transition-colors"
                      title="Tahrirlash"
                      @click="openEditStaffModal(staff)"
                    >
                      ✏️
                    </button>

                    <button
                      v-if="staff.username !== 'superadmin' && authStore.hasPermission('staff:manage')"
                      class="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:text-studio-400 dark:hover:text-rose-400 transition-colors"
                      title="O'chirish"
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
      @save="onRoleSaved"
    />

    <!-- Staff User Form Modal -->
    <StaffUserModal
      v-model="showStaffModal"
      :staff="selectedStaff"
      :roles="roles"
      @save="onStaffSaved"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
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
const permissions = ref([])
const staffUsers = ref([])

const showRoleModal = ref(false)
const selectedRole = ref(null)

const showStaffModal = ref(false)
const selectedStaff = ref(null)

async function loadRbacData() {
  loading.value = true
  try {
    const [rolesRes, permsRes, staffRes] = await Promise.all([
      rbacApi.getRoles(),
      rbacApi.getPermissions(),
      rbacApi.getStaffUsers()
    ])

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
      role_name: s.role?.name || s.role_name || 'Noma\'lum'
    }))
  } catch (err) {
    systemStore.addToast({
      type: 'danger',
      title: 'Xatolik',
      message: 'RBAC ma\'lumotlarini yuklashda xatolik yuz berdi'
    })
  } finally {
    loading.value = false
  }
}

function getRoleStaffCount(roleId) {
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
  if (confirm(`'${role.name}' rolini o'chirmoqchimisiz?`)) {
    try {
      await rbacApi.deleteRole(roleId)
      roles.value = roles.value.filter((r) => r.id !== roleId)
      systemStore.addToast({
        type: 'info',
        title: 'Rol o\'chirildi',
        message: `'${role.name}' muvaffaqiyatli olib tashlandi`
      })
    } catch (err) {
      systemStore.addToast({
        type: 'error',
        title: 'Xatolik',
        message: err.response?.data?.detail || err.message
      })
    }
  }
}

async function toggleRolePerm(role, permId) {
  if (role.name === 'superadmin') return

  if (!role.permission_ids) role.permission_ids = []
  const currentIds = [...role.permission_ids]
  const idx = currentIds.indexOf(permId)
  if (idx > -1) {
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

    systemStore.addToast({
      type: 'success',
      title: 'Ruxsat yangilandi',
      message: `'${role.name}' roliga ruxsatlar yangilandi`
    })
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: 'Xatolik',
      message: err.response?.data?.detail || 'Ruxsatni saqlashda xatolik yuz berdi'
    })
  }
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
        title: 'Rol saqlandi',
        message: `'${savedRole.name}' roli muvaffaqiyatli yangilandi`
      })
    } else {
      await rbacApi.createRole({
        name: savedRole.name,
        description: savedRole.description,
        permission_ids: savedRole.permission_ids
      })
      systemStore.addToast({
        type: 'success',
        title: 'Rol yaratildi',
        message: `'${savedRole.name}' roli muvaffaqiyatli yaratildi`
      })
    }
    await loadRbacData()
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: 'Xatolik',
      message: err.response?.data?.detail || err.message
    })
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
        is_active: formData.is_active
      })
      if (formData.role_id && formData.role_id !== selectedStaff.value.role_id) {
        await rbacApi.updateStaffRole(selectedStaff.value.id, formData.role_id)
      }
      systemStore.addToast({
        type: 'success',
        title: 'Xodim tahrirlandi',
        message: `${formData.username} ma'lumotlari yangilandi`
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
        title: 'Xodim yaratildi',
        message: `${formData.username} muvaffaqiyatli tizimga qo'shildi`
      })
    }
    await loadRbacData()
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: 'Xatolik',
      message: err.response?.data?.detail || err.message
    })
  }
}

async function deleteStaff(staffId) {
  const staff = staffUsers.value.find((s) => s.id === staffId)
  if (!staff) return
  if (confirm(`'${staff.username}' hisobini o'chirmoqchimisiz?`)) {
    try {
      await rbacApi.deleteStaffUser(staffId)
      staffUsers.value = staffUsers.value.filter((s) => s.id !== staffId)
      systemStore.addToast({
        type: 'info',
        title: 'Xodim o\'chirildi',
        message: `${staff.username} tizimdan olib tashlandi`
      })
    } catch (err) {
      systemStore.addToast({
        type: 'error',
        title: 'Xatolik',
        message: err.response?.data?.detail || err.message
      })
    }
  }
}

async function changeStaffRole(staff, newRoleId) {
  try {
    await rbacApi.updateStaffRole(staff.id, Number(newRoleId))
    const role = roles.value.find((r) => r.id === Number(newRoleId))
    staff.role_id = Number(newRoleId)
    staff.role_name = role?.name || ''
    systemStore.addToast({
      type: 'success',
      title: 'Xodim roli o\'zgartirildi',
      message: `${staff.username} ning roli '${role?.name}' ga o'zgartirildi`
    })
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: 'Xatolik',
      message: err.response?.data?.detail || err.message
    })
  }
}

onMounted(() => {
  loadRbacData()
})
</script>
