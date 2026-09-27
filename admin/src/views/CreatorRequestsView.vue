<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <svg class="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Creatorlik Arizalari Moderatsiyasi
        </h2>
        <p class="text-xs text-studio-400 mt-1">
          Sayt o'quvchilari tomonidan manhva tarjimoni va yuklovchi bo'lish uchun topshirilgan so'rovlar
        </p>
      </div>

      <!-- Status Filter -->
      <div class="p-1 rounded-xl bg-studio-900 border border-white/10 flex items-center gap-1">
        <button
          v-for="status in ['pending', 'approved', 'rejected', 'all']"
          :key="status"
          :class="[
            'px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all',
            currentStatus === status
              ? 'bg-brand-500 text-slate-950 font-bold shadow-sm'
              : 'text-studio-400 hover:text-white'
          ]"
          @click="currentStatus = status"
        >
          {{ status === 'pending' ? 'Kutilmoqda' : (status === 'approved' ? 'Tasdiqlangan' : (status === 'rejected' ? 'Rad etilgan' : 'Barchasi')) }}
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="filteredRequests.length === 0"
      class="glass-card rounded-2xl p-12 text-center border border-white/5 space-y-3"
    >
      <div class="w-12 h-12 rounded-2xl bg-studio-800 text-studio-400 mx-auto flex items-center justify-center">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 class="font-bold text-white text-base">Arizalar mavjud emas</h3>
      <p class="text-xs text-studio-400">Tanlangan holat bo'yicha hech qanday murojaat topilmadi.</p>
    </div>

    <!-- Requests Cards -->
    <div v-else class="space-y-4">
      <div
        v-for="req in filteredRequests"
        :key="req.id"
        class="glass-card rounded-2xl p-6 border border-white/5 hover:border-brand-500/30 transition-all flex flex-col md:flex-row md:items-start justify-between gap-6"
      >
        <div class="space-y-3 flex-1">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold flex items-center justify-center text-sm">
              {{ req.username.charAt(0).toUpperCase() }}
            </div>
            <div>
              <h3 class="font-bold text-white text-base flex items-center gap-2">
                {{ req.username }}
                <Badge :variant="req.status === 'approved' ? 'success' : (req.status === 'pending' ? 'warning' : 'danger')">
                  {{ req.status === 'approved' ? 'Tasdiqlangan' : (req.status === 'pending' ? 'Kutilmoqda' : 'Rad etilgan') }}
                </Badge>
              </h3>
              <p class="text-xs text-studio-400 font-mono">{{ req.email }} • Topshirilgan: {{ formatDate(req.created_at) }}</p>
            </div>
          </div>

          <!-- Message Body -->
          <div class="p-4 rounded-xl bg-studio-900/60 border border-white/5 text-xs text-studio-200 leading-relaxed">
            <span class="font-bold text-studio-400 block mb-1">Murojaat matni & Maqsad:</span>
            {{ req.message }}
          </div>

          <!-- Portfolio / Sample link -->
          <div v-if="req.sample_links" class="flex items-center gap-2 text-xs">
            <span class="text-studio-400">Namuna ishlari / Havola:</span>
            <a
              :href="req.sample_links"
              target="_blank"
              class="text-brand-400 hover:underline font-mono truncate"
            >
              {{ req.sample_links }} ↗
            </a>
          </div>
        </div>

        <!-- Action Controls -->
        <div class="flex items-center gap-3 self-end md:self-start shrink-0 pt-2 md:pt-0">
          <template v-if="req.status === 'pending'">
            <Button
              variant="danger"
              size="sm"
              @click="review(req.id, 'rejected')"
            >
              Rad Etish
            </Button>
            <Button
              variant="success"
              size="sm"
              @click="review(req.id, 'approved')"
            >
              ✓ Tasdiqlash & Creator Rolini Berish
            </Button>
          </template>

          <template v-else>
            <span class="text-xs font-mono text-studio-400 italic">
              {{ req.reviewed_by ? `Ko'rib chiqdi: ${req.reviewed_by}` : 'Yakunlangan' }}
            </span>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSystemStore } from '../stores/system'
import { mockDb } from '../api/client'
import Badge from '../components/common/Badge.vue'
import Button from '../components/common/Button.vue'

const systemStore = useSystemStore()
const currentStatus = ref('pending')

const requests = computed(() => mockDb.creatorRequests)

const filteredRequests = computed(() => {
  if (currentStatus.value === 'all') return requests.value
  return requests.value.filter((r) => r.status === currentStatus.value)
})

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('uz-UZ', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function review(id, status) {
  const req = mockDb.creatorRequests.find((r) => r.id === id)
  if (req) {
    req.status = status
    req.reviewed_by = 'superadmin'
    req.reviewed_at = new Date().toISOString()
    mockDb.save('creatorRequests')

    // If approved, add to staffUsers
    if (status === 'approved') {
      const exists = mockDb.staffUsers.find((s) => s.email === req.email)
      if (!exists) {
        mockDb.staffUsers.push({
          id: mockDb.staffUsers.length + 1,
          username: req.username,
          email: req.email,
          role_id: 2,
          role_name: 'creator',
          is_active: true,
          created_at: new Date().toISOString()
        })
        mockDb.save('staffUsers')
      }
    }

    systemStore.addToast({
      type: status === 'approved' ? 'success' : 'info',
      title: status === 'approved' ? 'Ariza tasdiqlandi' : 'Ariza rad etildi',
      message:
        status === 'approved'
          ? `${req.username} ga Creator roli muvaffaqiyatli berildi!`
          : 'Ariza rad etildi'
    })
  }
}
</script>
