<template>
  <Modal
    :model-value="modelValue"
    :title="isNovel ? 'Yangi Novel Bobi Yuklash' : (isManga ? 'Manga Bobini Yuklash (RTL)' : 'Yangi Bob Rasmlarini Yuklash')"
    :description="isNovel ? 'Roman yoki ranobe bob matnini (Markdown) yozing yoki nusxalang' : (isManga ? 'Manga sahifalarini ketma-ket yuklang (O\'quvchi o\'ngdan-chapga RTL tartibida o\'qiydi)' : '20-50 tagacha vertikal komiks sahifalarini bir vaqtning o\'zida yuklash va tartiblash')"
    max-width="3xl"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form @submit.prevent="handleSubmit" class="space-y-5">
      <!-- Webtoon & Chapter Number -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <!-- Webtoon Selector -->
        <div class="sm:col-span-2">
          <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-1.5">
            Loyiha *
          </label>
          <select
            v-model="form.webtoon_id"
            required
            class="w-full px-3.5 py-2 text-sm bg-studio-900 border border-white/10 rounded-xl text-studio-100 focus:outline-none focus:border-brand-500/70"
          >
            <option v-for="w in availableWebtoons" :key="w.id" :value="w.id">
              [{{ (w.type || 'manhwa').toUpperCase() }}] {{ w.title }} (Mavjud boblar: {{ w.chapters_count || 0 }})
            </option>
          </select>
        </div>

        <!-- Chapter Number -->
        <div>
          <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-1.5">
            Bob Raqami *
          </label>
          <input
            v-model.number="form.chapter_number"
            type="number"
            step="0.1"
            min="0.1"
            required
            placeholder="1.0"
            class="w-full px-3.5 py-2 text-sm bg-studio-900 border border-white/10 rounded-xl text-studio-100 font-mono focus:outline-none focus:border-brand-500/70"
          />
        </div>
      </div>

      <!-- Chapter Title & Reward -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="sm:col-span-2">
          <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-1.5">
            Bob Sarlavhasi (Ixtiyoriy)
          </label>
          <input
            v-model="form.title"
            type="text"
            :placeholder="isNovel ? 'Masalan: 1-bob: Qirmizi Oy va Qonli Marosim' : 'Masalan: 3-bob: Birinchi amr'"
            class="w-full px-3.5 py-2 text-sm bg-studio-900 border border-white/10 rounded-xl text-studio-100 focus:outline-none focus:border-brand-500/70"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-1.5">
            Mukofot (⚡ Chaqmoq)
          </label>
          <input
            v-model.number="form.reward_coins"
            type="number"
            min="0"
            required
            class="w-full px-3.5 py-2 text-sm bg-studio-900 border border-white/10 rounded-xl text-brand-400 font-bold font-mono focus:outline-none focus:border-brand-500/70"
          />
        </div>
      </div>

      <!-- FORMAT SPECIFIC SECTIONS -->

      <!-- 1. NOVEL RICH TEXT / MARKDOWN EDITOR -->
      <div v-if="isNovel" class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-xs font-semibold text-studio-300 uppercase tracking-wider flex items-center gap-2">
            <span>📜 Novel Bob Matni (Markdown) *</span>
            <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[11px] font-bold border border-emerald-500/20">
              Ranobe
            </span>
          </label>

          <!-- Word / Char Count -->
          <span class="text-xs font-mono text-studio-400">
            <strong class="text-white">{{ wordCount }}</strong> so'z |
            <strong class="text-white">{{ charCount }}</strong> belgi
          </span>
        </div>

        <!-- Editor Toolbar -->
        <div class="flex flex-wrap items-center justify-between gap-2 p-2 bg-studio-900 rounded-t-xl border border-white/10 border-b-0">
          <div class="flex flex-wrap items-center gap-1">
            <button
              type="button"
              class="px-2 py-1 rounded text-xs font-mono text-studio-300 hover:text-white hover:bg-studio-800 transition-colors"
              title="Katta Sarlavha"
              @click="insertText('# ', '\n')"
            >
              H1
            </button>
            <button
              type="button"
              class="px-2 py-1 rounded text-xs font-mono text-studio-300 hover:text-white hover:bg-studio-800 transition-colors"
              title="Kichik Sarlavha"
              @click="insertText('## ', '\n')"
            >
              H2
            </button>
            <span class="text-white/20">|</span>
            <button
              type="button"
              class="px-2 py-1 rounded text-xs font-bold text-studio-300 hover:text-white hover:bg-studio-800 transition-colors"
              title="Qalin (Bold)"
              @click="insertText('**', '**')"
            >
              B
            </button>
            <button
              type="button"
              class="px-2 py-1 rounded text-xs italic text-studio-300 hover:text-white hover:bg-studio-800 transition-colors"
              title="Kursiv (Italic)"
              @click="insertText('*', '*')"
            >
              I
            </button>
            <button
              type="button"
              class="px-2 py-1 rounded text-xs text-studio-300 hover:text-white hover:bg-studio-800 transition-colors"
              title="Iqtibos"
              @click="insertText('> ', '\n')"
            >
              " "
            </button>
            <button
              type="button"
              class="px-2 py-1 rounded text-xs text-studio-300 hover:text-white hover:bg-studio-800 transition-colors"
              title="Dialog chizig'i"
              @click="insertText('— ')"
            >
              —
            </button>
            <button
              type="button"
              class="px-2 py-1 rounded text-xs text-studio-300 hover:text-white hover:bg-studio-800 transition-colors"
              title="Bo'lim ajratuvchi"
              @click="insertText('\n***\n')"
            >
              ***
            </button>
          </div>

          <!-- Edit / Preview Switcher -->
          <div class="flex items-center p-0.5 rounded-lg bg-studio-950 border border-white/5 text-xs">
            <button
              type="button"
              :class="[
                'px-2.5 py-0.5 rounded font-medium transition-colors',
                activeEditorTab === 'write' ? 'bg-brand-500 text-slate-950 font-bold' : 'text-studio-400 hover:text-white'
              ]"
              @click="activeEditorTab = 'write'"
            >
              Tahrirlash
            </button>
            <button
              type="button"
              :class="[
                'px-2.5 py-0.5 rounded font-medium transition-colors',
                activeEditorTab === 'preview' ? 'bg-brand-500 text-slate-950 font-bold' : 'text-studio-400 hover:text-white'
              ]"
              @click="activeEditorTab = 'preview'"
            >
              Ko'rish
            </button>
          </div>
        </div>

        <!-- Write Area or Preview Area -->
        <div v-show="activeEditorTab === 'write'">
          <textarea
            ref="novelTextarea"
            v-model="form.content_text"
            rows="12"
            placeholder="# 1-bob: Boshlanish&#10;&#10;Og'riq. Bosh suyagini parchalab yuboradigan darajada kuchli og'riq...&#10;&#10;— Bu qayer? — deb pichirladi u o'ziga o'zi.&#10;&#10;> Hayot kutilmagan sirlarga to'la edi..."
            class="w-full px-4 py-3 text-sm bg-studio-950 border border-white/10 rounded-b-xl text-studio-100 font-mono leading-relaxed focus:outline-none focus:border-brand-500/70 resize-y min-h-[220px]"
          />
        </div>

        <div
          v-show="activeEditorTab === 'preview'"
          class="p-4 bg-studio-950/80 border border-white/10 rounded-b-xl min-h-[220px] max-h-[360px] overflow-y-auto"
        >
          <div
            v-if="form.content_text?.trim()"
            class="prose prose-invert max-w-none text-sm text-studio-200"
            v-html="renderedMarkdown"
          />
          <p v-else class="text-xs text-studio-500 italic text-center pt-8">
            Matn kiritilmagan. "Tahrirlash" yorlig'iga o'tib matn yozing.
          </p>
        </div>
      </div>

      <!-- 2. IMAGE UPLOAD SECTION (Required for Manhwa/Manga, Optional for Novel) -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs font-semibold text-studio-300 uppercase tracking-wider flex items-center gap-2">
            <span>{{ isNovel ? 'Ixtiyoriy Illyustratsiyalar' : 'Sahifalar To\'plami' }} ({{ uploadedImages.length }} ta rasm tanlandi)</span>
            <span v-if="!isNovel" class="text-brand-400">*</span>
            <span v-else class="text-[10px] text-studio-400 font-normal">(Novel uchun majburiy emas)</span>
          </label>
          <button
            v-if="uploadedImages.length > 0"
            type="button"
            class="text-xs text-rose-400 hover:text-rose-300 transition-colors"
            @click="clearImages"
          >
            Hammasini tozalash
          </button>
        </div>

        <!-- Dropzone Container -->
        <div
          :class="[
            'border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer relative',
            isDragging
              ? 'border-brand-500 bg-brand-500/10'
              : 'border-white/15 hover:border-brand-500/50 bg-studio-900/40 hover:bg-studio-900/60'
          ]"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          @click="$refs.fileInput.click()"
        >
          <input
            ref="fileInput"
            type="file"
            multiple
            accept="image/*"
            class="hidden"
            @change="handleFileInput"
          />

          <div class="flex flex-col items-center justify-center gap-2">
            <div class="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p class="text-xs font-semibold text-studio-100">
                Rasmlarni bu yerga sudrab olib keling yoki <span class="text-brand-400 underline">fayllarni tanlang</span>
              </p>
              <p class="text-[11px] text-studio-400 mt-0.5">
                PNG, JPG, WebP formatlari. Rasmlar yuklangan tartibda saqlanadi.
              </p>
            </div>
          </div>
        </div>

        <!-- Preview Grid & Reordering -->
        <div v-if="uploadedImages.length > 0" class="mt-4">
          <p class="text-xs text-studio-400 mb-2">
            {{ isManga ? 'Manga sahifalari RTL (o\'ngdan-chapga) tartibida ochiladi:' : 'Tartib bo\'yicha vertikal skroll qilinadi. Sahifa tartibini o\'zgartirish:' }}
          </p>

          <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-56 overflow-y-auto p-2 rounded-xl bg-studio-900/60 border border-white/5">
            <div
              v-for="(img, idx) in uploadedImages"
              :key="idx"
              class="relative group rounded-xl overflow-hidden bg-studio-950 border border-white/10 aspect-[3/4] flex items-center justify-center"
            >
              <img :src="img" alt="Preview" class="w-full h-full object-cover" />

              <!-- Order Index Badge -->
              <span class="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-white font-mono text-[10px] font-bold">
                #{{ idx + 1 }}
              </span>

              <!-- Action Controls Overlay -->
              <div class="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                <button
                  v-if="idx > 0"
                  type="button"
                  class="p-1 rounded bg-studio-800 text-white hover:bg-brand-500 hover:text-black transition-colors"
                  title="Oldinga siljitish"
                  @click.stop="moveImage(idx, -1)"
                >
                  ◀
                </button>
                <button
                  type="button"
                  class="p-1 rounded bg-rose-600/80 text-white hover:bg-rose-600 transition-colors"
                  title="O'chirish"
                  @click.stop="removeImage(idx)"
                >
                  ✕
                </button>
                <button
                  v-if="idx < uploadedImages.length - 1"
                  type="button"
                  class="p-1 rounded bg-studio-800 text-white hover:bg-brand-500 hover:text-black transition-colors"
                  title="Keyinga siljitish"
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
        <svg class="w-4 h-4 text-brand-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="leading-relaxed">
          <strong>Moderatsiya zanjiri:</strong> Bob yuklangach avtomatik ravishda <code class="font-mono text-brand-400">pending</code> (kutilmoqda) holatida saqlanadi. Moderator tekshiruvidan o'tgach saytda ommaga e'lon qilinadi va o'quvchilarga +5 ⚡ Chaqmoq beradi.
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
        <Button variant="ghost" size="sm" @click="$emit('update:modelValue', false)">
          Bekor qilish
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          :loading="isSubmitting"
          :disabled="isNovel ? (!form.content_text?.trim() && uploadedImages.length === 0) : uploadedImages.length === 0"
        >
          {{ isSubmitting ? 'Yuklanmoqda...' : (isNovel ? 'Novel Bobini Saqlash' : `${uploadedImages.length} ta rasmni yuklash`) }}
        </Button>
      </div>
    </form>
  </Modal>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted } from 'vue'
import Modal from '../common/Modal.vue'
import Button from '../common/Button.vue'
import { webtoonsApi } from '../../api/webtoons'

const props = defineProps({
  modelValue: Boolean,
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
const fileInput = ref(null)
const novelTextarea = ref(null)
const activeEditorTab = ref('write')
const loadedWebtoons = ref([])

onMounted(async () => {
  if (!props.webtoons || props.webtoons.length === 0) {
    try {
      const res = await webtoonsApi.getWebtoons({ limit: 100 })
      loadedWebtoons.value = res.data?.items || res.data || []
    } catch (e) {
      console.error('Failed to load webtoons in ChapterUploadModal', e)
    }
  }
})

const availableWebtoons = computed(() => {
  if (props.webtoons && props.webtoons.length > 0) return props.webtoons
  return loadedWebtoons.value
})

const form = reactive({
  webtoon_id: props.preselectedWebtoonId || 1,
  chapter_number: 1.0,
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

const currentWebtoon = computed(() => {
  return availableWebtoons.value.find((w) => w.id === form.webtoon_id)
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
    .replace(/^### (.*$)/gim, '</p><h3 class="text-base font-bold text-white mt-4 mb-2">$1</h3><p class="mb-3 leading-relaxed">')
    .replace(/^## (.*$)/gim, '</p><h2 class="text-lg font-bold text-white mt-4 mb-2">$1</h2><p class="mb-3 leading-relaxed">')
    .replace(/^# (.*$)/gim, '</p><h1 class="text-xl font-extrabold text-brand-400 mt-4 mb-2 pb-1 border-b border-white/10">$1</h1><p class="mb-3 leading-relaxed">')
    .replace(/^\> (.*$)/gim, '</p><blockquote class="border-l-4 border-brand-500 pl-3 py-1 my-2 italic text-studio-300 bg-brand-500/10 rounded-r">$1</blockquote><p class="mb-3 leading-relaxed">')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-studio-200">$1</em>')
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

// Track real File objects alongside preview data URLs
const rawFiles = ref([])
const uploadedImages = ref([])

function handleDrop(e) {
  isDragging.value = false
  const files = Array.from(e.dataTransfer.files)
  processFiles(files)
}

function handleFileInput(e) {
  const files = Array.from(e.target.files)
  processFiles(files)
}

function processFiles(files) {
  files.forEach((file) => {
    if (file.type.startsWith('image/')) {
      rawFiles.value.push(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        uploadedImages.value.push(event.target.result)
      }
      reader.readAsDataURL(file)
    }
  })
}

function moveImage(index, dir) {
  const target = index + dir
  if (target < 0 || target >= uploadedImages.value.length) return
  const item = uploadedImages.value.splice(index, 1)[0]
  uploadedImages.value.splice(target, 0, item)
  if (rawFiles.value[index]) {
    const rawItem = rawFiles.value.splice(index, 1)[0]
    rawFiles.value.splice(target, 0, rawItem)
  }
}

function removeImage(index) {
  uploadedImages.value.splice(index, 1)
  if (rawFiles.value[index]) {
    rawFiles.value.splice(index, 1)
  }
}

function clearImages() {
  uploadedImages.value = []
  rawFiles.value = []
}

function handleSubmit() {
  if (isNovel.value) {
    if (!form.content_text?.trim() && uploadedImages.value.length === 0) return
  } else {
    if (uploadedImages.value.length === 0) return
  }

  isSubmitting.value = true

  setTimeout(() => {
    emit('upload-success', {
      webtoon_id: form.webtoon_id,
      chapter_number: form.chapter_number,
      title: form.title || `${form.chapter_number}-bob`,
      reward_coins: form.reward_coins,
      content_text: isNovel.value ? form.content_text : '',
      rawFiles: [...rawFiles.value],
      images: [...uploadedImages.value]
    })
    isSubmitting.value = false
    emit('update:modelValue', false)
  }, 400)
}
</script>
