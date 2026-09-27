<template>
  <div class="space-y-8">
    <!-- Hero / Welcome Header -->
    <div class="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/10 relative overflow-hidden bg-gradient-to-r from-slate-100 via-white to-slate-100 dark:from-studio-900 dark:via-studio-850 dark:to-studio-900 shadow-sm dark:shadow-none">
      <div class="absolute -right-16 -top-16 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-brand-500/15 text-brand-700 dark:text-brand-300 border border-brand-500/30 mb-3">
            <span>⚡ WebtoonHub Studio</span>
            <span class="text-slate-300 dark:text-studio-500">|</span>
            <span>{{ $t('dashboard.tashkent_time') }}: {{ currentTime }}</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {{ $t('dashboard.welcome') }}, <span class="text-brand-600 dark:text-brand-400">{{ authStore.staff?.username }}</span>!
          </h2>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-studio-400 mt-1 max-w-xl">
            {{ $t('dashboard.subtitle') }}
          </p>
        </div>

        <!-- Quick Launch Action Buttons -->
        <div class="flex flex-wrap items-center gap-3">
          <Button
            v-if="authStore.hasPermission('chapters:create')"
            variant="primary"
            size="md"
            @click="showChapterUpload = true"
          >
            <template #icon-left>
              <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </template>
            {{ $t('dashboard.btn_upload_chapter') }}
          </Button>

          <Button
            v-if="authStore.hasPermission('webtoons:create')"
            variant="secondary"
            size="md"
            @click="showWebtoonModal = true"
          >
            {{ $t('dashboard.btn_new_webtoon') }}
          </Button>

          <router-link
            v-if="pendingChaptersCount > 0 && authStore.hasPermission('chapters:approve')"
            to="/moderation"
          >
            <Button variant="danger" size="md">
              <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse mr-1.5" />
              {{ pendingChaptersCount }} {{ $t('dashboard.in_review') }}
            </Button>
          </router-link>

          <router-link
            to="/economy"
          >
            <Button variant="ghost" size="md" class="border border-brand-500/30 text-brand-600 dark:text-brand-400 hover:bg-brand-500/10">
              ⚡ {{ $t('nav.economy') }}
            </Button>
          </router-link>
        </div>
      </div>
    </div>

    <!-- KPI Metric Cards Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        :label="$t('dashboard.kpi_webtoons')"
        :value="totalWebtoons"
        variant="brand"
        :trend="12"
        subtext="+12% (30 days)"
      >
        <template #icon>
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </template>
      </StatCard>

      <StatCard
        :label="$t('dashboard.kpi_chapters')"
        :value="publishedChaptersCount"
        variant="cyan"
        :trend="24"
        subtext="Public chapters"
      >
        <template #icon>
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </template>
      </StatCard>

      <StatCard
        :label="$t('dashboard.kpi_readers')"
        :value="totalReaders"
        variant="purple"
        :trend="18"
        subtext="Active community"
      >
        <template #icon>
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </template>
      </StatCard>

      <StatCard
        :label="$t('dashboard.kpi_coins')"
        :value="'⚡ ' + totalLightningInCirculation"
        variant="brand"
        subtext="Daily + Read rewards"
      >
        <template #icon>
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </template>
      </StatCard>
    </div>

    <!-- Main Grid: Charts & Activity Deck -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Activity / Read Rewards Chart Simulator -->
      <div class="lg:col-span-2 glass-card rounded-3xl p-6 border border-slate-200 dark:border-white/10">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <svg class="w-5 h-5 text-brand-500 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              {{ $t('dashboard.activity_title') }}
            </h3>
            <p class="text-xs text-slate-500 dark:text-studio-400 mt-0.5">
              {{ $t('dashboard.activity_sub') }}
            </p>
          </div>
          <Badge variant="primary" :dot="true">{{ $t('dashboard.realtime_cache') }}</Badge>
        </div>

        <!-- Custom Interactive Bar Graph -->
        <div class="space-y-4">
          <div class="grid grid-cols-7 gap-2 sm:gap-4 h-48 items-end pt-4 pb-2 border-b border-slate-200 dark:border-white/10">
            <div
              v-for="bar in activityBars"
              :key="bar.day"
              class="flex flex-col items-center gap-2 h-full justify-end group"
            >
              <div class="w-full max-w-[36px] bg-slate-200 dark:bg-studio-800 rounded-t-xl overflow-hidden relative transition-all duration-300 group-hover:scale-105 flex flex-col justify-end">
                <div
                  :style="{ height: `${bar.percent}%` }"
                  class="w-full bg-gradient-to-t from-brand-600 to-brand-400 rounded-t-xl relative group-hover:shadow-glow-brand transition-all"
                >
                  <span class="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/90 text-[10px] font-mono font-bold text-brand-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    {{ bar.val }} ⚡
                  </span>
                </div>
              </div>
              <span class="text-xs font-mono text-slate-600 dark:text-studio-400 font-semibold group-hover:text-brand-500">
                {{ bar.day }}
              </span>
            </div>
          </div>

          <div class="flex items-center justify-between text-xs text-slate-500 dark:text-studio-400 pt-2">
            <div class="flex items-center gap-4">
              <span class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-brand-500" />
                {{ $t('dashboard.claimed_coins') }}
              </span>
              <span class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-studio-600" />
                {{ $t('dashboard.chapter_views') }}
              </span>
            </div>
            <span class="font-mono text-slate-700 dark:text-studio-300">{{ $t('dashboard.avg_response') }}: <strong>42 ms</strong> (Redis)</span>
          </div>
        </div>
      </div>

      <!-- Pending Moderation / Creator Requests Quick Deck -->
      <div class="glass-card rounded-3xl p-6 border border-slate-200 dark:border-white/10 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <svg class="w-5 h-5 text-rose-500 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {{ $t('dashboard.urgent_tasks') }}
            </h3>
            <Badge variant="warning">{{ pendingChaptersCount + pendingRequestsCount }}</Badge>
          </div>

          <div class="space-y-3">
            <!-- Pending Chapters Box -->
            <router-link
              to="/moderation"
              class="block p-3.5 rounded-2xl bg-slate-50 dark:bg-studio-900/80 border border-slate-200 dark:border-white/5 hover:border-brand-500/40 transition-all group"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-800 dark:text-studio-200 group-hover:text-brand-600 dark:group-hover:text-brand-300">
                  {{ $t('dashboard.pending_chapters_box') }}
                </span>
                <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  {{ pendingChaptersCount }}
                </span>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-studio-400 mt-1">
                {{ $t('dashboard.pending_chapters_desc') }}
              </p>
            </router-link>

            <!-- Pending Creator Requests Box -->
            <router-link
              to="/creator-requests"
              class="block p-3.5 rounded-2xl bg-slate-50 dark:bg-studio-900/80 border border-slate-200 dark:border-white/5 hover:border-cyan-500/40 transition-all group"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-800 dark:text-studio-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-300">
                  {{ $t('dashboard.pending_requests_box') }}
                </span>
                <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-300">
                  {{ pendingRequestsCount }}
                </span>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-studio-400 mt-1">
                {{ $t('dashboard.pending_requests_desc') }}
              </p>
            </router-link>
          </div>
        </div>

        <div class="pt-6 border-t border-slate-200 dark:border-white/5 mt-4">
          <p class="text-[11px] text-slate-500 dark:text-studio-400 leading-relaxed">
            💡 {{ $t('dashboard.daily_reset_notice') }}
          </p>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <WebtoonFormModal
      v-model="showWebtoonModal"
      @save="onWebtoonCreated"
    />

    <ChapterUploadModal
      v-model="showChapterUpload"
      @upload-success="onChapterUploaded"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useSystemStore } from '../stores/system'
import { mockDb } from '../api/client'
import StatCard from '../components/common/StatCard.vue'
import Badge from '../components/common/Badge.vue'
import Button from '../components/common/Button.vue'
import WebtoonFormModal from '../components/webtoons/WebtoonFormModal.vue'
import ChapterUploadModal from '../components/webtoons/ChapterUploadModal.vue'

const authStore = useAuthStore()
const systemStore = useSystemStore()

const showWebtoonModal = ref(false)
const showChapterUpload = ref(false)

const currentTime = ref(
  new Intl.DateTimeFormat('uz-UZ', {
    timeZone: 'Asia/Tashkent',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date())
)

const totalWebtoons = computed(() => mockDb.webtoons.length)
const publishedChaptersCount = computed(
  () => mockDb.chapters.filter((c) => c.status === 'published').length
)
const pendingChaptersCount = computed(
  () => mockDb.chapters.filter((c) => c.status === 'pending').length
)
const pendingRequestsCount = computed(
  () => mockDb.creatorRequests.filter((r) => r.status === 'pending').length
)
const totalReaders = computed(() => mockDb.users.length)
const totalLightningInCirculation = computed(() =>
  mockDb.users.reduce((acc, u) => acc + (u.lightning_coins || 0), 0)
)

const activityBars = [
  { day: 'Mon', val: 420, percent: 55 },
  { day: 'Tue', val: 560, percent: 70 },
  { day: 'Wed', val: 380, percent: 45 },
  { day: 'Thu', val: 690, percent: 85 },
  { day: 'Fri', val: 820, percent: 95 },
  { day: 'Sat', val: 940, percent: 100 },
  { day: 'Sun', val: 760, percent: 88 }
]

function onWebtoonCreated(newItem) {
  mockDb.webtoons.unshift(newItem)
  mockDb.save('webtoons')
  systemStore.addToast({
    type: 'success',
    title: 'Manhwa yaratildi',
    message: `"${newItem.title}" muvaffaqiyatli katalogga qo'shildi`
  })
}

function onChapterUploaded(newChapter) {
  systemStore.addToast({
    type: 'success',
    title: 'Bob yuklandi',
    message: `${newChapter.chapter_number}-bob moderatsiya navbatiga yuborildi`
  })
}
</script>
