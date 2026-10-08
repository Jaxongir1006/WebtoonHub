<template>
  <Modal ref="draftDialog" :draft="{ form, files: rawFiles }"
    :busy="isSubmitting"
    :model-value="modelValue"
    :title="isNovel ? $t('staff.s137') : (isManga ? $t('staff.s138') : $t('staff.s139'))"
    :description="isNovel ? $t('staff.s140') : (isManga ? $t('staff.s141') : $t('staff.s142'))"
    max-width="3xl"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form @submit.prevent="handleSubmit">
      <fieldset :disabled="isSubmitting" class="space-y-5">
      <p v-if="submitError" role="alert" class="text-sm text-rose-600 dark:text-rose-300">{{ submitError }}</p>
      <div v-if="isSubmitting" role="progressbar" :aria-label="$t('common.upload')" :aria-valuenow="uploadProgress" aria-valuemin="0" aria-valuemax="100" class="space-y-1">
        <p class="text-sm">{{ uploadProgress < 100 ? $t('common.upload_progress', { percent: uploadProgress }) : $t('common.processing') }}</p>
        <div class="h-2 bg-slate-200 dark:bg-studio-800 rounded"><div class="h-full bg-brand-500 rounded" :style="{ width: uploadProgress + '%' }" /></div>
      </div>
      <!-- Webtoon & Chapter Number -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <!-- Webtoon Selector -->
        <div class="sm:col-span-2">
          <label for="ChapterUploadModal-field-1" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5"> {{ $t('staff.s143') }} </label>
          <select
            id="ChapterUploadModal-field-1"
            v-model="form.webtoon_id"
            required
            class="w-full px-3.5 py-2 text-sm bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70"
          >
            <option disabled :value="null">{{ $t('common.choose_project') }}</option>
            <option v-for="w in availableWebtoons" :key="w.id" :value="w.id">
              [{{ (w.type || 'manhwa').toUpperCase() }}] {{ w.title }} {{ $t('staff.s144') }} {{ w.chapter_count ?? w.chapters_count ?? 0 }})
            </option>
          </select>
        </div>

        <!-- Chapter Number -->
        <div>
          <label for="ChapterUploadModal-field-2" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5"> {{ $t('staff.s115') }} </label>
          <input
            id="ChapterUploadModal-field-2"
            v-model.number="form.chapter_number"
            type="number"
            step="0.1"
            min="0.1"
            required
            placeholder="1.0"
            class="w-full px-3.5 py-2 text-sm bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 font-mono focus:outline-none focus:border-brand-500/70"
          />
        </div>
      </div>

      <!-- Chapter Title & Reward -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="sm:col-span-2">
          <label for="ChapterUploadModal-field-3" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5"> {{ $t('staff.s145') }} </label>
          <input
            id="ChapterUploadModal-field-3"
            v-model="form.title"
            type="text"
            :placeholder="isNovel ? $t('staff.s146') : $t('staff.s147')"
            class="w-full px-3.5 py-2 text-sm bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70"
          />
        </div>

        <div>
          <label for="ChapterUploadModal-field-4" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5"> {{ $t('staff.s148') }} </label>
          <input
            id="ChapterUploadModal-field-4"
            v-model.number="form.reward_coins"
            type="number"
            min="0"
            required
            class="w-full px-3.5 py-2 text-sm bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-brand-700 dark:text-brand-400 font-bold font-mono focus:outline-none focus:border-brand-500/70"
          />
        </div>
      </div>

      <!-- FORMAT SPECIFIC SECTIONS -->

      <!-- 1. NOVEL RICH TEXT / MARKDOWN EDITOR -->
      <div v-if="isNovel" class="space-y-2">
        <div class="flex items-center justify-between">
          <label for="ChapterUploadModal-label-4348" class="text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider flex items-center gap-2">
            <span> {{ $t('staff.s149') }} </span>
            <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono text-[11px] font-bold border border-emerald-500/20"> {{ $t('staff.s150') }} </span>
          </label>

          <!-- Word / Char Count -->
          <span class="text-xs font-mono text-slate-500 dark:text-studio-400">
            <strong class="text-slate-900 dark:text-white">{{ wordCount }}</strong> {{ $t('staff.s151') }} <strong class="text-slate-900 dark:text-white">{{ charCount }}</strong> {{ $t('staff.s152') }} </span>
        </div>

        <!-- Editor Toolbar -->
        <div class="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-100 dark:bg-studio-900 rounded-t-xl border border-slate-200 dark:border-white/10 border-b-0">
          <div class="flex flex-wrap items-center gap-1">
            <button
              type="button"
              class="px-2 py-1 rounded text-xs font-mono text-slate-700 dark:text-studio-300 hover:text-white hover:bg-slate-200 dark:hover:bg-studio-800 transition-colors"
              :title="$t('staff.s153')" :aria-label="$t('staff.s153')"
              @click="insertText('# ', '\n')"
            > {{ $t('staff.s154') }} </button>
            <button
              type="button"
              class="px-2 py-1 rounded text-xs font-mono text-slate-700 dark:text-studio-300 hover:text-white hover:bg-slate-200 dark:hover:bg-studio-800 transition-colors"
              :title="$t('staff.s155')" :aria-label="$t('staff.s155')"
              @click="insertText('## ', '\n')"
            > {{ $t('staff.s156') }} </button>
            <span class="text-slate-900 dark:text-white/20">|</span>
            <button
              type="button"
              class="px-2 py-1 rounded text-xs font-bold text-slate-700 dark:text-studio-300 hover:text-white hover:bg-slate-200 dark:hover:bg-studio-800 transition-colors"
              :title="$t('staff.s157')" :aria-label="$t('staff.s157')"
              @click="insertText('**', '**')"
            > {{ $t('staff.s158') }} </button>
            <button
              type="button"
              class="px-2 py-1 rounded text-xs italic text-slate-700 dark:text-studio-300 hover:text-white hover:bg-slate-200 dark:hover:bg-studio-800 transition-colors"
              :title="$t('staff.s159')" :aria-label="$t('staff.s159')"
              @click="insertText('*', '*')"
            > {{ $t('staff.s160') }} </button>
            <button
              type="button"
              class="px-2 py-1 rounded text-xs text-slate-700 dark:text-studio-300 hover:text-white hover:bg-slate-200 dark:hover:bg-studio-800 transition-colors"
              :title="$t('staff.s161')" :aria-label="$t('staff.s161')"
              @click="insertText('> ', '\n')"
            >
              " "
            </button>
            <button
              type="button"
              class="px-2 py-1 rounded text-xs text-slate-700 dark:text-studio-300 hover:text-white hover:bg-slate-200 dark:hover:bg-studio-800 transition-colors"
              :title="$t('staff.s162')" :aria-label="$t('staff.s162')"
              @click="insertText('— ')"
            >
              —
            </button>
            <button
              type="button"
              class="px-2 py-1 rounded text-xs text-slate-700 dark:text-studio-300 hover:text-white hover:bg-slate-200 dark:hover:bg-studio-800 transition-colors"
              :title="$t('staff.s163')" :aria-label="$t('staff.s163')"
              @click="insertText('\n***\n')"
            >
              ***
            </button>
          </div>

          <!-- Edit / Preview Switcher -->
          <div class="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-studio-950 border border-slate-200 dark:border-white/5 text-xs">
            <button
              type="button"
              :class="[
                'px-2.5 py-0.5 rounded font-medium transition-colors',
                activeEditorTab === 'write' ? 'bg-brand-500 text-slate-950 font-bold' : 'text-slate-600 dark:text-studio-400 hover:text-slate-900 dark:hover:text-white'
              ]"
              @click="activeEditorTab = 'write'"
            > {{ $t('staff.s164') }} </button>
            <button
              type="button"
              :class="[
                'px-2.5 py-0.5 rounded font-medium transition-colors',
                activeEditorTab === 'preview' ? 'bg-brand-500 text-slate-950 font-bold' : 'text-slate-600 dark:text-studio-400 hover:text-slate-900 dark:hover:text-white'
              ]"
              @click="activeEditorTab = 'preview'"
            > {{ $t('staff.s165') }} </button>
          </div>
        </div>

        <!-- Write Area or Preview Area -->
        <div v-show="activeEditorTab === 'write'">
          <textarea id="ChapterUploadModal-label-4348"
            ref="novelTextarea"
            v-model="form.content_text"
            rows="12"
            :placeholder="$t('staff.s166')" :aria-label="$t('staff.s166')"
            class="w-full px-4 py-3 text-sm bg-slate-100 dark:bg-studio-950 border border-slate-200 dark:border-white/10 rounded-b-xl text-slate-900 dark:text-studio-100 font-mono leading-relaxed focus:outline-none focus:border-brand-500/70 resize-y min-h-[220px]"
          />
        </div>

        <div
          v-show="activeEditorTab === 'preview'"
          class="p-4 bg-slate-100 dark:bg-studio-950/80 border border-slate-200 dark:border-white/10 rounded-b-xl min-h-[220px] max-h-[360px] overflow-y-auto"
        >
          <div
            v-if="form.content_text?.trim()"
            class="prose prose-invert max-w-none text-sm text-slate-800 dark:text-studio-200"
            v-html="renderedMarkdown"
          />
          <p v-else class="text-xs text-slate-500 dark:text-studio-500 italic text-center pt-8"> {{ $t('staff.s167') }} </p>
        </div>
      </div>

      <!-- 2. IMAGE UPLOAD SECTION (Required for Manhwa/Manga, Optional for Novel) -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label for="ChapterUploadModal-label-10235" class="text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider flex items-center gap-2">
            <span>{{ isNovel ? $t('staff.s168') : $t('staff.s169') }} ({{ uploadedImages.length }} {{ $t('staff.s170') }} </span>
            <span v-if="!isNovel" class="text-brand-700 dark:text-brand-400">*</span>
            <span v-else class="text-[10px] text-slate-500 dark:text-studio-400 font-normal"> {{ $t('staff.s171') }} </span>
          </label>
          <button
            v-if="uploadedImages.length> 0"
            type="button"
            class="text-xs text-rose-700 dark:text-rose-400 hover:text-rose-300 transition-colors"
            @click="clearImages"
          > {{ $t('staff.s172') }} </button>
        </div>

        <!-- Dropzone Container -->
        <div
          role="button" :tabindex="isSubmitting ? -1 : 0" :aria-label="$t('common.upload')" :aria-disabled="isSubmitting"
          :class="[
            'border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer relative',
            isDragging
              ? 'border-brand-500 bg-brand-500/10'
              : 'border-slate-300 dark:border-white/15 hover:border-brand-500/50 bg-slate-100/40 dark:bg-studio-900/40 hover:bg-slate-200 dark:hover:bg-studio-900/60'
          ]"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          @click="!isSubmitting && $refs.fileInput.click()"
          @keydown.enter.prevent="!isSubmitting && $refs.fileInput.click()"
          @keydown.space.prevent="!isSubmitting && $refs.fileInput.click()"
        >
          <input id="ChapterUploadModal-label-10235"
            ref="fileInput"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            class="hidden"
            @change="handleFileInput"
          />

          <div class="flex flex-col items-center justify-center gap-2">
            <div class="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-700 dark:text-brand-400 flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p class="text-xs font-semibold text-slate-900 dark:text-studio-100"> {{ $t('staff.s173') }} <span class="text-brand-700 dark:text-brand-400 underline"> {{ $t('staff.s174') }} </span>
              </p>
              <p class="text-[11px] text-slate-500 dark:text-studio-400 mt-0.5"> {{ $t('staff.s175') }} </p>
            </div>
          </div>
        </div>

        <!-- Preview Grid & Reordering -->
        <div v-if="uploadedImages.length> 0" class="mt-4">
          <p class="text-xs text-slate-500 dark:text-studio-400 mb-2">
            {{ isManga ? $t('staff.s176') : $t('staff.s177') }}
          </p>

          <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-56 overflow-y-auto p-2 rounded-xl bg-slate-100 dark:bg-studio-900/60 border border-slate-200 dark:border-white/5">
            <div
              v-for="(img, idx) in uploadedImages"
              :key="idx"
              class="relative group rounded-xl overflow-hidden bg-slate-100 dark:bg-studio-950 border border-slate-200 dark:border-white/10 aspect-[3/4] flex items-center justify-center"
            >
              <img :src="img" :alt="$t('staff.s178')" class="w-full h-full object-cover" />

              <!-- Order Index Badge -->
              <span class="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-white font-mono text-[10px] font-bold">
                #{{ idx + 1 }}
              </span>

              <!-- Action Controls Overlay -->
              <div class="absolute inset-0 bg-black/70 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                <button
                  v-if="idx> 0"
                  type="button"
                  class="p-1 rounded bg-studio-800 text-white hover:bg-brand-500 hover:text-black transition-colors"
                  :title="$t('staff.s179')"
                  @click.stop="moveImage(idx, -1)"
                >
                  ◀
                </button>
                <button
                  type="button"
                  class="p-1 rounded bg-rose-600/80 text-white hover:bg-rose-600 transition-colors"
                  :title="$t('staff.s132')" :aria-label="$t('staff.s132')"
                  @click.stop="removeImage(idx)"
                >
                  ✕
                </button>
                <button
                  v-if="idx < uploadedImages.length - 1"
                  type="button"
                  class="p-1 rounded bg-studio-800 text-white hover:bg-brand-500 hover:text-black transition-colors"
                  :title="$t('staff.s180')" :aria-label="$t('staff.s180')"
                  @click.stop="moveImage(idx, 1)"
                >
                  ▶
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Moderation Status Notice -->
      <div class="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-300 flex items-start gap-2.5">
        <svg class="w-4 h-4 text-brand-700 dark:text-brand-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="leading-relaxed">
          <strong> {{ $t('staff.s181') }} </strong> {{ $t('staff.s182') }} <code class="font-mono text-brand-700 dark:text-brand-400"> {{ $t('staff.s183') }} </code> {{ $t('staff.s184') }} {{ form.reward_coins }} {{ $t('staff.s185') }} </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/5">
        <Button variant="ghost" size="sm" :disabled="isSubmitting" @click="$refs.draftDialog.close()"> {{ $t('staff.s019') }} </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          :loading="isSubmitting"
          :disabled="isNovel ? (!form.content_text?.trim() && uploadedImages.length === 0) : uploadedImages.length === 0"
        >
          {{ isSubmitting ? $t('staff.s186') : (isNovel ? $t('staff.s187') : $t('staff.s188', { value0: uploadedImages.length })) }}
        </Button>
      </div>

      </fieldset>
    </form>
  </Modal>
</template>

<script setup>
import i18n from '../../i18n/index.js'
const tr = (...args) => i18n.global.t(...args)

import { reactive, ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { getErrorMessage, moveItem } from '../../utils/forms'
import Modal from '../common/Modal.vue'
import Button from '../common/Button.vue'
import { webtoonsApi } from '../../api/webtoons'

const props = defineProps({
  modelValue: Boolean,
  onUpload: { type: Function, required: true },
  preselectedChapterNumber: Number,
  preselectedWebtoonId: {
    type: Number,
    default: null
  },
  webtoons: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'upload-success'])

const isDragging = ref(false)
const isSubmitting = ref(false)
const submitError = ref('')
const uploadProgress = ref(0)
const fileInput = ref(null)
const novelTextarea = ref(null)
const activeEditorTab = ref('write')
const loadedWebtoons = ref([])

watch(() => props.modelValue, async open => {
  if (!open) return
  try {
    const items = []
    let page = 1, total = Infinity
    while (items.length < total) {
      const result = await webtoonsApi.getWebtoons({ page, limit: 100 })
      const batch = result.data?.items || []
      items.push(...batch)
      total = result.data?.total ?? items.length
      if (!batch.length) break
      page++
    }
    loadedWebtoons.value = items
    if (!form.webtoon_id && props.preselectedWebtoonId) form.webtoon_id = props.preselectedWebtoonId
  } catch (error) { submitError.value = getErrorMessage(error) }
})

const availableWebtoons = computed(() => {
  return loadedWebtoons.value.length ? loadedWebtoons.value : props.webtoons
})

const form = reactive({
  webtoon_id: props.preselectedWebtoonId ?? null,
  chapter_number: props.preselectedChapterNumber ?? 1,
  title: '',
  reward_coins: 5,
  content_text: ''
})

watch(
  () => props.preselectedWebtoonId,
  (val) => {
    if (val) form.webtoon_id = val
  }
)

watch(() => props.preselectedChapterNumber, value => {
  if (value != null && !form.title && !form.content_text && !uploadFiles.value.length) form.chapter_number = value
})

const currentWebtoon = computed(() => {
  return availableWebtoons.value.find((w) => w.id === form.webtoon_id)
})

watch(() => form.webtoon_id, async id => {
  if (!id || form.title || form.content_text || uploadFiles.value.length) return
  try {
    const result = await webtoonsApi.getWebtoon(id)
    const chapters = result.data?.chapters || []
    if (form.webtoon_id === id && !form.title && !form.content_text && !uploadFiles.value.length) {
      form.chapter_number = chapters.length ? Math.max(...chapters.map(ch => ch.chapter_number)) + 1 : 1
    }
  } catch (error) { submitError.value = getErrorMessage(error) }
})
const isNovel = computed(() => currentWebtoon.value?.type === 'novel')
const isManga = computed(() => currentWebtoon.value?.type === 'manga')

const wordCount = computed(() => {
  if (!form.content_text) return 0
  const words = form.content_text.trim().split(/\s+/)
  return words[0] === '' ? 0 : words.length
})

const charCount = computed(() => {
  return form.content_text ? form.content_text.length : 0
})

const renderedMarkdown = computed(() => {
  if (!form.content_text) return ''
  const escaped = form.content_text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return '<p class="mb-3 leading-relaxed">' + escaped
    .replace(/^### (.*$)/gim, '</p><h3 class="text-base font-bold text-slate-900 dark:text-white mt-4 mb-2">$1</h3><p class="mb-3 leading-relaxed">')
    .replace(/^## (.*$)/gim, '</p><h2 class="text-lg font-bold text-slate-900 dark:text-white mt-4 mb-2">$1</h2><p class="mb-3 leading-relaxed">')
    .replace(/^# (.*$)/gim, '</p><h1 class="text-xl font-extrabold text-brand-700 dark:text-brand-400 mt-4 mb-2 pb-1 border-b border-slate-200 dark:border-white/10">$1</h1><p class="mb-3 leading-relaxed">')
    .replace(/^\> (.*$)/gim, '</p><blockquote class="border-l-4 border-brand-500 pl-3 py-1 my-2 italic text-studio-300 bg-brand-500/10 rounded-r">$1</blockquote><p class="mb-3 leading-relaxed">')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-slate-800 dark:text-studio-200">$1</em>')
    .replace(/\n\n/g, '</p><p class="mb-3 leading-relaxed">')
    .replace(/\n/g, '<br/>') + '</p>'
})

function insertText(before, after = '') {
  const el = novelTextarea.value
  if (!el) {
    form.content_text += before + after
    return
  }
  const start = el.selectionStart
  const end = el.selectionEnd
  const text = form.content_text
  const selection = text.substring(start, end)
  const replacement = before + selection + after
  form.content_text = text.substring(0, start) + replacement + text.substring(end)
  setTimeout(() => {
    el.focus()
    el.setSelectionRange(start + before.length, end + before.length)
  }, 10)
}

// A single ordered record owns its File and preview; asynchronous reads cannot swap pages.
const uploadFiles = ref([])
const rawFiles = computed(() => uploadFiles.value.map(item => item.file))
const uploadedImages = computed(() => uploadFiles.value.map(item => item.url))
function handleDrop(event) { isDragging.value = false; processFiles([...event.dataTransfer.files]) }
function handleFileInput(event) { processFiles([...event.target.files]); event.target.value = '' }
function processFiles(files) {
  if (isSubmitting.value) return
  submitError.value = ''
  for (const file of files) {
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type) || file.size> 20 * 1024 * 1024) {
      submitError.value = tr('staff.s189'); continue
    }
    if (uploadFiles.value.length>= 100 || rawFiles.value.reduce((size, item) => size + item.size, 0) + file.size> 49 * 1024 * 1024) {
      submitError.value = tr('staff.s190'); break
    }
    uploadFiles.value.push({ file, url: URL.createObjectURL(file) })
  }
}
function moveImage(index, direction) { moveItem(uploadFiles.value, index, direction) }
function removeImage(index) { URL.revokeObjectURL(uploadFiles.value[index].url); uploadFiles.value.splice(index, 1) }
function clearImages() { uploadFiles.value.forEach(item => URL.revokeObjectURL(item.url)); uploadFiles.value = [] }
onUnmounted(clearImages)
async function handleSubmit() {
  if (isSubmitting.value || !form.webtoon_id || (!form.content_text?.trim() && !rawFiles.value.length)) return
  submitError.value = ''
  isSubmitting.value = true
  uploadProgress.value = 0
  try {
    await props.onUpload({ ...form, content_text: form.content_text, rawFiles: [...rawFiles.value] }, percent => { uploadProgress.value = percent ?? uploadProgress.value })
    clearImages()
    form.title = ''; form.content_text = ''; form.chapter_number += 1
    emit('update:modelValue', false)
  } catch (error) { submitError.value = getErrorMessage(error) }
  finally { isSubmitting.value = false }
}
</script>
