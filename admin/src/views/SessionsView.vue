<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <svg class="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Faol Seanslar & Qurilmalar Xavfsizligi
        </h2>
        <p class="text-xs text-studio-400 mt-1">
          Hisobingizga kirilgan barcha qurilmalar va sessiyalarni kuzatish hamda masofadan to'xtatish
        </p>
      </div>

      <div class="flex items-center gap-3">
        <Button
          variant="danger"
          size="sm"
          @click="revokeOthers"
        >
          Boshqa barcha seanslardan chiqish
        </Button>
      </div>
    </div>

    <!-- Sessions List -->
    <div class="space-y-4">
      <div
        v-for="s in sessions"
        :key="s.id"
        class="glass-card rounded-2xl p-5 border border-white/5 hover:border-brand-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div class="flex items-start gap-4">
          <!-- Device Icon -->
          <div class="w-12 h-12 rounded-xl bg-studio-900 border border-white/10 flex items-center justify-center text-brand-400 shrink-0">
            <svg
              v-if="s.device_type === 'Desktop'"
              class="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <svg
              v-else
              class="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>

          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="font-bold text-white text-base">
                {{ s.device_type }}
              </span>
              <Badge v-if="s.is_current" variant="success" :dot="true">
                Joriy Qurilma
              </Badge>
            </div>

            <p class="text-xs text-studio-400 font-mono">
              IP: {{ s.ip_address }} • Seans ID: {{ s.id.substring(0, 8) }}...
            </p>

            <p class="text-[11px] text-studio-500 line-clamp-1 max-w-xl">
              {{ s.user_agent }}
            </p>

            <p class="text-[11px] text-studio-400 font-mono pt-1">
              Oxirgi faollik: {{ formatDate(s.last_active_at) }}
            </p>
          </div>
        </div>

        <div class="self-end md:self-center">
          <Button
            v-if="!s.is_current"
            variant="danger"
            size="xs"
            @click="revoke(s.id)"
          >
            Seansni Yakunlash
          </Button>
          <span v-else class="text-xs font-mono text-emerald-400 font-semibold">
            ✓ Ushbu qurilma
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useSystemStore } from '../stores/system'
import { mockDb } from '../api/client'
import Badge from '../components/common/Badge.vue'
import Button from '../components/common/Button.vue'

const authStore = useAuthStore()
const systemStore = useSystemStore()

const sessions = computed(() => mockDb.sessions)

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('uz-UZ', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function revoke(id) {
  mockDb.sessions = mockDb.sessions.filter((s) => s.id !== id)
  mockDb.save('sessions')
  systemStore.addToast({
    type: 'info',
    title: 'Seans tugatildi',
    message: 'Ko\'rsatilgan qurilmadagi seans bekor qilindi'
  })
}

function revokeOthers() {
  mockDb.sessions = mockDb.sessions.filter((s) => s.is_current)
  mockDb.save('sessions')
  systemStore.addToast({
    type: 'success',
    title: 'Barcha boshqa seanslar bekor qilindi',
    message: 'Faqat joriy faol qurilma qoldirildi'
  })
}
</script>
