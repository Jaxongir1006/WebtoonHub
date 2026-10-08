<template>
  <Modal ref="draftDialog" :draft="reason" :model-value="modelValue" :title="$t('common.reject')" :busy="pending" @update:model-value="$emit('update:modelValue', $event)">
    <form @submit.prevent="submit">
      <fieldset :disabled="pending" class="space-y-4">
      <p v-if="error" role="alert" class="text-sm text-rose-600 dark:text-rose-300">{{ error }}</p>
      <label for="RejectionModal-accessible-2" class="block text-sm">{{ $t('common.rejection_reason') }}
        <textarea id="RejectionModal-accessible-2" v-model="reason" required minlength="3" maxlength="1000" rows="4" class="mt-2 w-full rounded-xl border border-slate-300 dark:border-studio-700 bg-white dark:bg-studio-900 p-3" />
      </label>
      <p class="text-xs text-slate-500 dark:text-studio-400">{{ $t('common.rejection_help') }}</p>
      <div class="flex justify-end gap-2"><Button :disabled="pending" variant="ghost" @click="$refs.draftDialog.close()">{{ $t('common.cancel') }}</Button><Button type="submit" variant="danger" :loading="pending">{{ $t('common.reject') }}</Button></div>

      </fieldset>
    </form>
  </Modal>
</template>
<script setup>
import { ref, watch } from 'vue'
import Modal from './Modal.vue'
import Button from './Button.vue'
import { getErrorMessage } from '../../utils/forms'
const props = defineProps({ modelValue: Boolean, onSave: { type: Function, required: true } })
const emit = defineEmits(['update:modelValue'])
const reason = ref(''), pending = ref(false), error = ref('')
watch(() => props.modelValue, open => { if (open) { reason.value = ''; error.value = '' } })
async function submit() {
  if (pending.value || reason.value.trim().length < 3) return
  pending.value = true; error.value = ''
  try { await props.onSave(reason.value.trim()); emit('update:modelValue', false) }
  catch (failure) { error.value = getErrorMessage(failure) }
  finally { pending.value = false }
}
</script>
