<template>
  <Modal
    :model-value="modelValue"
    title="🏷 Janrlarni Boshqarish"
    description="Platformadagi manhvalar uchun janrlar katalogini yaratish, tahrirlash va o'chirish"
    max-width="lg"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="space-y-6">
      <!-- Create or Edit Form -->
      <div class="p-4 rounded-2xl bg-slate-100/80 dark:bg-studio-900 border border-slate-200 dark:border-white/10 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-800 dark:text-studio-200 uppercase tracking-wider">
            {{ editingGenreId ? '✏️ Janrni Tahrirlash' : '➕ Yangi Janr Qo\'shish' }}
          </span>
          <button
            v-if="editingGenreId"
            type="button"
            class="text-xs text-slate-500 dark:text-studio-400 hover:text-slate-700 dark:hover:text-white"
            @click="cancelEdit"
          >
            Bekor qilish
          </button>
        </div>

        <form @submit.prevent="handleSave" class="space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-semibold text-slate-600 dark:text-studio-400 mb-1">
                Janr Nomi *
              </label>
              <input
                v-model="form.name"
                type="text"
                required
                placeholder="Masalan: Qasos (Revenge)"
                class="w-full px-3 py-2 text-xs bg-white dark:bg-studio-850 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500"
                @input="onNameInput"
              />
            </div>

            <div>
              <label class="block text-[11px] font-semibold text-slate-600 dark:text-studio-400 mb-1">
                Slug (URL identifikatori) *
              </label>
              <input
                v-model="form.slug"
                type="text"
                required
                placeholder="revenge"
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
              {{ editingGenreId ? 'Yangilash' : 'Janrni Saqlash' }}
            </Button>
          </div>
        </form>
      </div>

      <!-- Genres List Table -->
      <div class="space-y-2">
        <div class="flex items-center justify-between text-xs text-slate-500 dark:text-studio-400 px-1 font-mono">
          <span>Mavjud janrlar ro'yxati</span>
          <span>Jami: <strong>{{ genres.length }}</strong> ta</span>
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
                  {{ getManhwasCount(genre.id) }} ta manhva
                </Badge>
              </div>
              <span class="text-xs font-mono text-slate-400 dark:text-studio-500">
                slug: /genres/{{ genre.slug }}
              </span>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                class="p-1.5 text-xs text-brand-600 dark:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-colors font-medium"
                title="Tahrirlash"
                @click="startEdit(genre)"
              >
                ✏️ Tahrirlash
              </button>
              <button
                type="button"
                class="p-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors font-medium"
                title="O'chirish"
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
import { reactive, ref, computed } from 'vue'
import { mockDb } from '../../api/client'
import { webtoonsApi } from '../../api/webtoons'
import { useSystemStore } from '../../stores/system'
import Modal from '../common/Modal.vue'
import Button from '../common/Button.vue'
import Badge from '../common/Badge.vue'

defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'changed'])
const systemStore = useSystemStore()

const isSubmitting = ref(false)
const editingGenreId = ref(null)

const form = reactive({
  name: '',
  slug: ''
})

const genres = computed(() => mockDb.genres)

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

function getManhwasCount(genreId) {
  return mockDb.webtoons.filter((w) => w.genre_ids?.includes(genreId)).length
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
  isSubmitting.value = true
  try {
    if (editingGenreId.value) {
      await webtoonsApi.updateGenre(editingGenreId.value, {
        name: form.name,
        slug: form.slug
      })
      systemStore.addToast({
        type: 'success',
        title: 'Janr yangilandi',
        message: `"${form.name}" janri muvaffaqiyatli saqlandi`
      })
    } else {
      await webtoonsApi.createGenre({
        name: form.name,
        slug: form.slug
      })
      systemStore.addToast({
        type: 'success',
        title: 'Janr yaratildi',
        message: `"${form.name}" janri katalogga qo'shildi`
      })
    }
    cancelEdit()
    emit('changed')
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: 'Xatolik',
      message: err.message || 'Janrni saqlashda xatolik yuz berdi'
    })
  } finally {
    isSubmitting.value = false
  }
}

async function handleDelete(genre) {
  const count = getManhwasCount(genre.id)
  if (count > 0) {
    if (!confirm(`Diqqat! "${genre.name}" janriga ${count} ta manhva biriktirilgan. Haqiqatan ham o'chirmoqchimisiz?`)) {
      return
    }
  } else {
    if (!confirm(`"${genre.name}" janrini o'chirishni tasdiqlaysizmi?`)) {
      return
    }
  }

  try {
    await webtoonsApi.deleteGenre(genre.id)
    if (editingGenreId.value === genre.id) {
      cancelEdit()
    }
    systemStore.addToast({
      type: 'success',
      title: 'Janr o\'chirildi',
      message: `"${genre.name}" muvaffaqiyatli o'chirildi`
    })
    emit('changed')
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: 'Xatolik',
      message: err.message || 'Janrni o\'chirishda xatolik yuz berdi'
    })
  }
}
</script>
