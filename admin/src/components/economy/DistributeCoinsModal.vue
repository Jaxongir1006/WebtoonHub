<template>
  <Modal
    :model-value="modelValue"
    title="🎁 Ommaviy Chaqmoq Tarqatish"
    description="Bayram yoki maxsus tadbirlar munosabati bilan barcha faol o'quvchilarga bir vaqtda Chaqmoq sovg'a qilish"
    max-width="md"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Amount -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
          Har bir o'quvchiga beriladigan Chaqmoq *
        </label>
        <div class="relative">
          <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-500 font-bold text-sm">⚡</span>
          <input
            v-model.number="form.amount"
            type="number"
            min="1"
            required
            placeholder="25"
            class="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-brand-600 dark:text-brand-400 font-bold font-mono focus:outline-none focus:border-brand-500"
          />
        </div>
        <div class="flex items-center gap-1.5 mt-2">
          <button
            v-for="amt in [15, 25, 50, 100]"
            :key="amt"
            type="button"
            class="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20"
            @click="form.amount = amt"
          >
            +{{ amt }} ⚡
          </button>
        </div>
      </div>

      <!-- Reason -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
          Sabab / Bayram Tavsifi *
        </label>
        <input
          v-model="form.reason"
          type="text"
          required
          placeholder="Masalan: Yangi yil bayrami sovg'asi"
          class="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500"
        />
      </div>

      <!-- Target Scope -->
      <div class="p-3.5 rounded-2xl bg-slate-100 dark:bg-studio-900/60 border border-slate-200 dark:border-white/5 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-700 dark:text-studio-300">Qamrov:</span>
          <Badge variant="success">{{ activeUsersCount }} ta faol o'quvchi</Badge>
        </div>
        <div class="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-white/5">
          <span class="text-slate-500 dark:text-studio-400">Jami tarqatiladigan emissiya:</span>
          <span class="font-mono font-bold text-brand-600 dark:text-brand-400">
            ⚡ {{ (form.amount * activeUsersCount).toLocaleString() }} Chaqmoq
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/5">
        <Button variant="ghost" size="sm" @click="$emit('update:modelValue', false)">
          Bekor qilish
        </Button>
        <Button type="submit" variant="primary" size="sm" :loading="isSubmitting">
          🎁 Tarqatishni Boshlash
        </Button>
      </div>
    </form>
  </Modal>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { mockDb } from '../../api/client'
import Modal from '../common/Modal.vue'
import Button from '../common/Button.vue'
import Badge from '../common/Badge.vue'

defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'distributed'])
const isSubmitting = ref(false)

const form = reactive({
  amount: 25,
  reason: 'WebtoonHub platformasi bayram sovg\'asi',
  all_active_users: true
})

const activeUsersCount = computed(() => {
  return mockDb.users.filter((u) => u.is_active).length
})

function handleSubmit() {
  isSubmitting.value = true
  setTimeout(() => {
    // Distribute to all active users in mockDb
    mockDb.users.forEach((u) => {
      if (u.is_active) {
        u.lightning_coins += form.amount
      }
    })
    mockDb.save('users')

    // Add record to reward transactions
    mockDb.rewardTransactions.unshift({
      id: Date.now(),
      user_id: 0,
      username: 'Barcha O\'quvchilar',
      type: 'creator_reward',
      title: `Ommaviy sovg'a: ${form.reason}`,
      amount: form.amount,
      created_at: new Date().toISOString()
    })
    mockDb.save('rewardTransactions')

    isSubmitting.value = false
    emit('distributed', {
      amount: form.amount,
      reason: form.reason,
      count: activeUsersCount.value,
      total: form.amount * activeUsersCount.value
    })
    emit('update:modelValue', false)
  }, 400)
}
</script>
