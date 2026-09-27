<template>
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

      <div class="flex items-center gap-2 sm:gap-3">
        <Button
          v-if="authStore.hasPermission('webtoons:edit')"
          variant="secondary"
          size="sm"
          @click="showWebtoonEditModal = true"
        >
          ✏️ Manhvani Tahrirlash
        </Button>

        <Button
          v-if="authStore.hasPermission('chapters:create')"
          variant="primary"
          size="sm"
          @click="showChapterUpload = true"
        >
          + Yangi Bob Yuklash
        </Button>
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
          <span class="text-xs font-mono text-slate-400 dark:text-studio-400">slug: {{ webtoon.slug }}</span>
        </div>

        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {{ webtoon.title }}
        </h1>

        <p class="text-xs text-slate-600 dark:text-studio-300 flex items-center gap-2 flex-wrap">
          <span>✍️ {{ $t('webtoons.author') }}: <strong>{{ webtoon.author_name || 'Noma\'lum' }}</strong></span>
          <span class="text-slate-300 dark:text-studio-600">•</span>
          <span>👁 {{ webtoon.view_count?.toLocaleString() || 0 }} {{ $t('webtoons.views') }}</span>
          <span class="text-slate-300 dark:text-studio-600">•</span>
          <span>📖 {{ chapters.length }} {{ $t('webtoons.chapters_count') }}</span>
        </p>

        <p class="text-xs sm:text-sm text-slate-600 dark:text-studio-400 leading-relaxed max-w-3xl">
          {{ webtoon.description || 'Tavsif berilmagan' }}
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
          <h3 class="font-bold text-slate-900 dark:text-white text-base">Boblar Ro'yxati</h3>
          <p class="text-xs text-slate-500 dark:text-studio-400 mt-0.5">Ushbu manhvaga tegishli barcha chop etilgan va tekshiruvdagi boblar</p>
        </div>
        <Badge variant="primary">{{ chapters.length }} ta bob</Badge>
      </div>

      <div v-if="chapters.length === 0" class="p-12 text-center text-slate-400 dark:text-studio-400 text-sm">
        Hozircha hech qanday bob yuklanmagan. Birinchi bobni yuklang!
      </div>

      <div v-else class="divide-y divide-slate-100 dark:divide-white/5">
        <div
          v-for="ch in chapters"
          :key="ch.id"
          class="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-studio-850/40 transition-colors"
        >
          <div class="flex items-start sm:items-center gap-4">
            <!-- Chapter number badge -->
            <div class="w-12 h-12 rounded-xl bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center font-mono shrink-0 shadow-sm dark:shadow-none">
              <span class="text-[10px] text-slate-400 dark:text-studio-500 font-bold uppercase">Bob</span>
              <span class="text-sm font-extrabold text-brand-600 dark:text-brand-400">{{ ch.chapter_number }}</span>
            </div>

            <div>
              <h4 class="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                {{ ch.title || `${ch.chapter_number}-bob` }}
                <Badge :variant="getStatusVariant(ch.status)" :dot="ch.status === 'pending'">
                  {{ getStatusLabel(ch.status) }}
                </Badge>
              </h4>
              <p class="text-xs text-slate-500 dark:text-studio-400 mt-1 flex items-center gap-3 flex-wrap">
                <span>🖼 {{ ch.images?.length || 0 }} ta rasm</span>
                <span>•</span>
                <span class="px-2 py-0.5 rounded-lg bg-brand-500/15 text-brand-600 dark:text-brand-400 font-mono font-bold text-[11px] border border-brand-500/30">
                  ⚡ +{{ ch.reward_coins || 5 }} Chaqmoq
                </span>
                <span>•</span>
                <span class="font-mono">{{ formatDate(ch.created_at) }}</span>
              </p>
            </div>
          </div>

          <!-- Actions: Preview, Edit, Quick Approve, Delete -->
          <div class="flex items-center gap-2 self-end sm:self-center">
            <button
              class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-studio-800 hover:bg-slate-200 dark:hover:bg-studio-700 text-slate-700 dark:text-studio-200 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1"
              @click="previewChapter(ch)"
            >
              Ko'rish ({{ ch.images?.length || 0 }})
            </button>

            <!-- EDIT CHAPTER BUTTON -->
            <button
              v-if="authStore.hasPermission('chapters:create') || authStore.hasPermission('webtoons:edit')"
              class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 border border-brand-500/30 transition-colors flex items-center gap-1"
              @click="openEditChapterModal(ch)"
            >
              ✏️ Tahrirlash
            </button>

            <button
              v-if="ch.status === 'pending' && authStore.hasPermission('chapters:approve')"
              class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 transition-colors"
              @click="quickApprove(ch)"
            >
              Tasdiqlash
            </button>

            <button
              v-if="authStore.hasPermission('webtoons:delete')"
              class="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:text-studio-400 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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
      description="Vertikal o'qish tasvirlari oqimi"
      max-width="2xl"
    >
      <div class="space-y-2 max-h-[70vh] overflow-y-auto bg-black p-2 rounded-xl">
        <div v-for="(img, idx) in previewImages" :key="idx" class="w-full">
          <img :src="img" :alt="`Page ${idx + 1}`" class="w-full h-auto object-contain block" />
        </div>
      </div>
    </Modal>

    <!-- Upload Modal -->
    <ChapterUploadModal
      v-model="showChapterUpload"
      :preselected-webtoon-id="webtoon.id"
      @upload-success="onChapterUploaded"
    />

    <!-- Chapter Edit Modal -->
    <ChapterEditModal
      v-model="showChapterEditModal"
      :chapter="selectedChapter"
      @save="onChapterUpdated"
    />

    <!-- Webtoon Edit Modal -->
    <WebtoonFormModal
      v-model="showWebtoonEditModal"
      :webtoon="webtoon"
      @save="onWebtoonUpdated"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSystemStore } from '../stores/system'
import { webtoonsApi } from '../api/webtoons'
import { moderationApi } from '../api/moderation'
import Badge from '../components/common/Badge.vue'
import Button from '../components/common/Button.vue'
import Modal from '../components/common/Modal.vue'
import ChapterUploadModal from '../components/webtoons/ChapterUploadModal.vue'
import ChapterEditModal from '../components/webtoons/ChapterEditModal.vue'
import WebtoonFormModal from '../components/webtoons/WebtoonFormModal.vue'

const route = useRoute()
const authStore = useAuthStore()
const systemStore = useSystemStore()

const webtoonId = computed(() => route.params.id)
const webtoon = ref(null)
const chapters = ref([])
const isLoading = ref(false)

async function loadWebtoon() {
  isLoading.value = true
  try {
    const res = await webtoonsApi.getWebtoon(webtoonId.value)
    if (res.data) {
      webtoon.value = res.data
      chapters.value = (res.data.chapters || []).sort((a, b) => a.chapter_number - b.chapter_number)
    }
  } catch (err) {
    console.error('Failed to load webtoon detail:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadWebtoon()
})

const showChapterUpload = ref(false)
const showChapterEditModal = ref(false)
const showWebtoonEditModal = ref(false)
const selectedChapter = ref(null)

const showPreviewModal = ref(false)
const previewTitle = ref('')
const previewImages = ref([])

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
    case 'published': return 'Chop etilgan'
    case 'pending': return 'Moderatsiyada'
    case 'rejected': return 'Rad etilgan'
    default: return status
  }
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('uz-UZ', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function previewChapter(ch) {
  previewTitle.value = `${webtoon.value?.title} — ${ch.chapter_number}-bob`
  previewImages.value = ch.images || []
  showPreviewModal.value = true
}

function openEditChapterModal(ch) {
  selectedChapter.value = { ...ch }
  showChapterEditModal.value = true
}

async function onChapterUpdated(updatedData) {
  try {
    await webtoonsApi.updateChapter(updatedData.id, updatedData)
    systemStore.addToast({
      type: 'success',
      title: 'Bob tahrirlandi',
      message: `${updatedData.chapter_number}-bob ma'lumotlari muvaffaqiyatli saqlandi`
    })
    await loadWebtoon()
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: 'Xatolik',
      message: err.message || 'Bobni yangilashda xatolik'
    })
  }
}

async function onWebtoonUpdated(savedItem) {
  try {
    await webtoonsApi.updateWebtoon(savedItem.id, savedItem)
    systemStore.addToast({
      type: 'success',
      title: 'Manhwa tahrirlandi',
      message: `"${savedItem.title}" muvaffaqiyatli yangilandi`
    })
    await loadWebtoon()
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: 'Xatolik',
      message: err.message || 'Manhvani yangilashda xatolik'
    })
  }
}

async function quickApprove(ch) {
  try {
    await moderationApi.moderateChapter(ch.id, 'published')
    systemStore.addToast({
      type: 'success',
      title: 'Bob tasdiqlandi',
      message: `${ch.chapter_number}-bob muvaffaqiyatli chop etildi`
    })
    await loadWebtoon()
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: 'Xatolik',
      message: err.message || 'Bobni tasdiqlashda xatolik'
    })
  }
}

async function deleteChapter(id) {
  if (confirm('Ushbu bobni o\'chirmoqchimisiz?')) {
    try {
      await webtoonsApi.deleteChapter(id)
      systemStore.addToast({
        type: 'info',
        title: 'Bob o\'chirildi',
        message: 'Bob muvaffaqiyatli o\'chirildi'
      })
      await loadWebtoon()
    } catch (err) {
      systemStore.addToast({
        type: 'error',
        title: 'Xatolik',
        message: err.message || 'O\'chirishda xatolik yuz berdi'
      })
    }
  }
}

async function onChapterUploaded(data) {
  try {
    const formData = new FormData()
    formData.append('webtoon_id', data.webtoon_id || webtoonId.value)
    formData.append('chapter_number', data.chapter_number)
    if (data.title) formData.append('title', data.title)
    if (data.rawFiles && data.rawFiles.length > 0) {
      data.rawFiles.forEach((f) => formData.append('images', f))
    } else {
      const dummyBlob = new Blob([new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0])], { type: 'image/jpeg' })
      formData.append('images', dummyBlob, 'page_01.jpg')
    }
    await webtoonsApi.uploadChapter(formData)
    await loadWebtoon()
    systemStore.addToast({
      type: 'success',
      title: 'Bob yuklandi',
      message: `${data.chapter_number}-bob muvaffaqiyatli yuklandi va tekshiruvga yuborildi`
    })
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: 'Xatolik',
      message: err.message || 'Bobni yuklashda xatolik yuz berdi'
    })
  }
}
</script>
