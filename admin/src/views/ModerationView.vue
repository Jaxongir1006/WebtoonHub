<template>
  <div class="space-y-6">
    <LoadState :error="loadError" @retry="loadChapters" />
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <svg class="w-6 h-6 text-brand-700 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg> {{ $t('staff.s389') }} </h2>
        <p class="text-xs text-slate-500 dark:text-studio-400 mt-1"> {{ $t('staff.s390') }} </p>
      </div>

      <!-- Status Tabs Filter -->
      <div class="p-1 rounded-xl bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/10 flex items-center gap-1">
        <button
          v-for="tab in filterTabs"
          :key="tab.value"
          :class="[
            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
            currentStatus === tab.value
              ? 'bg-brand-500 text-slate-950 font-bold shadow-sm'
              : 'text-slate-600 dark:text-studio-400 hover:text-slate-900 dark:hover:text-white'
          ]"
          @click="currentStatus = tab.value"
        >
          {{ tab.label }} <span v-if="tab.value === currentStatus">({{ totalItems }})</span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center p-16 space-y-4">
      <div class="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-xs text-slate-500 dark:text-studio-400 font-medium"> {{ $t('staff.s391') }} </p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!loadError && filteredChapters.length === 0"
      class="glass-card rounded-2xl p-12 text-center border border-slate-200 dark:border-white/5 space-y-3"
    >
      <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 mx-auto flex items-center justify-center">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 class="font-bold text-slate-900 dark:text-white text-base"> {{ $t('staff.s392') }} </h3>
      <p class="text-xs text-slate-500 dark:text-studio-400 max-w-sm mx-auto"> {{ $t('staff.s393') }} </p>
    </div>

    <!-- Chapter Review Cards -->
    <div v-else class="space-y-4">
      <div
        v-for="ch in filteredChapters"
        :key="ch.id"
        class="glass-card rounded-2xl p-5 border border-slate-200 dark:border-white/5 hover:border-brand-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div class="flex items-start gap-4">
          <!-- Webtoon Mini Cover -->
          <div class="w-14 h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-studio-950 border border-slate-200 dark:border-white/10 shrink-0">
            <img v-if="ch.webtoon_cover" :src="ch.webtoon_cover" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-studio-900 text-studio-600 font-bold text-xs"> {{ $t('staff.s394') }} </div>
          </div>

          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-brand-700 dark:text-brand-400 uppercase font-mono tracking-wider">
                {{ ch.webtoon_title }}
              </span>
              <Badge :variant="ch.status === 'published' ? 'success' : (ch.status === 'pending' ? 'warning' : 'danger')">
                {{ ch.status === 'published' ? $t('staff.s395') : (ch.status === 'pending' ? $t('staff.s323') : $t('staff.s325')) }}
              </Badge>
            </div>

            <h3 class="font-bold text-base text-slate-900 dark:text-white">
              {{ ch.chapter_number }} {{ $t('staff.s396') }} {{ ch.title || $t('common.untitled') }}
            </h3>

            <p class="text-xs text-slate-500 dark:text-studio-400 flex flex-wrap items-center gap-3 pt-0.5">
              <span v-if="ch.content_text">
                📜 {{ getWordCount(ch.content_text) }} {{ $t('staff.s397') }} </span>
              <span v-else>
                🖼 {{ ch.images_count || ch.images?.length || 0 }} {{ $t('staff.s398') }} </span>
              <span>•</span>
              <span>⚡ {{ ch.reward_coins ?? 5 }} {{ $t('staff.s399') }} </span>
              <span>•</span>
              <span class="font-mono text-slate-500 dark:text-studio-500"> {{ $t('staff.s400') }} {{ formatDate(ch.created_at) }}</span>
            </p>
          </div>
        </div>

        <!-- Action Controls -->
        <div class="flex items-center gap-3 self-end md:self-center">
          <Button
            variant="secondary"
            size="sm"
            @click="inspectChapter(ch)"
          >
            {{ ch.content_text ? $t('staff.s401') : $t('staff.s402', { value0: ch.images_count || ch.images?.length || 0 }) }}
          </Button>

          <template v-if="ch.status === 'pending'">
            <Button
              variant="danger"
              size="sm"
              :disabled="!!actionLoading"
              @click="openRejection(ch.id)"
            > {{ $t('staff.s332') }} </Button>
            <Button
              variant="success"
              size="sm"
              :disabled="!!actionLoading"
              @click="moderate(ch.id, 'published')"
            > {{ $t('staff.s403') }} </Button>
          </template>

          <template v-else>
            <span class="text-xs font-mono text-slate-500 dark:text-studio-400 italic"> {{ $t('staff.s404') }} {{ ch.status }}
            </span>
          </template>
        </div>
      </div>
    </div>

    <!-- Full Chapter Inspector Modal -->
    <Modal
      v-model="showInspectorModal"
      :title="inspectorTitle"
      :description="activeChapter?.content_text ? $t('staff.s405') : $t('staff.s406')"
      max-width="3xl"
    >
      <div class="space-y-4">
        <LoadState :error="inspectorError" @retry="inspectChapter(activeChapter)" />
        <!-- Sticky Action Bar inside inspector -->
        <div class="p-3 rounded-xl bg-slate-100 dark:bg-studio-900/90 border border-slate-200 dark:border-white/10 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
          <span class="text-xs font-mono text-slate-700 dark:text-studio-300">
            <template v-if="activeChapter?.content_text"> {{ $t('staff.s407') }} <strong>{{ getWordCount(activeChapter.content_text) }} {{ $t('staff.s408') }} </strong>
            </template>
            <template v-else> {{ $t('staff.s409') }} <strong>{{ activeChapter?.images?.length || activeChapter?.images_count || 0 }}</strong>
            </template>
          </span>
          <div v-if="activeChapter?.status === 'pending'" class="flex items-center gap-2">
            <Button variant="danger" size="xs" :disabled="inspectorLoading || !!inspectorError || !!actionLoading" @click="openRejection(activeChapter.id)"> {{ $t('staff.s410') }} </Button>
            <Button variant="success" size="xs" :disabled="inspectorLoading || !!inspectorError || !!actionLoading" @click="moderate(activeChapter.id, 'published')"> {{ $t('staff.s411') }} </Button>
          </div>
        </div>

        <!-- Scrollable Stream: Novel text or Comic Images -->
        <div class="bg-white dark:bg-black p-4 rounded-2xl space-y-3 border border-slate-200 dark:border-white/5">
          <div v-if="inspectorLoading" class="p-8 text-center text-slate-500 dark:text-studio-400 text-xs"> {{ $t('staff.s412') }} </div>
          <!-- Novel text display -->
          <template v-else-if="activeChapter?.content_text">
            <div class="p-5 bg-slate-100 dark:bg-studio-950 rounded-xl border border-slate-200 dark:border-white/10 text-slate-900 dark:text-studio-100 font-serif leading-relaxed text-sm">
              <div v-html="renderMarkdown(activeChapter.content_text)" />
            </div>
            <!-- If novel also has illustrations -->
            <div v-if="activeChapter?.images?.length" class="space-y-2 mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
              <h5 class="text-xs uppercase font-mono font-bold text-slate-500 dark:text-studio-400"> {{ $t('staff.s413') }} </h5>
              <div v-for="(img, idx) in activeChapter.images" :key="idx" class="rounded-lg overflow-hidden">
                <img :src="typeof img === 'string' ? img : img.image_url" class="w-full h-auto block" />
              </div>
            </div>
          </template>
          <!-- Comic images display -->
          <template v-else>
            <div
              v-for="(img, idx) in (activeChapter?.images || [])"
              :key="idx"
              class="relative rounded-lg overflow-hidden group"
            >
              <span class="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-white font-mono text-xs font-bold z-10"> {{ $t('staff.s414') }} {{ idx + 1 }}
              </span>
              <img :src="typeof img === 'string' ? img : img.image_url" class="w-full h-auto block" />
            </div>
            <div v-if="!activeChapter?.images?.length" class="p-8 text-center text-slate-500 dark:text-studio-500 text-xs font-mono"> {{ $t('staff.s415') }} </div>
          </template>
        </div>
      </div>
    </Modal>
    <Pagination v-model:page="page" :limit="limit" :total="totalItems" :loading="loading" />
    <RejectionModal v-model="showRejection" :on-save="rejectWithReason" />
  </div>
</template>

<script setup>
import i18n from '../i18n/index.js'
const tr = (...args) => i18n.global.t(...args)

import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import Pagination from '../components/common/Pagination.vue'
import LoadState from '../components/common/LoadState.vue'
import { getErrorMessage, pageCount } from '../utils/forms'
import RejectionModal from '../components/common/RejectionModal.vue'
import { useSystemStore } from '../stores/system'
import { moderationApi } from '../api/moderation'
import Badge from '../components/common/Badge.vue'
import Button from '../components/common/Button.vue'
import Modal from '../components/common/Modal.vue'

const systemStore = useSystemStore()
const currentStatus = ref('pending')
const loading = ref(false)
const actionLoading = ref(null)
const inspectorLoading = ref(false)
const chapters = ref([])

const filterTabs = [
  { get label() { return tr('staff.s323') }, value: 'pending' },
  { get label() { return tr('staff.s324') }, value: 'published' },
  { get label() { return tr('staff.s325') }, value: 'rejected' },
  { get label() { return tr('staff.s416') }, value: 'all' }
]

const showInspectorModal = ref(false)
const activeChapter = ref(null)
const inspectorTitle = ref('')

const page = ref(1)
const limit = 25
const loadError = ref('')
let loadSequence = 0
const totalItems = ref(0)
async function loadChapters() {
  const sequence = ++loadSequence
  loadError.value = ''
  loading.value = true
  try {
    const res = await moderationApi.getChapters({ page: page.value, limit, status: currentStatus.value === 'all' ? undefined : currentStatus.value })
    if (sequence !== loadSequence) return
    totalItems.value = res.data?.total ?? 0
    if (page.value> pageCount(totalItems.value, limit)) { page.value = pageCount(totalItems.value, limit); return }
    const items = res.data?.items || res.data || []
    chapters.value = items
  } catch (err) {
    if (sequence !== loadSequence) return
    loadError.value = getErrorMessage(err)
    systemStore.addToast({
      type: 'error',
      title: tr('staff.s024'),
      message: tr('staff.s417')
    })
  } finally {
    if (sequence === loadSequence) loading.value = false
  }
}

const filteredChapters = computed(() => {
  if (currentStatus.value === 'all') return chapters.value
  return chapters.value.filter((c) => c.status === currentStatus.value)
})

function getCountByStatus(status) {
  if (status === 'all') return chapters.value.length
  return chapters.value.filter((c) => c.status === status).length
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString(i18n.global.locale.value, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getWordCount(text) {
  if (!text) return 0
  const words = text.trim().split(/\s+/)
  return words[0] === '' ? 0 : words.length
}

function renderMarkdown(text) {
  if (!text) return ''
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return '<p class="mb-3 leading-relaxed">' + escaped
    .replace(/^### (.*$)/gim, '</p><h3 class="text-base font-bold text-slate-900 dark:text-white mt-4 mb-2 font-sans">$1</h3><p class="mb-3 leading-relaxed">')
    .replace(/^## (.*$)/gim, '</p><h2 class="text-lg font-bold text-slate-900 dark:text-white mt-5 mb-2 font-sans">$1</h2><p class="mb-3 leading-relaxed">')
    .replace(/^# (.*$)/gim, '</p><h1 class="text-xl font-extrabold text-brand-700 dark:text-brand-400 mt-5 mb-3 pb-1 border-b border-slate-200 dark:border-white/10 font-sans">$1</h1><p class="mb-3 leading-relaxed">')
    .replace(/^\> (.*$)/gim, '</p><blockquote class="border-l-4 border-brand-500 pl-4 py-1.5 my-3 italic text-studio-300 bg-brand-500/10 rounded-r font-sans">$1</blockquote><p class="mb-3 leading-relaxed">')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-slate-800 dark:text-studio-200">$1</em>')
    .replace(/\n\n/g, '</p><p class="mb-3 leading-relaxed">')
    .replace(/\n/g, '<br/>') + '</p>'
}

const inspectorError = ref('')
let inspectionSequence = 0
async function inspectChapter(ch) {
  const sequence = ++inspectionSequence
  activeChapter.value = { ...ch, images: [] }
  inspectorTitle.value = tr('staff.s418', { value0: ch.webtoon_title, value1: ch.chapter_number })
  showInspectorModal.value = true
  inspectorLoading.value = true; inspectorError.value = ''
  try {
    const result = await moderationApi.getChapter(ch.id)
    if (sequence === inspectionSequence && activeChapter.value?.id === ch.id) activeChapter.value = { ...ch, ...result.data }
  } catch (error) { if (sequence === inspectionSequence) inspectorError.value = getErrorMessage(error) }
  finally { if (sequence === inspectionSequence) inspectorLoading.value = false }
}

const showRejection = ref(false)
const rejectionId = ref(null)
function openRejection(id) { if (actionLoading.value) return; rejectionId.value = id; showRejection.value = true }
async function rejectWithReason(reason) { await moderate(rejectionId.value, 'rejected', reason) }
async function moderate(id, newStatus, feedback = '') {
  if (actionLoading.value) throw new Error(tr('studioFixes.busy'))
  actionLoading.value = id
  try {
    await moderationApi.moderateChapter(id, newStatus, feedback)

    // Update local item
    const found = chapters.value.find((c) => c.id === id)
    if (found) {
      found.status = newStatus
    }
    if (activeChapter.value && activeChapter.value.id === id) {
      activeChapter.value.status = newStatus
      showInspectorModal.value = false
    }

    systemStore.addToast({
      type: newStatus === 'published' ? 'success' : 'info',
      title: newStatus === 'published' ? tr('staff.s419') : tr('staff.s420'),
      message:
        newStatus === 'published'
          ? tr('staff.s421')
          : tr('staff.s420')
    })
    await loadChapters()
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: tr('staff.s024'),
      message: err.response?.data?.detail || tr('staff.s422')
    })
    if (newStatus === 'rejected') throw err
  } finally {
    actionLoading.value = null
  }
}

onMounted(() => {
  loadChapters()
})
watch(page, loadChapters)
onUnmounted(() => { loadSequence++; clearTimeout(searchTimer) })
let searchTimer = null
watch(currentStatus, () => { if (page.value !== 1) page.value = 1; else loadChapters() })
</script>
