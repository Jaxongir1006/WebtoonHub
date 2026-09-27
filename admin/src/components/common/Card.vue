<template>
  <div
    :class="[
      'glass-card rounded-2xl overflow-hidden transition-all duration-300',
      hover ? 'hover:border-slate-300 dark:hover:border-studio-700 hover:shadow-xl hover:-translate-y-0.5' : '',
      customClass
    ]"
  >
    <div
      v-if="$slots.header || title"
      class="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between"
    >
      <slot name="header">
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-studio-100 text-base flex items-center gap-2">
            <slot name="icon" />
            {{ title }}
          </h3>
          <p v-if="subtitle" class="text-xs text-slate-500 dark:text-studio-400 mt-0.5">{{ subtitle }}</p>
        </div>
        <div v-if="$slots.actions">
          <slot name="actions" />
        </div>
      </slot>
    </div>

    <div :class="['p-6', noPadding ? '!p-0' : '']">
      <slot />
    </div>

    <div
      v-if="$slots.footer"
      class="px-6 py-3.5 bg-slate-50 dark:bg-studio-900/40 border-t border-slate-100 dark:border-white/5 text-xs text-slate-500 dark:text-studio-400 flex items-center justify-between"
    >
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  hover: {
    type: Boolean,
    default: false
  },
  noPadding: {
    type: Boolean,
    default: false
  },
  customClass: {
    type: String,
    default: ''
  }
})
</script>
