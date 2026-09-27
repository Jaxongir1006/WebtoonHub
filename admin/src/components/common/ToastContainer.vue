<template>
  <div class="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
    <TransitionGroup
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform translate-y-4 opacity-0 scale-95"
      enter-to-class="transform translate-y-0 opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform translate-y-0 opacity-100 scale-100"
      leave-to-class="transform translate-y-2 opacity-0 scale-95"
    >
      <div
        v-for="toast in systemStore.toasts"
        :key="toast.id"
        class="pointer-events-auto p-4 rounded-xl shadow-2xl border flex items-start gap-3 glass-panel"
        :class="getToastClasses(toast.type)"
      >
        <!-- Icon -->
        <div class="mt-0.5 shrink-0">
          <svg
            v-if="toast.type === 'success'"
            class="w-5 h-5 text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <svg
            v-else-if="toast.type === 'error'"
            class="w-5 h-5 text-rose-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <svg
            v-else
            class="w-5 h-5 text-brand-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <!-- Text -->
        <div class="flex-1 min-w-0">
          <h5 v-if="toast.title" class="text-sm font-semibold text-studio-100">
            {{ toast.title }}
          </h5>
          <p class="text-xs text-studio-300 mt-0.5 leading-relaxed">
            {{ toast.message }}
          </p>
        </div>

        <!-- Close -->
        <button
          class="shrink-0 text-studio-400 hover:text-studio-200 transition-colors"
          @click="systemStore.removeToast(toast.id)"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useSystemStore } from '../../stores/system'

const systemStore = useSystemStore()

function getToastClasses(type) {
  switch (type) {
    case 'success':
      return 'border-emerald-500/30 bg-emerald-950/40 text-emerald-200'
    case 'error':
      return 'border-rose-500/30 bg-rose-950/40 text-rose-200'
    default:
      return 'border-brand-500/30 bg-brand-950/40 text-brand-200'
  }
}
</script>
