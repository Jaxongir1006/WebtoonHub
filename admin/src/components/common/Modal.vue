<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/40 dark:bg-studio-950/80 backdrop-blur-md"
        @click.self="closeOnBackdrop && close()"
      >
        <div
          class="relative w-full glass-panel rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden transform transition-all duration-200 bg-white dark:bg-studio-900"
          :class="maxWidthClass"
        >
          <!-- Header -->
          <div class="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
            <div>
              <h3 class="text-lg font-bold text-slate-900 dark:text-studio-100 flex items-center gap-2">
                <slot name="icon" />
                {{ title }}
              </h3>
              <p v-if="description" class="text-xs text-slate-500 dark:text-studio-400 mt-0.5">
                {{ description }}
              </p>
            </div>
            <button
              class="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:text-studio-400 dark:hover:text-studio-100 dark:hover:bg-studio-800/80 transition-colors"
              @click="close()"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="p-6 max-h-[75vh] overflow-y-auto">
            <slot />
          </div>

          <!-- Footer -->
          <div
            v-if="$slots.footer"
            class="px-6 py-4 bg-slate-50 dark:bg-studio-900/60 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-3"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  maxWidth: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'].includes(v)
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

const maxWidthClass = computed(() => {
  switch (props.maxWidth) {
    case 'sm': return 'max-w-sm'
    case 'lg': return 'max-w-lg'
    case 'xl': return 'max-w-xl'
    case '2xl': return 'max-w-2xl'
    case '3xl': return 'max-w-3xl'
    case '4xl': return 'max-w-4xl'
    default: return 'max-w-md'
  }
})

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function onKeyDown(e) {
  if (e.key === 'Escape' && props.modelValue) {
    close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>
