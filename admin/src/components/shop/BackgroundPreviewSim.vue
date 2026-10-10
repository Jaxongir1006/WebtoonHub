<template>
  <figure class="w-full">
    <div class="relative isolate min-h-64 overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 p-5 dark:border-white/10">
      <img v-if="source && !posterFailed" :src="source" :alt="item.name || $t('shop.bg_type')" class="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-center" @error="handleError" />
      <div class="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/45 to-slate-950/80" />
      <div class="flex items-center gap-3 py-4">
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-white/30 bg-slate-800 text-white">
          <svg viewBox="0 0 24 24" aria-hidden="true" class="h-9 w-9" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4" /><path d="M4 22v-2a8 8 0 0 1 16 0v2" /></svg>
        </div>
        <div class="space-y-1"><p class="text-sm font-bold text-white">{{ $t('staff.s080') }}</p><p class="text-xs text-slate-200">{{ $t('backgroundArt.profilePreview') }}</p></div>
      </div>
      <div class="space-y-3">
        <div class="rounded-xl border border-white/15 bg-slate-950/65 p-3"><p class="text-xs font-semibold text-white">{{ $t('backgroundArt.activity') }}</p><div class="mt-3 grid grid-cols-3 gap-2"><span v-for="index in 3" :key="index" class="h-5 rounded bg-white/15" /></div></div>
        <div class="rounded-xl border border-white/15 bg-slate-950/65 p-3"><p class="text-xs font-semibold text-white">{{ $t('backgroundArt.collection') }}</p><div class="mt-3 flex gap-2"><span v-for="index in 4" :key="index" class="h-10 w-8 rounded bg-white/15" /></div></div>
      </div>
    </div>
    <button v-if="item.asset_animated && item.asset_url" type="button" class="mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-studio-700 dark:text-studio-100 dark:hover:bg-studio-800" :aria-pressed="playing" @click="playing = !playing; animationFailed = false">
      <span aria-hidden="true">{{ playing ? 'Ⅱ' : '▶' }}</span>{{ $t(playing ? 'backgroundArt.pause' : 'backgroundArt.play') }}
    </button>
    <figcaption v-if="animationFailed || posterFailed" role="status" class="mt-2 text-xs text-amber-700 dark:text-amber-300">{{ $t(animationFailed ? 'backgroundArt.animationUnavailable' : 'backgroundArt.previewUnavailable') }}</figcaption>
  </figure>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { backgroundPreviewSource } from '../../utils/backgroundMedia'
const props = defineProps({ item: { type: Object, required: true } })
// Starting paused respects reduced motion and keeps lists from playing many animations at once.
const playing = ref(false), animationFailed = ref(false), posterFailed = ref(false)
const source = computed(() => backgroundPreviewSource(props.item, playing.value))
function handleError() {
  if (playing.value) { playing.value = false; animationFailed.value = true }
  else posterFailed.value = true
}
watch(() => [props.item.asset_url, props.item.asset_preview_url, props.item.asset_animated], () => { playing.value = false; animationFailed.value = false; posterFailed.value = false })
</script>
