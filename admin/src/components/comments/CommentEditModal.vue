<template>
  <Modal
    :model-value="modelValue"
    :title="$t('comments.modal_edit_title')"
    :description="comment ? `${comment.username} • ${comment.webtoon_title} (${comment.chapter_number}-bob)` : $t('comments.modal_edit_desc')"
    max-width="md"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form v-if="comment" @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Quick Moderation Censor Presets -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
          Tezkor Moderatsiya Shablonlari
        </label>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="preset in censorPresets"
            :key="preset.label"
            type="button"
            class="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-studio-300 hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-300 transition-colors"
            @click="applyPreset(preset.text)"
          >
            {{ preset.label }}
          </button>
        </div>
      </div>

      <!-- Comment Content Editor -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
          {{ $t('comments.field_content') }} *
        </label>
        <textarea
          v-model="content"
          rows="5"
          required
          class="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70 resize-none leading-relaxed"
          placeholder="Sharh matnini kiriting..."
        />
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/5">
        <Button variant="ghost" size="sm" @click="$emit('update:modelValue', false)">
          {{ $t('common.cancel') }}
        </Button>
        <Button type="submit" variant="primary" size="sm" :loading="isSubmitting">
          {{ $t('common.save') }}
        </Button>
      </div>
    </form>
  </Modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '../common/Modal.vue'
import Button from '../common/Button.vue'

const { t } = useI18n()

const props = defineProps({
  modelValue: Boolean,
  comment: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'save'])
const isSubmitting = ref(false)
const content = ref('')

const censorPresets = [
  { label: '⚠️ Qoidabuzarlik', text: '[Ushbu sharh qoidabuzarlik sababli moderator tomonidan tahrirlandi]' },
  { label: '🚫 Reklama / Spam', text: '[Reklama va spam kontent moderator tomonidan olib tashlandi]' },
  { label: '🤐 Spoiler Qalqoni', text: '[Diqqat: Ushbu sharhda spoiler mavjud bo\'lgani sababli yashirildi]' }
]

watch(
  () => props.comment,
  (newComment) => {
    if (newComment) {
      content.value = newComment.content || ''
    }
  },
  { immediate: true }
)

function applyPreset(text) {
  content.value = text
}

function handleSubmit() {
  if (!content.value.trim()) return
  isSubmitting.value = true
  setTimeout(() => {
    emit('save', {
      id: props.comment.id,
      content: content.value
    })
    isSubmitting.value = false
    emit('update:modelValue', false)
  }, 250)
}
</script>
