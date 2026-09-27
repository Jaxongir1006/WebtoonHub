<template>
  <Modal
    :model-value="modelValue"
    title="Do'konga Yangi Buyum Qo'shish"
    description="Avatar ramkasi yoki profil foni kiritish va Chaqmoq narxini belgilash"
    max-width="lg"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Item Name -->
      <div>
        <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-1.5">
          Buyum Nomi *
        </label>
        <input
          v-model="form.name"
          type="text"
          required
          placeholder="Masalan: Oltin Chaqmoq Ramkasi"
          class="w-full px-3.5 py-2 text-sm bg-studio-900 border border-white/10 rounded-xl text-studio-100 focus:outline-none focus:border-brand-500/70"
        />
      </div>

      <!-- Type & Price -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-1.5">
            Buyum Turi *
          </label>
          <select
            v-model="form.item_type"
            class="w-full px-3.5 py-2 text-sm bg-studio-900 border border-white/10 rounded-xl text-studio-100 focus:outline-none focus:border-brand-500/70"
          >
            <option value="frame">Avatar Ramkasi (Frame)</option>
            <option value="background">Profil Foni (Background)</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-1.5">
            Narxi (⚡ Chaqmoq) *
          </label>
          <input
            v-model.number="form.price_coins"
            type="number"
            min="1"
            required
            placeholder="50"
            class="w-full px-3.5 py-2 text-sm bg-studio-900 border border-white/10 rounded-xl text-brand-400 font-bold font-mono focus:outline-none focus:border-brand-500/70"
          />
        </div>
      </div>

      <!-- Style Presets / Border Glow -->
      <div>
        <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-1.5">
          Vizual Effekt / Uslub
        </label>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="preset in availablePresets"
            :key="preset.name"
            type="button"
            :class="[
              'p-2 rounded-xl text-xs font-semibold border text-center transition-all',
              form.border_style === preset.class
                ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                : 'border-white/10 bg-studio-900 text-studio-300 hover:text-white'
            ]"
            @click="form.border_style = preset.class"
          >
            {{ preset.name }}
          </button>
        </div>
      </div>

      <!-- Live Simulator Preview -->
      <div>
        <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-1.5">
          Jonli Simulyatsiya
        </label>
        <FramePreviewSim
          :frame-style="form.item_type === 'frame' ? form.border_style : ''"
          :background-url="form.item_type === 'background' ? form.asset_url : ''"
          :background-gradient="form.item_type === 'background' ? form.border_style : ''"
        />
      </div>

      <!-- Asset URL -->
      <div>
        <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-1.5">
          MinIO Asset Manzili / Fayl
        </label>
        <input
          v-model="form.asset_url"
          type="text"
          placeholder="http://localhost:9000/shop-assets/..."
          class="w-full px-3.5 py-2 text-xs bg-studio-900 border border-white/10 rounded-xl text-studio-100 font-mono"
        />
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
        <Button variant="ghost" size="sm" @click="$emit('update:modelValue', false)">
          Bekor qilish
        </Button>
        <Button type="submit" variant="primary" size="sm" :loading="isSubmitting">
          Buyumni Qo'shish
        </Button>
      </div>
    </form>
  </Modal>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import Modal from '../common/Modal.vue'
import Button from '../common/Button.vue'
import FramePreviewSim from './FramePreviewSim.vue'

defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'save'])
const isSubmitting = ref(false)

const form = reactive({
  name: '',
  item_type: 'frame',
  price_coins: 50,
  asset_url: 'https://api.iconify.design/solar:star-circle-bold.svg?color=%23f59e0b',
  border_style: 'ring-4 ring-amber-400 shadow-glow-brand'
})

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

const availablePresets = computed(() => {
  return form.item_type === 'frame' ? framePresets : bgPresets
})

function handleSubmit() {
  isSubmitting.value = true
  setTimeout(() => {
    emit('save', { ...form })
    isSubmitting.value = false
    emit('update:modelValue', false)
  }, 400)
}
</script>
