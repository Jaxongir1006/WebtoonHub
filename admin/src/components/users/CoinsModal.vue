<template>
  <Modal ref="draftDialog" :draft="{ isAdd, amount, reason }"
    :busy="isSubmitting"
    :model-value="modelValue"
    :title="$t('staff.s101')"
    :description="user ? $t('staff.s102', { value0: user.username, value1: user.email }) : ''"
    max-width="md"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form @submit.prevent="handleSubmit">
      <fieldset :disabled="isSubmitting" class="space-y-4">
      <p v-if="submitError" role="alert" class="text-sm text-rose-600 dark:text-rose-300">{{ submitError }}</p>
      <p v-if="restoredIntent" role="status" class="text-xs text-amber-700 dark:text-amber-300">{{ $t('studioFixes.recoveredIntent') }}</p>
      <!-- Current Balance Info -->
      <div class="p-3.5 rounded-xl bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/5 flex items-center justify-between">
        <span class="text-xs text-slate-500 dark:text-studio-400"> {{ $t('staff.s103') }} </span>
        <span class="text-base font-bold text-brand-700 dark:text-brand-400 font-mono flex items-center gap-1">
          ⚡ {{ user?.lightning_coins || 0 }} {{ $t('staff.s104') }} </span>
      </div>

      <!-- Action Type -->
      <div>
        <label for="CoinsModal-field-1" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5"> {{ $t('staff.s105') }} </label>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            :class="[
              'py-2 px-3 rounded-xl text-xs font-bold transition-all border',
              isAdd
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-100 dark:bg-studio-850 text-slate-600 dark:text-studio-400 border-slate-300 dark:border-white/5 hover:text-slate-900 dark:hover:text-white'
            ]"
            @click="isAdd = true"
          > {{ $t('staff.s106') }} </button>
          <button
            type="button"
            :class="[
              'py-2 px-3 rounded-xl text-xs font-bold transition-all border',
              !isAdd
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-100 dark:bg-studio-850 text-slate-600 dark:text-studio-400 border-slate-300 dark:border-white/5 hover:text-slate-900 dark:hover:text-white'
            ]"
            @click="isAdd = false"
          > {{ $t('staff.s107') }} </button>
        </div>
      </div>

      <!-- Amount -->
      <div>
        <label for="CoinsModal-field-1" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5"> {{ $t('staff.s108') }} </label>
        <input
          id="CoinsModal-field-1"
          v-model.number="amount"
          type="number"
          min="1"
          required
          placeholder="50"
          class="w-full px-3.5 py-2 text-sm bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-brand-700 dark:text-brand-400 font-bold font-mono focus:outline-none focus:border-brand-500/70"
        />
      </div>

      <!-- Reason -->
      <div>
        <label for="CoinsModal-field-2" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5"> {{ $t('staff.s109') }} </label>
        <input
          id="CoinsModal-field-2"
          v-model="reason"
          type="text"
          minlength="2" maxlength="255"
          required
          :placeholder="$t('staff.s110')"
          class="w-full px-3.5 py-2 text-sm bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70"
        />
      </div>

      <!-- New Calculated Balance -->
      <div class="text-xs text-slate-500 dark:text-studio-400 flex items-center justify-between pt-1">
        <span> {{ $t('staff.s111') }} </span>
        <span class="font-bold text-slate-900 dark:text-white font-mono">
          ⚡ {{ projectedBalance }} {{ $t('staff.s104') }} </span>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/5">
        <Button variant="ghost" size="sm" :disabled="isSubmitting" @click="$refs.draftDialog.close()"> {{ $t('staff.s019') }} </Button>
        <Button type="submit" variant="primary" size="sm" :loading="isSubmitting"> {{ $t('staff.s112') }} </Button>
      </div>

      </fieldset>
    </form>
  </Modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getErrorMessage } from '../../utils/forms'
import { useAuthStore } from '../../stores/auth'
import { pendingOperation, prepareOperation, completeOperation } from '../../utils/operationIntents'
import Modal from '../common/Modal.vue'
import Button from '../common/Button.vue'

const props = defineProps({
  modelValue: Boolean,
  onSave: { type: Function, required: true },
  user: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'save'])
const auth = useAuthStore()
const restoredIntent = ref(false)

const isAdd = ref(true)
const amount = ref(25)
const reason = ref('')
const isSubmitting = ref(false)
const submitError = ref('')

const projectedBalance = computed(() => {
  const current = props.user?.lightning_coins || 0
  const delta = isAdd.value ? Number(amount.value || 0) : -Number(amount.value || 0)
  return Math.max(0, current + delta)
})

async function handleSubmit() {
  if (isSubmitting.value) return
  submitError.value = ''
  isSubmitting.value = true
  const delta = isAdd.value ? Number(amount.value) : -Number(amount.value)
  const owner = auth.staff?.id ?? auth.staff?.username
  const kind = `adjust:${props.user.id}`
  const payload = { userId: props.user.id, amount: delta, reason: reason.value.trim() }
  try {
    const intent = prepareOperation(owner, kind, payload)
    await props.onSave({
      ...payload,
      operationKey: intent.key
    })
    completeOperation(owner, kind, intent.key)
    restoredIntent.value = false
    emit('update:modelValue', false)
  } catch (error) {
    submitError.value = getErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}
watch(() => [props.modelValue, props.user?.id], ([open]) => {
  if (!open || !props.user) return
  const saved = pendingOperation(auth.staff?.id ?? auth.staff?.username, `adjust:${props.user.id}`)
  isAdd.value = saved ? saved.payload.amount > 0 : true
  amount.value = saved ? Math.abs(saved.payload.amount) : 25
  reason.value = saved?.payload.reason || ''
  restoredIntent.value = !!saved
  submitError.value = ''
}, { immediate: true })
</script>
