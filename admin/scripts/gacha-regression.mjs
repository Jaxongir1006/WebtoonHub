import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createRenderer, createSSRApp, nextTick, ssrContextKey } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { DEFAULT_RARITY_WEIGHTS, GACHA_RARITIES, gachaDraftError, gachaWritePayload, previewGachaRates } from '../src/utils/gachaConfig.js'
import { validateContract } from './validate-contract.mjs'

let checks = 0
const check = (condition, message) => { assert.ok(condition, message); checks++ }
const cards = [
  { id: 101, item_type: 'card', name: 'Common A', rarity: 'common', is_available: true },
  { id: 102, item_type: 'card', name: 'Common B', rarity: 'common', is_available: true },
  { id: 103, item_type: 'card', name: 'Epic C', rarity: 'epic', is_available: true },
  { id: 104, item_type: 'card', name: 'Hidden legendary', rarity: 'legendary', is_available: false },
  { id: 105, item_type: 'frame', name: 'Frame', rarity: 'common', is_available: true }
]
const members = [{ item_id: 101, weight: 1 }, { item_id: 102, weight: 3 }, { item_id: 103, weight: 2 }, { item_id: 104, weight: 20 }, { item_id: 105, weight: 1 }]
const rates = previewGachaRates(DEFAULT_RARITY_WEIGHTS, members, cards)
check(rates.ready, 'An available weighted card makes a pool ready')
check(rates.rarityRates.find(tier => tier.rarity === 'legendary').probability_percent === 0, 'Hidden cards do not contribute to rarity probability')
check(rates.rarityRates.find(tier => tier.rarity === 'rare').probability_percent === 0, 'An empty rarity has zero effective chance')
check(Math.abs(rates.cardRates.reduce((total, card) => total + card.probability_percent, 0) - 100) < 1e-8, 'Effective card chances normalize to 100%')
check(rates.cardRates.find(card => card.id === 102).probability_percent === rates.cardRates.find(card => card.id === 101).probability_percent * 3, 'Card weights split the same rarity proportionately')
check(!rates.cardRates.some(card => [104, 105].includes(card.id)), 'Hidden cards and cosmetics cannot be eligible rewards')
const draft = { title: '  Fixture pool  ', description: '', cost_coins: 100, is_active: true, rarity_weights: { ...DEFAULT_RARITY_WEIGHTS }, cards: [{ item_id: 101, weight: 1 }] }
check(gachaDraftError({ ...draft, cards: [] }, cards) === 'notReady', 'An empty active pool cannot be submitted')
check(gachaDraftError({ ...draft, cards: [], is_active: false }, cards) === '', 'An inactive configuration draft can be saved without cards')
check(gachaDraftError({ ...draft, cost_coins: 1.5 }, cards) === 'invalidCost', 'A fractional currency cost is rejected')
check(gachaDraftError({ ...draft, rarity_weights: { ...DEFAULT_RARITY_WEIGHTS, common: '' } }, cards) === 'invalidTierWeight', 'A blank rarity weight is not silently treated as zero')
check(gachaDraftError({ ...draft, cards: [{ item_id: 101, weight: 1 }, { item_id: 101, weight: 3 }] }, cards) === 'invalidCardWeight', 'Duplicate memberships cannot create accidental probability drift')
check(!previewGachaRates(Object.fromEntries(GACHA_RARITIES.map(rarity => [rarity, 0])), draft.cards, cards).ready, 'An all-zero rarity configuration cannot be activated')
validateContract('PoolCreateRequest', gachaWritePayload(draft)); checks++
validateContract('PoolUpdateRequest', gachaWritePayload(draft, 3)); checks++

const storage = new Map()
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) }
globalThis.window = { performance: globalThis.performance, addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, confirm: () => true, matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }), location: { assign() {} } }
globalThis.document = { body: { style: {} }, activeElement: null, getElementById: () => null, documentElement: { classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {} } }
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: 'Isolated gacha tests' } })
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
try {
  const { default: i18n } = await server.ssrLoadModule('/src/i18n/index.js')
  const { useAuthStore } = await server.ssrLoadModule('/src/stores/auth.js')
  const { useSystemStore } = await server.ssrLoadModule('/src/stores/system.js')
  const { default: client } = await server.ssrLoadModule('/src/api/client.js')
  const pool = { id: 8, title: 'Fixture pool', description: '', cost_coins: 100, is_active: true, version: 3, cards_count: 1, duplicate_refund: 'full_cost', rarity_weights: { ...DEFAULT_RARITY_WEIGHTS }, rarity_rates: [{ rarity: 'common', weight: 70, probability_percent: 100 }], cards: [{ ...cards[0], weight: 1, probability_percent: 100 }] }
  const requests = []
  let failSave = false
  client.defaults.adapter = async config => {
    requests.push(config)
    if (config.method === 'post' && config.url === '/gacha/pools') validateContract('PoolCreateRequest', JSON.parse(config.data))
    if (config.method === 'patch' && config.url.startsWith('/gacha/pools/')) validateContract('PoolUpdateRequest', JSON.parse(config.data))
    if (config.method === 'post' && config.url === '/wheels/1/items') validateContract('WheelItemCreateRequest', JSON.parse(config.data))
    if (failSave && config.method === 'patch') throw { response: { status: 409, data: { detail: 'Configuration changed' } } }
    const data = config.url === '/gacha/pools' && config.method === 'get' ? [pool]
      : config.url === '/shop/items' ? cards
        : config.url.endsWith('/history') || config.url.endsWith('/spins?limit=25') ? []
          : config.url === '/wheels' ? [{ id: 1, title: 'Wheel', items: [] }] : pool
    return { status: 200, statusText: 'OK', headers: {}, config, data: { success: true, data } }
  }
  async function mount(file) {
    const { default: original } = await server.ssrLoadModule(file)
    let state
    const component = { ...original, setup(props, context) { state = original.setup(props, context); return state } }
    const pinia = createPinia(), auth = useAuthStore(pinia)
    auth.staff = { username: 'Fixture', role: { system_key: 'superadmin' }, permissions: [] }; auth.token = 'fixture'
    const app = createSSRApp(component); app.use(pinia); app.use(i18n)
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { render() { return null } } }] })
    await router.push('/wheels'); app.use(router)
    app.config.warnHandler = () => {}; app.config.errorHandler = error => { throw error }
    const context = {}, html = await renderToString(app, context)
    return { state, auth, system: useSystemStore(pinia), html: html + (context.teleports?.body || '') }
  }
  async function mountClient() {
    const { default: original } = await server.ssrLoadModule('/src/components/gacha/GachaManagement.vue')
    const renderer = createRenderer({ createElement: () => ({}), createText: () => ({}), createComment: () => ({}), setText() {}, setElementText() {}, parentNode() {}, nextSibling() {}, insert() {}, remove() {}, patchProp() {} })
    let state
    const component = { ...original, setup(props, context) { state = original.setup(props, context); return state }, render() { return null } }
    const pinia = createPinia(), auth = useAuthStore(pinia)
    auth.staff = { id: 91, username: 'Fixture', role: { system_key: 'superadmin' }, permissions: [] }; auth.token = 'fixture'
    const app = renderer.createApp(component); app.provide(ssrContextKey, { modules: new Set() }); app.use(pinia); app.use(i18n); app.mount({})
    await state.loadPools()
    return { state, auth, system: useSystemStore(pinia), unmount: () => app.unmount() }
  }
  i18n.global.locale.value = 'en'
  const gacha = await mount('/src/components/gacha/GachaManagement.vue')
  check(gacha.state.percentage(0.0000000001).startsWith('<') && gacha.state.percentage(0) === '0', 'Tiny positive odds are distinguished from impossible drops')
  await gacha.state.loadPools()
  check(gacha.state.selectedPool.value.id === 8 && requests.some(request => request.url === '/gacha/pools/8/history'), 'Selecting a configured pool loads its own roll history')
  gacha.state.openCreate(); await gacha.state.loadCatalog()
  check(gacha.state.form.value.is_active === false && gacha.state.catalog.value.every(card => card.item_type === 'card'), 'New pools start inactive and the picker excludes cosmetics')
  gacha.state.form.value.title = 'New pool'; gacha.state.form.value.is_active = true
  const before = requests.length; await gacha.state.savePool()
  check(requests.length === before && gacha.state.formError.value === i18n.global.t('gacha.notReady'), 'An invalid active draft never sends a write request')
  gacha.state.toggleCard(cards[0], true); await gacha.state.savePool()
  const created = requests.findLast(request => request.method === 'post' && request.url === '/gacha/pools')
  check(JSON.parse(created.data).cards[0].item_id === 101 && !Object.hasOwn(JSON.parse(created.data), 'expected_version'), 'Creating a pool sends card membership through the backend create contract')
  gacha.state.openEdit(pool); await gacha.state.loadCatalog()
  gacha.state.form.value.cost_coins = 125; gacha.state.form.value.rarity_weights.common = 50
  failSave = true; await gacha.state.savePool()
  check(gacha.state.showModal.value && gacha.state.form.value.cost_coins === 125 && gacha.state.form.value.rarity_weights.common === 50, 'A concurrent configuration change retains the complete draft')
  check(gacha.state.formError.value === i18n.global.t('gacha.conflict'), 'Version conflicts explain how to reload without silently overwriting another admin')
  const updated = requests.findLast(request => request.method === 'patch')
  check(JSON.parse(updated.data).expected_version === 3, 'Every pool update includes the version the admin reviewed')
  failSave = false
  const normalAdapter = client.defaults.adapter
  let releaseSave
  const delayedSave = await mountClient()
  delayedSave.state.openEdit(pool); await delayedSave.state.loadCatalog()
  client.defaults.adapter = config => config.method === 'patch' ? new Promise(resolve => { requests.push(config); releaseSave = () => resolve({ status: 200, statusText: 'OK', headers: {}, config, data: { success: true, data: pool } }) }) : normalAdapter(config)
  const toastCount = delayedSave.system.toasts.length
  const pendingSave = delayedSave.state.savePool(); await new Promise(resolve => setImmediate(resolve))
  delayedSave.auth.token = 'new-staff-token'; delayedSave.auth.staff = { id: 92, permissions: ['wheel:manage'] }; await nextTick()
  const requestCount = requests.length; releaseSave(); await pendingSave
  check(requests.length === requestCount && delayedSave.system.toasts.length === toastCount, 'An old staff save cannot show a success toast or reload data for a newly signed-in staff member')
  check(!delayedSave.state.showModal.value && delayedSave.state.catalog.value.length === 0, 'Changing staff identity clears the old private configuration draft and catalogue')
  delayedSave.unmount(); client.defaults.adapter = normalAdapter
  const delayedArchive = await mountClient()
  let releaseArchive
  client.defaults.adapter = config => config.method === 'delete' ? new Promise(resolve => { requests.push(config); releaseArchive = () => resolve({ status: 200, statusText: 'OK', headers: {}, config, data: { success: true, data: pool } }) }) : normalAdapter(config)
  const pendingArchive = delayedArchive.state.archivePool(pool); await new Promise(resolve => setImmediate(resolve))
  delayedArchive.unmount(); const requestsBeforeRelease = requests.length; releaseArchive(); await pendingArchive
  check(requests.length === requestsBeforeRelease, 'A deactivation completing after navigation cannot trigger new requests from an unmounted view')
  client.defaults.adapter = normalAdapter
  const wheel = await mount('/src/views/WheelManagementView.vue')
  check(wheel.html.includes('Character Card Gacha') && wheel.html.includes('Lucky wheel'), 'The wheel page exposes both reward categories')
  wheel.state.selectedWheel.value = { id: 1, items: [] }
  wheel.state.openCreateSectorModal(); wheel.state.sectorForm.value.label = 'Lightning'; wheel.state.sectorForm.value.reward_type = 'shop_item'
  await wheel.state.saveSector()
  const sector = JSON.parse(requests.findLast(request => request.url === '/wheels/1/items').data)
  check(sector.reward_type === 'coins' && !Object.hasOwn(sector, 'shop_item_id'), 'Wheel writes always send Lightning rewards and cannot select cosmetic or card prizes')
  for (const locale of ['en', 'uz', 'ru']) {
    const messages = i18n.global.getLocaleMessage(locale).gacha
    for (const key of Object.keys(i18n.global.getLocaleMessage('en').gacha)) check(typeof messages[key] === 'string' && i18n.global.te('gacha.' + key, locale), `${locale} translates ${key}`)
  }
  console.log(`Gacha admin regression: ${checks} checks passed (in-memory requests; no real accounts or rolls).`)
} finally { await server.close() }
