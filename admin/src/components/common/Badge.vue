<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide uppercase transition-all duration-200',
      badgeClasses
    ]"
  >
    <span v-if="dot" class="w-1.5 h-1.5 rounded-full" :class="dotClasses" />
    <slot />
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: (v) =>
      ['default', 'primary', 'success', 'warning', 'danger', 'info', 'purple'].includes(v)
  },
  dot: {
    type: Boolean,
    default: false
  }
})

const badgeClasses = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'bg-brand-500/15 text-brand-300 border border-brand-500/30'
    case 'success':
      return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
    case 'warning':
      return 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
    case 'danger':
      return 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
    case 'info':
      return 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
    case 'purple':
      return 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
    default:
      return 'bg-studio-800 text-studio-300 border border-studio-700'
  }
})

const dotClasses = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'bg-brand-400 animate-pulse'
    case 'success':
      return 'bg-emerald-400 animate-pulse'
    case 'warning':
      return 'bg-amber-400'
    case 'danger':
      return 'bg-rose-400'
    case 'info':
      return 'bg-cyan-400'
    case 'purple':
      return 'bg-purple-400'
    default:
      return 'bg-studio-400'
  }
})
</script>
