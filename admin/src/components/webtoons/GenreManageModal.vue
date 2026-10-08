<template>
  <Modal ref="draftDialog" :draft="form" :busy="isSubmitting"
    :model-value="modelValue"
    :title="$t('staff.s191')"
    :description="$t('staff.s192')"
    max-width="lg"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <LoadState :error="loadError" @retry="loadGenres" />
    <div class="space-y-6">
      <!-- Create or Edit Form -->
      <div class="p-4 rounded-2xl bg-slate-100/80 dark:bg-studio-900 border border-slate-200 dark:border-white/10 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-800 dark:text-studio-200 uppercase tracking-wider">
            {{ editingGenreId ? $t('staff.s193') : $t('staff.s194') }}
          </span>
          <button
            v-if="editingGenreId"
            type="button"
            :disabled="isSubmitting"
            class="text-xs text-slate-500 dark:text-studio-400 hover:text-slate-700 dark:hover:text-white"
            @click="cancelEdit"
          > {{ $t('staff.s019') }} </button>
        </div>

        <form @submit.prevent="handleSave">
      <fieldset :disabled="isSubmitting" class="space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="GenreManageModal-field-1" class="block text-[11px] font-semibold text-slate-600 dark:text-studio-400 mb-1"> {{ $t('staff.s195') }} </label>
              <input
                id="GenreManageModal-field-1"
                v-model="form.name"
                type="text"
                required
                :placeholder="$t('staff.s196')"
                class="w-full px-3 py-2 text-xs bg-white dark:bg-studio-850 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500"
                @input="onNameInput"
              />
            </div>

            <div>
              <label for="GenreManageModal-field-2" class="block text-[11px] font-semibold text-slate-600 dark:text-studio-400 mb-1"> {{ $t('staff.s197') }} </label>
              <input
                id="GenreManageModal-field-2"
                v-model="form.slug"
                type="text"
                required
                :placeholder="$t('staff.s198')"
                class="w-full px-3 py-2 text-xs bg-white dark:bg-studio-850 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 font-mono focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-1">
            <Button
              type="submit"
              variant="primary"
              size="xs"
              :loading="isSubmitting"
            >
              {{ editingGenreId ? $t('staff.s061') : $t('staff.s199') }}
            </Button>
          </div>

      </fieldset>
    </form>
      </div>

      <!-- Genres List Table -->
      <div class="space-y-2">
        <div class="flex items-center justify-between text-xs text-slate-500 dark:text-studio-400 px-1 font-mono">
          <span> {{ $t('staff.s200') }} </span>
          <span> {{ $t('staff.s201') }} <strong>{{ genres.length }}</strong> {{ $t('staff.s202') }} </span>
        </div>

        <div class="max-h-80 overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden divide-y divide-slate-100 dark:divide-white/5">
          <div
            v-for="genre in genres"
            :key="genre.id"
            class="p-3.5 flex items-center justify-between gap-3 bg-white dark:bg-studio-900/60 hover:bg-slate-50 dark:hover:bg-studio-850/50 transition-colors"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {{ genre.name }}
                </span>
                <Badge variant="default" size="xs">
                  {{ (genre.webtoon_count ?? 0) }} {{ $t('staff.s203') }} </Badge>
              </div>
              <span class="text-xs font-mono text-slate-600 dark:text-studio-400 dark:text-studio-500"> {{ $t('staff.s204') }} {{ genre.slug }}
              </span>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                :disabled="isSubmitting"
                class="p-1.5 text-xs text-brand-700 dark:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-colors font-medium"
                :title="$t('staff.s164')" :aria-label="$t('staff.s164')"
                @click="startEdit(genre)"
              > {{ $t('staff.s205') }} </button>
              <button
                type="button"
                :disabled="isSubmitting"
                class="p-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors font-medium"
                :title="$t('staff.s132')" :aria-label="$t('staff.s132')"
                @click="handleDelete(genre)"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup>
import i18n from '../../i18n/index.js'
const tr = (...args) => i18n.global.t(...args)

import { reactive, ref, onMounted, watch } from 'vue'
import { webtoonsApi } from '../../api/webtoons'
import { useSystemStore } from '../../stores/system'
import LoadState from '../common/LoadState.vue'
import { getErrorMessage } from '../../utils/forms'
import Modal from '../common/Modal.vue'
import Button from '../common/Button.vue'
import Badge from '../common/Badge.vue'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'changed'])
const systemStore = useSystemStore()

const loadError = ref('')
const isSubmitting = ref(false)
const editingGenreId = ref(null)
const genres = ref([])

const form = reactive({
  name: '',
  slug: ''
})

async function loadGenres() {
  loadError.value = ''
  try {
    const res = await webtoonsApi.getGenres()
    genres.value = res.data || []
  } catch (err) {
    loadError.value = getErrorMessage(err)
  }
}

onMounted(() => {
  loadGenres()
})

function onNameInput() {
  if (!editingGenreId.value) {
    form.slug = form.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }
}

function startEdit(genre) {
  editingGenreId.value = genre.id
  form.name = genre.name
  form.slug = genre.slug
}

function cancelEdit() {
  editingGenreId.value = null
  form.name = ''
  form.slug = ''
}

async function handleSave() {
  if (isSubmitting.value) return
  loadError.value = ''
  isSubmitting.value = true
  try {
    if (editingGenreId.value) {
      await webtoonsApi.updateGenre(editingGenreId.value, {
        name: form.name,
        slug: form.slug
      })
      systemStore.addToast({
        type: 'success',
        title: tr('staff.s206'),
        message: tr('staff.s207', { value0: form.name })
      })
    } else {
      await webtoonsApi.createGenre({
        name: form.name,
        slug: form.slug
      })
      systemStore.addToast({
        type: 'success',
        title: tr('staff.s208'),
        message: tr('staff.s209', { value0: form.name })
      })
    }
    cancelEdit()
    await loadGenres()
    emit('changed')
  } catch (err) {
    loadError.value = getErrorMessage(err)
    systemStore.addToast({
      type: 'error',
      title: tr('staff.s024'),
      message: err.message || tr('staff.s210')
    })
  } finally {
    isSubmitting.value = false
  }
}

async function handleDelete(genre) {
  if (isSubmitting.value) return
  if (!confirm(tr('staff.s211', { value0: genre.name }))) {
    return
  }

  isSubmitting.value = true
  try {
    await webtoonsApi.deleteGenre(genre.id)
    if (editingGenreId.value === genre.id) {
      cancelEdit()
    }
    systemStore.addToast({
      type: 'success',
      title: tr('staff.s212'),
      message: tr('staff.s213', { value0: genre.name })
    })
    await loadGenres()
    emit('changed')
  } catch (err) {
    loadError.value = getErrorMessage(err)
    systemStore.addToast({
      type: 'error',
      title: tr('staff.s024'),
      message: err.response?.data?.detail || err.message || tr('staff.s214')
    })
  } finally {
    isSubmitting.value = false
  }
}
watch(() => props.modelValue, open => { if (open) loadGenres() })
</script>
