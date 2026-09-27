<template>
  <Modal
    :model-value="modelValue"
    :title="$t('users.modal_edit_title')"
    :description="user ? `${user.username} (${user.email})` : $t('users.modal_edit_desc')"
    max-width="lg"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form v-if="user" @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Avatar & Quick Info -->
      <div class="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-100 dark:bg-studio-900/60 border border-slate-200 dark:border-white/5">
        <!-- Live Avatar Frame Preview -->
        <div class="relative w-14 h-14 flex items-center justify-center shrink-0">
          <div
            v-if="selectedFrameStyle"
            class="absolute -inset-1 rounded-full pointer-events-none"
            :class="selectedFrameStyle"
          />
          <div class="w-12 h-12 rounded-full bg-slate-200 dark:bg-studio-800 border border-slate-300 dark:border-white/10 flex items-center justify-center font-bold text-base text-brand-600 dark:text-brand-400 overflow-hidden">
            {{ (form.username || 'U').charAt(0).toUpperCase() }}
          </div>
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-bold text-sm text-slate-900 dark:text-white truncate">{{ form.username }}</span>
            <span class="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-studio-800 text-slate-600 dark:text-studio-400">ID: #{{ user.id }}</span>
          </div>
          <p class="text-xs text-slate-500 dark:text-studio-400 mt-0.5">
            📖 {{ user.read_chapters_count || 0 }} ta bob o'qilgan • {{ user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Noma\'lum sana' }}
          </p>
        </div>
      </div>

      <!-- Username & Email -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
            {{ $t('users.field_username') }} *
          </label>
          <input
            v-model="form.username"
            type="text"
            required
            class="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
            {{ $t('users.field_email') }} *
          </label>
          <input
            v-model="form.email"
            type="email"
            required
            class="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70"
          />
        </div>
      </div>

      <!-- Lightning Balance Direct Setting -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider">
            {{ $t('users.field_coins') }} *
          </label>
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              class="px-2 py-0.5 rounded text-[11px] font-mono bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 font-bold"
              @click="form.lightning_coins += 50"
            >
              +50 ⚡
            </button>
            <button
              type="button"
              class="px-2 py-0.5 rounded text-[11px] font-mono bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 font-bold"
              @click="form.lightning_coins += 200"
            >
              +200 ⚡
            </button>
          </div>
        </div>
        <div class="relative">
          <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-500 font-bold text-sm">⚡</span>
          <input
            v-model.number="form.lightning_coins"
            type="number"
            min="0"
            required
            class="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-brand-600 dark:text-brand-400 font-bold font-mono focus:outline-none focus:border-brand-500/70"
          />
        </div>
      </div>

      <!-- Cosmetics: Avatar Frame & Profile Background -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
            {{ $t('users.field_avatar_frame') }}
          </label>
          <select
            v-model="form.equipped_frame"
            class="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70"
          >
            <option value="">(Hech biri / Standart)</option>
            <option
              v-for="frame in availableFrames"
              :key="frame.id"
              :value="frame.name"
            >
              👑 {{ frame.name }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
            {{ $t('users.field_profile_bg') }}
          </label>
          <select
            v-model="form.equipped_background"
            class="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70"
          >
            <option value="">(Hech biri / Standart)</option>
            <option
              v-for="bg in availableBackgrounds"
              :key="bg.id"
              :value="bg.name"
            >
              🌌 {{ bg.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Status Toggle -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
          {{ $t('users.field_active_status') }}
        </label>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            :class="[
              'py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5',
              form.is_active
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-slate-100 dark:bg-studio-900 text-slate-500 dark:text-studio-400 border-slate-200 dark:border-white/5'
            ]"
            @click="form.is_active = true"
          >
            <span>✓</span> {{ $t('users.status_active') }}
          </button>
          <button
            type="button"
            :class="[
              'py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5',
              !form.is_active
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                : 'bg-slate-100 dark:bg-studio-900 text-slate-500 dark:text-studio-400 border-slate-200 dark:border-white/5'
            ]"
            @click="form.is_active = false"
          >
            <span>🚫</span> {{ $t('users.status_blocked') }}
          </button>
        </div>
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
import { reactive, ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { mockDb } from '../../api/client'
import Modal from '../common/Modal.vue'
import Button from '../common/Button.vue'

const { t } = useI18n()

const props = defineProps({
  modelValue: Boolean,
  user: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'save'])
const isSubmitting = ref(false)

const form = reactive({
  username: '',
  email: '',
  lightning_coins: 0,
  equipped_frame: '',
  equipped_background: '',
  is_active: true
})

const availableFrames = computed(() => {
  return mockDb.shopItems.filter((i) => i.item_type === 'frame')
})

const availableBackgrounds = computed(() => {
  return mockDb.shopItems.filter((i) => i.item_type === 'background')
})

const selectedFrameStyle = computed(() => {
  if (!form.equipped_frame) return ''
  const item = availableFrames.value.find((f) => f.name === form.equipped_frame)
  return item?.border_style || 'ring-4 ring-amber-400'
})

watch(
  () => props.user,
  (newUser) => {
    if (newUser) {
      form.username = newUser.username || ''
      form.email = newUser.email || ''
      form.lightning_coins = newUser.lightning_coins ?? 0
      form.equipped_frame = newUser.equipped_frame || ''
      form.equipped_background = newUser.equipped_background || ''
      form.is_active = newUser.is_active ?? true
    }
  },
  { immediate: true }
)

function handleSubmit() {
  isSubmitting.value = true
  setTimeout(() => {
    emit('save', {
      id: props.user.id,
      ...form
    })
    isSubmitting.value = false
    emit('update:modelValue', false)
  }, 300)
}
</script>
