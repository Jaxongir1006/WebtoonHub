<template>
  <div class="space-y-8">
    <LoadState :loading="statsLoading" :error="loadError" @retry="loadStats" />
    <!-- Hero / Welcome Header -->
    <div class="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/10 relative overflow-hidden bg-gradient-to-r from-slate-100 via-white to-slate-100 dark:from-studio-900 dark:via-studio-850 dark:to-studio-900 shadow-sm dark:shadow-none">
      <div class="absolute -right-16 -top-16 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-brand-500/15 text-brand-700 dark:text-brand-300 border border-brand-500/30 mb-3">
            <span> {{ $t('staff.s341') }} </span>
            <span class="text-slate-300 dark:text-studio-500">|</span>
            <span>{{ $t('dashboard.tashkent_time') }}: {{ currentTime }}</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {{ $t('dashboard.welcome') }}, <span class="text-brand-700 dark:text-brand-400">{{ authStore.staff?.username }}</span>!
          </h2>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-studio-400 mt-1 max-w-xl">
            {{ $t('dashboard.subtitle') }}
          </p>
        </div>

        <!-- Quick Launch Action Buttons -->
        <div class="flex flex-wrap items-center gap-3">
          <Button v-if="authStore.hasPermission('chapters:create')" variant="primary" size="md" @click="showChapterImport = true">{{ $t('chapterImport.title') }}</Button>
          <Button
            v-if="authStore.hasPermission('chapters:create')"
            variant="secondary"
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
            v-if="pendingChaptersCount> 0 && authStore.hasPermission('chapters:approve')"
            to="/moderation"
          >
            <Button variant="danger" size="md">
              <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse mr-1.5" />
              {{ pendingChaptersCount }} {{ $t('dashboard.in_review') }}
            </Button>
          </router-link>

          <router-link
            v-if="authStore.hasPermission('users:manage') || authStore.hasPermission('coins:view')" to="/economy"
          >
            <Button variant="ghost" size="md" class="border border-brand-500/30 text-brand-700 dark:text-brand-400 hover:bg-brand-500/10">
              ⚡ {{ $t('nav.economy') }}
            </Button>
          </router-link>
        </div>
      </div>
    </div>

    <!-- KPI Metric Cards Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard v-if="statsReady && authStore.hasPermission('analytics:view')"
        :label="$t('dashboard.kpi_webtoons')"
        :value="totalWebtoons"
        variant="brand"
      >
        <template #icon>
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </template>
      </StatCard>

      <StatCard v-if="statsReady && authStore.hasPermission('analytics:view')"
        :label="$t('dashboard.kpi_chapters')"
        :value="publishedChaptersCount"
        variant="cyan"
        :subtext="$t('staff.s342')"
      >
        <template #icon>
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </template>
      </StatCard>

      <StatCard v-if="statsReady && authStore.hasPermission('analytics:view')"
        :label="$t('common.total_readers')"
        :value="totalReaders"
        variant="purple"
      >
        <template #icon>
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </template>
      </StatCard>

      <StatCard v-if="statsReady && authStore.hasPermission('analytics:view')"
        :label="$t('dashboard.kpi_coins')"
        :value="'⚡ ' + totalLightningInCirculation"
        variant="brand"
      >
        <template #icon>
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </template>
      </StatCard>
    </div>

    <!-- Main Grid: Activity & moderation -->
    <div v-if="statsReady && authStore.hasPermission('analytics:view')" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Daily activity reporting is not available yet. -->
      <div class="lg:col-span-2 glass-card rounded-3xl p-6 border border-slate-200 dark:border-white/10">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <svg class="w-5 h-5 text-brand-700 dark:text-brand-500 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg> {{ $t('staff.s343') }} </h3>
            <p class="text-xs text-slate-500 dark:text-studio-400 mt-0.5"> {{ $t('staff.s344') }} </p>
          </div>
        </div>

        <div class="h-48 flex items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-studio-900/30 text-sm text-slate-500 dark:text-studio-400 text-center px-6"> {{ $t('staff.s345') }} </div>
      </div>

      <!-- Pending Moderation / Creator Requests Quick Deck -->
      <div class="glass-card rounded-3xl p-6 border border-slate-200 dark:border-white/10 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <svg class="w-5 h-5 text-rose-700 dark:text-rose-500 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {{ $t('dashboard.urgent_tasks') }}
            </h3>
            <Badge variant="warning">{{ pendingChaptersCount + pendingRequestsCount }}</Badge>
          </div>

          <div class="space-y-3">
            <!-- Pending Chapters Box -->
            <router-link
              v-if="authStore.hasPermission('chapters:approve')" to="/moderation"
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
              v-if="authStore.hasPermission('users:manage')" to="/creator-requests"
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
      :on-save="onWebtoonCreated"
    />

    <ChapterUploadModal
      v-model="showChapterUpload"
      :on-upload="onChapterUploaded"
    />
    <ChapterImportWorkspace v-model="showChapterImport" @updated="loadStats" />
  </div>
</template>

<script setup>
import i18n from '../i18n/index.js'
const tr = (...args) => i18n.global.t(...args)

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import LoadState from '../components/common/LoadState.vue'
import { getErrorMessage } from '../utils/forms'
import { useSystemStore } from '../stores/system'
import { analyticsApi } from '../api/analytics'
import StatCard from '../components/common/StatCard.vue'
import Badge from '../components/common/Badge.vue'
import Button from '../components/common/Button.vue'
import WebtoonFormModal from '../components/webtoons/WebtoonFormModal.vue'
import ChapterUploadModal from '../components/webtoons/ChapterUploadModal.vue'
import ChapterImportWorkspace from '../components/webtoons/ChapterImportWorkspace.vue'

const authStore = useAuthStore()
const systemStore = useSystemStore()

const showWebtoonModal = ref(false)
const showChapterUpload = ref(false)
const showChapterImport = ref(false)

const currentTime = ref(
  new Intl.DateTimeFormat(i18n.global.locale.value, {
    timeZone: 'Asia/Tashkent',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date())
)

const loadError = ref('')
const statsLoading = ref(false)
const statsReady = ref(false)
const clockTimer = setInterval(() => { currentTime.value = new Intl.DateTimeFormat(systemStore.currentLocale, { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date()) }, 1000)
onUnmounted(() => clearInterval(clockTimer))
const stats = ref({
  total_webtoons: 0,
  total_chapters: 0,
  pending_chapters: 0,
  pending_creator_requests: 0,
  total_readers: 0,
  total_comments: 0,
  total_coins_in_circulation: 0
})

const totalWebtoons = computed(() => stats.value.total_webtoons)
const publishedChaptersCount = computed(
  () => stats.value.published_chapters ?? 0
)
const pendingChaptersCount = computed(() => stats.value.pending_chapters)
const pendingRequestsCount = computed(() => stats.value.pending_creator_requests)
const totalReaders = computed(() => stats.value.total_readers)
const totalLightningInCirculation = computed(() => stats.value.total_coins_in_circulation)

async function loadStats() {
  if (!authStore.hasPermission('analytics:view')) return
  statsLoading.value = true; loadError.value = ''
  try {
    const res = await analyticsApi.getDashboardStats()
    if (res.data) {
      stats.value = res.data
      statsReady.value = true
    }
  } catch (err) {
    loadError.value = getErrorMessage(err)
  } finally { statsLoading.value = false
  }
}

onMounted(() => {
  loadStats()
  window.addEventListener('chapter-import-complete', loadStats)
})
onUnmounted(() => window.removeEventListener('chapter-import-complete', loadStats))

import { webtoonsApi } from '../api/webtoons'

async function onWebtoonCreated(formData) {
  try {
    const fd = new FormData()
    fd.append('title', formData.title)
    fd.append('type', formData.type || 'manhwa')
    fd.append('description', formData.description || '')
    fd.append('author_name', formData.author_name || '')
    fd.append('status', formData.status || 'ongoing')
    fd.append('genre_ids', JSON.stringify(formData.genre_ids || []))

    if (!formData.cover_image_file) throw new Error(tr('staff.s346'))
    fd.append('cover_image', formData.cover_image_file)

    await webtoonsApi.createWebtoon(fd)
    await loadStats()
    systemStore.addToast({
      type: 'success',
      title: tr('staff.s347'),
      message: tr('staff.s348', { value0: formData.title })
    })
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: tr('staff.s024'),
      message: err.response?.data?.detail || tr('staff.s349')
    })
    throw err
  }
}

async function onChapterUploaded(data, onProgress) {
  try {
    const formData = new FormData()
    formData.append('webtoon_id', data.webtoon_id)
    formData.append('chapter_number', data.chapter_number)
    if (data.reward_coins !== undefined) formData.append('reward_coins', data.reward_coins)
    if (data.title) formData.append('title', data.title)
    if (data.content_text) formData.append('content_text', data.content_text)

    if (data.rawFiles && data.rawFiles.length> 0) {
      data.rawFiles.forEach((f) => formData.append('images', f))
    } else if (!data.content_text?.trim()) {
      throw new Error(tr('staff.s350'))
    }

    await webtoonsApi.uploadChapter(formData, onProgress)
    await loadStats()
    systemStore.addToast({
      type: 'success',
      title: tr('staff.s351'),
      message: tr('staff.s352', { value0: data.chapter_number })
    })
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: tr('staff.s024'),
      message: err.response?.data?.detail || tr('staff.s353')
    })
    throw err
  }
}

</script>
