<template>
  <Modal
    :model-value="modelValue"
    :title="isEdit ? $t('shop.modal_edit_title') : $t('shop.modal_title')"
    :description="isEdit ? $t('shop.edit_desc') : $t('shop.modal_desc')"
    max-width="lg"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Item Name -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
          {{ $t('shop.field_name') }}
        </label>
        <input
          v-model="form.name"
          type="text"
          required
          :placeholder="isEdit ? '' : 'Masalan: Oltin Chaqmoq Ramkasi'"
          class="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70"
        />
      </div>

      <!-- Type & Price -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
            {{ $t('shop.field_type') }}
          </label>
          <select
            v-model="form.item_type"
            class="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70"
          >
            <option value="frame">{{ $t('shop.frame_type') }} (Frame)</option>
            <option value="background">{{ $t('shop.bg_type') }} (Background)</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
            {{ $t('shop.field_price') }}
          </label>
          <input
            v-model.number="form.price_coins"
            type="number"
            min="1"
            required
            placeholder="50"
            class="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-brand-500 dark:text-brand-400 font-bold font-mono focus:outline-none focus:border-brand-500/70"
          />
        </div>
      </div>

      <!-- Style Presets / Border Glow -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
          {{ $t('shop.field_style') }}
        </label>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="preset in availablePresets"
            :key="preset.name"
            type="button"
            :class="[
              'p-2 rounded-xl text-xs font-semibold border text-center transition-all',
              form.border_style === preset.class
                ? 'border-brand-500 bg-brand-500/15 text-brand-600 dark:text-brand-300'
                : 'border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-studio-900 text-slate-600 dark:text-studio-300 hover:text-slate-900 dark:hover:text-white'
            ]"
            @click="form.border_style = preset.class"
          >
            {{ preset.name }}
          </button>
        </div>
      </div>

      <!-- Live Simulator Preview -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
          {{ $t('shop.field_live_sim') }}
        </label>
        <FramePreviewSim
          :frame-style="form.item_type === 'frame' ? form.border_style : ''"
          :background-url="form.item_type === 'background' ? form.asset_url : ''"
          :background-gradient="form.item_type === 'background' ? form.border_style : ''"
        />
      </div>

      <!-- Asset URL -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
          {{ $t('shop.field_asset') }}
        </label>
        <input
          v-model="form.asset_url"
          type="text"
          placeholder="http://localhost:9000/shop-assets/..."
          class="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 font-mono"
        />
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/5">
        <Button variant="ghost" size="sm" @click="$emit('update:modelValue', false)">
          {{ $t('common.cancel') }}
        </Button>
        <Button type="submit" variant="primary" size="sm" :loading="isSubmitting">
          {{ isEdit ? $t('common.save') : $t('shop.btn_submit') }}
        </Button>
      </div>
    </form>
  </Modal>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '../common/Modal.vue'
import Button from '../common/Button.vue'
import FramePreviewSim from './FramePreviewSim.vue'

const { t } = useI18n()

const props = defineProps({
  modelValue: Boolean,
  item: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'save'])
const isSubmitting = ref(false)

const isEdit = computed(() => !!props.item)

const framePresets = [
  { name: '⚡ Oltin Chaqmoq', class: 'ring-4 ring-amber-400 shadow-glow-brand' },
  { name: '💎 Neon Kiber', class: 'ring-4 ring-cyan-400 shadow-glow-cyan' },
  { name: '🔥 Binafsharang', class: 'ring-4 ring-purple-500 shadow-glow-purple' }
]

const bgPresets = [
  { name: '🌌 Kosmik Tungi', class: 'bg-gradient-to-r from-purple-900 to-indigo-950' },
  { name: '🏙 Neon Shahar', class: 'bg-gradient-to-r from-cyan-900 to-blue-950' },
  { name: '🌋 Lava Olov', class: 'bg-gradient-to-r from-rose-950 to-amber-950' }
]

const form = reactive({
  name: '',
  item_type: 'frame',
  price_coins: 50,
  asset_url: 'https://api.iconify.design/solar:star-circle-bold.svg?color=%23f59e0b',
  border_style: 'ring-4 ring-amber-400 shadow-glow-brand'
})

watch(
  () => props.item,
  (newItem) => {
    if (newItem) {
      form.name = newItem.name || ''
      form.item_type = newItem.item_type || 'frame'
      form.price_coins = newItem.price_coins ?? 50
      form.asset_url = newItem.asset_url || ''
      form.border_style = newItem.border_style || (newItem.item_type === 'frame' ? framePresets[0].class : bgPresets[0].class)
    } else {
      form.name = ''
      form.item_type = 'frame'
      form.price_coins = 50
      form.asset_url = 'https://api.iconify.design/solar:star-circle-bold.svg?color=%23f59e0b'
      form.border_style = framePresets[0].class
    }
  },
  { immediate: true }
)

const availablePresets = computed(() => {
  return form.item_type === 'frame' ? framePresets : bgPresets
})

function handleSubmit() {
  isSubmitting.value = true
  setTimeout(() => {
    emit('save', {
      ...(props.item ? { id: props.item.id } : {}),
      ...form
    })
    isSubmitting.value = false
    emit('update:modelValue', false)
  }, 300)
}
</script>
