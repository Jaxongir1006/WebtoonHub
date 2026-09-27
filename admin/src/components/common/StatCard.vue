<template>
  <div
    class="glass-card rounded-2xl p-6 relative overflow-hidden group hover:border-slate-300 dark:hover:border-studio-700 transition-all duration-300"
  >
    <!-- Background Glow -->
    <div
      :class="[
        'absolute -right-8 -top-8 w-28 h-28 rounded-full blur-2xl opacity-10 dark:opacity-15 transition-opacity group-hover:opacity-20 dark:group-hover:opacity-25',
        glowColorClass
      ]"
    />

    <div class="flex items-start justify-between">
      <div>
        <p class="text-xs font-semibold text-slate-500 dark:text-studio-400 uppercase tracking-wider">
          {{ label }}
        </p>
        <h4 class="text-2xl font-extrabold text-slate-900 dark:text-studio-100 mt-1 tracking-tight font-mono">
          {{ value }}
        </h4>
      </div>

      <div
        :class="[
          'p-3 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-110 duration-200',
          iconContainerClass
        ]"
      >
        <slot name="icon" />
      </div>
    </div>

    <div v-if="subtext" class="mt-4 flex items-center gap-1.5 text-xs">
      <span
        v-if="trend"
        :class="trend > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
        class="font-semibold flex items-center gap-0.5"
      >
        {{ trend > 0 ? '↑' : '↓' }} {{ Math.abs(trend) }}%
      </span>
      <span class="text-slate-500 dark:text-studio-400">{{ subtext }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number],
    required: true
  },
  trend: {
    type: Number,
    default: null
  },
  subtext: {
    type: String,
    default: ''
  },
  variant: {
    type: String,
    default: 'brand',
    validator: (v) => ['brand', 'cyan', 'purple', 'emerald', 'rose'].includes(v)
  }
})

const glowColorClass = computed(() => {
  switch (props.variant) {
    case 'cyan': return 'bg-cyan-500'
    case 'purple': return 'bg-purple-500'
    case 'emerald': return 'bg-emerald-500'
    case 'rose': return 'bg-rose-500'
    default: return 'bg-brand-500'
  }
})

const iconContainerClass = computed(() => {
  switch (props.variant) {
    case 'cyan': return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
    case 'purple': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
    case 'emerald': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    case 'rose': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
    default: return 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20'
  }
})
</script>
