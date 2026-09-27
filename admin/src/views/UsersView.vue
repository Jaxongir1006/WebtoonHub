<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <svg class="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          O'quvchilar & Chaqmoq Balansi
        </h2>
        <p class="text-xs text-studio-400 mt-1">
          Sayt foydalanuvchilari (`users`), ularning Chaqmoq hamyonlari va xarid qilgan bezaklari
        </p>
      </div>
    </div>

    <!-- Search & Filters -->
    <div class="glass-card rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="w-full sm:w-80">
        <SearchInput v-model="searchQuery" placeholder="Foydalanuvchi nomi yoki emaili..." />
      </div>

      <div class="text-xs text-studio-400 font-mono">
        Jami: <strong>{{ filteredUsers.length }}</strong> ta o'quvchi
      </div>
    </div>

    <!-- Users Table -->
    <div class="glass-card rounded-2xl overflow-hidden border border-white/5">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-studio-900/80 text-xs uppercase font-bold text-studio-400 border-b border-white/5">
            <tr>
              <th class="px-6 py-3.5">Foydalanuvchi</th>
              <th class="px-6 py-3.5">⚡ Chaqmoq Balansi</th>
              <th class="px-6 py-3.5">Taqilgan Bezaklar</th>
              <th class="px-6 py-3.5">O'qilgan Boblar</th>
              <th class="px-6 py-3.5">Holat</th>
              <th class="px-6 py-3.5 text-right">Amallar</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr
              v-for="user in filteredUsers"
              :key="user.id"
              class="hover:bg-studio-850/40 transition-colors"
            >
              <!-- Username & Email -->
              <td class="px-6 py-4 flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-studio-800 border border-white/10 flex items-center justify-center font-bold text-xs text-brand-400">
                  {{ user.username.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <span class="font-bold text-white block">{{ user.username }}</span>
                  <span class="text-xs text-studio-400 font-mono">{{ user.email }}</span>
                </div>
              </td>

              <!-- Lightning Coins Balance -->
              <td class="px-6 py-4">
                <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 font-bold font-mono text-sm">
                  ⚡ {{ user.lightning_coins }}
                </div>
              </td>

              <!-- Equipped Cosmetics -->
              <td class="px-6 py-4 text-xs space-y-0.5">
                <div v-if="user.equipped_frame" class="text-amber-300 flex items-center gap-1">
                  <span>👑</span> {{ user.equipped_frame }}
                </div>
                <div v-if="user.equipped_background" class="text-purple-300 flex items-center gap-1">
                  <span>🌌</span> {{ user.equipped_background }}
                </div>
                <span v-if="!user.equipped_frame && !user.equipped_background" class="text-studio-500 italic">
                  Bezak taqilmagan
                </span>
              </td>

              <!-- Read Count -->
              <td class="px-6 py-4 font-mono font-bold text-studio-300">
                📖 {{ user.read_chapters_count || 0 }} ta bob
              </td>

              <!-- Status -->
              <td class="px-6 py-4">
                <Badge :variant="user.is_active ? 'success' : 'danger'" :dot="true">
                  {{ user.is_active ? 'Faol' : 'Bloklangan' }}
                </Badge>
              </td>

              <!-- Actions -->
              <td class="px-6 py-4 text-right">
                <div class="inline-flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="xs"
                    @click="openCoinsModal(user)"
                  >
                    ⚡ Balansni O'zgartirish
                  </Button>

                  <button
                    :class="[
                      'p-1.5 rounded-lg text-xs transition-colors',
                      user.is_active
                        ? 'text-studio-400 hover:text-rose-400 hover:bg-rose-500/10'
                        : 'text-emerald-400 hover:bg-emerald-500/10'
                    ]"
                    :title="user.is_active ? 'Bloklash' : 'Faollashtirish'"
                    @click="toggleUserActive(user)"
                  >
                    {{ user.is_active ? '🚫 Bloklash' : '✓ Ochish' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

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
import Badge from '../components/common/Badge.vue'
import Button from '../components/common/Button.vue'
import SearchInput from '../components/common/SearchInput.vue'
import CoinsModal from '../components/users/CoinsModal.vue'

const systemStore = useSystemStore()
const searchQuery = ref('')
const showCoinsModal = ref(false)
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

function openCoinsModal(user) {
  selectedUser.value = user
  showCoinsModal.value = true
}

function onCoinsAdjusted({ userId, amount, reason }) {
  const user = mockDb.users.find((u) => u.id === userId)
  if (user) {
    user.lightning_coins += amount
    if (user.lightning_coins < 0) user.lightning_coins = 0
    mockDb.save('users')

    systemStore.addToast({
      type: 'success',
      title: 'Balans yangilandi',
      message: `${user.username} balansi: ${user.lightning_coins} Chaqmoq (${amount > 0 ? '+' : ''}${amount} ⚡)`
    })
  }
}

function toggleUserActive(user) {
  user.is_active = !user.is_active
  mockDb.save('users')
  systemStore.addToast({
    type: user.is_active ? 'success' : 'info',
    title: 'Holat yangilandi',
    message: `${user.username} hisobi ${user.is_active ? 'faollashtirildi' : 'bloklandi'}`
  })
}
</script>
