<template>
  <LoadState :loading="isLoading" :error="loadError" :empty="!isLoading && !loadError && !webtoon" @retry="loadWebtoon" />
  <div v-if="webtoon" class="space-y-6">
    <!-- Back Button & Breadcrumbs -->
    <div class="flex items-center justify-between">
      <router-link
        to="/webtoons"
        class="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-studio-400 dark:hover:text-white transition-colors"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        {{ $t('common.back') }}
      </router-link>

      <div class="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
        <Button v-if="webtoon.type !== 'novel' && authStore.hasPermission('chapters:create')" variant="secondary" size="sm" @click="showChapterImport = true">{{ $t('chapterImport.title') }}</Button>
        <Button
          v-if="authStore.hasPermission('webtoons:edit')"
          variant="secondary"
          size="sm"
          @click="showWebtoonEditModal = true"
        > {{ $t('staff.s501') }} </Button>

        <Button
          v-if="authStore.hasPermission('chapters:create')"
          variant="primary"
          size="sm"
          @click="showChapterUpload = true"
        > {{ $t('staff.s502') }} </Button>
      </div>
    </div>

    <!-- Webtoon Hero Card -->
    <div class="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/10 flex flex-col md:flex-row gap-6 items-start">
      <div class="w-36 h-48 rounded-2xl overflow-hidden shadow-2xl shrink-0 bg-slate-900 dark:bg-studio-950 border border-slate-200 dark:border-white/10">
        <img :src="webtoon.cover_image_url" :alt="webtoon.title" class="w-full h-full object-cover" />
      </div>

      <div class="flex-1 space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <Badge :variant="webtoon.status === 'completed' ? 'success' : 'primary'" :dot="true">
            {{ webtoon.status === 'completed' ? $t('webtoons.completed') : $t('webtoons.ongoing') }}
          </Badge>
          <span
            :class="[
              'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider',
              webtoon.type === 'novel' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' :
              webtoon.type === 'manga' ? 'bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30' :
              'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
            ]"
          >
            {{ webtoon.type === 'novel' ? $t('staff.s503') : webtoon.type === 'manga' ? $t('staff.s504') : $t('staff.s505') }}
          </span>
          <span class="text-xs font-mono text-slate-600 dark:text-studio-400"> {{ $t('staff.s506') }} {{ webtoon.slug }}</span>
        </div>

        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {{ webtoon.title }}
        </h1>

        <p class="text-xs text-slate-600 dark:text-studio-300 flex items-center gap-2 flex-wrap">
          <span>✍️ {{ $t('webtoons.author') }}: <strong>{{ webtoon.author_name || $t('common.unknown') }}</strong></span>
          <span class="text-slate-300 dark:text-studio-600">•</span>
          <span>👁 {{ webtoon.view_count?.toLocaleString() || 0 }} {{ $t('webtoons.views') }}</span>
          <span class="text-slate-300 dark:text-studio-600">•</span>
          <span>📖 {{ chapters.length }} {{ $t('webtoons.chapters_count') }}</span>
        </p>

        <p class="text-xs sm:text-sm text-slate-600 dark:text-studio-400 leading-relaxed max-w-3xl">
          {{ webtoon.description || $t('staff.s282') }}
        </p>

        <div class="flex flex-wrap gap-1.5 pt-2">
          <span
            v-for="g in webtoon.genres"
            :key="g"
            class="px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-studio-850 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-studio-300 font-medium"
          >
            {{ g }}
          </span>
        </div>
      </div>
    </div>

    <!-- Chapters Section -->
    <div class="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5">
      <div class="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
        <div>
          <h3 class="font-bold text-slate-900 dark:text-white text-base"> {{ $t('staff.s507') }} </h3>
          <p class="text-xs text-slate-500 dark:text-studio-400 mt-0.5"> {{ $t('staff.s508') }} </p>
        </div>
        <Badge variant="primary">{{ chapters.length }} {{ $t('staff.s373') }} </Badge>
      </div>

      <div v-if="chapters.length === 0" class="p-12 text-center text-slate-600 dark:text-studio-400 text-sm"> {{ $t('staff.s509') }} </div>

      <div v-else class="divide-y divide-slate-100 dark:divide-white/5">
        <div
          v-for="ch in chapters"
          :key="ch.id"
          class="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-studio-850/40 transition-colors"
        >
          <div class="flex items-start sm:items-center gap-4">
            <!-- Chapter number badge -->
            <div class="w-12 h-12 rounded-xl bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center font-mono shrink-0 shadow-sm dark:shadow-none">
              <span class="text-[10px] text-slate-600 dark:text-studio-400 dark:text-studio-500 font-bold uppercase"> {{ $t('staff.s510') }} </span>
              <span class="text-sm font-extrabold text-brand-700 dark:text-brand-400">{{ ch.chapter_number }}</span>
            </div>

            <div>
              <h4 class="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                {{ ch.title || `${ch.chapter_number}-bob` }}
                <Badge :variant="getStatusVariant(ch.status)" :dot="ch.status === 'pending'">
                  {{ getStatusLabel(ch.status) }}
                </Badge>
              </h4>
              <p class="text-xs text-slate-500 dark:text-studio-400 mt-1 flex items-center gap-3 flex-wrap">
                <span v-if="ch.content_text">
                  📝 {{ getWordCount(ch.content_text) }} {{ $t('staff.s408') }} </span>
                <span v-if="ch.images?.length> 0">
                  🖼 {{ ch.images?.length || 0 }} {{ $t('staff.s511') }} </span>
                <span v-if="!ch.content_text && (!ch.images || ch.images.length === 0)"> {{ $t('staff.s512') }} </span>
                <span>•</span>
                <span class="px-2 py-0.5 rounded-lg bg-brand-500/15 text-brand-700 dark:text-brand-400 font-mono font-bold text-[11px] border border-brand-500/30">
                  ⚡ +{{ ch.reward_coins ?? 5 }} {{ $t('staff.s104') }} </span>
                <span>•</span>
                <span class="font-mono">{{ formatDate(ch.created_at) }}</span>
              </p>
              <p v-if="ch.moderation_feedback" class="mt-2 text-sm text-rose-700 dark:text-rose-300">{{ ch.moderation_feedback }}</p>
            </div>
          </div>

          <!-- Actions: Preview, Edit, Quick Approve, Delete -->
          <div class="flex items-center gap-2 self-end sm:self-center">
            <button
              class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-studio-800 hover:bg-slate-200 dark:hover:bg-studio-700 text-slate-700 dark:text-studio-200 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1"
              @click="previewChapter(ch)"
            > {{ $t('staff.s165') }} </button>

            <!-- EDIT CHAPTER BUTTON -->
            <button
              v-if="authStore.hasPermission('chapters:edit')"
              class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-brand-500/10 hover:bg-brand-500/20 text-brand-700 dark:text-brand-400 border border-brand-500/30 transition-colors flex items-center gap-1"
              @click="openEditChapterModal(ch)"
            > {{ $t('staff.s205') }} </button>

            <button
              v-if="ch.status === 'pending' && authStore.hasPermission('chapters:approve')"
              class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 transition-colors"
              @click="quickApprove(ch)"
            > {{ $t('staff.s513') }} </button>

            <button
              v-if="authStore.hasPermission('chapters:delete')"
              class="p-2 rounded-xl text-slate-600 dark:text-studio-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              :title="$t('common.delete')"
              @click="deleteChapter(ch.id)"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Chapter Preview Modal -->
    <Modal
      v-model="showPreviewModal"
      :title="previewTitle"
      :description="previewChapterData?.content_text ? $t('staff.s514') : $t('staff.s515')"
      max-width="3xl"
    >
      <!-- Text content preview if novel -->
      <div v-if="previewChapterData?.content_text" class="space-y-4  bg-slate-100 dark:bg-studio-950 p-6 rounded-2xl border border-slate-200 dark:border-white/10">
        <div class="prose prose-invert max-w-none text-sm text-slate-900 dark:text-studio-100 font-serif leading-relaxed" v-html="renderPreviewMarkdown(previewChapterData.content_text)" />
      </div>

      <!-- Images stream if comic or images available -->
      <div v-if="previewImages.length> 0" class="space-y-2  bg-black p-2 rounded-xl">
        <div v-for="(img, idx) in previewImages" :key="idx" class="w-full">
          <img :src="typeof img === 'string' ? img : img.image_url" :alt="$t('staff.s516', { value0: idx + 1 })" class="w-full h-auto object-contain block" />
        </div>
      </div>

      <div v-if="!previewImages.length && !previewChapterData?.content_text" class="p-8 text-center text-slate-500 dark:text-studio-400 text-sm"> {{ $t('staff.s517') }} </div>
    </Modal>

    <!-- Upload Modal -->
    <ChapterUploadModal
      v-model="showChapterUpload"
      :preselected-chapter-number="chapters.length ? Math.max(...chapters.map(ch => ch.chapter_number)) + 1 : 1"
      :preselected-webtoon-id="webtoon.id"
      :on-upload="onChapterUploaded"
    />

    <!-- Chapter Edit Modal -->
    <ChapterImportWorkspace v-model="showChapterImport" :preselected-webtoon-id="webtoon.id" :webtoons="[webtoon]" @updated="loadWebtoon" />

    <ChapterEditModal
      v-model="showChapterEditModal"
      :chapter="selectedChapter"
      :on-save="onChapterUpdated"
    />

    <!-- Webtoon Edit Modal -->
    <WebtoonFormModal
      v-model="showWebtoonEditModal"
      :webtoon="webtoon"
      :on-save="onWebtoonUpdated"
    />
  </div>
</template>

<script setup>
import i18n from '../i18n/index.js'
const tr = (...args) => i18n.global.t(...args)

import { watch, ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import LoadState from '../components/common/LoadState.vue'
import { getErrorMessage } from '../utils/forms'
import { useSystemStore } from '../stores/system'
import { webtoonsApi } from '../api/webtoons'
import { moderationApi } from '../api/moderation'
import Badge from '../components/common/Badge.vue'
import Button from '../components/common/Button.vue'
import Modal from '../components/common/Modal.vue'
import ChapterUploadModal from '../components/webtoons/ChapterUploadModal.vue'
import ChapterImportWorkspace from '../components/webtoons/ChapterImportWorkspace.vue'
import ChapterEditModal from '../components/webtoons/ChapterEditModal.vue'
import WebtoonFormModal from '../components/webtoons/WebtoonFormModal.vue'

const route = useRoute()
const authStore = useAuthStore()
const systemStore = useSystemStore()

const webtoonId = computed(() => route.params.id)
const webtoon = ref(null)
const chapters = ref([])
const isLoading = ref(false)
const loadError = ref('')
let loadSequence = 0

async function loadWebtoon() {
  const sequence = ++loadSequence
  loadError.value = ''
  isLoading.value = true
  try {
    const res = await webtoonsApi.getWebtoon(webtoonId.value)
    if (sequence !== loadSequence) return
    if (res.data) {
      webtoon.value = res.data
      chapters.value = (res.data.chapters || []).sort((a, b) => a.chapter_number - b.chapter_number)
    }
  } catch (err) {
    if (sequence === loadSequence) loadError.value = getErrorMessage(err)
  } finally {
    isLoading.value = false
  }
}

watch(webtoonId, () => { webtoon.value = null; chapters.value = []; loadWebtoon() }, { immediate: true })
const importedChapter = event => { if (Number(event.detail?.webtoonId) === Number(webtoonId.value)) loadWebtoon() }
onMounted(() => window.addEventListener('chapter-import-complete', importedChapter))
onUnmounted(() => { loadSequence++; window.removeEventListener('chapter-import-complete', importedChapter) })

const showChapterUpload = ref(false)
const showChapterImport = ref(false)
const showChapterEditModal = ref(false)
const showWebtoonEditModal = ref(false)
const selectedChapter = ref(null)

const showPreviewModal = ref(false)
const previewTitle = ref('')
const previewImages = ref([])
const previewChapterData = ref(null)

function getWordCount(text) {
  if (!text) return 0
  const words = text.trim().split(/\s+/)
  return words[0] === '' ? 0 : words.length
}

function renderPreviewMarkdown(text) {
  if (!text) return ''
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return '<p class="mb-4 leading-relaxed">' + escaped
    .replace(/^### (.*$)/gim, '</p><h3 class="text-base font-bold text-slate-900 dark:text-white mt-4 mb-2 font-sans">$1</h3><p class="mb-4 leading-relaxed">')
    .replace(/^## (.*$)/gim, '</p><h2 class="text-lg font-bold text-slate-900 dark:text-white mt-5 mb-2 font-sans">$1</h2><p class="mb-4 leading-relaxed">')
    .replace(/^# (.*$)/gim, '</p><h1 class="text-xl font-extrabold text-brand-700 dark:text-brand-400 mt-5 mb-3 pb-1 border-b border-slate-200 dark:border-white/10 font-sans">$1</h1><p class="mb-4 leading-relaxed">')
    .replace(/^\> (.*$)/gim, '</p><blockquote class="border-l-4 border-brand-500 pl-4 py-1.5 my-3 italic text-studio-300 bg-brand-500/10 rounded-r font-sans">$1</blockquote><p class="mb-4 leading-relaxed">')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-slate-800 dark:text-studio-200">$1</em>')
    .replace(/\n\n/g, '</p><p class="mb-4 leading-relaxed">')
    .replace(/\n/g, '<br/>') + '</p>'
}

function getStatusVariant(status) {
  switch (status) {
    case 'published': return 'success'
    case 'pending': return 'warning'
    case 'rejected': return 'danger'
    default: return 'default'
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'published': return tr('staff.s395')
    case 'pending': return 'Moderatsiyada'
    case 'rejected': return tr('staff.s325')
    default: return status
  }
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(i18n.global.locale.value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function previewChapter(ch) {
  previewTitle.value = tr('staff.s518', { value0: webtoon.value?.title, value1: ch.chapter_number, value2: ch.title || '' })
  previewChapterData.value = ch
  previewImages.value = ch.images || []
  showPreviewModal.value = true
}

function openEditChapterModal(ch) {
  selectedChapter.value = { ...ch }
  showChapterEditModal.value = true
}

async function onChapterUpdated(updatedData) {
  try {
    const result = await webtoonsApi.updateChapter(updatedData.id, updatedData)
    systemStore.addToast({
      type: 'success',
      title: tr('staff.s519'),
      message: result.data?.status_changed_to_pending ? tr('studioFixes.pendingRevision') : tr('staff.s520', { value0: updatedData.chapter_number })
    })
    await loadWebtoon()
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: tr('staff.s024'),
      message: err.message || tr('staff.s521')
    })
    throw err
  }
}

async function onWebtoonUpdated(savedItem) {
  try {
    await webtoonsApi.updateWebtoon(savedItem.id, savedItem)
    systemStore.addToast({
      type: 'success',
      title: tr('staff.s522'),
      message: tr('staff.s523', { value0: savedItem.title })
    })
    await loadWebtoon()
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: tr('staff.s024'),
      message: err.message || tr('staff.s524')
    })
    throw err
  }
}

async function quickApprove(ch) {
  try {
    await moderationApi.moderateChapter(ch.id, 'published')
    systemStore.addToast({
      type: 'success',
      title: tr('staff.s419'),
      message: tr('staff.s525', { value0: ch.chapter_number })
    })
    await loadWebtoon()
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: tr('staff.s024'),
      message: err.message || tr('staff.s526')
    })
  }
}

async function deleteChapter(id) {
  if (confirm(tr('staff.s527'))) {
    try {
      await webtoonsApi.deleteChapter(id)
      systemStore.addToast({
        type: 'info',
        title: tr('staff.s528'),
        message: tr('staff.s529')
      })
      await loadWebtoon()
    } catch (err) {
      systemStore.addToast({
        type: 'error',
        title: tr('staff.s024'),
        message: err.message || tr('staff.s305')
      })
    }
  }
}

async function onChapterUploaded(data, onProgress) {
  try {
    const formData = new FormData()
    formData.append('webtoon_id', data.webtoon_id || webtoonId.value)
    formData.append('chapter_number', data.chapter_number)
    if (data.title) formData.append('title', data.title)
    if (data.reward_coins !== undefined) formData.append('reward_coins', data.reward_coins)
    if (data.content_text) formData.append('content_text', data.content_text)

    if (data.rawFiles && data.rawFiles.length> 0) {
      data.rawFiles.forEach((f) => formData.append('images', f))
    } else if (!data.content_text?.trim()) {
      throw new Error(tr('staff.s350'))
    }
    await webtoonsApi.uploadChapter(formData, onProgress)
    await loadWebtoon()
    systemStore.addToast({
      type: 'success',
      title: tr('staff.s351'),
      message: tr('staff.s530', { value0: data.chapter_number })
    })
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: tr('staff.s024'),
      message: err.message || tr('staff.s353')
    })
    throw err
  }
}

</script>
