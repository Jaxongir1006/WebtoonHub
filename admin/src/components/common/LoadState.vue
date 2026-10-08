<template>
  <div v-if="loading" class="p-8 text-center text-slate-600 dark:text-studio-300" role="status" aria-live="polite">{{ $t('common.loading') }}</div>
  <div v-else-if="error" class="rounded-xl border border-rose-300 dark:border-rose-500/40 p-5 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-200" role="alert">
    <p>{{ error }}</p><Button class="mt-3" variant="outline" @click="$emit('retry')">{{ $t('common.retry') }}</Button>
  </div>
  <div v-else-if="empty" class="p-8 text-center text-slate-600 dark:text-studio-300" role="status">{{ $t('common.no_results') }}</div>
</template>
<script setup>
import Button from './Button.vue'
defineProps({ loading: Boolean, error: String, empty: Boolean })
defineEmits(['retry'])
</script>
