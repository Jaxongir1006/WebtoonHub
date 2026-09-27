<template>
  <div class="relative w-full rounded-2xl overflow-hidden border border-white/10 p-6 flex flex-col items-center justify-center min-h-[160px] bg-studio-900/60">
    <!-- Simulated Background Layer -->
    <div
      v-if="backgroundUrl || backgroundGradient"
      class="absolute inset-0 bg-cover bg-center transition-all duration-300"
      :style="bgStyle"
    />
    <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

    <!-- Avatar Simulator with Frame -->
    <div class="relative z-10 flex flex-col items-center">
      <div class="relative">
        <!-- Frame Decoration Layer -->
        <div
          v-if="frameStyle"
          :class="[
            'absolute -inset-2.5 rounded-full pointer-events-none transition-all duration-300 z-10',
            frameStyle
          ]"
        />

        <!-- Avatar Image / Placeholder -->
        <div class="w-16 h-16 rounded-full bg-studio-800 border-2 border-white/20 overflow-hidden flex items-center justify-center shadow-lg relative z-0">
          <img
            src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
            alt="Sample Avatar"
            class="w-full h-full object-cover"
          />
        </div>
      </div>

      <div class="mt-3 text-center">
        <span class="text-xs font-bold text-white tracking-wide drop-shadow-md">
          {{ username || 'Namuna Foydalanuvchi' }}
        </span>
        <p class="text-[10px] text-brand-300 font-mono drop-shadow">
          ⚡ 150 Chaqmoq
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  frameStyle: {
    type: String,
    default: ''
  },
  backgroundUrl: {
    type: String,
    default: ''
  },
  backgroundGradient: {
    type: String,
    default: ''
  },
  username: {
    type: String,
    default: 'namuna_reader'
  }
})

const bgStyle = computed(() => {
  if (props.backgroundUrl) {
    return { backgroundImage: `url(${props.backgroundUrl})` }
  }
  return {}
})
</script>
