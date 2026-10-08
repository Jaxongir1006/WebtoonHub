<template>
  <Modal ref="draftDialog" :draft="form" :busy="isSubmitting"
    :model-value="modelValue"
    :title="$t('staff.s010')"
    :description="$t('staff.s011')"
    max-width="md"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form @submit.prevent="handleSubmit">
      <fieldset :disabled="isSubmitting" class="space-y-4">
      <p v-if="submitError" role="alert" class="text-sm text-rose-600 dark:text-rose-300">{{ submitError }}</p>
      <p v-if="restoredIntent" role="status" class="text-xs text-amber-700 dark:text-amber-300">{{ $t('studioFixes.recoveredIntent') }}</p>
      <!-- Amount -->
      <div>
        <label for="DistributeCoinsModal-accessible-1" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5"> {{ $t('staff.s012') }} </label>
        <div class="relative">
          <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-700 dark:text-brand-500 font-bold text-sm">⚡</span>
          <input id="DistributeCoinsModal-accessible-1"
            v-model.number="form.amount"
            type="number"
            min="1"
            step="1"
            required
            placeholder="25"
            class="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-brand-700 dark:text-brand-400 font-bold font-mono focus:outline-none focus:border-brand-500"
          />
        </div>
        <div class="flex items-center gap-1.5 mt-2">
          <button
            v-for="amt in [15, 25, 50, 100]"
            :key="amt"
            type="button"
            class="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-brand-500/10 text-brand-700 dark:text-brand-400 hover:bg-brand-500/20"
            @click="form.amount = amt"
          >
            +{{ amt }} ⚡
          </button>
        </div>
      </div>

      <!-- Reason -->
      <div>
        <label for="DistributeCoinsModal-field-1" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5"> {{ $t('staff.s013') }} </label>
        <input
          id="DistributeCoinsModal-field-1"
          v-model="form.reason"
          type="text"
          minlength="2" maxlength="255"
          required
          :placeholder="$t('staff.s014')"
          class="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500"
        />
      </div>

      <!-- Target Scope -->
      <div class="p-3.5 rounded-2xl bg-slate-100 dark:bg-studio-900/60 border border-slate-200 dark:border-white/5 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-700 dark:text-studio-300"> {{ $t('staff.s015') }} </span>
          <Badge variant="success"> {{ $t('staff.s016') }} </Badge>
        </div>
        <div class="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-white/5">
          <span class="text-slate-500 dark:text-studio-400"> {{ $t('staff.s017') }} </span>
          <span class="font-mono font-bold text-brand-700 dark:text-brand-400">
            +{{ form.amount }} {{ $t('staff.s018') }} </span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/5">
        <Button variant="ghost" size="sm" :disabled="isSubmitting" @click="$refs.draftDialog.close()"> {{ $t('staff.s019') }} </Button>
        <Button type="submit" variant="primary" size="sm" :loading="isSubmitting"> {{ $t('staff.s020') }} </Button>
      </div>

      </fieldset>
    </form>
  </Modal>
</template>

<script setup>
import i18n from '../../i18n/index.js'
const tr = (...args) => i18n.global.t(...args)


import { reactive, ref, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { pendingOperation, prepareOperation, completeOperation } from '../../utils/operationIntents'
import { economyApi } from '../../api/economy'
import { getErrorMessage } from '../../utils/forms'
import { useSystemStore } from '../../stores/system'
import Modal from '../common/Modal.vue'
import Button from '../common/Button.vue'
import Badge from '../common/Badge.vue'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'distributed'])
const systemStore = useSystemStore()
const auth = useAuthStore()
const restoredIntent = ref(false)
const isSubmitting = ref(false)
const submitError = ref('')

const form = reactive({
  amount: 25,
  reason: '',
  all_active_users: true
})

async function handleSubmit() {
  if (isSubmitting.value) return
  submitError.value = ''
  isSubmitting.value = true
  const owner = auth.staff?.id ?? auth.staff?.username
  try {
    const payload = {
      amount: Number(form.amount),
      reason: form.reason.trim(),
      all_active_users: true
    }
    const intent = prepareOperation(owner, 'distribute', payload)
    const res = await economyApi.distributeCoins(payload, intent.key)
    completeOperation(owner, 'distribute', intent.key)
    restoredIntent.value = false

    const distributedData = res.data || {}
    systemStore.addToast({
      type: 'success',
      title: tr('staff.s022'),
      message: tr('staff.s023', { value0: distributedData.rewarded_users_count ?? distributedData.users_count ?? distributedData.count ?? 0, value1: form.amount })
    })

    emit('distributed', {
      amount: form.amount,
      reason: form.reason,
      ...distributedData
    })
    emit('update:modelValue', false)
  } catch (err) {
    submitError.value = getErrorMessage(err)
    systemStore.addToast({
      type: 'error',
      title: tr('staff.s024'),
      message: err.response?.data?.detail || err.message || tr('staff.s025')
    })
  } finally {
    isSubmitting.value = false
  }
}
watch(() => props.modelValue, open => {
  if (!open) return
  const saved = pendingOperation(auth.staff?.id ?? auth.staff?.username, 'distribute')
  form.amount = saved?.payload.amount ?? 25
  form.reason = saved?.payload.reason || ''
  restoredIntent.value = !!saved
  submitError.value = ''
}, { immediate: true })
</script>
