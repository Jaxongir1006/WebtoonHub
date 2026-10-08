<template>
  <Modal ref="draftDialog" :draft="form"
    :busy="isSubmitting"
    :model-value="modelValue"
    :title="$t('staff.s113')"
    :description="$t('staff.s114')"
    max-width="3xl"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form @submit.prevent="handleSubmit">
      <fieldset :disabled="isSubmitting" class="space-y-4">
      <p v-if="submitError" role="alert" class="text-sm text-rose-600 dark:text-rose-300">{{ submitError }}</p>
      <!-- Chapter Number & Reward -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label for="ChapterEditModal-field-1" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5"> {{ $t('staff.s115') }} </label>
          <input
            id="ChapterEditModal-field-1"
            v-model.number="form.chapter_number"
            type="number"
            step="0.1"
            min="0.1"
            required
            class="w-full px-3.5 py-2 text-sm bg-white dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 font-mono focus:outline-none focus:border-brand-500/70"
          />
        </div>

        <div>
          <label for="ChapterEditModal-field-2" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5"> {{ $t('staff.s116') }} </label>
          <select
            id="ChapterEditModal-field-2"
            v-model="form.status" :disabled="!auth.hasPermission('chapters:approve')"
            class="w-full px-3.5 py-2 text-sm bg-white dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70"
          >
            <option value="published"> {{ $t('staff.s117') }} </option>
            <option value="pending"> {{ $t('staff.s118') }} </option>
            <option value="rejected"> {{ $t('staff.s119') }} </option>
          </select>
        </div>

        <div>
          <label for="ChapterEditModal-field-3" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5"> {{ $t('staff.s120') }} </label>
          <input
            id="ChapterEditModal-field-3"
            v-model.number="form.reward_coins"
            type="number"
            min="0"
            required
            class="w-full px-3.5 py-2 text-sm bg-white dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-brand-700 dark:text-brand-400 font-bold font-mono focus:outline-none focus:border-brand-500/70"
          />
        </div>
      </div>

      <!-- Chapter Title -->
      <div>
        <label for="ChapterEditModal-field-4" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5"> {{ $t('staff.s121') }} </label>
        <input
          id="ChapterEditModal-field-4"
          v-model="form.title"
          type="text"
          :placeholder="$t('staff.s122')"
          class="w-full px-3.5 py-2 text-sm bg-white dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70"
        />
      </div>

      <!-- Novel Text Content Section -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label for="ChapterEditModal-label-3327" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider"> {{ $t('staff.s123') }} </label>
          <div class="flex items-center gap-3">
            <span v-if="form.content_text" class="text-xs font-mono text-slate-500 dark:text-studio-400">
              {{ wordCount }} {{ $t('staff.s124') }} </span>
            <button
              v-if="!showTextEditor && !form.content_text"
              type="button"
              class="text-xs text-brand-700 dark:text-brand-400 font-semibold hover:underline"
              @click="showTextEditor = true"
            > {{ $t('staff.s125') }} </button>
          </div>
        </div>
        <textarea id="ChapterEditModal-label-3327"
          v-if="showTextEditor || form.content_text"
          v-model="form.content_text"
          rows="8"
          :placeholder="$t('staff.s126')" :aria-label="$t('staff.s126')"
          class="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-studio-950 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 font-mono leading-relaxed focus:outline-none focus:border-brand-500/70"
        />
      </div>

      <!-- Images Management Section -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label for="ChapterEditModal-label-4593" class="text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider"> {{ $t('staff.s127') }} {{ form.images.length }} {{ $t('staff.s128') }} </label>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="text-xs text-brand-700 dark:text-brand-400 hover:underline font-semibold"
              @click="$refs.pageInput.click()"
            > {{ $t('staff.s129') }} </button>
          </div>
        </div>

        <input id="ChapterEditModal-label-4593" ref="pageInput" type="file" class="sr-only" multiple accept="image/jpeg,image/png,image/webp,image/gif" @change="addImages" />
        <p class="text-xs text-slate-500">{{ $t('common.new_pages_append') }}</p>
        <!-- Thumbnails Grid with Reorder/Delete -->
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-56 overflow-y-auto p-2.5 rounded-xl bg-slate-100 dark:bg-studio-900/60 border border-slate-200 dark:border-white/5">
          <div
            v-for="(img, idx) in form.images"
            :key="idx"
            class="relative group rounded-xl overflow-hidden bg-slate-900 dark:bg-studio-950 border border-slate-300 dark:border-white/10 aspect-[3/4] flex items-center justify-center shadow-sm"
          >
            <img :src="img.image_url || img" :alt="$t('staff.s130')" class="w-full h-full object-cover" />

            <span class="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-white font-mono text-[10px] font-bold">
              #{{ idx + 1 }}
            </span>

            <!-- Actions -->
            <div class="absolute inset-0 bg-black/75 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
              <button
                v-if="idx> 0"
                type="button"
                class="p-1 rounded bg-studio-800 text-white hover:bg-brand-500 hover:text-black transition-colors"
                :title="$t('staff.s131')"
                @click="moveImage(idx, -1)"
              >
                ◀
              </button>
              <button
                type="button"
                class="p-1 rounded bg-rose-600 text-white hover:bg-rose-500 transition-colors"
                :title="$t('staff.s132')" :aria-label="$t('staff.s132')"
                @click="removeImage(idx)"
              >
                ✕
              </button>
              <button
                v-if="idx < form.images.length - 1"
                type="button"
                class="p-1 rounded bg-studio-800 text-white hover:bg-brand-500 hover:text-black transition-colors"
                :title="$t('staff.s133')" :aria-label="$t('staff.s133')"
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
        <Button variant="ghost" size="sm" :disabled="isSubmitting" @click="$refs.draftDialog.close()"> {{ $t('staff.s019') }} </Button>
        <Button type="submit" variant="primary" size="sm" :loading="isSubmitting"> {{ $t('staff.s134') }} </Button>
      </div>

      </fieldset>
    </form>
  </Modal>
</template>

<script setup>
import i18n from '../../i18n/index.js'
const tr = (...args) => i18n.global.t(...args)

import { reactive, watch, ref, computed, onUnmounted } from 'vue'
import { getErrorMessage } from '../../utils/forms'
import { draftFingerprint } from '../../utils/drafts'
import { useAuthStore } from '../../stores/auth'
import Modal from '../common/Modal.vue'
import Button from '../common/Button.vue'

const auth = useAuthStore()
const newFiles = ref([])
let uploadBatchKey = crypto.randomUUID()
let submittedFingerprint = ''
const props = defineProps({
  modelValue: Boolean,
  onSave: { type: Function, required: true },
  chapter: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'save'])

const isSubmitting = ref(false)
const submitError = ref('')
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
  () => [props.chapter, props.modelValue],
  ([ch, open]) => {
    if (!open) return
    submitError.value = ''
    if (ch) {
      form.chapter_number = ch.chapter_number
      form.title = ch.title || ''
      form.reward_coins = ch.reward_coins ?? 5
      form.status = ch.status || 'published'
      form.content_text = ch.content_text || ''
      showTextEditor.value = !!ch.content_text
      newFiles.value.forEach(item => URL.revokeObjectURL(item.image_url)); newFiles.value = []
      form.images = ch.images ? ch.images.map(img => ({ ...img })) : []
    }
  },
  { immediate: true }
)

function moveImage(index, dir) {
  const target = index + dir
  if (target < 0 || target>= form.images.length || Boolean(form.images[index].id) !== Boolean(form.images[target].id)) return
  const item = form.images.splice(index, 1)[0]
  form.images.splice(target, 0, item)
  if (item.file) uploadBatchKey = crypto.randomUUID()
}

function removeImage(index) {
  const image = form.images[index]
  if (image?.file) {
    uploadBatchKey = crypto.randomUUID()
    URL.revokeObjectURL(image.image_url)
    newFiles.value = newFiles.value.filter(item => item !== image)
  }
  form.images.splice(index, 1)
}

function addImages(event) {
  uploadBatchKey = crypto.randomUUID()
  for (const file of event.target.files) {
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type) || file.size> 20 * 1024 * 1024) { submitError.value = tr('staff.s135'); continue }
    if (form.images.length>= 100 || newFiles.value.reduce((size, item) => size + item.file.size, 0) + file.size> 49 * 1024 * 1024) { submitError.value = tr('staff.s136'); break }
    const item = { file, image_url: URL.createObjectURL(file) }
    newFiles.value.push(item); form.images.push(item)
  }
  event.target.value = ''
}
onUnmounted(() => newFiles.value.forEach(item => URL.revokeObjectURL(item.image_url)))

async function handleSubmit() {
  if (isSubmitting.value) return
  submitError.value = ''
  isSubmitting.value = true
  try {
    const payload = {
      id: props.chapter?.id,
      chapter_number: form.chapter_number, title: form.title, reward_coins: form.reward_coins, content_text: form.content_text,
      ...(auth.hasPermission('chapters:approve') ? {status: form.status} : {}),
      image_ids: form.images.filter(image => image.id).map(image => image.id),
      newFiles: form.images.filter(image => image.file).map(image => image.file)
    }
    const fingerprint = draftFingerprint(payload)
    if (fingerprint !== submittedFingerprint) { uploadBatchKey = crypto.randomUUID(); submittedFingerprint = fingerprint }
    await props.onSave({ ...payload, uploadBatchKey })
    emit('update:modelValue', false)
  } catch (error) {
    submitError.value = getErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>
