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
  solid: Boolean,
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
  if (props.solid && props.variant === 'success') return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
  if (props.solid && props.variant === 'primary') return 'bg-brand-100 text-brand-900 dark:bg-brand-950 dark:text-brand-200 border border-brand-300 dark:border-brand-700'
  switch (props.variant) {
    case 'primary':
      return 'bg-brand-500/15 text-brand-700 dark:text-brand-300 border border-brand-500/30'
    case 'success':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
    case 'warning':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
    case 'danger':
      return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
    case 'info':
      return 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30'
    case 'purple':
      return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30'
    default:
      return 'bg-slate-100 dark:bg-studio-800 text-slate-700 dark:text-studio-300 border border-slate-300 dark:border-studio-700'
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
