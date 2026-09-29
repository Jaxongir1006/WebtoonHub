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

      <!-- Asset File Upload (No manual URL needed) -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span>{{ form.item_type === 'frame' ? 'Ramka Fayli (SVG yoki PNG)' : 'Fon Rasmi (JPG, PNG, WebP)' }}</span>
          <span v-if="selectedFileName" class="text-[11px] font-mono text-brand-500 font-normal truncate max-w-xs">
            ✓ {{ selectedFileName }}
          </span>
        </label>

        <div
          class="border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer relative bg-slate-50 dark:bg-studio-900/60 border-slate-200 dark:border-white/10 hover:border-brand-500/50"
          @click="$refs.assetFileInput.click()"
        >
          <input
            ref="assetFileInput"
            type="file"
            accept=".svg,.png,.jpg,.jpeg,.webp"
            class="hidden"
            @change="handleAssetFile"
          />

          <div class="flex flex-col items-center justify-center gap-1.5">
            <div class="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-500 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p class="text-xs font-semibold text-slate-800 dark:text-studio-200">
              {{ selectedFileName ? "Faylni almashtirish uchun bosing" : "Kompyuterdan fayl yuklash" }}
            </p>
            <p class="text-[11px] text-slate-400 dark:text-studio-400">
              {{ form.item_type === 'frame' ? 'SVG yoki shaffof PNG ramkalar' : 'Keng formatli rasm (16:9 yoki panorama)' }} (Max: 5MB)
            </p>
          </div>
        </div>
      </div>

      <p v-if="submitError" role="alert" class="text-sm text-rose-600 dark:text-rose-400">
        {{ submitError }}
      </p>

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
import { shopApi } from '../../api/shop'

const { t } = useI18n()

const props = defineProps({
  modelValue: Boolean,
  onSave: {
    type: Function,
    required: true
  },
  item: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])
const isSubmitting = ref(false)
const submitError = ref('')
const assetFileInput = ref(null)
const selectedFileName = ref('')

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
  asset_url: '',
  border_style: 'ring-4 ring-amber-400 shadow-glow-brand',
  asset_file: null
})

watch(
  () => [props.modelValue, props.item],
  ([isOpen, newItem]) => {
    if (!isOpen) return
    if (form.asset_url.startsWith('blob:')) URL.revokeObjectURL(form.asset_url)
    submitError.value = ''
    if (assetFileInput.value) assetFileInput.value.value = ''
    if (newItem) {
      form.name = newItem.name || ''
      form.item_type = newItem.item_type || 'frame'
      form.price_coins = newItem.price_coins ?? 50
      form.asset_url = newItem.asset_url || ''
      form.border_style = newItem.border_style || (newItem.item_type === 'frame' ? framePresets[0].class : bgPresets[0].class)
      form.asset_file = null
      selectedFileName.value = newItem.asset_url ? newItem.name : ''
    } else {
      form.name = ''
      form.item_type = 'frame'
      form.price_coins = 50
      form.asset_url = ''
      form.border_style = framePresets[0].class
      form.asset_file = null
      selectedFileName.value = ''
    }
  },
  { immediate: true }
)

const availablePresets = computed(() => {
  return form.item_type === 'frame' ? framePresets : bgPresets
})

function handleAssetFile(e) {
  const file = e.target.files[0]
  if (!file) return
  if (form.asset_url.startsWith('blob:')) URL.revokeObjectURL(form.asset_url)
  selectedFileName.value = file.name
  form.asset_file = file
  form.asset_url = URL.createObjectURL(file)
}

async function handleSubmit() {
  if (isSubmitting.value) return
  if (!props.item && !form.asset_file) {
    submitError.value = 'Haqiqiy bezak faylini tanlang.'
    return
  }
  isSubmitting.value = true
  submitError.value = ''
  try {
    let finalUrl = form.asset_url
    // Creation accepts the file in the same request. Editing needs a separate upload.
    if (props.item && form.asset_file) {
      const res = await shopApi.uploadAsset(form.asset_file, form.item_type)
      finalUrl = res.data?.asset_url
      if (!finalUrl) throw new Error('The asset upload did not return a URL')
      if (form.asset_url.startsWith('blob:')) URL.revokeObjectURL(form.asset_url)
      form.asset_url = finalUrl
      form.asset_file = null
    }
    await props.onSave({
      ...(props.item ? { id: props.item.id } : {}),
      name: form.name,
      item_type: form.item_type,
      price_coins: form.price_coins,
      asset_url: form.asset_file && !props.item ? '' : finalUrl,
      border_style: form.border_style,
      asset_file: props.item ? undefined : form.asset_file
    })
    emit('update:modelValue', false)
  } catch (err) {
    console.error('Failed to submit shop item', err)
    submitError.value = err.response?.data?.error?.message || err.response?.data?.detail || err.message || 'Failed to save item'
  } finally {
    isSubmitting.value = false
  }
}
</script>
