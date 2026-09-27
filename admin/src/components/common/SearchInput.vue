<template>
  <div class="relative w-full">
    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-studio-400">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
    <input
      :value="modelValue"
      type="text"
      :placeholder="placeholder"
      class="w-full pl-10 pr-9 py-2 text-sm bg-white dark:bg-studio-900/60 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 placeholder-slate-400 dark:placeholder-studio-500 focus:outline-none focus:border-brand-500/70 focus:ring-1 focus:ring-brand-500/50 transition-all duration-200 shadow-sm dark:shadow-none"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <button
      v-if="modelValue"
      class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:text-studio-400 dark:hover:text-studio-200 transition-colors"
      @click="$emit('update:modelValue', '')"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'Qidirish...'
  }
})

defineEmits(['update:modelValue'])
</script>
