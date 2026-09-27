<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]',
      sizeClasses,
      variantClasses
    ]"
    @click="$emit('click', $event)"
  >
    <svg
      v-if="loading"
      class="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      ></circle>
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
    <slot name="icon-left" />
    <slot />
    <slot name="icon-right" />
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'button'
  },
  variant: {
    type: String,
    default: 'primary',
    validator: (v) =>
      ['primary', 'secondary', 'danger', 'success', 'ghost', 'outline'].includes(v)
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['xs', 'sm', 'md', 'lg'].includes(v)
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'px-2.5 py-1 text-xs gap-1'
    case 'sm':
      return 'px-3 py-1.5 text-xs gap-1.5'
    case 'lg':
      return 'px-6 py-3 text-base gap-2.5 shadow-lg'
    default:
      return 'px-4 py-2.5 text-sm gap-2 shadow-md'
  }
})

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-slate-950 font-semibold shadow-glow-brand border border-brand-400/40'
    case 'secondary':
      return 'bg-studio-850 hover:bg-studio-800 text-studio-100 border border-studio-700 hover:border-studio-600'
    case 'danger':
      return 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40'
    case 'success':
      return 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
    case 'ghost':
      return 'bg-transparent hover:bg-studio-800/60 text-studio-300 hover:text-studio-100 shadow-none'
    case 'outline':
      return 'bg-transparent hover:bg-studio-850 text-studio-200 border border-studio-700 hover:border-studio-500'
    default:
      return 'bg-studio-800 text-studio-100'
  }
})
</script>
