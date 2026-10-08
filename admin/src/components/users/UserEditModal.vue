<template>
  <Modal ref="draftDialog" :draft="isActive" :model-value="modelValue" :title="$t('common.edit_user')" :busy="isSubmitting" @update:model-value="$emit('update:modelValue', $event)">
    <form @submit.prevent="handleSubmit">
      <fieldset :disabled="isSubmitting" class="space-y-4">
      <p v-if="submitError" role="alert" class="text-sm text-rose-600 dark:text-rose-300">{{ submitError }}</p>
      <dl class="space-y-2 text-sm"><div><dt>{{ $t('common.username') }}</dt><dd class="font-semibold">{{ user?.username }}</dd></div><div><dt>{{ $t('common.email') }}</dt><dd>{{ user?.email }}</dd></div><div><dt>{{ $t('common.coins') }}</dt><dd>{{ user?.lightning_coins ?? 0 }} ⚡</dd></div></dl>
      <p class="text-xs text-slate-500 dark:text-studio-400">{{ $t('common.reader_readonly') }}</p>
      <label for="UserEditModal-accessible-2" class="flex items-center gap-2"><input id="UserEditModal-accessible-2" v-model="isActive" type="checkbox" />{{ $t('common.active_account') }}</label>
      <div class="flex justify-end gap-3"><Button :disabled="isSubmitting" variant="ghost" @click="$refs.draftDialog.close()">{{ $t('common.cancel') }}</Button><Button type="submit" :loading="isSubmitting">{{ $t('common.save') }}</Button></div>

      </fieldset>
    </form>
  </Modal>
</template>
<script setup>
import { ref, watch } from 'vue'
import Modal from '../common/Modal.vue'
import Button from '../common/Button.vue'
import { getErrorMessage } from '../../utils/forms'
const props = defineProps({ modelValue: Boolean, user: Object, onSave: { type: Function, required: true } })
const emit = defineEmits(['update:modelValue'])
const isActive = ref(true), isSubmitting = ref(false), submitError = ref('')
watch(() => [props.user, props.modelValue], () => { if (props.modelValue) { isActive.value = props.user?.is_active ?? true; submitError.value = '' } }, {immediate: true})
async function handleSubmit() {
  if (isSubmitting.value) return
  isSubmitting.value = true; submitError.value = ''
  try { await props.onSave({ id: props.user.id, username: props.user.username, is_active: isActive.value }); emit('update:modelValue', false) }
  catch (error) { submitError.value = getErrorMessage(error) }
  finally { isSubmitting.value = false }
}
</script>
