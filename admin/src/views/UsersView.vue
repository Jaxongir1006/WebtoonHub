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
        <SearchInput v-model="searchQuery" :placeholder="$t('common.search')" @input="debouncedSearch" />
      </div>

      <div class="text-xs text-slate-500 dark:text-studio-400 font-mono">
        Jami: <strong>{{ totalReaders }}</strong> {{ $t('users.total_readers') }}
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center p-16 space-y-4">
      <div class="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-xs text-studio-400 font-medium">O'quvchilar ro'yxati yuklanmoqda...</p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="users.length === 0"
      class="glass-card rounded-2xl p-12 text-center border border-slate-200 dark:border-white/5 space-y-3"
    >
      <div class="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 mx-auto flex items-center justify-center font-bold text-lg">
        👥
      </div>
      <h3 class="font-bold text-white text-base">Foydalanuvchilar topilmadi</h3>
      <p class="text-xs text-studio-400 max-w-sm mx-auto">
        Qidiruv so'rovi bo'yicha hech qanday o'quvchi qaytmadi.
      </p>
    </div>

    <!-- Users Table -->
    <div v-else class="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-100 dark:bg-studio-900/80 text-xs uppercase font-bold text-slate-600 dark:text-studio-400 border-b border-slate-200 dark:border-white/5">
            <tr>
              <th class="px-6 py-3.5">{{ $t('users.th_user') }}</th>
              <th class="px-6 py-3.5">{{ $t('users.th_coins') }}</th>
              <th class="px-6 py-3.5">{{ $t('users.th_equipped') }}</th>
              <th class="px-6 py-3.5">Ro'yxatdan o'tgan</th>
              <th class="px-6 py-3.5">{{ $t('users.th_status') }}</th>
              <th class="px-6 py-3.5 text-right">{{ $t('users.th_actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-white/5">
            <tr
              v-for="user in users"
              :key="user.id"
              class="hover:bg-slate-50 dark:hover:bg-studio-850/40 transition-colors"
            >
              <!-- Username & Email -->
              <td class="px-6 py-4 flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-slate-200 dark:bg-studio-800 border border-slate-300 dark:border-white/10 flex items-center justify-center font-bold text-xs text-brand-600 dark:text-brand-400 shrink-0">
                  {{ (user.username || 'U').charAt(0).toUpperCase() }}
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
                  Standart
                </span>
              </td>

              <!-- Registration Date -->
              <td class="px-6 py-4 font-mono text-xs text-slate-500 dark:text-studio-400">
                {{ formatDate(user.created_at) }}
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

                  <!-- TERMINATE SESSIONS BUTTON -->
                  <button
                    class="p-1.5 rounded-lg text-xs transition-colors font-medium text-slate-500 dark:text-studio-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-500/10"
                    title="Barcha seanslarni to'xtatish"
                    @click="terminateUserSessions(user)"
                  >
                    🔒 Seanslar
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
import { ref, onMounted } from 'vue'
import { useSystemStore } from '../stores/system'
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
const loading = ref(false)
const users = ref([])
const totalReaders = ref(0)

let searchTimeout = null

function debouncedSearch() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadUsers()
  }, 300)
}

async function loadUsers() {
  loading.value = true
  try {
    const res = await usersApi.getUsers({
      search: searchQuery.value || undefined,
      limit: 100
    })
    users.value = res.data?.items || []
    totalReaders.value = res.data?.total || users.value.length
  } catch (err) {
    systemStore.addToast({
      type: 'danger',
      title: 'Xatolik',
      message: 'Foydalanuvchilar ro\'yxatini yuklashda xatolik yuz berdi'
    })
  } finally {
    loading.value = false
  }
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('uz-UZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

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
    await usersApi.updateUser(formData.id, {
      lightning_coins: formData.lightning_coins,
      is_active: formData.is_active
    })
    systemStore.addToast({
      type: 'success',
      title: 'Tahrirlandi',
      message: `"${formData.username}" ma'lumotlari muvaffaqiyatli yangilandi`
    })
    await loadUsers()
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: 'Xatolik',
      message: err.response?.data?.detail || err.message || 'Foydalanuvchini yangilashda xatolik'
    })
  }
}

async function onCoinsAdjusted({ userId, amount, reason }) {
  try {
    await usersApi.adjustCoins(userId, amount, reason)
    systemStore.addToast({
      type: 'success',
      title: 'Balans yangilandi',
      message: `Balans muvaffaqiyatli o'zgartirildi (${amount > 0 ? '+' : ''}${amount} ⚡)`
    })
    await loadUsers()
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: 'Xatolik',
      message: err.response?.data?.detail || err.message || 'Balansni o\'zgartirishda xatolik'
    })
  }
}

async function toggleUserActive(user) {
  try {
    await usersApi.toggleUserStatus(user.id)
    user.is_active = !user.is_active
    systemStore.addToast({
      type: user.is_active ? 'success' : 'info',
      title: 'Holat yangilandi',
      message: `${user.username} hisobi ${user.is_active ? 'faollashtirildi' : 'bloklandi'}`
    })
  } catch (err) {
    systemStore.addToast({
      type: 'danger',
      title: 'Xatolik',
      message: err.response?.data?.detail || 'Holatni o\'zgartirishda xatolik'
    })
  }
}

async function terminateUserSessions(user) {
  if (!confirm(`"${user.username}" foydalanuvchisining barcha qurilmalardagi seanslarini to'xtatmoqchimisiz?`)) {
    return
  }
  try {
    await usersApi.terminateReaderSessions(user.id)
    systemStore.addToast({
      type: 'success',
      title: 'Seanslar bekor qilindi',
      message: `${user.username} seanslari muvaffaqiyatli to'xtatildi`
    })
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: 'Xatolik',
      message: err.response?.data?.detail || 'Seanslarni to\'xtatishda xatolik'
    })
  }
}

onMounted(() => {
  loadUsers()
})
</script>
