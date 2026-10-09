<template>
  <section class="space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div><h2 class="text-xl font-extrabold text-slate-900 dark:text-white">{{ $t('gacha.title') }}</h2><p class="mt-1 max-w-3xl text-sm text-slate-600 dark:text-studio-300">{{ $t('gacha.description') }}</p></div>
      <div class="flex gap-2"><Button variant="secondary" :disabled="loading" @click="loadPools()">{{ $t('gacha.refresh') }}</Button><Button @click="openCreate">{{ $t('gacha.newPool') }}</Button></div>
    </div>
    <div class="rounded-xl border border-brand-500/20 bg-brand-500/5 p-4 text-sm text-slate-700 dark:text-studio-200">
      <p>{{ $t('gacha.setupHint') }} <RouterLink v-if="canManageCards" to="/shop" class="font-bold text-brand-700 underline dark:text-brand-400">{{ $t('gacha.openCards') }}</RouterLink></p>
      <p class="mt-1">{{ $t('gacha.duplicateHint') }}</p>
    </div>
    <LoadState :loading="loading" :error="loadError" @retry="loadPools" />
    <p v-if="!loading && !loadError && !pools.length" class="rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-600 dark:border-white/10 dark:text-studio-300">{{ $t('gacha.empty') }}</p>
    <div v-if="pools.length" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <button v-for="pool in pools" :key="pool.id" type="button" :aria-pressed="selectedPool?.id === pool.id" class="rounded-2xl border p-4 text-left transition-colors" :class="selectedPool?.id === pool.id ? 'border-brand-500 bg-brand-500/5 ring-2 ring-brand-500/15' : 'border-slate-200 bg-white/50 dark:border-white/10 dark:bg-studio-900/50'" @click="selectPool(pool)">
        <div class="flex items-center justify-between gap-2"><strong class="text-sm text-slate-900 dark:text-white">{{ pool.title }}</strong><Badge :variant="pool.is_active ? 'success' : 'default'">{{ $t(pool.is_active ? 'gacha.active' : 'gacha.inactive') }}</Badge></div>
        <p class="mt-2 text-xs text-slate-600 dark:text-studio-300">⚡ {{ pool.cost_coins }} · {{ $t('gacha.cardsCount', { count: pool.cards_count ?? pool.cards?.length ?? 0 }) }}</p>
      </button>
    </div>
    <div v-if="selectedPool" class="space-y-5 rounded-2xl border border-slate-200 p-4 sm:p-6 dark:border-white/10">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div><h3 class="font-bold text-slate-900 dark:text-white">{{ selectedPool.title }}</h3><p v-if="selectedPool.description" class="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-studio-300">{{ selectedPool.description }}</p></div>
        <div class="flex gap-2"><Button size="sm" variant="secondary" @click="openEdit(selectedPool)">{{ $t('common.edit') }}</Button><Button v-if="selectedPool.is_active" size="sm" variant="outline" :disabled="archiving" @click="archivePool(selectedPool)">{{ $t('gacha.archive') }}</Button></div>
      </div>
      <p v-if="!poolReady(selectedPool)" class="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">{{ $t('gacha.notReady') }}</p>
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div v-for="rarity in GACHA_RARITIES" :key="rarity" class="rounded-xl border border-slate-200 p-3 dark:border-white/10"><p class="text-xs font-semibold">{{ $t('collectibleCards.rarities.' + rarity) }}</p><p class="mt-1 font-mono text-lg font-extrabold text-brand-700 dark:text-brand-300">{{ percentage(tierRate(selectedPool, rarity)) }}%</p><p class="text-xs text-slate-500 dark:text-studio-400">{{ $t('gacha.weight') }}: {{ selectedPool.rarity_weights?.[rarity] ?? 0 }}</p></div>
      </div>
      <p class="text-xs text-slate-600 dark:text-studio-300">{{ $t('gacha.ratesHint') }}</p>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs"><caption class="mb-3 text-left font-bold">{{ $t('gacha.poolCards') }}</caption><thead><tr class="border-b border-slate-200 dark:border-white/10"><th class="p-2">{{ $t('collectibleCards.cardName') }}</th><th class="p-2">{{ $t('collectibleCards.rarity') }}</th><th class="p-2">{{ $t('gacha.weight') }}</th><th class="p-2">{{ $t('gacha.actualChance') }}</th><th class="p-2">{{ $t('gacha.availability') }}</th></tr></thead><tbody><tr v-for="card in selectedPool.cards || []" :key="card.id" class="border-b border-slate-100 dark:border-white/5"><td class="p-2 font-semibold">{{ card.name }}<span v-if="card.character_name" class="block font-normal text-slate-500 dark:text-studio-400">{{ card.character_name }}</span></td><td class="p-2">{{ $t('collectibleCards.rarities.' + card.rarity) }}</td><td class="p-2 font-mono">{{ card.weight }}</td><td class="p-2 font-mono">{{ percentage(card.probability_percent) }}%</td><td class="p-2">{{ $t(card.is_available ? 'gacha.eligible' : 'gacha.hidden') }}</td></tr></tbody></table>
      </div>
      <div class="border-t border-slate-200 pt-4 dark:border-white/10">
        <div class="mb-3 flex items-center justify-between gap-2"><h4 class="text-sm font-bold">{{ $t('gacha.history') }}</h4><Button size="sm" variant="ghost" :disabled="historyLoading" @click="loadHistory(selectedPool.id)">{{ $t('gacha.refresh') }}</Button></div>
        <LoadState :loading="historyLoading" :error="historyError" @retry="loadHistory(selectedPool.id)" />
        <p v-if="!historyLoading && !historyError && !history.length" class="text-xs text-slate-600 dark:text-studio-300">{{ $t('gacha.noHistory') }}</p>
        <ol v-else-if="!historyLoading && !historyError" class="max-h-64 space-y-2 overflow-y-auto"><li v-for="roll in history" :key="roll.id" class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-xs dark:bg-studio-800/50"><div><strong>{{ roll.winning_card?.name || '—' }}</strong><p class="mt-1 text-slate-600 dark:text-studio-300">{{ $t('gacha.readerId', { id: roll.user_id }) }} · {{ formatDate(roll.created_at) }}</p></div><div class="text-right"><p>⚡ {{ roll.cost_paid }}</p><p v-if="roll.is_duplicate" class="text-emerald-700 dark:text-emerald-300">{{ $t('gacha.refunded', { count: roll.refund_coins }) }}</p></div></li></ol>
      </div>
    </div>

    <Modal ref="draftDialog" v-model="showModal" :draft="form" :busy="saving" :title="$t(editingPool ? 'gacha.editPool' : 'gacha.newPool')" :description="$t('gacha.formDescription')" max-width="3xl">
      <form @submit.prevent="savePool"><fieldset :disabled="saving" class="space-y-5">
        <p v-if="formError" role="alert" class="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">{{ formError }}</p>
        <div><label for="gacha-title" class="field-label">{{ $t('gacha.poolTitle') }}</label><input id="gacha-title" v-model="form.title" class="gacha-input" maxlength="100" required /></div>
        <div><label for="gacha-description" class="field-label">{{ $t('gacha.poolDescription') }}</label><textarea id="gacha-description" v-model="form.description" class="gacha-input" maxlength="5000" rows="2" /></div>
        <div class="grid gap-4 sm:grid-cols-2"><div><label for="gacha-cost" class="field-label">{{ $t('gacha.cost') }}</label><input id="gacha-cost" v-model.number="form.cost_coins" type="number" min="1" max="1000000" step="1" class="gacha-input" required /></div><div class="flex items-center gap-2 pt-6"><input id="gacha-active" v-model="form.is_active" type="checkbox" /><label for="gacha-active" class="text-sm">{{ $t('gacha.activate') }}</label></div></div>
        <p class="text-xs text-slate-600 dark:text-studio-300">{{ $t('gacha.duplicateHint') }}</p>
        <fieldset class="rounded-xl border border-slate-200 p-3 dark:border-white/10"><legend class="px-1 text-sm font-bold">{{ $t('gacha.rarityWeights') }}</legend><div class="grid grid-cols-2 gap-3 sm:grid-cols-4"><div v-for="rarity in GACHA_RARITIES" :key="rarity"><label :for="'gacha-weight-' + rarity" class="field-label">{{ $t('collectibleCards.rarities.' + rarity) }}</label><input :id="'gacha-weight-' + rarity" v-model.number="form.rarity_weights[rarity]" type="number" min="0" max="1000000" step="1" required class="gacha-input" /><p class="mt-1 text-xs font-mono">{{ percentage(draftRates.rarityRates.find(tier => tier.rarity === rarity)?.probability_percent) }}% · {{ $t('gacha.eligibleCount', { count: draftRates.rarityRates.find(tier => tier.rarity === rarity)?.eligible_count || 0 }) }}</p></div></div><p class="mt-3 text-xs text-slate-600 dark:text-studio-300">{{ $t('gacha.ratesHint') }}</p></fieldset>
        <section class="space-y-3"><h4 class="text-sm font-bold">{{ $t('gacha.selectCards') }}</h4><p class="text-xs text-slate-600 dark:text-studio-300">{{ $t('gacha.cardWeightHint') }}</p><LoadState :loading="catalogLoading" :error="catalogError" @retry="loadCatalog" /><label for="gacha-search" class="field-label">{{ $t('gacha.searchCards') }}</label><input id="gacha-search" v-model="cardSearch" type="search" class="gacha-input" /><p v-if="!catalogLoading && !visibleCards.length" class="text-xs text-slate-600 dark:text-studio-300">{{ $t('gacha.noCards') }}</p><div class="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-white/10"><div v-for="card in visibleCards" :key="card.id" class="grid grid-cols-[auto_minmax(0,1fr)_5rem] items-center gap-3 rounded-lg bg-slate-50 p-2 dark:bg-studio-800/60"><input :id="'gacha-card-' + card.id" type="checkbox" :checked="Boolean(memberFor(card.id))" @change="toggleCard(card, $event.target.checked)" /><label :for="'gacha-card-' + card.id" class="min-w-0 text-xs"><strong class="block break-words">{{ card.name }}</strong><span>{{ $t('collectibleCards.rarities.' + card.rarity) }} · {{ $t(card.is_available ? 'gacha.eligible' : 'gacha.hidden') }}</span><span v-if="memberFor(card.id)" class="block font-mono">{{ percentage(draftRates.cardRates.find(rate => rate.id === card.id)?.probability_percent) }}%</span></label><div v-if="memberFor(card.id)"><label :for="'gacha-card-weight-' + card.id" class="field-label">{{ $t('gacha.weight') }}</label><input :id="'gacha-card-weight-' + card.id" v-model.number="memberFor(card.id).weight" type="number" min="1" max="1000000" step="1" required class="gacha-input" :aria-label="$t('gacha.cardWeight', { name: card.name })" /></div></div></div><p class="text-xs text-slate-600 dark:text-studio-300">{{ $t('gacha.availabilityHint') }}</p></section>
        <p v-if="!draftRates.ready" class="rounded-xl bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">{{ $t('gacha.notReady') }}</p>
        <p v-else role="status" class="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{{ $t('gacha.ready') }}</p>
        <div class="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/10"><Button variant="ghost" :disabled="saving" @click="draftDialog.close()">{{ $t('common.cancel') }}</Button><Button type="submit" :loading="saving" :disabled="catalogLoading || (form.is_active && !draftRates.ready)">{{ $t('common.save') }}</Button></div>
      </fieldset></form>
    </Modal>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from '../common/Button.vue'
import Badge from '../common/Badge.vue'
import LoadState from '../common/LoadState.vue'
import Modal from '../common/Modal.vue'
import { gachaApi } from '../../api/gacha'
import { shopApi } from '../../api/shop'
import { getErrorMessage } from '../../utils/forms'
import { useAuthStore } from '../../stores/auth'
import { useSystemStore } from '../../stores/system'
import { DEFAULT_RARITY_WEIGHTS, GACHA_RARITIES, gachaDraftError, gachaWritePayload, previewGachaRates } from '../../utils/gachaConfig'

const { t, locale } = useI18n()
const auth = useAuthStore(), system = useSystemStore()
const canManageCards = computed(() => auth.hasPermission('shop:manage'))
const pools = ref([]), selectedPool = ref(null), loading = ref(false), loadError = ref('')
const history = ref([]), historyLoading = ref(false), historyError = ref('')
const showModal = ref(false), draftDialog = ref(null), saving = ref(false), archiving = ref(false), formError = ref(''), editingPool = ref(null)
const catalog = ref([]), catalogLoading = ref(false), catalogError = ref(''), cardSearch = ref('')
const newForm = () => ({ title: '', description: '', cost_coins: 100, is_active: false, rarity_weights: { ...DEFAULT_RARITY_WEIGHTS }, cards: [] })
const form = ref(newForm())
let poolSequence = 0, historySequence = 0, catalogSequence = 0
let alive = true, mutationSequence = 0
const captureActor = () => ({ token: auth.token, id: auth.staff?.id })
const isCurrentActor = actor => alive && actor.token === auth.token && actor.id === auth.staff?.id
const draftCatalog = computed(() => [...new Map([...(editingPool.value?.cards || []), ...catalog.value].filter(card => card.item_type === 'card').map(card => [card.id, card])).values()])
const visibleCards = computed(() => draftCatalog.value.filter(card => `${card.name} ${card.character_name || ''} ${card.series_title || ''}`.toLocaleLowerCase(locale.value).includes(cardSearch.value.trim().toLocaleLowerCase(locale.value))))
const draftRates = computed(() => previewGachaRates(form.value.rarity_weights, form.value.cards, draftCatalog.value))
const memberFor = id => form.value.cards.find(card => card.item_id === id)
const percentage = value => {
  const probability = Number(value || 0)
  const format = number => number.toLocaleString(locale.value, { maximumFractionDigits: 6 })
  return probability > 0 && probability < 0.000001 ? '<' + format(0.000001) : format(probability)
}
const tierRate = (pool, rarity) => pool.rarity_rates?.find(tier => tier.rarity === rarity)?.probability_percent || 0
const poolReady = pool => (pool.rarity_rates || []).some(tier => tier.probability_percent > 0)
const formatDate = iso => iso ? new Date(iso).toLocaleString(locale.value) : ''

async function loadPools(preferredId = selectedPool.value?.id) {
  const actor = captureActor(), sequence = ++poolSequence; loading.value = true; loadError.value = ''
  try {
    const result = await gachaApi.getPools()
    if (sequence !== poolSequence || !isCurrentActor(actor)) return
    pools.value = result.data || []
    const next = pools.value.find(pool => pool.id === preferredId) || pools.value[0] || null
    selectedPool.value = next
    if (next) await loadHistory(next.id)
    else { historySequence++; history.value = []; historyError.value = '' }
  } catch (error) { if (sequence === poolSequence && isCurrentActor(actor)) loadError.value = getErrorMessage(error) }
  finally { if (sequence === poolSequence && isCurrentActor(actor)) loading.value = false }
}
function selectPool(pool) { selectedPool.value = pool; loadHistory(pool.id) }
async function loadHistory(id) {
  const actor = captureActor(), sequence = ++historySequence; historyLoading.value = true; historyError.value = ''; history.value = []
  try { const result = await gachaApi.getHistory(id); if (sequence === historySequence && isCurrentActor(actor) && selectedPool.value?.id === id) history.value = result.data || [] }
  catch (error) { if (sequence === historySequence && isCurrentActor(actor)) historyError.value = getErrorMessage(error) }
  finally { if (sequence === historySequence && isCurrentActor(actor)) historyLoading.value = false }
}
async function loadCatalog() {
  const actor = captureActor(), sequence = ++catalogSequence; catalogLoading.value = true; catalogError.value = ''
  try { const result = await shopApi.getItems(); if (sequence === catalogSequence && isCurrentActor(actor)) catalog.value = (result.data || []).filter(card => card.item_type === 'card') }
  catch (error) { if (sequence === catalogSequence && isCurrentActor(actor)) catalogError.value = getErrorMessage(error) }
  finally { if (sequence === catalogSequence && isCurrentActor(actor)) catalogLoading.value = false }
}
function openCreate() { editingPool.value = null; form.value = newForm(); cardSearch.value = ''; formError.value = ''; showModal.value = true; loadCatalog() }
function openEdit(pool) {
  editingPool.value = pool
  form.value = { title: pool.title, description: pool.description || '', cost_coins: pool.cost_coins, is_active: pool.is_active, rarity_weights: { ...pool.rarity_weights }, cards: (pool.cards || []).map(card => ({ item_id: card.id, weight: card.weight })) }
  cardSearch.value = ''; formError.value = ''; showModal.value = true; loadCatalog()
}
function toggleCard(card, checked) {
  if (checked && !memberFor(card.id)) form.value.cards.push({ item_id: card.id, weight: 1 })
  if (!checked) form.value.cards = form.value.cards.filter(member => member.item_id !== card.id)
}
async function savePool() {
  if (saving.value || archiving.value || catalogLoading.value) return
  const error = gachaDraftError(form.value, draftCatalog.value)
  formError.value = error ? t('gacha.' + error) : ''
  if (error) return
  const actor = captureActor(), sequence = ++mutationSequence
  saving.value = true
  try {
    const payload = gachaWritePayload(form.value, editingPool.value?.version)
    const result = editingPool.value ? await gachaApi.updatePool(editingPool.value.id, payload) : await gachaApi.createPool(payload)
    if (sequence !== mutationSequence || !isCurrentActor(actor)) return
    showModal.value = false
    system.addToast({ type: 'success', title: t('gacha.saved'), message: form.value.title })
    await loadPools(result.data?.id || editingPool.value?.id)
  } catch (error) { if (sequence === mutationSequence && isCurrentActor(actor)) formError.value = error.response?.status === 409 ? t('gacha.conflict') : getErrorMessage(error) }
  finally { if (sequence === mutationSequence && isCurrentActor(actor)) saving.value = false }
}
async function archivePool(pool) {
  if (archiving.value || saving.value || !window.confirm(t('gacha.archiveConfirm', { title: pool.title }))) return
  const actor = captureActor(), sequence = ++mutationSequence
  archiving.value = true
  try { await gachaApi.archivePool(pool.id); if (sequence === mutationSequence && isCurrentActor(actor)) await loadPools(pool.id) }
  catch (error) { if (sequence === mutationSequence && isCurrentActor(actor)) system.addToast({ type: 'error', title: t('common.error'), message: getErrorMessage(error) }) }
  finally { if (sequence === mutationSequence && isCurrentActor(actor)) archiving.value = false }
}
watch(() => [auth.token, auth.staff?.id], () => {
  poolSequence++; historySequence++; catalogSequence++; mutationSequence++
  pools.value = []; selectedPool.value = null; history.value = []; catalog.value = []; editingPool.value = null
  loading.value = false; historyLoading.value = false; catalogLoading.value = false; saving.value = false; archiving.value = false
  loadError.value = ''; historyError.value = ''; catalogError.value = ''; formError.value = ''; showModal.value = false; form.value = newForm()
})
onMounted(loadPools)
onUnmounted(() => { alive = false; poolSequence++; historySequence++; catalogSequence++; mutationSequence++ })
</script>

<style scoped>
.field-label { display: block; margin-bottom: .3rem; font-size: .75rem; font-weight: 600; }
.gacha-input { width: 100%; min-height: 40px; border: 1px solid rgb(148 163 184 / .4); border-radius: .65rem; background: transparent; padding: .45rem .65rem; color: inherit; font-size: .8rem; }
.gacha-input:focus-visible { outline: 2px solid #d79a26; outline-offset: 2px; }
.gacha-input:disabled { opacity: .6; }
</style>
