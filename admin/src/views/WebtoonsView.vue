<template>
  <div class="space-y-6">
    <LoadState :loading="isLoading" :empty="!isLoading && !loadError && !webtoons.length" :error="loadError" @retry="loadData" />
    <!-- Top Action Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <svg class="w-6 h-6 text-brand-700 dark:text-brand-500 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          {{ $t('webtoons.title') }}
        </h2>
        <p class="text-xs text-slate-500 dark:text-studio-400 mt-1">
          {{ $t('webtoons.subtitle') }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <Button v-if="authStore.hasPermission('chapters:create')" variant="secondary" size="md" @click="showChapterImport = true">{{ $t('chapterImport.title') }}</Button>
        <Button
          v-if="authStore.hasPermission('genres:manage')"
          variant="ghost"
          size="md"
          class="border border-slate-200 dark:border-white/10"
          @click="showGenreModal = true"
        > {{ $t('staff.s531') }} </Button>

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
        <!-- Format (Type) Filter -->
        <select
          v-model="selectedType"
          class="px-3 py-2 text-xs bg-white dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-studio-200 focus:outline-none shadow-sm dark:shadow-none font-medium"
        >
          <option value="all"> {{ $t('staff.s532') }} </option>
          <option value="manhwa"> {{ $t('staff.s533') }} </option>
          <option value="manga"> {{ $t('staff.s534') }} </option>
          <option value="novel"> {{ $t('staff.s535') }} </option>
        </select>

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
          v-if="canReadGenres" v-model="selectedGenre"
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
            :class="['p-1.5 rounded-lg transition-colors', isGrid ? 'bg-white dark:bg-studio-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-studio-400 dark:text-studio-500']"
            @click="isGrid = true"
            :aria-pressed="isGrid"
            :title="$t('staff.s536')" :aria-label="$t('staff.s536')"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            :class="['p-1.5 rounded-lg transition-colors', !isGrid ? 'bg-white dark:bg-studio-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-studio-400 dark:text-studio-500']"
            @click="isGrid = false"
            :aria-pressed="!isGrid"
            :title="$t('staff.s537')" :aria-label="$t('staff.s537')"
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

            <!-- Status & Format Badges -->
            <div class="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
              <Badge :solid="true" :variant="item.status === 'completed' ? 'success' : 'primary'" :dot="true">
                {{ item.status === 'completed' ? $t('webtoons.completed') : $t('webtoons.ongoing') }}
              </Badge>
              <span
                :class="[
                  'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md',
                  item.type === 'novel' ? 'bg-emerald-500/90 text-slate-950 font-black' :
                  item.type === 'manga' ? 'bg-rose-500/90 text-white' :
                  'bg-indigo-600/90 text-white'
                ]"
              >
                {{ item.type === 'novel' ? 'Novel' : item.type === 'manga' ? 'Manga' : 'Manhwa' }}
              </span>
            </div>

            <!-- View Count Badge -->
            <div class="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-mono text-white">
              👁 {{ item.view_count?.toLocaleString() || 0 }}
            </div>

            <!-- Chapter Counter Badge -->
            <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <span class="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-xs font-mono font-bold text-brand-300 border border-slate-200 dark:border-white/10">
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
              <span>✍️</span> {{ item.author_name || $t('staff.s538') }}
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
              <span v-if="item.genres?.length> 2" class="text-[10px] text-slate-600 dark:text-studio-400 dark:text-studio-500">
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
              <th class="px-5 py-3.5"> {{ $t('staff.s539') }} </th>
              <th class="px-5 py-3.5"> {{ $t('staff.s540') }} </th>
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
                  <p class="text-xs text-slate-600 dark:text-studio-400 dark:text-studio-500 font-mono">{{ item.slug }}</p>
                </div>
              </td>
              <td class="px-5 py-3">
                <span
                  :class="[
                    'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider inline-block',
                    item.type === 'novel' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' :
                    item.type === 'manga' ? 'bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30' :
                    'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  ]"
                >
                  {{ item.type === 'novel' ? 'Novel' : item.type === 'manga' ? 'Manga' : 'Manhwa' }}
                </span>
              </td>
              <td class="px-5 py-3 text-slate-600 dark:text-studio-300 text-xs">{{ item.author_name }}</td>
              <td class="px-5 py-3">
                <Badge :variant="item.status === 'completed' ? 'success' : 'primary'" :dot="true">
                  {{ item.status === 'completed' ? $t('webtoons.completed') : $t('webtoons.ongoing') }}
                </Badge>
              </td>
              <td class="px-5 py-3 font-mono font-bold text-brand-700 dark:text-brand-400">
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
      :webtoon="selectedWebtoon" :genres="genres"
      :on-save="onWebtoonSaved"
    />

    <ChapterUploadModal
      v-model="showChapterUpload"
      :on-upload="onChapterUploaded"
    />

    <GenreManageModal
      v-model="showGenreModal" @changed="loadData"
    />
    <ChapterImportWorkspace v-model="showChapterImport" :webtoons="webtoons" @updated="loadData" />
    <Pagination v-model:page="page" :limit="limit" :total="totalItems" :loading="isLoading" />
  </div>
</template>

<script setup>
import i18n from '../i18n/index.js'
const tr = (...args) => i18n.global.t(...args)

import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import Pagination from '../components/common/Pagination.vue'
import LoadState from '../components/common/LoadState.vue'
import { getErrorMessage, pageCount } from '../utils/forms'
import { useSystemStore } from '../stores/system'
import { webtoonsApi } from '../api/webtoons'
import Badge from '../components/common/Badge.vue'
import Button from '../components/common/Button.vue'
import SearchInput from '../components/common/SearchInput.vue'
import WebtoonFormModal from '../components/webtoons/WebtoonFormModal.vue'
import ChapterUploadModal from '../components/webtoons/ChapterUploadModal.vue'
import ChapterImportWorkspace from '../components/webtoons/ChapterImportWorkspace.vue'
import GenreManageModal from '../components/webtoons/GenreManageModal.vue'

const authStore = useAuthStore()
const systemStore = useSystemStore()

const isGrid = ref(true)
const searchQuery = ref('')
const selectedType = ref('all')
const selectedStatus = ref('all')
const selectedGenre = ref('all')

const showCreateModal = ref(false)
const showChapterUpload = ref(false)
const showChapterImport = ref(false)
const showGenreModal = ref(false)
const selectedWebtoon = ref(null)

const webtoons = ref([])
const genres = ref([])
const canReadGenres = computed(() => ['genres:manage','webtoons:create','webtoons:edit'].some(code => authStore.hasPermission(code)))
const isLoading = ref(false)

const page = ref(1)
const limit = 25
const loadError = ref('')
let loadSequence = 0
const totalItems = ref(0)
async function loadData() {
  const sequence = ++loadSequence
  loadError.value = ''
  isLoading.value = true
  try {
    const [wRes, gRes] = await Promise.all([
      webtoonsApi.getWebtoons({ page: page.value, limit, search: searchQuery.value || undefined, type: selectedType.value === 'all' ? undefined : selectedType.value, status: selectedStatus.value === 'all' ? undefined : selectedStatus.value, genre: genres.value.find(g => g.id === Number(selectedGenre.value))?.slug }),
      canReadGenres.value ? webtoonsApi.getGenres() : Promise.resolve({data: []})
    ])
    if (sequence !== loadSequence) return
    totalItems.value = wRes.data?.total ?? 0
    if (page.value> pageCount(totalItems.value, limit)) { page.value = pageCount(totalItems.value, limit); return }
    webtoons.value = wRes.data?.items || wRes.data || []
    genres.value = gRes.data || []
  } catch (err) {
    if (sequence !== loadSequence) return
    loadError.value = getErrorMessage(err)
    console.error('Failed to load webtoons:', err)
  } finally {
    if (sequence === loadSequence) isLoading.value = false
  }
}

onMounted(() => {
  loadData()
  window.addEventListener('chapter-import-complete', importedChapter)
})
const importedChapter = () => loadData()

const filteredWebtoons = computed(() => webtoons.value)

function getWebtoonChaptersCount(itemOrId) {
  if (typeof itemOrId === 'object' && itemOrId !== null) {
    return itemOrId.chapter_count ?? itemOrId.chapters_count ?? 0
  }
  const found = webtoons.value.find((w) => w.id === itemOrId)
  return found?.chapter_count ?? found?.chapters_count ?? 0
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
        title: tr('staff.s541'),
        message: tr('staff.s479', { value0: savedItem.title })
      })
    } else {
      const formData = new FormData()
      formData.append('title', savedItem.title)
      formData.append('type', savedItem.type || 'manhwa')
      if (savedItem.description) formData.append('description', savedItem.description)
      if (savedItem.author_name) formData.append('author_name', savedItem.author_name)
      formData.append('status', savedItem.status || 'ongoing')
      formData.append('genre_ids', JSON.stringify(savedItem.genre_ids || []))
      if (!savedItem.cover_image_file) throw new Error(tr('staff.s346'))
      formData.append('cover_image', savedItem.cover_image_file)
      await webtoonsApi.createWebtoon(formData)
      systemStore.addToast({
        type: 'success',
        title: tr('staff.s542'),
        message: tr('staff.s348', { value0: savedItem.title })
      })
    }
    await loadData()
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: tr('staff.s024'),
      message: err.message || tr('staff.s543')
    })
    throw err
  }
}

async function deleteWebtoon(id) {
  if (confirm(tr('staff.s544'))) {
    try {
      await webtoonsApi.deleteWebtoon(id)
      systemStore.addToast({
        type: 'info',
        title: tr('staff.s545'),
        message: tr('staff.s546')
      })
      await loadData()
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
    formData.append('webtoon_id', data.webtoon_id)
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
    await loadData()
    systemStore.addToast({
      type: 'success',
      title: tr('staff.s351'),
      message: tr('staff.s547', { value0: data.chapter_number })
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

watch(page, loadData)
onUnmounted(() => { loadSequence++; clearTimeout(searchTimer); window.removeEventListener('chapter-import-complete', importedChapter) })
let searchTimer = null
watch([searchQuery, selectedType, selectedStatus, selectedGenre], () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { if (page.value !== 1) page.value = 1; else loadData() }, 250) })
</script>
