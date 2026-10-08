<template>
  <div class="relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 p-6 flex flex-col items-center justify-center min-h-[160px] bg-slate-100 dark:bg-studio-900/60">
    <!-- Simulated Background Layer -->
    <div
      v-if="backgroundUrl"
      class="absolute inset-0 bg-cover bg-center transition-all duration-300"
      :style="bgStyle"
    />
    <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

    <!-- Avatar Simulator with Frame -->
    <div class="relative z-10 flex flex-col items-center">
      <div class="relative">
        <!-- Avatar Image / Placeholder -->
        <div class="w-16 h-16 rounded-full bg-slate-100 dark:bg-studio-800 border-2 border-slate-200 dark:border-white/20 overflow-hidden flex items-center justify-center shadow-lg relative z-0">
          <svg viewBox="0 0 24 24" role="img" :aria-label="$t('staff.s079')"
            class="w-10 h-10 text-slate-500 dark:text-studio-300" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 22v-2a8 8 0 0 1 16 0v2" />
          </svg>
        </div>
        <img v-if="frameUrl" :src="frameUrl" :alt="$t('shop.frame_type')" class="pointer-events-none absolute -inset-3 z-10 h-[calc(100%+1.5rem)] w-[calc(100%+1.5rem)] max-w-none object-contain" />
      </div>

      <div class="mt-3 text-center">
        <span class="text-xs font-bold text-slate-900 dark:text-white tracking-wide drop-shadow-md">
          {{ username || $t('staff.s080') }}
        </span>
        <p class="text-[10px] text-brand-300 font-mono drop-shadow"> {{ $t('staff.s081') }} </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  frameUrl: {
    type: String,
    default: ''
  },
  backgroundUrl: {
    type: String,
    default: ''
  },
  username: {
    type: String,
    default: ''
  }
})

const bgStyle = computed(() => {
  if (props.backgroundUrl) {
    return { backgroundImage: `url(${props.backgroundUrl})` }
  }
  return {}
})
</script>
