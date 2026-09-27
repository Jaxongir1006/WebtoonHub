<template>
  <Modal
    :model-value="modelValue"
    title="Chaqmoq Balansini Boshqarish"
    :description="user ? `${user.username} (${user.email}) hisobi` : ''"
    max-width="md"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Current Balance Info -->
      <div class="p-3.5 rounded-xl bg-studio-900 border border-white/5 flex items-center justify-between">
        <span class="text-xs text-studio-400">Joriy Balans:</span>
        <span class="text-base font-bold text-brand-400 font-mono flex items-center gap-1">
          ⚡ {{ user?.lightning_coins || 0 }} Chaqmoq
        </span>
      </div>

      <!-- Action Type -->
      <div>
        <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-1.5">
          Amaliyot Turi
        </label>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            :class="[
              'py-2 px-3 rounded-xl text-xs font-bold transition-all border',
              isAdd
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-studio-850 text-studio-400 border-white/5 hover:text-white'
            ]"
            @click="isAdd = true"
          >
            + Chaqmoq Qo'shish
          </button>
          <button
            type="button"
            :class="[
              'py-2 px-3 rounded-xl text-xs font-bold transition-all border',
              !isAdd
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-studio-850 text-studio-400 border-white/5 hover:text-white'
            ]"
            @click="isAdd = false"
          >
            - Chaqmoq Ayirish
          </button>
        </div>
      </div>

      <!-- Amount -->
      <div>
        <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-1.5">
          Chaqmoq Miqdori *
        </label>
        <input
          v-model.number="amount"
          type="number"
          min="1"
          required
          placeholder="50"
          class="w-full px-3.5 py-2 text-sm bg-studio-900 border border-white/10 rounded-xl text-brand-400 font-bold font-mono focus:outline-none focus:border-brand-500/70"
        />
      </div>

      <!-- Reason -->
      <div>
        <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-1.5">
          Sabab / Izoh *
        </label>
        <input
          v-model="reason"
          type="text"
          required
          placeholder="Masalan: Faollik bonusi, musobaqa g'olibi yoki tuzatish"
          class="w-full px-3.5 py-2 text-sm bg-studio-900 border border-white/10 rounded-xl text-studio-100 focus:outline-none focus:border-brand-500/70"
        />
      </div>

      <!-- New Calculated Balance -->
      <div class="text-xs text-studio-400 flex items-center justify-between pt-1">
        <span>Yangilangan kutilayotgan balans:</span>
        <span class="font-bold text-white font-mono">
          ⚡ {{ projectedBalance }} Chaqmoq
        </span>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
        <Button variant="ghost" size="sm" @click="$emit('update:modelValue', false)">
          Bekor qilish
        </Button>
        <Button type="submit" variant="primary" size="sm" :loading="isSubmitting">
          Balansni Yangilash
        </Button>
      </div>
    </form>
  </Modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import Modal from '../common/Modal.vue'
import Button from '../common/Button.vue'

const props = defineProps({
  modelValue: Boolean,
  user: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'save'])

const isAdd = ref(true)
const amount = ref(25)
const reason = ref('Faollik va rag\'batlantirish bonusi')
const isSubmitting = ref(false)

const projectedBalance = computed(() => {
  const current = props.user?.lightning_coins || 0
  const delta = isAdd.value ? Number(amount.value || 0) : -Number(amount.value || 0)
  return Math.max(0, current + delta)
})

function handleSubmit() {
  isSubmitting.value = true
  const delta = isAdd.value ? Number(amount.value) : -Number(amount.value)
  setTimeout(() => {
    emit('save', {
      userId: props.user.id,
      amount: delta,
      reason: reason.value
    })
    isSubmitting.value = false
    emit('update:modelValue', false)
  }, 400)
}
</script>
