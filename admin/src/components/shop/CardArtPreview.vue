<template>
  <figure class="mx-auto w-full max-w-[240px]">
    <div class="relative aspect-[3/4] overflow-hidden rounded-2xl border-2 bg-slate-950 shadow-lg" :class="rarityClass">
      <img v-if="source && !posterFailed" :src="source" :alt="alt || item.character_name || item.name || $t('collectibleCards.type')" class="h-full w-full object-contain" loading="lazy" @error="handleError" />
      <div v-else class="flex h-full items-center justify-center p-4 text-center text-xs text-slate-300">{{ $t(posterFailed ? 'collectibleCards.previewUnavailable' : 'collectibleCards.chooseArt') }}</div>
      <span v-if="item.rarity" class="absolute left-2 top-2 rounded-full bg-slate-950/90 px-2 py-1 text-[10px] font-bold text-white">{{ $t('collectibleCards.rarities.' + item.rarity) }}</span>
    </div>
    <button v-if="item.asset_animated && item.asset_url" type="button" class="mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-studio-700 dark:text-studio-100 dark:hover:bg-studio-800" :aria-pressed="playing" @click="playing = !playing; animationFailed = false">
      <span aria-hidden="true">{{ playing ? 'Ⅱ' : '▶' }}</span>{{ $t(playing ? 'collectibleCards.pause' : 'collectibleCards.play') }}
    </button>
    <figcaption v-if="animationFailed" role="status" class="mt-2 text-xs text-amber-700 dark:text-amber-300">{{ $t('collectibleCards.animationUnavailable') }}</figcaption>
  </figure>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { CARD_RARITY_CLASSES, cardPreviewSource } from '../../utils/cardMedia'
const props = defineProps({ item: { type: Object, required: true }, alt: { type: String, default: '' } })
const playing = ref(false), animationFailed = ref(false), posterFailed = ref(false)
const source = computed(() => cardPreviewSource(props.item, playing.value))
const rarityClass = computed(() => CARD_RARITY_CLASSES[props.item.rarity] || CARD_RARITY_CLASSES.common)
function handleError() {
  if (playing.value) { playing.value = false; animationFailed.value = true }
  else posterFailed.value = true
}
watch(() => [props.item.asset_url, props.item.asset_preview_url, props.item.asset_animated], () => { playing.value = false; animationFailed.value = false; posterFailed.value = false })
</script>
