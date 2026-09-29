<template>
  <Modal
    :model-value="modelValue"
    title="Bobni Tahrirlash"
    description="Bob ma'lumotlari, raqami, chop etilish statusi va sahifalarini o'zgartirish"
    max-width="3xl"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Chapter Number & Reward -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
            Bob Raqami *
          </label>
          <input
            v-model.number="form.chapter_number"
            type="number"
            step="0.1"
            min="0.1"
            required
            class="w-full px-3.5 py-2 text-sm bg-white dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 font-mono focus:outline-none focus:border-brand-500/70"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
            Holati (Status) *
          </label>
          <select
            v-model="form.status"
            class="w-full px-3.5 py-2 text-sm bg-white dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70"
          >
            <option value="published">Chop etilgan (Published)</option>
            <option value="pending">Moderatsiyada (Pending)</option>
            <option value="rejected">Rad etilgan (Rejected)</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
            Mukofot (⚡ Chaqmoq) *
          </label>
          <input
            v-model.number="form.reward_coins"
            type="number"
            min="0"
            required
            class="w-full px-3.5 py-2 text-sm bg-white dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-brand-600 dark:text-brand-400 font-bold font-mono focus:outline-none focus:border-brand-500/70"
          />
        </div>
      </div>

      <!-- Chapter Title -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
          Bob Sarlavhasi
        </label>
        <input
          v-model="form.title"
          type="text"
          placeholder="Masalan: 1-bob: D-darajali xandaqdagi fojia"
          class="w-full px-3.5 py-2 text-sm bg-white dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70"
        />
      </div>

      <!-- Novel Text Content Section -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider">
            📜 Novel Bob Matni (Markdown)
          </label>
          <div class="flex items-center gap-3">
            <span v-if="form.content_text" class="text-xs font-mono text-studio-400">
              {{ wordCount }} so'z
            </span>
            <button
              v-if="!showTextEditor && !form.content_text"
              type="button"
              class="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline"
              @click="showTextEditor = true"
            >
              + Matn kiritish (Novel)
            </button>
          </div>
        </div>
        <textarea
          v-if="showTextEditor || form.content_text"
          v-model="form.content_text"
          rows="8"
          placeholder="Novel matnini shu yerga yozing yoki tahrirlang (Markdown qo'llab-quvvatlanadi)..."
          class="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-studio-950 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 font-mono leading-relaxed focus:outline-none focus:border-brand-500/70"
        />
      </div>

      <!-- Images Management Section -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider">
            Sahifalar Ro'yxati ({{ form.images.length }} ta rasm)
          </label>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold"
              @click="addImageUrl"
            >
              + Rasm URL qo'shish
            </button>
          </div>
        </div>

        <!-- Thumbnails Grid with Reorder/Delete -->
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-56 overflow-y-auto p-2.5 rounded-xl bg-slate-100 dark:bg-studio-900/60 border border-slate-200 dark:border-white/5">
          <div
            v-for="(img, idx) in form.images"
            :key="idx"
            class="relative group rounded-xl overflow-hidden bg-slate-900 dark:bg-studio-950 border border-slate-300 dark:border-white/10 aspect-[3/4] flex items-center justify-center shadow-sm"
          >
            <img :src="img" alt="Page" class="w-full h-full object-cover" />

            <span class="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-white font-mono text-[10px] font-bold">
              #{{ idx + 1 }}
            </span>

            <!-- Actions -->
            <div class="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
              <button
                v-if="idx > 0"
                type="button"
                class="p-1 rounded bg-studio-800 text-white hover:bg-brand-500 hover:text-black transition-colors"
                title="Oldinga"
                @click="moveImage(idx, -1)"
              >
                ◀
              </button>
              <button
                type="button"
                class="p-1 rounded bg-rose-600 text-white hover:bg-rose-500 transition-colors"
                title="O'chirish"
                @click="removeImage(idx)"
              >
                ✕
              </button>
              <button
                v-if="idx < form.images.length - 1"
                type="button"
                class="p-1 rounded bg-studio-800 text-white hover:bg-brand-500 hover:text-black transition-colors"
                title="Keyinga"
                @click="moveImage(idx, 1)"
              >
                ▶
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/5">
        <Button variant="ghost" size="sm" @click="$emit('update:modelValue', false)">
          Bekor qilish
        </Button>
        <Button type="submit" variant="primary" size="sm" :loading="isSubmitting">
          O'zgarishlarni Saqlash
        </Button>
      </div>
    </form>
  </Modal>
</template>

<script setup>
import { reactive, watch, ref, computed } from 'vue'
import Modal from '../common/Modal.vue'
import Button from '../common/Button.vue'

const props = defineProps({
  modelValue: Boolean,
  chapter: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'save'])

const isSubmitting = ref(false)
const showTextEditor = ref(false)

const form = reactive({
  chapter_number: 1.0,
  title: '',
  reward_coins: 5,
  status: 'published',
  content_text: '',
  images: []
})

const wordCount = computed(() => {
  if (!form.content_text) return 0
  const words = form.content_text.trim().split(/\s+/)
  return words[0] === '' ? 0 : words.length
})

watch(
  () => props.chapter,
  (ch) => {
    if (ch) {
      form.chapter_number = ch.chapter_number
      form.title = ch.title || ''
      form.reward_coins = ch.reward_coins || 5
      form.status = ch.status || 'published'
      form.content_text = ch.content_text || ''
      showTextEditor.value = !!ch.content_text
      form.images = ch.images ? [...ch.images] : []
    }
  },
  { immediate: true }
)

function moveImage(index, dir) {
  const target = index + dir
  if (target < 0 || target >= form.images.length) return
  const item = form.images.splice(index, 1)[0]
  form.images.splice(target, 0, item)
}

function removeImage(index) {
  form.images.splice(index, 1)
}

function addImageUrl() {
  const url = prompt('Yangi rasm URL manzilini kiriting:')
  if (url && url.trim()) {
    form.images.push(url.trim())
  }
}

function handleSubmit() {
  isSubmitting.value = true
  setTimeout(() => {
    emit('save', {
      id: props.chapter?.id,
      ...form
    })
    isSubmitting.value = false
    emit('update:modelValue', false)
  }, 350)
}
</script>
