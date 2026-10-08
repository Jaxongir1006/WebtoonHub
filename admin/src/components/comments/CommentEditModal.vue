<template>
  <Modal ref="draftDialog" :draft="content"
    :busy="isSubmitting"
    :model-value="modelValue"
    :title="$t('comments.modal_edit_title')"
    :description="comment ? $t('staff.s001', { value0: comment.username, value1: comment.webtoon_title, value2: comment.chapter_number }) : $t('comments.modal_edit_desc')"
    max-width="md"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form v-if="comment" @submit.prevent="handleSubmit">
      <fieldset :disabled="isSubmitting" class="space-y-4">
      <p v-if="submitError" role="alert" class="text-sm text-rose-600 dark:text-rose-300">{{ submitError }}</p>
      <!-- Quick Moderation Censor Presets -->
      <div>
        <label for="CommentEditModal-field-1" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5"> {{ $t('staff.s002') }} </label>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="preset in censorPresets"
            :key="preset.label"
            type="button"
            class="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-studio-300 hover:border-brand-500 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
            @click="applyPreset(preset.text)"
          >
            {{ preset.label }}
          </button>
        </div>
      </div>

      <!-- Comment Content Editor -->
      <div>
        <label for="CommentEditModal-field-1" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
          {{ $t('comments.field_content') }} *
        </label>
        <textarea
          id="CommentEditModal-field-1"
          v-model="content"
          rows="5"
          required
          class="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70 resize-none leading-relaxed"
          :placeholder="$t('staff.s003')"
        />
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/5">
        <Button variant="ghost" size="sm" :disabled="isSubmitting" @click="$refs.draftDialog.close()">
          {{ $t('common.cancel') }}
        </Button>
        <Button type="submit" variant="primary" size="sm" :loading="isSubmitting">
          {{ $t('common.save') }}
        </Button>
      </div>

      </fieldset>
    </form>
  </Modal>
</template>

<script setup>
import i18n from '../../i18n/index.js'
const tr = (...args) => i18n.global.t(...args)

import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getErrorMessage } from '../../utils/forms'
import Modal from '../common/Modal.vue'
import Button from '../common/Button.vue'

const { t } = useI18n()

const props = defineProps({
  modelValue: Boolean,
  onSave: { type: Function, required: true },
  comment: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'save'])
const isSubmitting = ref(false)
const submitError = ref('')
const content = ref('')

const censorPresets = [
  { get label() { return tr('staff.s004') }, get text() { return tr('staff.s005') } },
  { get label() { return tr('staff.s006') }, get text() { return tr('staff.s007') } },
  { get label() { return tr('staff.s008') }, get text() { return tr('staff.s009') } }
]

watch(
  () => [props.comment, props.modelValue],
  ([newComment, open]) => {
    if (!open) return
    submitError.value = ''
    if (newComment) {
      content.value = newComment.content || ''
    }
  },
  { immediate: true }
)

function applyPreset(text) {
  content.value = text
}

async function handleSubmit() {
  if (isSubmitting.value) return
  submitError.value = ''
  if (!content.value.trim()) return
  isSubmitting.value = true
  try {
    await props.onSave({
      id: props.comment.id,
      content: content.value
    })
    emit('update:modelValue', false)
  } catch (error) {
    submitError.value = getErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>
