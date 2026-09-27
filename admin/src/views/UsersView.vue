<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <svg class="w-6 h-6 text-brand-500 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          {{ $t('users.title') }}
        </h2>
        <p class="text-xs text-slate-500 dark:text-studio-400 mt-1">
          {{ $t('users.subtitle') }}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <router-link
          to="/economy"
          class="px-4 py-2 rounded-xl text-xs font-bold bg-brand-500/15 hover:bg-brand-500/25 text-brand-600 dark:text-brand-400 border border-brand-500/30 transition-all flex items-center gap-2 shadow-sm"
        >
          <svg class="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>⚡ {{ $t('nav.economy') }}</span>
        </router-link>
      </div>
    </div>

    <!-- Search & Filters -->
    <div class="glass-card rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-200 dark:border-white/5">
      <div class="w-full sm:w-80">
        <SearchInput v-model="searchQuery" :placeholder="$t('common.search')" />
      </div>

      <div class="text-xs text-slate-500 dark:text-studio-400 font-mono">
        Jami: <strong>{{ filteredUsers.length }}</strong> {{ $t('users.total_readers') }}
      </div>
    </div>

    <!-- Users Table -->
    <div class="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-100 dark:bg-studio-900/80 text-xs uppercase font-bold text-slate-600 dark:text-studio-400 border-b border-slate-200 dark:border-white/5">
            <tr>
              <th class="px-6 py-3.5">{{ $t('users.th_user') }}</th>
              <th class="px-6 py-3.5">{{ $t('users.th_coins') }}</th>
              <th class="px-6 py-3.5">{{ $t('users.th_equipped') }}</th>
              <th class="px-6 py-3.5">{{ $t('users.th_chapters') }}</th>
              <th class="px-6 py-3.5">{{ $t('users.th_status') }}</th>
              <th class="px-6 py-3.5 text-right">{{ $t('users.th_actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-white/5">
            <tr
              v-for="user in filteredUsers"
              :key="user.id"
              class="hover:bg-slate-50 dark:hover:bg-studio-850/40 transition-colors"
            >
              <!-- Username & Email -->
              <td class="px-6 py-4 flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-slate-200 dark:bg-studio-800 border border-slate-300 dark:border-white/10 flex items-center justify-center font-bold text-xs text-brand-600 dark:text-brand-400 shrink-0">
                  {{ user.username.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <span class="font-bold text-slate-900 dark:text-white block">{{ user.username }}</span>
                  <span class="text-xs text-slate-400 dark:text-studio-400 font-mono">{{ user.email }}</span>
                </div>
              </td>

              <!-- Lightning Coins Balance -->
              <td class="px-6 py-4">
                <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-600 dark:text-brand-300 font-bold font-mono text-sm">
                  ⚡ {{ user.lightning_coins }}
                </div>
              </td>

              <!-- Equipped Cosmetics -->
              <td class="px-6 py-4 text-xs space-y-0.5">
                <div v-if="user.equipped_frame" class="text-amber-500 dark:text-amber-300 flex items-center gap-1 font-medium">
                  <span>👑</span> {{ user.equipped_frame }}
                </div>
                <div v-if="user.equipped_background" class="text-purple-600 dark:text-purple-300 flex items-center gap-1 font-medium">
                  <span>🌌</span> {{ user.equipped_background }}
                </div>
                <span v-if="!user.equipped_frame && !user.equipped_background" class="text-slate-400 dark:text-studio-500 italic">
                  Bezak taqilmagan
                </span>
              </td>

              <!-- Read Count -->
              <td class="px-6 py-4 font-mono font-bold text-slate-700 dark:text-studio-300">
                📖 {{ user.read_chapters_count || 0 }} ta bob
              </td>

              <!-- Status -->
              <td class="px-6 py-4">
                <Badge :variant="user.is_active ? 'success' : 'danger'" :dot="true">
                  {{ user.is_active ? $t('users.status_active') : $t('users.status_blocked') }}
                </Badge>
              </td>

              <!-- Actions -->
              <td class="px-6 py-4 text-right">
                <div class="inline-flex items-center gap-2">
                  <!-- EDIT PROFILE BUTTON -->
                  <Button
                    variant="ghost"
                    size="xs"
                    class="text-brand-600 dark:text-brand-400 hover:bg-brand-500/10 border border-brand-500/30"
                    @click="openEditModal(user)"
                  >
                    ✏️ {{ $t('common.edit') }}
                  </Button>

                  <!-- ADJUST COINS BUTTON -->
                  <Button
                    variant="secondary"
                    size="xs"
                    @click="openCoinsModal(user)"
                  >
                    ⚡ {{ $t('users.btn_adjust') }}
                  </Button>

                  <!-- BLOCK / UNBLOCK BUTTON -->
                  <button
                    :class="[
                      'p-1.5 rounded-lg text-xs transition-colors font-medium',
                      user.is_active
                        ? 'text-slate-500 dark:text-studio-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10'
                        : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                    ]"
                    :title="user.is_active ? $t('users.btn_block') : $t('users.btn_unblock')"
                    @click="toggleUserActive(user)"
                  >
                    {{ user.is_active ? $t('users.btn_block') : $t('users.btn_unblock') }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Edit User Profile Modal -->
    <UserEditModal
      v-model="showEditModal"
      :user="selectedUser"
      @save="onUserUpdated"
    />

    <!-- Coins Adjustment Modal -->
    <CoinsModal
      v-model="showCoinsModal"
      :user="selectedUser"
      @save="onCoinsAdjusted"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSystemStore } from '../stores/system'
import { mockDb } from '../api/client'
import { usersApi } from '../api/users'
import Badge from '../components/common/Badge.vue'
import Button from '../components/common/Button.vue'
import SearchInput from '../components/common/SearchInput.vue'
import CoinsModal from '../components/users/CoinsModal.vue'
import UserEditModal from '../components/users/UserEditModal.vue'

const systemStore = useSystemStore()
const searchQuery = ref('')
const showCoinsModal = ref(false)
const showEditModal = ref(false)
const selectedUser = ref(null)

const users = computed(() => mockDb.users)

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value
  const q = searchQuery.value.toLowerCase()
  return users.value.filter(
    (u) =>
      u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  )
})

function openEditModal(user) {
  selectedUser.value = user
  showEditModal.value = true
}

function openCoinsModal(user) {
  selectedUser.value = user
  showCoinsModal.value = true
}

async function onUserUpdated(formData) {
  try {
    await usersApi.updateUser(formData.id, formData)
    systemStore.addToast({
      type: 'success',
      title: 'Tahrirlandi',
      message: `"${formData.username}" ma'lumotlari muvaffaqiyatli yangilandi`
    })
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: 'Xatolik',
      message: err.message || 'Foydalanuvchini yangilashda xatolik'
    })
  }
}

async function onCoinsAdjusted({ userId, amount, reason }) {
  try {
    await usersApi.adjustCoins(userId, amount, reason)
    const user = mockDb.users.find((u) => u.id === userId)
    systemStore.addToast({
      type: 'success',
      title: 'Balans yangilandi',
      message: `${user?.username} balansi: ${user?.lightning_coins} Chaqmoq (${amount > 0 ? '+' : ''}${amount} ⚡)`
    })
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: 'Xatolik',
      message: err.message
    })
  }
}

async function toggleUserActive(user) {
  try {
    await usersApi.toggleUserStatus(user.id)
    systemStore.addToast({
      type: user.is_active ? 'success' : 'info',
      title: 'Holat yangilandi',
      message: `${user.username} hisobi ${user.is_active ? 'faollashtirildi' : 'bloklandi'}`
    })
  } catch {
    user.is_active = !user.is_active
    mockDb.save('users')
  }
}
</script>
