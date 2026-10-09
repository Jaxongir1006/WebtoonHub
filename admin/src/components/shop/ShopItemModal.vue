<template>
  <Modal ref="draftDialog" :busy="isSubmitting" :draft="form"
    :model-value="modelValue"
    :title="isCard ? $t(isEdit ? 'collectibleCards.editTitle' : 'collectibleCards.createTitle') : isEdit ? $t('shop.modal_edit_title') : $t('shop.modal_title')"
    :description="isCard ? $t('collectibleCards.modalDescription') : isEdit ? $t('shop.edit_desc') : $t('shop.modal_desc')"
    :max-width="isCard ? '2xl' : 'lg'"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form @submit.prevent="handleSubmit">
      <fieldset :disabled="isSubmitting" class="space-y-4">
      <!-- Item Name -->
      <div>
        <label for="ShopItemModal-field-1" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
          {{ isCard ? $t('collectibleCards.cardName') : $t('shop.field_name') }}
        </label>
        <input
          id="ShopItemModal-field-1"
          v-model="form.name"
          type="text"
          required
          maxlength="100"
          :disabled="identityLocked"
          :placeholder="isEdit ? '' : isCard ? $t('collectibleCards.namePlaceholder') : $t('staff.s082')"
          class="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70"
        />
      </div>

      <!-- Cards are created for gacha; only cosmetics have a shop price. -->
      <div class="grid gap-4" :class="isCard ? 'grid-cols-1' : 'grid-cols-2'">
        <div>
          <label for="ShopItemModal-field-2" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
            {{ $t('shop.field_type') }}
          </label>
          <select
            id="ShopItemModal-field-2"
            v-model="form.item_type"
            :disabled="isEdit"
            class="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70"
          >
            <option value="frame">{{ $t('shop.frame_type') }} {{ $t('staff.s083') }} </option>
            <option value="background">{{ $t('shop.bg_type') }} {{ $t('staff.s084') }} </option>
            <option value="card">{{ $t('collectibleCards.type') }}</option>
          </select>
        </div>

        <div v-if="!isCard">
          <label for="ShopItemModal-field-3" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
            {{ $t('shop.field_price') }}
          </label>
          <input
            id="ShopItemModal-field-3"
            v-model.number="form.price_coins"
            type="number"
            min="1"
            required
            placeholder="50"
            class="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-brand-700 dark:text-brand-500 dark:text-brand-400 font-bold font-mono focus:outline-none focus:border-brand-500/70"
          />
        </div>
      </div>

      <section v-if="isCard" class="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-studio-700">
        <p class="text-xs text-slate-600 dark:text-studio-300">{{ $t('collectibleCards.description') }}</p>
        <p class="rounded-lg bg-brand-500/10 p-2 text-xs text-brand-800 dark:text-brand-300">{{ $t('gacha.cardOnlyHint') }}</p>
        <p v-if="identityLocked" class="rounded-lg bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">{{ $t('collectibleCards.identityLocked') }}</p>
        <div class="grid gap-3 sm:grid-cols-2">
          <div><label for="card-character" class="mb-1 block text-xs font-semibold">{{ $t('collectibleCards.character') }}</label><input id="card-character" v-model="form.character_name" :disabled="identityLocked" maxlength="100" required class="card-input" /></div>
          <div><label for="card-rarity" class="mb-1 block text-xs font-semibold">{{ $t('collectibleCards.rarity') }}</label><select id="card-rarity" v-model="form.rarity" :disabled="identityLocked" required class="card-input"><option v-for="rarity in CARD_RARITIES" :key="rarity" :value="rarity">{{ $t('collectibleCards.rarities.' + rarity) }}</option></select></div>
        </div>
        <div><label for="card-series-link" class="mb-1 block text-xs font-semibold">{{ $t('collectibleCards.association') }}</label><select id="card-series-link" v-model="form.webtoon_id" :disabled="identityLocked || loadingSeries" class="card-input" @change="associateSeries"><option :value="null">{{ $t(loadingSeries ? 'collectibleCards.loadingSeries' : 'collectibleCards.noAssociation') }}</option><option v-for="series in seriesList" :key="series.id" :value="series.id">{{ series.title }}</option></select><p v-if="catalogError" class="mt-1 text-xs text-amber-700 dark:text-amber-300">{{ $t('collectibleCards.catalogUnavailable') }}</p></div>
        <div><label for="card-series-title" class="mb-1 block text-xs font-semibold">{{ $t('collectibleCards.series') }}</label><input id="card-series-title" v-model="form.series_title" :disabled="identityLocked" maxlength="255" class="card-input" /></div>
      </section>

      <!-- Live Simulator Preview -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
          {{ isCard ? $t('collectibleCards.preview') : $t('shop.field_live_sim') }}
        </label>
        <CardArtPreview v-if="isCard" :item="previewCard" />
        <FramePreviewSim v-else
          :frame-url="form.item_type === 'frame' ? form.asset_url : ''"
          :background-url="form.item_type === 'background' ? form.asset_url : ''"
        />
      </div>

      <!-- Asset File Upload (No manual URL needed) -->
      <div>
        <div v-if="form.item_type === 'frame'" class="mb-3 space-y-2 rounded-xl border border-brand-500/20 bg-brand-500/5 p-3">
          <p class="text-xs leading-relaxed text-slate-700 dark:text-studio-200">{{ $t('shop.frame_art_help') }}</p>
          <p class="text-xs leading-relaxed text-slate-600 dark:text-studio-300">{{ $t('shop.frame_art_warning') }}</p>
          <a :href="frameTemplateUrl" download="avatar-frame-template.svg" class="inline-block text-xs font-semibold text-brand-700 underline dark:text-brand-400">{{ $t('shop.frame_template') }} ↓</a>
        </div>
        <label for="ShopItemModal-label-4123" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span>{{ isCard ? $t('collectibleCards.artwork') : form.item_type === 'frame' ? $t('staff.s085') : $t('staff.s086') }}</span>
          <span v-if="selectedFileName" class="text-[11px] font-mono text-brand-700 dark:text-brand-500 font-normal truncate max-w-xs">
            ✓ {{ selectedFileName }}
          </span>
        </label>

        <div
          class="border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer relative bg-slate-50 dark:bg-studio-900/60 border-slate-200 dark:border-white/10 hover:border-brand-500/50"
          role="button" tabindex="0" :aria-label="isCard ? $t('collectibleCards.artwork') : $t('staff.s088')"
          @click="$refs.assetFileInput.click()"
          @keydown.enter.prevent="$refs.assetFileInput.click()" @keydown.space.prevent="$refs.assetFileInput.click()"
        >
          <input id="ShopItemModal-label-4123"
            ref="assetFileInput"
            type="file"
            :accept="isCard ? '.png,.jpg,.jpeg,.webp,.gif' : form.item_type === 'frame' ? '.svg,.png,.webp' : '.svg,.png,.jpg,.jpeg,.webp'"
            class="hidden"
            @change="handleAssetFile"
          />

          <div class="flex flex-col items-center justify-center gap-1.5">
            <div class="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-700 dark:text-brand-500 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p class="text-xs font-semibold text-slate-800 dark:text-studio-200">
              {{ selectedFileName ? $t('staff.s087') : $t('staff.s088') }}
            </p>
            <p class="text-[11px] text-slate-600 dark:text-studio-400">
              <template v-if="isCard">{{ $t('collectibleCards.artHint') }}</template><template v-else>{{ form.item_type === 'frame' ? $t('staff.s089') : $t('staff.s090') }} {{ $t('staff.s091') }}</template></p>
          </div>
        </div>
        <p v-if="isCard" class="mt-2 text-xs text-slate-500 dark:text-studio-400">{{ $t('collectibleCards.animationHint') }}</p>
        <p v-if="previewLoading" role="status" class="mt-2 text-xs text-slate-500">{{ $t('collectibleCards.preparing') }}</p>
        <a v-if="isCard" :href="cardGuideUrl" target="_blank" rel="noopener" class="mt-2 inline-block text-xs font-semibold text-brand-700 underline dark:text-brand-400">{{ $t('collectibleCards.guide') }} ↗</a>
      </div>

      <p v-if="submitError" role="alert" class="text-sm text-rose-600 dark:text-rose-400">
        {{ submitError }}
      </p>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/5">
        <Button variant="ghost" size="sm" :disabled="isSubmitting" @click="$refs.draftDialog.close()">
          {{ $t('common.cancel') }}
        </Button>
        <Button type="submit" variant="primary" size="sm" :loading="isSubmitting" :disabled="previewLoading">
          {{ isEdit ? $t('common.save') : $t('shop.btn_submit') }}
        </Button>
      </div>

      </fieldset>
    </form>
  </Modal>
</template>

<script setup>
import i18n from '../../i18n/index.js'
const tr = (...args) => i18n.global.t(...args)

import { reactive, ref, computed, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '../common/Modal.vue'
import Button from '../common/Button.vue'
import FramePreviewSim from './FramePreviewSim.vue'
import CardArtPreview from './CardArtPreview.vue'
import { shopApi } from '../../api/shop'
import { CARD_RARITIES, cardFileError, cardItemMetadata, createLocalCardMedia, releaseLocalCardMedia } from '../../utils/cardMedia'

const { t } = useI18n()

const props = defineProps({
  modelValue: Boolean,
  initialType: { type: String, default: 'frame' },
  onSave: {
    type: Function,
    required: true
  },
  item: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])
const isSubmitting = ref(false)
const submitError = ref('')
const assetFileInput = ref(null)
const selectedFileName = ref('')
const previewLoading = ref(false)
const seriesList = ref([]), loadingSeries = ref(false), catalogError = ref(false)
let previewSequence = 0, catalogSequence = 0

const isEdit = computed(() => !!props.item)
const isCard = computed(() => form.item_type === 'card')
const identityLocked = computed(() => isCard.value && Boolean(props.item?.identity_locked || props.item?.owned_count > 0))
const cardGuideUrl = computed(() => import.meta.env.BASE_URL + 'guides/character-cards-guide.html#' + i18n.global.locale.value)
const frameTemplateUrl = import.meta.env.BASE_URL + 'templates/avatar-frame-template.svg'

const form = reactive({
  name: '',
  item_type: 'frame',
  price_coins: 50,
  asset_url: '',
  asset_file: null,
  asset_preview_url: '', asset_animated: false,
  rarity: 'common', character_name: '', series_title: '', webtoon_id: null
})
const previewCard = computed(() => ({ asset_url: form.asset_url, asset_preview_url: form.asset_preview_url, asset_animated: form.asset_animated, rarity: form.rarity, name: form.name, character_name: form.character_name }))

watch(
  () => [props.modelValue, props.item],
  ([isOpen, newItem]) => {
    previewSequence++
    if (!isOpen) { catalogSequence++; clearLocalMedia(); return }
    clearLocalMedia()
    previewLoading.value = false
    submitError.value = ''
    if (assetFileInput.value) assetFileInput.value.value = ''
    if (newItem) {
      form.name = newItem.name || ''
      form.item_type = newItem.item_type || 'frame'
      form.price_coins = newItem.price_coins ?? 50
      form.asset_url = newItem.asset_url || ''
      form.asset_file = null
      form.asset_preview_url = newItem.asset_preview_url || ''
      form.asset_animated = newItem.asset_animated === true
      form.rarity = newItem.rarity || 'common'; form.character_name = newItem.character_name || ''
      form.series_title = newItem.series_title || ''; form.webtoon_id = newItem.webtoon_id || null
      selectedFileName.value = newItem.asset_url ? newItem.name : ''
    } else {
      form.name = ''
      form.item_type = ['frame', 'background', 'card'].includes(props.initialType) ? props.initialType : 'frame'
      form.price_coins = 50
      form.asset_url = ''
      form.asset_file = null
      form.asset_preview_url = ''; form.asset_animated = false
      form.rarity = 'common'; form.character_name = ''; form.series_title = ''; form.webtoon_id = null
      selectedFileName.value = ''
    }
  },
  { immediate: true }
)

function clearLocalMedia() { releaseLocalCardMedia(form); if (form.asset_url.startsWith('blob:')) form.asset_url = ''; if (form.asset_preview_url.startsWith('blob:')) form.asset_preview_url = '' }
async function handleAssetFile(e) {
  const file = e.target.files[0]
  e.target.value = ''
  if (!file) return
  const sequence = ++previewSequence
  previewLoading.value = false
  submitError.value = ''
  if (isCard.value) {
    const error = cardFileError(file)
    if (error) { submitError.value = t('collectibleCards.' + error); return }
    previewLoading.value = true
    try {
      const media = await createLocalCardMedia(file)
      if (sequence !== previewSequence || !props.modelValue || !isCard.value) { releaseLocalCardMedia(media); return }
      clearLocalMedia(); Object.assign(form, media); form.asset_file = file; selectedFileName.value = file.name
    } catch (error) { if (sequence === previewSequence) submitError.value = t('collectibleCards.' + (error.code || 'file_decode')) }
    finally { if (sequence === previewSequence) previewLoading.value = false }
    return
  }
  clearLocalMedia()
  selectedFileName.value = file.name
  form.asset_file = file
  form.asset_url = URL.createObjectURL(file)
}

async function handleSubmit() {
  if (isSubmitting.value || previewLoading.value) return
  if (isCard.value && !form.character_name.trim()) { submitError.value = t('collectibleCards.requiredCharacter'); return }
  if (isCard.value && !CARD_RARITIES.includes(form.rarity)) { submitError.value = t('collectibleCards.requiredRarity'); return }
  if (isCard.value && form.asset_file && cardFileError(form.asset_file)) { submitError.value = t('collectibleCards.' + cardFileError(form.asset_file)); return }
  if (!props.item && !form.asset_file) {
    submitError.value = isCard.value ? t('collectibleCards.requiredArt') : tr('staff.s099')
    return
  }
  isSubmitting.value = true
  submitError.value = ''
  try {
    let finalUrl = form.asset_url
    // Creation accepts the file in the same request. Editing needs a separate upload.
    if (props.item && form.asset_file) {
      const res = await shopApi.uploadAsset(form.asset_file, form.item_type)
      finalUrl = res.data?.asset_url
      if (!finalUrl) throw new Error(tr('staff.s100'))
      clearLocalMedia()
      form.asset_url = finalUrl
      form.asset_preview_url = res.data?.asset_preview_url || ''
      form.asset_animated = res.data?.asset_animated === true
      form.asset_file = null
    }
    await props.onSave({
      name: form.name,
      ...(!props.item ? { item_type: form.item_type } : {}),
      ...(!isCard.value ? { price_coins: form.price_coins } : {}),
      asset_url: form.asset_file && !props.item ? '' : finalUrl,
      ...(isCard.value ? cardItemMetadata(form) : {}),
      asset_file: props.item ? undefined : form.asset_file
    })
    emit('update:modelValue', false)
  } catch (err) {
    console.error('Failed to submit shop item', err)
    submitError.value = err.response?.data?.error?.message || err.response?.data?.detail || err.message || tr('common.error')
  } finally {
    isSubmitting.value = false
  }
}

async function loadSeries() {
  const sequence = ++catalogSequence; loadingSeries.value = true; catalogError.value = false
  try {
    const items = []; let page = 1, total = Infinity
    while (items.length < total) { const result = await shopApi.getSeries({ page, limit: 100 }); const batch = result.data?.items || []; items.push(...batch); total = result.data?.total ?? items.length; if (!batch.length || sequence !== catalogSequence) break; page++ }
    if (sequence === catalogSequence) seriesList.value = items
  } catch { if (sequence === catalogSequence) catalogError.value = true }
  finally { if (sequence === catalogSequence) loadingSeries.value = false }
}
function associateSeries() { const series = seriesList.value.find(item => item.id === form.webtoon_id); if (series) form.series_title = series.title }
watch(() => [props.modelValue, isCard.value], ([open, card]) => { if (open && card) loadSeries() }, { immediate: true })
watch(() => form.item_type, () => { previewSequence++; previewLoading.value = false; clearLocalMedia(); form.asset_file = null; selectedFileName.value = form.asset_url ? form.name : '' })
onUnmounted(() => { previewSequence++; catalogSequence++; clearLocalMedia() })
</script>

<style scoped>
.card-input { width: 100%; min-height: 42px; padding: .5rem .65rem; border: 1px solid rgb(148 163 184 / .4); border-radius: .65rem; background: transparent; color: inherit; font-size: .8rem; }
.card-input:disabled { opacity: .6; }
.card-input:focus-visible { outline: 2px solid #d79a26; outline-offset: 2px; }
</style>
