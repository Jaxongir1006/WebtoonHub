<template>
  <div class="space-y-6">
    <!-- Top Action Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <svg class="w-6 h-6 text-brand-500 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          {{ $t('webtoons.title') }}
        </h2>
        <p class="text-xs text-slate-500 dark:text-studio-400 mt-1">
          {{ $t('webtoons.subtitle') }}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <Button
          v-if="authStore.hasPermission('genres:manage')"
          variant="ghost"
          size="md"
          class="border border-slate-200 dark:border-white/10"
          @click="showGenreModal = true"
        >
          🏷 Janrlar
        </Button>

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
          {{ $t('webtoons.btn_upload_chapter') }}
        </Button>

        <Button
          v-if="authStore.hasPermission('webtoons:create')"
          variant="primary"
          size="md"
          @click="openCreateModal"
        >
          {{ $t('webtoons.btn_new') }}
        </Button>
      </div>
    </div>

    <!-- Filters & Search Bar -->
    <div class="glass-card rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="w-full md:w-80">
        <SearchInput v-model="searchQuery" :placeholder="$t('common.search')" />
      </div>

      <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
        <!-- Status Filter -->
        <select
          v-model="selectedStatus"
          class="px-3 py-2 text-xs bg-white dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-studio-200 focus:outline-none shadow-sm dark:shadow-none"
        >
          <option value="all">{{ $t('webtoons.all_statuses') }}</option>
          <option value="ongoing">{{ $t('webtoons.ongoing') }}</option>
          <option value="completed">{{ $t('webtoons.completed') }}</option>
        </select>

        <!-- Genre Filter -->
        <select
          v-model="selectedGenre"
          class="px-3 py-2 text-xs bg-white dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-studio-200 focus:outline-none shadow-sm dark:shadow-none"
        >
          <option value="all">{{ $t('webtoons.all_genres') }}</option>
          <option v-for="g in genres" :key="g.id" :value="g.id">
            {{ g.name }}
          </option>
        </select>

        <!-- View Mode Switcher -->
        <div class="p-1 rounded-xl bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/10 flex items-center">
          <button
            :class="['p-1.5 rounded-lg transition-colors', isGrid ? 'bg-white dark:bg-studio-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 dark:text-studio-500']"
            @click="isGrid = true"
            title="Grid"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            :class="['p-1.5 rounded-lg transition-colors', !isGrid ? 'bg-white dark:bg-studio-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 dark:text-studio-500']"
            @click="isGrid = false"
            title="Table"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Webtoons Content: Grid View -->
    <div v-if="isGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <div
        v-for="item in filteredWebtoons"
        :key="item.id"
        class="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 hover:border-brand-500/40 hover:shadow-2xl transition-all duration-300 group flex flex-col justify-between"
      >
        <div>
          <!-- Cover Image Container -->
          <div class="relative aspect-[3/4] overflow-hidden bg-slate-900 dark:bg-studio-950">
            <img
              :src="item.cover_image_url"
              :alt="item.title"
              class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

            <!-- Status Badge -->
            <div class="absolute top-3 left-3">
              <Badge :variant="item.status === 'completed' ? 'success' : 'primary'" :dot="true">
                {{ item.status === 'completed' ? $t('webtoons.completed') : $t('webtoons.ongoing') }}
              </Badge>
            </div>

            <!-- View Count Badge -->
            <div class="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-mono text-white">
              👁 {{ item.view_count?.toLocaleString() || 0 }}
            </div>

            <!-- Chapter Counter Badge -->
            <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <span class="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-xs font-mono font-bold text-brand-300 border border-white/10">
                📖 {{ getWebtoonChaptersCount(item.id) }} {{ $t('webtoons.chapters_count') }}
              </span>
            </div>
          </div>

          <!-- Metadata -->
          <div class="p-4 space-y-2">
            <h3 class="font-bold text-slate-900 dark:text-white text-base leading-snug line-clamp-1 group-hover:text-brand-500 transition-colors">
              {{ item.title }}
            </h3>
            <p class="text-xs text-slate-500 dark:text-studio-400 flex items-center gap-1">
              <span>✍️</span> {{ item.author_name || 'Muallif ko\'rsatilmagan' }}
            </p>

            <!-- Genres Badges -->
            <div class="flex flex-wrap gap-1 pt-1">
              <span
                v-for="g in item.genres?.slice(0, 2)"
                :key="g"
                class="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-studio-850 text-slate-700 dark:text-studio-300 font-medium"
              >
                {{ g }}
              </span>
              <span v-if="item.genres?.length > 2" class="text-[10px] text-slate-400 dark:text-studio-500">
                +{{ item.genres.length - 2 }}
              </span>
            </div>
          </div>
        </div>

        <!-- Card Footer Actions -->
        <div class="p-4 pt-0 border-t border-slate-100 dark:border-white/5 mt-3 flex items-center justify-between gap-2">
          <router-link
            :to="`/webtoons/${item.id}`"
            class="flex-1 py-1.5 px-3 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-studio-850 hover:bg-slate-200 dark:hover:bg-studio-800 text-slate-800 dark:text-studio-100 text-center border border-slate-200 dark:border-white/5 transition-colors"
          >
            {{ $t('webtoons.list_chapters') }}
          </router-link>

          <button
            v-if="authStore.hasPermission('webtoons:edit')"
            class="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-studio-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-studio-800 transition-colors"
            :title="$t('common.edit')"
            @click="openEditModal(item)"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          <button
            v-if="authStore.hasPermission('webtoons:delete')"
            class="p-2 rounded-xl text-slate-500 hover:text-rose-600 dark:text-studio-400 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            :title="$t('common.delete')"
            @click="deleteWebtoon(item.id)"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Table View -->
    <div v-else class="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-100 dark:bg-studio-900/80 text-xs uppercase font-bold text-slate-600 dark:text-studio-400 border-b border-slate-200 dark:border-white/5">
            <tr>
              <th class="px-5 py-3.5">Manhwa</th>
              <th class="px-5 py-3.5">{{ $t('webtoons.author') }}</th>
              <th class="px-5 py-3.5">{{ $t('common.status') }}</th>
              <th class="px-5 py-3.5">{{ $t('webtoons.chapters_count') }}</th>
              <th class="px-5 py-3.5">{{ $t('webtoons.views') }}</th>
              <th class="px-5 py-3.5 text-right">{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-white/5">
            <tr v-for="item in filteredWebtoons" :key="item.id" class="hover:bg-slate-50 dark:hover:bg-studio-850/40 transition-colors">
              <td class="px-5 py-3 flex items-center gap-3">
                <img :src="item.cover_image_url" class="w-10 h-14 rounded-lg object-cover shadow-sm" />
                <div>
                  <router-link :to="`/webtoons/${item.id}`" class="font-bold text-slate-900 dark:text-white hover:text-brand-500">
                    {{ item.title }}
                  </router-link>
                  <p class="text-xs text-slate-400 dark:text-studio-500 font-mono">{{ item.slug }}</p>
                </div>
              </td>
              <td class="px-5 py-3 text-slate-600 dark:text-studio-300 text-xs">{{ item.author_name }}</td>
              <td class="px-5 py-3">
                <Badge :variant="item.status === 'completed' ? 'success' : 'primary'" :dot="true">
                  {{ item.status === 'completed' ? $t('webtoons.completed') : $t('webtoons.ongoing') }}
                </Badge>
              </td>
              <td class="px-5 py-3 font-mono font-bold text-brand-600 dark:text-brand-400">
                {{ getWebtoonChaptersCount(item.id) }}
              </td>
              <td class="px-5 py-3 font-mono text-slate-500 dark:text-studio-400 text-xs">
                {{ item.view_count?.toLocaleString() || 0 }}
              </td>
              <td class="px-5 py-3 text-right">
                <div class="inline-flex items-center gap-2">
                  <router-link
                    :to="`/webtoons/${item.id}`"
                    class="px-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-studio-800 text-slate-700 dark:text-studio-200 hover:text-slate-900 dark:hover:text-white"
                  >
                    {{ $t('webtoons.list_chapters') }}
                  </router-link>
                  <button
                    v-if="authStore.hasPermission('webtoons:edit')"
                    class="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-studio-400 dark:hover:text-white"
                    @click="openEditModal(item)"
                  >
                    ✏️
                  </button>
                  <button
                    v-if="authStore.hasPermission('webtoons:delete')"
                    class="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:text-studio-400 dark:hover:text-rose-400"
                    @click="deleteWebtoon(item.id)"
                  >
                    🗑
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modals -->
    <WebtoonFormModal
      v-model="showCreateModal"
      :webtoon="selectedWebtoon"
      @save="onWebtoonSaved"
    />

    <ChapterUploadModal
      v-model="showChapterUpload"
      @upload-success="onChapterUploaded"
    />

    <GenreManageModal
      v-model="showGenreModal"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useSystemStore } from '../stores/system'
import { webtoonsApi } from '../api/webtoons'
import Badge from '../components/common/Badge.vue'
import Button from '../components/common/Button.vue'
import SearchInput from '../components/common/SearchInput.vue'
import WebtoonFormModal from '../components/webtoons/WebtoonFormModal.vue'
import ChapterUploadModal from '../components/webtoons/ChapterUploadModal.vue'
import GenreManageModal from '../components/webtoons/GenreManageModal.vue'

const authStore = useAuthStore()
const systemStore = useSystemStore()

const isGrid = ref(true)
const searchQuery = ref('')
const selectedStatus = ref('all')
const selectedGenre = ref('all')

const showCreateModal = ref(false)
const showChapterUpload = ref(false)
const showGenreModal = ref(false)
const selectedWebtoon = ref(null)

const webtoons = ref([])
const genres = ref([])
const isLoading = ref(false)

async function loadData() {
  isLoading.value = true
  try {
    const [wRes, gRes] = await Promise.all([
      webtoonsApi.getWebtoons({ limit: 100 }),
      webtoonsApi.getGenres()
    ])
    webtoons.value = wRes.data?.items || wRes.data || []
    genres.value = gRes.data || []
  } catch (err) {
    console.error('Failed to load webtoons:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadData()
})

const filteredWebtoons = computed(() => {
  return webtoons.value.filter((w) => {
    const matchesSearch =
      !searchQuery.value ||
      w.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      w.author_name?.toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchesStatus =
      selectedStatus.value === 'all' || w.status === selectedStatus.value

    let matchesGenre = true
    if (selectedGenre.value !== 'all') {
      const targetGenre = genres.value.find((g) => g.id === Number(selectedGenre.value))
      if (targetGenre) {
        matchesGenre = (w.genres && w.genres.includes(targetGenre.name)) ||
          (w.genre_ids && w.genre_ids.includes(Number(selectedGenre.value)))
      }
    }

    return matchesSearch && matchesStatus && matchesGenre
  })
})

function getWebtoonChaptersCount(itemOrId) {
  if (typeof itemOrId === 'object' && itemOrId !== null) {
    return itemOrId.latest_chapter?.chapter_number || itemOrId.chapters_count || 0
  }
  const found = webtoons.value.find((w) => w.id === itemOrId)
  return found?.latest_chapter?.chapter_number || found?.chapters_count || 0
}

function openCreateModal() {
  selectedWebtoon.value = null
  showCreateModal.value = true
}

function openEditModal(item) {
  selectedWebtoon.value = { ...item }
  showCreateModal.value = true
}

async function onWebtoonSaved(savedItem) {
  try {
    if (savedItem.id) {
      await webtoonsApi.updateWebtoon(savedItem.id, savedItem)
      systemStore.addToast({
        type: 'success',
        title: 'Manhwa yangilandi',
        message: `"${savedItem.title}" muvaffaqiyatli saqlandi`
      })
    } else {
      const formData = new FormData()
      formData.append('title', savedItem.title)
      if (savedItem.description) formData.append('description', savedItem.description)
      if (savedItem.author_name) formData.append('author_name', savedItem.author_name)
      formData.append('status', savedItem.status || 'ongoing')
      formData.append('genre_ids', JSON.stringify(savedItem.genre_ids || []))
      if (savedItem.cover_file) {
        formData.append('cover_image', savedItem.cover_file)
      } else {
        const dummyBlob = new Blob([new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0])], { type: 'image/jpeg' })
        formData.append('cover_image', dummyBlob, 'cover.jpg')
      }
      await webtoonsApi.createWebtoon(formData)
      systemStore.addToast({
        type: 'success',
        title: 'Manhwa yaratildi',
        message: `"${savedItem.title}" muvaffaqiyatli katalogga qo'shildi`
      })
    }
    await loadData()
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: 'Xatolik',
      message: err.message || 'Manhvani saqlashda xatolik yuz berdi'
    })
  }
}

async function deleteWebtoon(id) {
  if (confirm('Rostdan ham ushbu manhva va uning barcha boblarini o\'chirmoqchimisiz?')) {
    try {
      await webtoonsApi.deleteWebtoon(id)
      systemStore.addToast({
        type: 'info',
        title: 'Manhwa o\'chirildi',
        message: 'Manhwa va uning barcha ma\'lumotlari bazadan o\'chirildi'
      })
      await loadData()
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
    formData.append('webtoon_id', data.webtoon_id)
    formData.append('chapter_number', data.chapter_number)
    if (data.title) formData.append('title', data.title)
    if (data.rawFiles && data.rawFiles.length > 0) {
      data.rawFiles.forEach((f) => formData.append('images', f))
    } else {
      const dummyBlob = new Blob([new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0])], { type: 'image/jpeg' })
      formData.append('images', dummyBlob, 'page_01.jpg')
    }
    await webtoonsApi.uploadChapter(formData)
    await loadData()
    systemStore.addToast({
      type: 'success',
      title: 'Bob yuklandi',
      message: `${data.chapter_number}-bob muvaffaqiyatli yuklandi va moderatsiya navbatiga qo'shildi`
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
