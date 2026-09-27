<template>
  <div v-if="webtoon" class="space-y-6">
    <!-- Back Button & Breadcrumbs -->
    <div class="flex items-center justify-between">
      <router-link
        to="/webtoons"
        class="inline-flex items-center gap-2 text-xs font-semibold text-studio-400 hover:text-white transition-colors"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Manhvalar Katalogiga Qaytish
      </router-link>

      <div class="flex items-center gap-3">
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
    <div class="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 flex flex-col md:flex-row gap-6 items-start">
      <div class="w-36 h-48 rounded-2xl overflow-hidden shadow-2xl shrink-0 bg-studio-950 border border-white/10">
        <img :src="webtoon.cover_image_url" :alt="webtoon.title" class="w-full h-full object-cover" />
      </div>

      <div class="flex-1 space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <Badge :variant="webtoon.status === 'completed' ? 'success' : 'primary'" :dot="true">
            {{ webtoon.status === 'completed' ? 'Tugallangan' : 'Ongoing' }}
          </Badge>
          <span class="text-xs font-mono text-studio-400">slug: {{ webtoon.slug }}</span>
        </div>

        <h1 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {{ webtoon.title }}
        </h1>

        <p class="text-xs text-studio-300 flex items-center gap-2">
          <span>✍️ Muallif: <strong>{{ webtoon.author_name || 'Noma\'lum' }}</strong></span>
          <span class="text-studio-600">•</span>
          <span>👁 {{ webtoon.view_count?.toLocaleString() || 0 }} ko'rishlar</span>
          <span class="text-studio-600">•</span>
          <span>📖 {{ chapters.length }} ta bob</span>
        </p>

        <p class="text-xs sm:text-sm text-studio-400 leading-relaxed max-w-3xl">
          {{ webtoon.description || 'Tavsif berilmagan' }}
        </p>

        <div class="flex flex-wrap gap-1.5 pt-2">
          <span
            v-for="g in webtoon.genres"
            :key="g"
            class="px-2.5 py-1 rounded-lg text-xs bg-studio-850 border border-white/5 text-studio-300 font-medium"
          >
            {{ g }}
          </span>
        </div>
      </div>
    </div>

    <!-- Chapters Section -->
    <div class="glass-card rounded-2xl overflow-hidden border border-white/5">
      <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 class="font-bold text-white text-base">Boblar Ro'yxati</h3>
          <p class="text-xs text-studio-400 mt-0.5">Ushbu manhvaga tegishli barcha chop etilgan va tekshiruvdagi boblar</p>
        </div>
        <Badge variant="primary">{{ chapters.length }} ta bob</Badge>
      </div>

      <div v-if="chapters.length === 0" class="p-12 text-center text-studio-400 text-sm">
        Hozircha hech qanday bob yuklanmagan. Birinchi bobni yuklang!
      </div>

      <div v-else class="divide-y divide-white/5">
        <div
          v-for="ch in chapters"
          :key="ch.id"
          class="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-studio-850/40 transition-colors"
        >
          <div class="flex items-start sm:items-center gap-4">
            <!-- Chapter number badge -->
            <div class="w-12 h-12 rounded-xl bg-studio-900 border border-white/10 flex flex-col items-center justify-center font-mono shrink-0">
              <span class="text-[10px] text-studio-500 font-bold uppercase">Bob</span>
              <span class="text-sm font-extrabold text-brand-400">{{ ch.chapter_number }}</span>
            </div>

            <div>
              <h4 class="font-bold text-sm text-white flex items-center gap-2">
                {{ ch.title || `${ch.chapter_number}-bob` }}
                <Badge :variant="getStatusVariant(ch.status)" :dot="ch.status === 'pending'">
                  {{ getStatusLabel(ch.status) }}
                </Badge>
              </h4>
              <p class="text-xs text-studio-400 mt-1 flex items-center gap-3">
                <span>🖼 {{ ch.images?.length || 0 }} ta rasm</span>
                <span>•</span>
                <span>⚡ {{ ch.reward_coins || 5 }} Chaqmoq mukofoti</span>
                <span>•</span>
                <span class="font-mono">{{ formatDate(ch.created_at) }}</span>
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 self-end sm:self-center">
            <button
              class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-studio-800 hover:bg-studio-700 text-studio-200 hover:text-white transition-colors flex items-center gap-1"
              @click="previewChapter(ch)"
            >
              Ko'rish ({{ ch.images?.length || 0 }})
            </button>

            <button
              v-if="ch.status === 'pending' && authStore.hasPermission('chapters:approve')"
              class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors"
              @click="quickApprove(ch)"
            >
              Tasdiqlash
            </button>

            <button
              v-if="authStore.hasPermission('webtoons:delete')"
              class="p-2 rounded-xl text-studio-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Bobni o'chirish"
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

    <!-- Chapter Preview Modal (Vertical Reader Simulator) -->
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSystemStore } from '../stores/system'
import { mockDb } from '../api/client'
import Badge from '../components/common/Badge.vue'
import Button from '../components/common/Button.vue'
import Modal from '../components/common/Modal.vue'
import ChapterUploadModal from '../components/webtoons/ChapterUploadModal.vue'

const route = useRoute()
const authStore = useAuthStore()
const systemStore = useSystemStore()

const webtoonId = computed(() => Number(route.params.id))
const webtoon = computed(() => mockDb.webtoons.find((w) => w.id === webtoonId.value))
const chapters = computed(() =>
  mockDb.chapters.filter((c) => c.webtoon_id === webtoonId.value).sort((a, b) => a.chapter_number - b.chapter_number)
)

const showChapterUpload = ref(false)
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

function quickApprove(ch) {
  ch.status = 'published'
  mockDb.save('chapters')
  systemStore.addToast({
    type: 'success',
    title: 'Bob tasdiqlandi',
    message: `${ch.chapter_number}-bob muvaffaqiyatli chop etildi`
  })
}

function deleteChapter(id) {
  if (confirm('Ushbu bobni o\'chirmoqchimisiz?')) {
    mockDb.chapters = mockDb.chapters.filter((c) => c.id !== id)
    mockDb.save('chapters')
    systemStore.addToast({
      type: 'info',
      title: 'Bob o\'chirildi',
      message: 'Bob muvaffaqiyatli o\'chirildi'
    })
  }
}

function onChapterUploaded() {
  systemStore.addToast({
    type: 'success',
    title: 'Bob yuklandi',
    message: 'Yangi bob moderatsiyaga yuborildi'
  })
}
</script>
