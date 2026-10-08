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
          ref="dialog" @input.capture="hasChanges = true" @change.capture="hasChanges = true" @drop.capture="hasChanges = true" role="dialog" aria-modal="true" :aria-labelledby="titleId" :aria-describedby="description ? descriptionId : undefined" :aria-busy="busy" tabindex="-1"
          class="relative w-full max-h-[calc(100dvh-2rem)] flex flex-col glass-panel rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden transform transition-all duration-200 bg-white dark:bg-studio-900"
          :class="maxWidthClass"
        >
          <!-- Header -->
          <div class="shrink-0 px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
            <div>
              <h3 :id="titleId" class="text-lg font-bold text-slate-900 dark:text-studio-100 flex items-center gap-2">
                <slot name="icon" />
                {{ title }}
              </h3>
              <p :id="descriptionId" v-if="description" class="text-xs text-slate-500 dark:text-studio-400 mt-0.5">
                {{ description }}
              </p>
            </div>
            <button
              class="p-1.5 rounded-lg text-slate-600 dark:text-studio-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:text-studio-100 dark:hover:bg-studio-800/80 transition-colors"
              type="button" :disabled="busy" :aria-label="$t('common.close')"
              @click="close()"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="p-4 sm:p-6 min-h-0 overflow-y-auto">
            <slot />
          </div>

          <!-- Footer -->
          <div
            v-if="$slots.footer"
            class="shrink-0 px-4 sm:px-6 py-4 bg-slate-50 dark:bg-studio-900/60 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-3"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch, nextTick, onUnmounted, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { registerDialog, unregisterDialog, isTopDialog } from '../../utils/dialogs'
import { draftFingerprint } from '../../utils/drafts'
const { t } = useI18n()
const props = defineProps({ modelValue: Boolean, title: { type: String, default: '' }, description: String, maxWidth: { type: String, default: 'md' }, closeOnBackdrop: { type: Boolean, default: true }, busy: Boolean, dirty: Boolean, draft: { default: undefined }, preserveOnClose: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue', 'close'])
const dialog = ref(null)
const hasChanges = ref(false)
const initialDraft = ref('')
const draftChanged = computed(() => props.draft !== undefined ? draftFingerprint(props.draft) !== initialDraft.value : hasChanges.value)
const titleId = useId()
const descriptionId = useId()
const maxWidthClass = computed(() => ({sm:'max-w-sm',md:'max-w-md',lg:'max-w-lg',xl:'max-w-xl','2xl':'max-w-2xl','3xl':'max-w-3xl','4xl':'max-w-4xl'}[props.maxWidth] || 'max-w-md'))
let previousFocus = null
function close() {
  if (props.busy || (!props.preserveOnClose && (props.dirty || draftChanged.value) && !window.confirm(t('common.discard_changes')))) return
  emit('update:modelValue', false)
  emit('close')
}
function keydown(event) {
  if (!props.modelValue || !isTopDialog(titleId)) return
  if (event.key === 'Escape') { event.preventDefault(); close() }
  if (event.key !== 'Tab') return
  const nodes = [...(dialog.value?.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]') || [])].filter(el => el.offsetParent !== null)
  const first = nodes[0], last = nodes.at(-1)
  if (!first) { event.preventDefault(); dialog.value?.focus(); return }
  if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
watch(() => props.modelValue, async open => {
  if (open) {
    hasChanges.value = false
    initialDraft.value = draftFingerprint(props.draft)
    previousFocus = document.activeElement
    registerDialog(titleId)
    await nextTick()
    dialog.value?.focus()
    window.addEventListener('keydown', keydown)
  } else {
    unregisterDialog(titleId)
    window.removeEventListener('keydown', keydown)
    if (previousFocus?.isConnected) previousFocus.focus()
  }
}, { immediate: true })
defineExpose({ close })
onUnmounted(() => { unregisterDialog(titleId); window.removeEventListener('keydown', keydown) })
</script>
