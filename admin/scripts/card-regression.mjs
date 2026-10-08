import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createPinia } from 'pinia'
import { CARD_MEDIA_LIMITS, cardFileError, cardItemMetadata, cardPreviewSource, isAnimatedCardBytes, releaseLocalCardMedia } from '../src/utils/cardMedia.js'

let checks = 0
function check(value, message) { assert.ok(value, message); checks++ }
const descriptor = [0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 0x44, 1, 0]
const gif = frames => new Uint8Array([...Buffer.from('GIF89a'), 1, 0, 1, 0, 0, 0, 0, ...Array.from({ length: frames }, () => descriptor).flat(), 0x3b])
check(!isAnimatedCardBytes(gif(1)), 'A single-frame GIF must not offer animation playback')
check(isAnimatedCardBytes(gif(2)), 'A two-frame GIF must be recognized from frame blocks')
check(!isAnimatedCardBytes(new Uint8Array(Buffer.from('GIF89a'))), 'Truncated GIF markers must not be accepted as animation')
const webp = frames => {
  const data = Buffer.alloc(12 + frames * 8); data.write('RIFF'); data.writeUInt32LE(data.length - 8, 4); data.write('WEBP', 8)
  for (let index = 0; index < frames; index++) data.write('ANMF', 12 + index * 8)
  return new Uint8Array(data)
}
check(!isAnimatedCardBytes(webp(1)), 'A one-frame WebP must remain a still preview')
check(isAnimatedCardBytes(webp(2)), 'Animation detection must count WebP frame chunks')
check(!isAnimatedCardBytes(new Uint8Array([1, 2, 3, 4])), 'Ordinary image bytes do not invent animation')
check(cardFileError(new File(['ok'], 'art.gif', { type: 'image/gif' })) === null, 'GIF is a supported card format')
check(cardFileError({ name: 'art.webp', type: 'image/webp', size: CARD_MEDIA_LIMITS.bytes }) === null, 'The exact 10 MiB boundary is accepted')
check(cardFileError({ name: 'art.png', type: 'image/png', size: CARD_MEDIA_LIMITS.bytes + 1 }) === 'file_size', 'Oversized source art is rejected before decoding')
check(cardFileError({ name: 'art.svg', type: 'image/svg+xml', size: 20 }) === 'file_type', 'SVG cannot become card artwork')
check(cardFileError({ name: 'video.mp4', type: 'video/mp4', size: 20 }) === 'file_type', 'Deferred video uploads are rejected')
check(cardFileError({ name: 'art.png', type: 'text/html', size: 20 }) === 'file_type', 'A contradictory MIME type is rejected')
check(cardFileError({ name: 'empty.jpg', type: 'image/jpeg', size: 0 }) === 'file_size', 'Empty uploads are rejected')
assert.deepEqual(cardItemMetadata({ item_type: 'card', rarity: 'rare', character_name: ' Hero ', series_title: ' Book ', webtoon_id: '9' }), { rarity: 'rare', character_name: 'Hero', series_title: 'Book', webtoon_id: 9 }); checks++
assert.deepEqual(cardItemMetadata({ item_type: 'card', rarity: 'common', character_name: 'Hero', series_title: '', webtoon_id: null }), { rarity: 'common', character_name: 'Hero', series_title: null, webtoon_id: null }); checks++
assert.deepEqual(cardItemMetadata({ item_type: 'frame', rarity: 'rare', character_name: 'Hero' }), {}); checks++
const animated = { asset_url: '/animation.gif', asset_preview_url: '/still.png', asset_animated: true }
check(cardPreviewSource(animated) === '/still.png', 'The initial source is a static poster, never the animation')
check(cardPreviewSource(animated, true) === '/animation.gif', 'Explicit playback uses the original animation')
check(cardPreviewSource({ asset_url: '/unknown.gif', asset_animated: true }) === '', 'Missing posters must not silently autoplay')
check(cardPreviewSource({ asset_url: '/still.webp', asset_animated: false }) === '/still.webp', 'Static media keeps its original source')
const originalRevoke = URL.revokeObjectURL, revoked = []
URL.revokeObjectURL = value => revoked.push(value)
releaseLocalCardMedia({ asset_url: 'blob:one', asset_preview_url: 'blob:one' })
releaseLocalCardMedia({ asset_url: '/remote.webp', asset_preview_url: 'blob:two' })
URL.revokeObjectURL = originalRevoke
assert.deepEqual(revoked, ['blob:one', 'blob:two']); checks++

const storage = new Map()
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) }
globalThis.window = { performance: globalThis.performance, addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }), location: { assign() {} } }
globalThis.document = { body: { style: {} }, activeElement: null, getElementById: () => null, documentElement: { classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {} } }
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: 'Isolated card tests' } })
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
try {
  const { default: i18n } = await server.ssrLoadModule('/src/i18n/index.js')
  const { useAuthStore } = await server.ssrLoadModule('/src/stores/auth.js')
  const { default: client } = await server.ssrLoadModule('/src/api/client.js')
  const requests = []
  client.defaults.adapter = async config => {
    requests.push(config)
    return { status: 200, statusText: 'OK', config, headers: {}, data: { success: true, data: config.url.endsWith('upload-asset') ? { asset_url: '/content/cards/asset_uploaded.webp', asset_preview_url: '/content/cards/poster_uploaded.webp', asset_animated: true } : { items: [], total: 0 } } }
  }
  async function mount(file, props = {}) {
    const { default: original } = await server.ssrLoadModule(file)
    let state
    const component = { ...original, setup(p, context) { state = original.setup(p, context); return state } }
    const pinia = createPinia(), auth = useAuthStore(pinia)
    auth.staff = { id: 91, username: 'Fixture', role: { name: 'superadmin' }, permissions: [] }; auth.token = 'fixture'
    const app = createSSRApp(component, props); app.use(pinia); app.use(i18n)
    app.config.warnHandler = () => {}; app.config.errorHandler = error => { throw error }
    const context = {}, html = await renderToString(app, context)
    return { state, html: html + (context.teleports?.body || '') }
  }
  i18n.global.locale.value = 'en'
  const preview = await mount('/src/components/shop/CardArtPreview.vue', { item: { ...animated, rarity: 'legendary', character_name: 'Fixture hero' } })
  check(preview.state.playing.value === false && preview.html.includes('src="/still.png"'), 'Mounted previews start paused even with reduced motion enabled')
  check(!preview.html.includes('src="/animation.gif"') && preview.html.includes('aria-pressed="false"'), 'Initial rendering does not request animation and exposes playback state')
  preview.state.playing.value = true
  check(preview.state.source.value === '/animation.gif', 'A manual play action selects animation')
  preview.state.handleError()
  check(preview.state.source.value === '/still.png' && preview.state.animationFailed.value, 'Animation errors return to the retained still poster')
  const saved = []
  const create = await mount('/src/components/shop/ShopItemModal.vue', { modelValue: true, initialType: 'card', onSave: async body => saved.push(body) })
  check(create.state.form.item_type === 'card' && create.html.includes('card-character'), 'The new-card shortcut opens card metadata, not cosmetic controls')
  check(!create.html.includes('ring-4 ring-amber-400 shadow-glow-brand'), 'Card forms do not render cosmetic border presets')
  create.state.form.name = 'Hero card'; create.state.form.character_name = 'Hero'; create.state.form.rarity = 'epic'
  create.state.form.asset_file = new File(['fixture bytes'], 'card.png', { type: 'image/png' }); create.state.form.asset_url = 'blob:fixture'
  await create.state.handleSubmit()
  check(saved[0].item_type === 'card' && saved[0].rarity === 'epic' && saved[0].character_name === 'Hero', 'New-card saves include the agreed identity fields')
  check(!Object.hasOwn(saved[0], 'border_style') && !Object.hasOwn(saved[0], 'asset_animated'), 'Read-only media flags and cosmetic effects are absent from write payloads')
  check(saved[0].asset_file.name === 'card.png' && saved[0].asset_url === '', 'Creation sends the source File in the existing atomic upload request')
  const locked = await mount('/src/components/shop/ShopItemModal.vue', { modelValue: true, item: { id: 3, name: 'Owned', item_type: 'card', character_name: 'Hero', rarity: 'rare', price_coins: 50, identity_locked: true, owned_count: 2, ...animated }, onSave: async () => {} })
  check(locked.state.identityLocked.value && locked.html.includes('Readers already own this card'), 'Owned-card identity locking is visible before a rejected save')
  check(/id="card-character"[^>]*disabled/.test(locked.html), 'Character identity inputs are disabled once collected')
  const retryPayloads = []
  let fail = true
  const edited = await mount('/src/components/shop/ShopItemModal.vue', { modelValue: true, item: { id: 4, name: 'Editable', item_type: 'card', character_name: 'Hero', rarity: 'common', asset_url: '/old.webp' }, onSave: async body => { retryPayloads.push(body); if (fail) throw new Error('Fixture save failure') } })
  edited.state.form.asset_file = new File(['fixture'], 'new.gif', { type: 'image/gif' })
  const originalError = console.error; console.error = () => {}
  try { await edited.state.handleSubmit() } finally { console.error = originalError }
  check(edited.state.submitError.value === 'Fixture save failure' && edited.state.form.asset_url.includes('asset_uploaded'), 'A failed metadata save retains the uploaded artwork for retry')
  fail = false; await edited.state.handleSubmit()
  check(requests.filter(request => request.url.endsWith('upload-asset')).length === 1, 'Retry does not upload replacement artwork twice')
  check(!Object.hasOwn(retryPayloads[1], 'item_type') && retryPayloads[1].rarity === 'common', 'Editing respects immutable type while retaining metadata')
  for (const locale of ['en', 'uz', 'ru']) {
    i18n.global.locale.value = locale
    for (const key of ['type', 'guide', 'play', 'pause', 'file_type', 'file_size', 'file_pixels', 'file_decode', 'identityLocked', 'character']) check(i18n.global.te('collectibleCards.' + key, locale), `${locale} translates ${key}`)
    for (const rarity of ['common', 'rare', 'epic', 'legendary']) check(i18n.global.te('collectibleCards.rarities.' + rarity, locale), `${locale} translates ${rarity}`)
  }
  console.log(`Collectible card regression: ${checks} checks passed (in-memory requests; no real uploads or accounts).`)
} finally { await server.close() }
