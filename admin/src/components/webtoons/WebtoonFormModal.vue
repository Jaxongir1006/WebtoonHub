<template>
  <Modal ref="draftDialog" :draft="form"
    :busy="isSubmitting"
    :model-value="modelValue"
    :title="isEdit ? $t('staff.s215') : $t('staff.s216')"
    :description="$t('staff.s217')"
    max-width="2xl"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form @submit.prevent="handleSubmit">
      <fieldset :disabled="isSubmitting" class="space-y-4">
      <p v-if="submitError" role="alert" class="text-sm text-rose-600 dark:text-rose-300">{{ submitError }}</p>
      <!-- Content Format / Type -->
      <div role="group" aria-labelledby="webtoon-format-label">
        <p id="webtoon-format-label" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-2"> {{ $t('staff.s218') }} </p>
        <div class="grid grid-cols-3 gap-3">
          <button
            type="button"
            :aria-pressed="form.type === 'manhwa'"
            :class="[
              'p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1',
              form.type === 'manhwa'
                ? 'border-indigo-500/80 bg-indigo-500/15 text-indigo-900 dark:text-white shadow-sm ring-1 ring-indigo-500/50'
                : 'border-slate-300 dark:border-white/10 bg-slate-100/60 dark:bg-studio-900/60 text-slate-600 dark:text-studio-400 hover:border-white/20 hover:text-slate-900 dark:hover:text-studio-200'
            ]"
            @click="form.type = 'manhwa'"
          >
            <div class="flex items-center gap-1.5 font-bold text-xs">
              <span>📱</span> {{ $t('staff.s219') }} </div>
            <p class="text-[10px] text-slate-500 dark:text-studio-400"> {{ $t('staff.s220') }} </p>
          </button>

          <button
            type="button"
            :aria-pressed="form.type === 'manga'"
            :class="[
              'p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1',
              form.type === 'manga'
                ? 'border-rose-500/80 bg-rose-500/15 text-rose-900 dark:text-white shadow-sm ring-1 ring-rose-500/50'
                : 'border-slate-300 dark:border-white/10 bg-slate-100/60 dark:bg-studio-900/60 text-slate-600 dark:text-studio-400 hover:border-white/20 hover:text-slate-900 dark:hover:text-studio-200'
            ]"
            @click="form.type = 'manga'"
          >
            <div class="flex items-center gap-1.5 font-bold text-xs">
              <span>📖</span> {{ $t('staff.s221') }} </div>
            <p class="text-[10px] text-slate-500 dark:text-studio-400"> {{ $t('staff.s222') }} </p>
          </button>

          <button
            type="button"
            :aria-pressed="form.type === 'novel'"
            :class="[
              'p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1',
              form.type === 'novel'
                ? 'border-emerald-500/80 bg-emerald-500/15 text-emerald-900 dark:text-white shadow-sm ring-1 ring-emerald-500/50'
                : 'border-slate-300 dark:border-white/10 bg-slate-100/60 dark:bg-studio-900/60 text-slate-600 dark:text-studio-400 hover:border-white/20 hover:text-slate-900 dark:hover:text-studio-200'
            ]"
            @click="form.type = 'novel'"
          >
            <div class="flex items-center gap-1.5 font-bold text-xs">
              <span>📜</span> {{ $t('staff.s223') }} </div>
            <p class="text-[10px] text-slate-500 dark:text-studio-400"> {{ $t('staff.s224') }} </p>
          </button>
        </div>
      </div>

      <!-- Title -->
      <div>
        <label for="WebtoonFormModal-field-1" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5"> {{ $t('staff.s225') }} </label>
        <input
          id="WebtoonFormModal-field-1"
          v-model="form.title"
          type="text"
          required
          :placeholder="$t('staff.s226')"
          class="w-full px-3.5 py-2 text-sm bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70 focus:ring-1 focus:ring-brand-500/50"
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Author Name -->
        <div>
          <label for="WebtoonFormModal-field-2" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5"> {{ $t('staff.s227') }} </label>
          <input
            id="WebtoonFormModal-field-2"
            v-model="form.author_name"
            type="text"
            :placeholder="$t('staff.s228')"
            class="w-full px-3.5 py-2 text-sm bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70"
          />
        </div>

        <!-- Status -->
        <div>
          <label for="WebtoonFormModal-field-3" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5"> {{ $t('staff.s229') }} </label>
          <select
            id="WebtoonFormModal-field-3"
            v-model="form.status"
            class="w-full px-3.5 py-2 text-sm bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70"
          >
            <option value="ongoing"> {{ $t('staff.s230') }} </option>
            <option value="completed"> {{ $t('staff.s231') }} </option>
          </select>
        </div>
      </div>

      <!-- Genres Multi-Select -->
      <div role="group" aria-labelledby="webtoon-genres-label">
        <p id="webtoon-genres-label" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5"> {{ $t('staff.s232') }} </p>
        <div class="flex flex-wrap gap-2 p-3 bg-slate-100 dark:bg-studio-900/50 rounded-xl border border-slate-200 dark:border-white/5">
          <p v-if="availableGenres.length === 0" class="text-xs text-slate-500 dark:text-studio-400"> {{ $t('staff.s233') }} </p>
          <button
            v-for="genre in availableGenres"
            :key="genre.id"
            type="button"
            :aria-pressed="form.genre_ids.includes(genre.id)"
            :class="[
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
              form.genre_ids.includes(genre.id)
                ? 'bg-brand-500 text-slate-950 font-semibold shadow-sm'
                : 'bg-slate-100 dark:bg-studio-800 text-slate-700 dark:text-studio-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-studio-700'
            ]"
            @click="toggleGenre(genre.id)"
          >
            {{ genre.name }}
          </button>
        </div>
      </div>

      <!-- Description -->
      <div>
        <label for="WebtoonFormModal-field-4" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5"> {{ $t('staff.s234') }} </label>
        <textarea
          id="WebtoonFormModal-field-4"
          v-model="form.description"
          rows="3"
          :placeholder="$t('staff.s235')"
          class="w-full px-3.5 py-2 text-sm bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70"
        />
      </div>

      <!-- Cover Image Upload & Preview -->
      <div>
        <label for="WebtoonFormModal-label-6757" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5"> {{ $t('staff.s236') }} </label>
        <div class="flex items-start gap-4">
          <!-- Thumbnail preview -->
          <div class="w-24 h-32 rounded-xl bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/10 overflow-hidden shrink-0 flex items-center justify-center relative">
            <img
              v-if="form.cover_image_url"
              :src="form.cover_image_url"
              :alt="$t('staff.s237')"
              class="w-full h-full object-cover"
            />
            <div v-else class="text-center p-2 text-slate-500 dark:text-studio-400 text-[10px]"> {{ $t('staff.s238') }} </div>
          </div>

          <div class="flex-1 space-y-2">
            <div
              class="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors border-slate-200 dark:border-white/15 hover:border-brand-500/50 bg-slate-100 dark:bg-studio-950/60"
              @click="$refs.coverFileInput.click()"
            >
              <input id="WebtoonFormModal-label-6757"
                ref="coverFileInput"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                class="hidden"
                @change="handleFileUpload"
              />
              <div class="flex flex-col items-center justify-center gap-1.5">
                <svg class="w-6 h-6 text-brand-700 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span class="text-xs font-semibold text-slate-800 dark:text-studio-200">
                  {{ form.cover_image_file ? form.cover_image_file.name : $t('staff.s239') }}
                </span>
                <span class="text-[11px] text-slate-500 dark:text-studio-400"> {{ $t('staff.s240') }} </span>
              </div>
            </div>
            <div v-if="form.cover_image_url" class="flex items-center justify-between text-xs text-slate-500 dark:text-studio-400">
              <span class="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1"> {{ $t('staff.s241') }} </span>
              <button
                type="button"
                class="text-rose-700 dark:text-rose-400 hover:text-rose-300 font-semibold"
                @click="form.cover_image_url = ''; form.cover_image_file = null"
              > {{ $t('staff.s132') }} </button>
            </div>
          </div>
        </div>
      </div>

      <p v-if="formError" class="text-xs text-rose-700 dark:text-rose-400">{{ formError }}</p>

      <!-- Action Buttons -->
      <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/5">
        <Button variant="ghost" size="sm" :disabled="isSubmitting" @click="$refs.draftDialog.close()"> {{ $t('staff.s019') }} </Button>
        <Button type="submit" variant="primary" size="sm" :loading="isSubmitting">
          {{ isEdit ? $t('staff.s077') : $t('staff.s242') }}
        </Button>
      </div>

      </fieldset>
    </form>
  </Modal>
</template>

<script setup>
import i18n from '../../i18n/index.js'
const tr = (...args) => i18n.global.t(...args)

import { reactive, watch, ref, computed, onMounted } from 'vue'
import { getErrorMessage } from '../../utils/forms'
import Modal from '../common/Modal.vue'
import Button from '../common/Button.vue'
import { webtoonsApi } from '../../api/webtoons'

const props = defineProps({
  modelValue: Boolean,
  onSave: { type: Function, required: true },
  webtoon: {
    type: Object,
    default: null
  },
  genres: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'save'])

const isEdit = ref(false)
const isSubmitting = ref(false)
const submitError = ref('')
const formError = ref('')
const loadedGenres = ref([])

watch(() => props.modelValue, async open => {
  if (!open) return
  submitError.value = ''

  if (!props.genres?.length) {
    try {
      const res = await webtoonsApi.getGenres()
      loadedGenres.value = res.data || []
    } catch (e) {
      submitError.value = getErrorMessage(e)
    }
  }
})

const availableGenres = computed(() => {
  if (props.genres && props.genres.length> 0) return props.genres
  return loadedGenres.value
})

const form = reactive({
  title: '',
  type: 'manhwa',
  author_name: '',
  status: 'ongoing',
  description: '',
  genre_ids: [],
  cover_image_url: '',
  cover_image_file: null
})

watch(
  () => [props.webtoon, props.modelValue],
  ([val, open]) => {
    if (!open) return
    submitError.value = ''
    formError.value = ''
    if (val) {
      isEdit.value = true
      form.title = val.title || ''
      form.type = val.type || 'manhwa'
      form.author_name = val.author_name || ''
      form.status = val.status || 'ongoing'
      form.description = val.description || ''
      form.genre_ids = val.genre_ids ? [...val.genre_ids] : []
      form.cover_image_url = val.cover_image_url || ''
      form.cover_image_file = null
    } else {
      isEdit.value = false
      form.title = ''
      form.type = 'manhwa'
      form.author_name = ''
      form.status = 'ongoing'
      form.description = ''
      form.genre_ids = []
      form.cover_image_url = ''
      form.cover_image_file = null
    }
  },
  { immediate: true }
)

function toggleGenre(id) {
  const index = form.genre_ids.indexOf(id)
  if (index> -1) {
    form.genre_ids.splice(index, 1)
  } else {
    form.genre_ids.push(id)
  }
}

function handleFileUpload(e) {
  const file = e.target.files[0]
  if (file) {
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type) || file.size> 20 * 1024 * 1024) { formError.value = tr('staff.s135'); return }
    form.cover_image_file = file
    const reader = new FileReader()
    reader.onload = (event) => {
      form.cover_image_url = event.target.result
    }
    reader.readAsDataURL(file)
  }
}

async function handleSubmit() {
  if (isSubmitting.value) return
  submitError.value = ''
  formError.value = ''
  if (!isEdit.value && !form.cover_image_file) {
    formError.value = tr('staff.s243')
    return
  }
  isSubmitting.value = true
  try {
    await props.onSave({ ...form, id: props.webtoon?.id })
    emit('update:modelValue', false)
  } catch (error) {
    submitError.value = getErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>
