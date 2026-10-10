import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createPinia } from 'pinia'
import { BACKGROUND_MEDIA_LIMITS, backgroundFileError, backgroundPreviewSource, createLocalBackgroundMedia } from '../src/utils/backgroundMedia.js'
import { releaseLocalCardMedia } from '../src/utils/cardMedia.js'

let checks = 0
function check(value, message) { assert.ok(value, message); checks++ }
check(backgroundFileError({ name: 'scene.gif', type: 'image/gif', size: 15 * 1024 * 1024 }) === null, 'Background GIF uses its 20 MiB limit, not the card limit')
check(backgroundFileError({ name: 'scene.webp', type: 'image/webp', size: BACKGROUND_MEDIA_LIMITS.bytes }) === null, 'The exact background size boundary is accepted')
check(backgroundFileError({ name: 'scene.png', type: 'image/png', size: BACKGROUND_MEDIA_LIMITS.bytes + 1 }) === 'file_size', 'Oversized backgrounds are rejected before preview allocation')
check(backgroundFileError({ name: 'scene.svg', type: 'image/svg+xml', size: 50 }) === null, 'Existing static SVG uploads remain supported')
check(backgroundFileError({ name: 'scene.gif', type: 'text/html', size: 50 }) === 'file_type', 'Contradictory MIME types are rejected')
check(backgroundFileError({ name: 'scene.mp4', type: 'video/mp4', size: 50 }) === 'file_type', 'Backgrounds do not add unsupported videos')
check(backgroundFileError({ name: 'scene.jpg', type: 'image/jpeg', size: 0 }) === 'file_size', 'Empty files are rejected')
const animated = { asset_url: '/motion.webp', asset_preview_url: '/poster.webp', asset_animated: true }
check(backgroundPreviewSource(animated) === '/poster.webp', 'Initial and reduced-motion previews request a still poster')
check(backgroundPreviewSource(animated, true) === '/motion.webp', 'Playback uses the original only after a play action')
check(backgroundPreviewSource({ asset_url: '/motion.webp', asset_animated: true }) === '', 'Missing posters do not fall back to unwanted animation')
check(backgroundPreviewSource({ asset_url: '/static.svg' }) === '/static.svg', 'Static legacy backgrounds keep rendering without metadata')

const descriptor = [0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 0x44, 1, 0]
const animatedFile = new File([new Uint8Array([...Buffer.from('GIF89a'), 1, 0, 1, 0, 0, 0, 0, ...descriptor, ...descriptor, 0x3b])], 'scene.gif', { type: 'image/gif' })
const originalDocument = globalThis.document, originalBitmap = globalThis.createImageBitmap
const originalCreate = URL.createObjectURL, originalRevoke = URL.revokeObjectURL
let nextUrl = 0, closed = 0, drawn = 0
const revoked = []
URL.createObjectURL = () => `blob:background-${++nextUrl}`
URL.revokeObjectURL = url => revoked.push(url)
globalThis.createImageBitmap = async () => ({ width: 100, height: 80, close() { closed++ } })
globalThis.document = { createElement: () => ({ getContext: () => ({ drawImage() { drawn++ } }), toBlob: callback => callback(new Blob(['poster'], { type: 'image/png' })) }) }
try {
  const local = await createLocalBackgroundMedia(animatedFile)
  check(local.asset_animated && local.asset_url !== local.asset_preview_url && drawn === 1, 'Animated local uploads generate a separate static first-frame poster')
  check(closed === 1, 'Decoded image resources are released after poster generation')
  releaseLocalCardMedia(local)
  assert.deepEqual(revoked, ['blob:background-1', 'blob:background-2']); checks++
  globalThis.createImageBitmap = async () => ({ width: 4000, height: 2000, close() { closed++ } })
  await assert.rejects(createLocalBackgroundMedia(animatedFile), error => error.code === 'file_pixels'); checks++
  check(revoked.at(-1) === 'blob:background-3' && closed === 2, 'Rejected animations release their blob and decoded frame')
  const svg = await createLocalBackgroundMedia(new File(['<svg/>'], 'still.svg', { type: 'image/svg+xml' }))
  check(!svg.asset_animated && svg.asset_preview_url === svg.asset_url, 'Static SVG needs no bitmap decoder or animation poster')
  releaseLocalCardMedia(svg)
} finally {
  globalThis.document = originalDocument; globalThis.createImageBitmap = originalBitmap
  URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke
}

const storage = new Map()
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) }
globalThis.window = { performance: globalThis.performance, addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }), location: { assign() {} } }
globalThis.document = { body: { style: {} }, activeElement: null, getElementById: () => null, documentElement: { classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {} } }
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: 'Isolated background tests' } })
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
try {
  const { default: i18n } = await server.ssrLoadModule('/src/i18n/index.js')
  const { useAuthStore } = await server.ssrLoadModule('/src/stores/auth.js')
  const { default: client } = await server.ssrLoadModule('/src/api/client.js')
  const requests = []
  client.defaults.adapter = async config => {
    requests.push(config)
    return { status: 200, statusText: 'OK', config, headers: {}, data: { success: true, data: { asset_url: '/content/shop/asset_background.webp', asset_preview_url: '/content/shop/poster_background.webp', asset_animated: true } } }
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
  const preview = await mount('/src/components/shop/BackgroundPreviewSim.vue', { item: animated })
  check(preview.html.includes('src="/poster.webp"') && !preview.html.includes('src="/motion.webp"'), 'Mounted backgrounds start paused even with reduced motion enabled')
  check(preview.html.includes('Profile activity') && preview.html.includes('Collection'), 'The preview depicts the background behind profile content')
  check(preview.html.includes('aria-pressed="false"'), 'Playback state is accessible')
  preview.state.playing.value = true
  check(preview.state.source.value === '/motion.webp', 'The Play action selects the animation')
  preview.state.handleError()
  check(preview.state.source.value === '/poster.webp' && preview.state.animationFailed.value, 'Playback failure returns to a still poster')
  const saved = []
  const create = await mount('/src/components/shop/ShopItemModal.vue', { modelValue: true, initialType: 'background', onSave: async body => saved.push(body) })
  check(create.html.includes('.svg,.png,.jpg,.jpeg,.webp,.gif') && create.html.includes('up to 20 MiB'), 'Background file controls accept GIF and display the correct size guidance')
  check(create.html.includes('whole profile') && create.html.includes('120 frames'), 'The form explains profile cropping and animation limits')
  create.state.form.name = 'Scene'; create.state.form.asset_file = animatedFile; create.state.form.asset_url = 'blob:fixture'; create.state.form.asset_animated = true; create.state.form.asset_preview_url = 'blob:poster'
  await create.state.handleSubmit()
  check(saved[0].item_type === 'background' && saved[0].asset_file === animatedFile && saved[0].price_coins === 50, 'Creation passes the background file through atomic upload with its purchase price')
  check(!Object.hasOwn(saved[0], 'asset_animated') && !Object.hasOwn(saved[0], 'asset_preview_url'), 'Client animation claims and temporary poster URLs are absent from API writes')
  const edit = await mount('/src/components/shop/ShopItemModal.vue', { modelValue: true, item: { id: 6, name: 'Scene', item_type: 'background', price_coins: 50, ...animated }, onSave: async body => saved.push(body) })
  check(edit.state.form.asset_animated && edit.state.form.asset_preview_url === '/poster.webp', 'Editing retains trusted animation metadata')
  edit.state.form.asset_file = animatedFile
  await edit.state.handleSubmit()
  check(requests.length === 1 && requests[0].data.get('item_type') === 'background', 'Replacement artwork uploads with background validation')
  check(edit.state.form.asset_animated && edit.state.form.asset_preview_url.includes('poster_background'), 'Successful replacement retains server-derived animation and poster')
  check(!Object.hasOwn(saved[1], 'asset_animated') && !Object.hasOwn(saved[1], 'asset_preview_url'), 'Editing also omits read-only media flags')
  for (const locale of ['en', 'uz', 'ru']) {
    for (const key of ['help', 'artHint', 'animationHint', 'play', 'pause', 'file_type', 'file_size', 'file_pixels', 'file_decode', 'activity', 'collection']) check(i18n.global.te('backgroundArt.' + key, locale), `${locale} translates ${key}`)
  }
  console.log(`Background regression: ${checks} checks passed (in-memory requests; no real uploads or accounts).`)
} finally { await server.close() }
