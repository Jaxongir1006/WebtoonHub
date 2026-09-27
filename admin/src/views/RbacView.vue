<template>
  <div class="space-y-8">
    <!-- Top Action Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <svg class="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          Dinamik RBAC (Rollar va Ruxsatlar)
        </h2>
        <p class="text-xs text-studio-400 mt-1">
          Xodimlar rollari, tizim ruxsatlari matritsasi va xodimlarga huquqlar taqsimoti
        </p>
      </div>

      <div class="flex items-center gap-3">
        <Button
          v-if="authStore.hasPermission('roles:manage')"
          variant="primary"
          size="md"
          @click="openCreateRoleModal"
        >
          + Yangi Rol Yaratish
        </Button>
      </div>
    </div>

    <!-- Roles Grid Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="role in roles"
        :key="role.id"
        class="glass-card rounded-2xl p-5 border border-white/5 hover:border-brand-500/30 transition-all flex flex-col justify-between"
      >
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-mono font-bold uppercase text-brand-400 tracking-wider">
              ID: #{{ role.id }}
            </span>
            <Badge :variant="role.name === 'superadmin' ? 'primary' : 'default'">
              {{ role.permissions_count }} ta ruxsat
            </Badge>
          </div>

          <h3 class="font-extrabold text-base text-white font-mono">
            {{ role.name }}
          </h3>
          <p class="text-xs text-studio-400 mt-1 line-clamp-2">
            {{ role.description || 'Tavsif kiritilmagan' }}
          </p>
        </div>

        <div class="pt-4 mt-4 border-t border-white/5 flex items-center justify-between">
          <span class="text-[11px] text-studio-500 font-mono">
            {{ getRoleStaffCount(role.id) }} ta xodim biriktirilgan
          </span>
          <button
            v-if="role.name !== 'superadmin' && authStore.hasPermission('roles:manage')"
            class="text-xs text-brand-400 hover:underline font-semibold"
            @click="openEditRoleModal(role)"
          >
            Tahrirlash
          </button>
        </div>
      </div>
    </div>

    <!-- Interactive RBAC Permission Matrix Table -->
    <div class="glass-card rounded-2xl overflow-hidden border border-white/5">
      <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 class="font-bold text-white text-base">Ruxsatlar Matritsasi (Permission Matrix)</h3>
          <p class="text-xs text-studio-400 mt-0.5">
            Har bir rolning qaysi tizim imkoniyatlariga kirish huquqi borligini boshqarish
          </p>
        </div>
        <Badge variant="primary">Real-time Saqlash</Badge>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-studio-900/80 text-xs font-mono text-studio-400 border-b border-white/5">
            <tr>
              <th class="px-6 py-3.5">Ruxsat Kodi (Permission Code)</th>
              <th class="px-6 py-3.5">Tavsif</th>
              <th
                v-for="role in roles"
                :key="role.id"
                class="px-4 py-3.5 text-center font-bold"
                :class="role.name === 'superadmin' ? 'text-brand-400' : 'text-studio-200'"
              >
                {{ role.name }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 font-mono text-xs">
            <tr
              v-for="perm in permissions"
              :key="perm.id"
              class="hover:bg-studio-850/40 transition-colors"
            >
              <td class="px-6 py-3.5 font-bold text-brand-300">
                {{ perm.code }}
              </td>
              <td class="px-6 py-3.5 text-studio-400 font-sans text-xs">
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

    <!-- Staff Users List & Role Assignment -->
    <div class="glass-card rounded-2xl overflow-hidden border border-white/5">
      <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 class="font-bold text-white text-base">Boshqaruv Xodimlari (`staff_users`)</h3>
          <p class="text-xs text-studio-400 mt-0.5">Admin panelga kirish huquqiga ega barcha xodimlar</p>
        </div>
        <Badge variant="primary">{{ staffUsers.length }} ta xodim</Badge>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-studio-900/80 text-xs uppercase font-bold text-studio-400 border-b border-white/5">
            <tr>
              <th class="px-6 py-3.5">Xodim</th>
              <th class="px-6 py-3.5">Email</th>
              <th class="px-6 py-3.5">Biriktirilgan Rol</th>
              <th class="px-6 py-3.5">Holat</th>
              <th class="px-6 py-3.5 text-right">Rolni O'zgartirish</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr
              v-for="staff in staffUsers"
              :key="staff.id"
              class="hover:bg-studio-850/40 transition-colors"
            >
              <td class="px-6 py-3 font-bold text-white flex items-center gap-2">
                <span class="w-7 h-7 rounded-lg bg-brand-500/10 text-brand-400 font-bold text-xs flex items-center justify-center border border-brand-500/20">
                  {{ staff.username.charAt(0).toUpperCase() }}
                </span>
                {{ staff.username }}
              </td>
              <td class="px-6 py-3 font-mono text-xs text-studio-300">{{ staff.email }}</td>
              <td class="px-6 py-3">
                <Badge :variant="staff.role_name === 'superadmin' ? 'primary' : 'default'">
                  {{ staff.role_name }}
                </Badge>
              </td>
              <td class="px-6 py-3">
                <Badge variant="success" :dot="true">Faol</Badge>
              </td>
              <td class="px-6 py-3 text-right">
                <select
                  :value="staff.role_id"
                  :disabled="staff.username === 'superadmin' || !authStore.hasPermission('staff:manage')"
                  class="px-2.5 py-1 text-xs bg-studio-900 border border-white/10 rounded-lg text-studio-100 disabled:opacity-50"
                  @change="changeStaffRole(staff, $event.target.value)"
                >
                  <option v-for="r in roles" :key="r.id" :value="r.id">
                    {{ r.name }}
                  </option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Role Form Modal -->
    <RoleFormModal
      v-model="showRoleModal"
      :role="selectedRole"
      @save="onRoleSaved"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useSystemStore } from '../stores/system'
import { mockDb } from '../api/client'
import Badge from '../components/common/Badge.vue'
import Button from '../components/common/Button.vue'
import RoleFormModal from '../components/rbac/RoleFormModal.vue'

const authStore = useAuthStore()
const systemStore = useSystemStore()

const showRoleModal = ref(false)
const selectedRole = ref(null)

const roles = computed(() => mockDb.roles)
const permissions = computed(() => mockDb.permissions)
const staffUsers = computed(() => mockDb.staffUsers)

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

function toggleRolePerm(role, permId) {
  if (role.name === 'superadmin') return

  if (!role.permission_ids) role.permission_ids = []
  const idx = role.permission_ids.indexOf(permId)
  if (idx > -1) {
    role.permission_ids.splice(idx, 1)
  } else {
    role.permission_ids.push(permId)
  }
  role.permissions_count = role.permission_ids.length
  mockDb.save('roles')

  systemStore.addToast({
    type: 'success',
    title: 'Ruxsat yangilandi',
    message: `'${role.name}' roliga ruxsatlar yangilandi`
  })
}

function onRoleSaved(savedRole) {
  if (savedRole.id) {
    const idx = mockDb.roles.findIndex((r) => r.id === savedRole.id)
    if (idx !== -1) {
      mockDb.roles[idx] = { ...mockDb.roles[idx], ...savedRole }
      mockDb.save('roles')
    }
  } else {
    mockDb.roles.push(savedRole)
    mockDb.save('roles')
  }
  systemStore.addToast({
    type: 'success',
    title: 'Rol saqlandi',
    message: `'${savedRole.name}' roli muvaffaqiyatli saqlandi`
  })
}

function changeStaffRole(staff, newRoleId) {
  const role = roles.value.find((r) => r.id === Number(newRoleId))
  if (role) {
    staff.role_id = role.id
    staff.role_name = role.name
    mockDb.save('staffUsers')
    systemStore.addToast({
      type: 'success',
      title: 'Xodim roli o\'zgartirildi',
      message: `${staff.username} ning roli '${role.name}' ga o'zgartirildi`
    })
  }
}
</script>
