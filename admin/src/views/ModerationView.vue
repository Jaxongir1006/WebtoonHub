<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <svg class="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Boblar Moderatsiyasi Navbati
        </h2>
        <p class="text-xs text-studio-400 mt-1">
          Creatorlar tomonidan yuklangan yangi bob rasmlari sifatini tekshirish va chop etish
        </p>
      </div>

      <!-- Status Tabs Filter -->
      <div class="p-1 rounded-xl bg-studio-900 border border-white/10 flex items-center gap-1">
        <button
          v-for="tab in filterTabs"
          :key="tab.value"
          :class="[
            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
            currentStatus === tab.value
              ? 'bg-brand-500 text-slate-950 font-bold shadow-sm'
              : 'text-studio-400 hover:text-white'
          ]"
          @click="currentStatus = tab.value"
        >
          {{ tab.label }} ({{ getCountByStatus(tab.value) }})
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="filteredChapters.length === 0"
      class="glass-card rounded-2xl p-12 text-center border border-white/5 space-y-3"
    >
      <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 class="font-bold text-white text-base">Hozirda moderatsiya uchun yangi boblar yo'q</h3>
      <p class="text-xs text-studio-400 max-w-sm mx-auto">
        Barcha boblar tekshirib chiqilgan va tasdiqlangan. Yangi boblar yuklanganda bu yerda paydo bo'ladi.
      </p>
    </div>

    <!-- Chapter Review Cards -->
    <div v-else class="space-y-4">
      <div
        v-for="ch in filteredChapters"
        :key="ch.id"
        class="glass-card rounded-2xl p-5 border border-white/5 hover:border-brand-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div class="flex items-start gap-4">
          <!-- Webtoon Mini Cover -->
          <div class="w-14 h-20 rounded-xl overflow-hidden bg-studio-950 border border-white/10 shrink-0">
            <img :src="ch.webtoon_cover" class="w-full h-full object-cover" />
          </div>

          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-brand-400 uppercase font-mono tracking-wider">
                {{ ch.webtoon_title }}
              </span>
              <Badge :variant="ch.status === 'published' ? 'success' : (ch.status === 'pending' ? 'warning' : 'danger')">
                {{ ch.status === 'published' ? 'Chop etilgan' : (ch.status === 'pending' ? 'Kutilmoqda' : 'Rad etilgan') }}
              </Badge>
            </div>

            <h3 class="font-bold text-base text-white">
              {{ ch.chapter_number }}-bob: {{ ch.title || 'Sarlavhasiz' }}
            </h3>

            <p class="text-xs text-studio-400 flex flex-wrap items-center gap-3 pt-0.5">
              <span>🖼 {{ ch.images?.length || 0 }} ta vertikal sahifa</span>
              <span>•</span>
              <span>⚡ {{ ch.reward_coins || 5 }} Chaqmoq mukofot</span>
              <span>•</span>
              <span class="font-mono text-studio-500">Yuklangan: {{ formatDate(ch.created_at) }}</span>
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
            Sahifalarni Ko'rish ({{ ch.images?.length || 0 }})
          </Button>

          <template v-if="ch.status === 'pending'">
            <Button
              variant="danger"
              size="sm"
              @click="moderate(ch.id, 'rejected')"
            >
              Rad Etish
            </Button>
            <Button
              variant="success"
              size="sm"
              @click="moderate(ch.id, 'published')"
            >
              ✓ Tasdiqlash
            </Button>
          </template>

          <template v-else>
            <span class="text-xs font-mono text-studio-400 italic">
              Holat: {{ ch.status }}
            </span>
          </template>
        </div>
      </div>
    </div>

    <!-- Full Chapter Inspector Modal -->
    <Modal
      v-model="showInspectorModal"
      :title="inspectorTitle"
      description="Yuklangan barcha rasmlarni sifat va tartib bo'yicha tekshirish"
      max-width="3xl"
    >
      <div class="space-y-4">
        <!-- Sticky Action Bar inside inspector -->
        <div class="p-3 rounded-xl bg-studio-900/90 border border-white/10 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
          <span class="text-xs font-mono text-studio-300">
            Jami sahifalar: <strong>{{ activeChapter?.images?.length || 0 }}</strong>
          </span>
          <div v-if="activeChapter?.status === 'pending'" class="flex items-center gap-2">
            <Button variant="danger" size="xs" @click="moderate(activeChapter.id, 'rejected')">
              Rad etish
            </Button>
            <Button variant="success" size="xs" @click="moderate(activeChapter.id, 'published')">
              Tasdiqlash & Chop Etish
            </Button>
          </div>
        </div>

        <!-- Scrollable Vertical Image Stream -->
        <div class="max-h-[60vh] overflow-y-auto bg-black p-3 rounded-2xl space-y-2 border border-white/5">
          <div
            v-for="(img, idx) in activeChapter?.images"
            :key="idx"
            class="relative rounded-lg overflow-hidden group"
          >
            <span class="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-white font-mono text-xs font-bold z-10">
              Sahifa #{{ idx + 1 }}
            </span>
            <img :src="img" class="w-full h-auto block" />
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSystemStore } from '../stores/system'
import { mockDb } from '../api/client'
import Badge from '../components/common/Badge.vue'
import Button from '../components/common/Button.vue'
import Modal from '../components/common/Modal.vue'

const systemStore = useSystemStore()
const currentStatus = ref('pending')

const filterTabs = [
  { label: 'Kutilmoqda', value: 'pending' },
  { label: 'Tasdiqlangan', value: 'published' },
  { label: 'Rad etilgan', value: 'rejected' },
  { label: 'Barchasi', value: 'all' }
]

const showInspectorModal = ref(false)
const activeChapter = ref(null)
const inspectorTitle = ref('')

const populatedChapters = computed(() => {
  return mockDb.chapters.map((c) => {
    const w = mockDb.webtoons.find((item) => item.id === c.webtoon_id)
    return {
      ...c,
      webtoon_title: w ? w.title : `Webtoon #${c.webtoon_id}`,
      webtoon_cover: w ? w.cover_image_url : null
    }
  })
})

const filteredChapters = computed(() => {
  if (currentStatus.value === 'all') return populatedChapters.value
  return populatedChapters.value.filter((c) => c.status === currentStatus.value)
})

function getCountByStatus(status) {
  if (status === 'all') return populatedChapters.value.length
  return populatedChapters.value.filter((c) => c.status === status).length
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('uz-UZ', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function inspectChapter(ch) {
  activeChapter.value = ch
  inspectorTitle.value = `${ch.webtoon_title} — ${ch.chapter_number}-bobni tekshirish`
  showInspectorModal.value = true
}

function moderate(id, newStatus) {
  const chapter = mockDb.chapters.find((c) => c.id === id)
  if (chapter) {
    chapter.status = newStatus
    mockDb.save('chapters')
    if (activeChapter.value && activeChapter.value.id === id) {
      activeChapter.value.status = newStatus
      showInspectorModal.value = false
    }
    systemStore.addToast({
      type: newStatus === 'published' ? 'success' : 'info',
      title: newStatus === 'published' ? 'Bob tasdiqlandi' : 'Bob rad etildi',
      message:
        newStatus === 'published'
          ? 'Bob ommaga e\'lon qilindi va o\'quvchilarga +5 Chaqmoq berishga tayyor'
          : 'Bob rad etildi'
    })
  }
}
</script>
