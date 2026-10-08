import assert from 'node:assert/strict'
import { zipSync } from 'fflate'
import { createServer } from 'vite'
import { createPinia } from 'pinia'
import { IMPORT_LIMITS, ImportError, chapterNumberFromName, safeImportPath, prepareChapterImport, inspectZip, createChapterUploader, createDraftStorage } from '../src/utils/chapterImport.js'

let checks = 0
const check = (condition, message) => { assert.ok(condition, message); checks++ }
const image = (name, path, bytes = 4) => {
  const file = new File([new Uint8Array(bytes)], name, { type: 'image/png', lastModified: 123 })
  if (path) Object.defineProperty(file, 'webkitRelativePath', { value: path })
  return file
}
const archive = (name, files) => new File([zipSync(files)], name, { type: 'application/zip' })
const context = { webtoonId: 7, seriesTitle: 'Test series', chapterNumber: 8, existingNumbers: [1] }

const numbers = ['Chapter 01', 'Ch. 2', '03 - Title', 'Bob 3', 'Chapter 4.5'].map(chapterNumberFromName)
assert.deepEqual(numbers, [1, 2, 3, 3, 4.5]); checks++
check(chapterNumberFromName('Unnumbered folder') === null, 'An unknown chapter folder must be reviewed manually')
check(safeImportPath('../outside.png') === null && safeImportPath('C:\\outside.png') === null && safeImportPath('/outside.png') === null, 'Paths must remain within an import')

const flat = await prepareChapterImport([image('10.png'), image('2.png'), image('1.png')], context)
assert.deepEqual(flat.drafts[0].pages.map(page => page.name), ['1.png', '2.png', '10.png']); checks++
check(flat.drafts[0].chapterNumber === 8 && !flat.drafts[0].validationErrors.length, 'Loose pages use the suggested next chapter')
const grouped = await prepareChapterImport([
  image('2.png', 'Series/Chapter 02/2.png'), image('1.png', 'Series/Chapter 02/1.png'),
  image('1.png', 'Series/Chapter 01/1.png'), new File(['notes'], 'readme.txt')
], context)
assert.deepEqual(grouped.drafts.map(draft => draft.chapterNumber), [1, 2]); checks++
check(grouped.drafts[0].validationErrors.some(error => error.code === 'duplicate_chapter'), 'Existing chapters must be flagged before uploading')
check(grouped.warnings.some(warning => warning.code === 'ignored_file'), 'Ignored non-image files must be reported')
const unknown = await prepareChapterImport([image('1.png', 'Series/Alpha/1.png'), image('1.png', 'Series/Beta/1.png')], context)
check(unknown.drafts.every(draft => draft.chapterNumber === null), 'Separate unknown folders cannot silently use the same guessed number')
const gif = await prepareChapterImport([new File([new Uint8Array(3)], 'page.gif')], context)
check(gif.drafts.length === 1, 'GIF must remain supported alongside JPEG, PNG and WebP')

const zipped = await prepareChapterImport([archive('Series.zip', {
  'Series/Chapter 3/10.png': new Uint8Array(5), 'Series/Chapter 3/2.png': new Uint8Array(5),
  'Series/Chapter 4.5/1.webp': new Uint8Array(5), 'notes.txt': new Uint8Array(2)
})], context)
assert.deepEqual(zipped.drafts.map(draft => draft.chapterNumber), [3, 4.5]); checks++
assert.deepEqual(zipped.drafts[0].pages.map(page => page.name), ['2.png', '10.png']); checks++
check(zipped.drafts[0].pages[0].file instanceof File, 'ZIP pages must remain browser Files for preview and retry')
const duplicate = await prepareChapterImport([archive('One.zip', { 'Chapter 2/1.png': new Uint8Array(5) }), archive('Two.zip', { 'Chapter 2/1.png': new Uint8Array(5) })], context)
check(duplicate.drafts.every(draft => draft.validationErrors.some(error => error.code === 'duplicate_chapter')), 'Duplicate chapter numbers across archives must be flagged')
await assert.rejects(() => prepareChapterImport([archive('bad.zip', { '../escape.png': new Uint8Array(4) })], context), error => error.code === 'invalid_path'); checks++
const encrypted = zipSync({ '1.png': new Uint8Array(2) })
const encryptedView = new DataView(encrypted.buffer)
for (let offset = 0; offset < encrypted.length - 46; offset++) if (encryptedView.getUint32(offset, true) === 0x02014b50) { encryptedView.setUint16(offset + 8, 1, true); break }
assert.throws(() => inspectZip(encrypted), error => error.code === 'encrypted_zip'); checks++
const oversizedMetadata = zipSync({ '1.png': new Uint8Array(2) })
const metadataView = new DataView(oversizedMetadata.buffer)
for (let offset = 0; offset < oversizedMetadata.length - 46; offset++) if (metadataView.getUint32(offset, true) === 0x02014b50) { metadataView.setUint32(offset + 24, IMPORT_LIMITS.pageBytes + 1, true); break }
assert.throws(() => inspectZip(oversizedMetadata), error => error.code === 'file_size'); checks++
assert.throws(() => inspectZip(zipSync({ '1.png': new Uint8Array(2), '2.png': new Uint8Array(2) }), { ...IMPORT_LIMITS, archiveEntries: 1 }), error => error.code === 'archive_entries'); checks++
const tinyBudget = { ...IMPORT_LIMITS, stagingBytes: 600 }
await assert.rejects(() => prepareChapterImport([archive('One.zip', { '1.png': new Uint8Array(350) }), archive('Two.zip', { '2.png': new Uint8Array(350) })], context, tinyBudget), error => error.code === 'staging_size'); checks++
const pageLimit = await prepareChapterImport([image('1.png'), image('2.png')], context, { ...IMPORT_LIMITS, pages: 1 })
check(pageLimit.drafts[0].validationErrors.some(error => error.code === 'page_count'), 'Oversized chapters must be shown as invalid drafts')

async function draft() { return (await prepareChapterImport([image('1.png'), image('2.png'), image('3.png')], context)).drafts[0] }
function mockApi() {
  const uploaded = new Set(), calls = [], sessions = new Map()
  let finalized = false
  return {
    calls, uploaded, sessions,
    async create(data) { calls.push(['create', data.idempotency_key]); sessions.set(data.idempotency_key, 'session'); return { id: 'session', status: finalized ? 'finalized' : 'uploading', chapter_id: finalized ? 99 : null, uploaded_pages: [...uploaded].map(index => ({ index })) } },
    async status() { calls.push(['status']); return { id: 'session', status: finalized ? 'finalized' : 'uploading', chapter_id: finalized ? 99 : null, uploaded_pages: [...uploaded].map(index => ({ index })) } },
    async upload(id, index, file, progress) { calls.push(['upload', index]); uploaded.add(index); progress?.(1); return { index } },
    async finalize() { calls.push(['finalize']); finalized = true; return { id: 'session', status: 'finalized', chapter_id: 99 } }
  }
}
const normalDraft = await draft(), normalApi = mockApi()
await createChapterUploader({ api: normalApi }).run(normalDraft)
check(normalDraft.status === 'complete' && normalDraft.progress === 100 && normalDraft.chapterId === 99, 'Finalization must determine completion')
assert.deepEqual(normalApi.calls.filter(call => call[0] === 'upload').map(call => call[1]), [0, 1, 2]); checks++

const pausedDraft = await draft(), pausedApi = mockApi()
let started, release
const uploadStarted = new Promise(resolve => { started = resolve }), uploadRelease = new Promise(resolve => { release = resolve })
const realUpload = pausedApi.upload
pausedApi.upload = async (...args) => { started(); await uploadRelease; return realUpload(...args) }
const pausedRunner = createChapterUploader({ api: pausedApi }), running = pausedRunner.run(pausedDraft)
await uploadStarted; pausedRunner.pause(); release(); await running
check(pausedDraft.status === 'paused' && pausedApi.uploaded.size === 1, 'Pause must stop after the current page request')
pausedApi.upload = realUpload
await pausedRunner.run(pausedDraft)
assert.deepEqual(pausedApi.calls.filter(call => call[0] === 'upload').map(call => call[1]), [0, 1, 2]); checks++
check(pausedDraft.status === 'complete', 'Resume must upload only pages missing from the server session')

const lostFinalizeDraft = await draft(), lostFinalizeApi = mockApi(), originalFinalize = lostFinalizeApi.finalize
lostFinalizeApi.finalize = async () => { await originalFinalize(); throw new Error('Connection lost after commit') }
const lostFinalizeRunner = createChapterUploader({ api: lostFinalizeApi })
await lostFinalizeRunner.run(lostFinalizeDraft)
check(lostFinalizeDraft.status === 'failed', 'Lost finalization responses must remain retryable')
await lostFinalizeRunner.run(lostFinalizeDraft)
check(lostFinalizeDraft.status === 'complete' && lostFinalizeApi.calls.filter(call => call[0] === 'finalize').length === 1, 'Retry must recognize a finalized session without duplicating the chapter')

const lostPageDraft = await draft(), lostPageApi = mockApi(), originalPage = lostPageApi.upload
let losePage = true
lostPageApi.upload = async (...args) => { const result = await originalPage(...args); if (losePage) { losePage = false; throw new Error('Connection lost after storing page') } return result }
const lostPageRunner = createChapterUploader({ api: lostPageApi })
await lostPageRunner.run(lostPageDraft); await lostPageRunner.run(lostPageDraft)
assert.deepEqual(lostPageApi.calls.filter(call => call[0] === 'upload').map(call => call[1]), [0, 1, 2]); checks++

const lostCreateDraft = await draft(), lostCreateApi = mockApi(), originalCreate = lostCreateApi.create
let loseCreate = true
lostCreateApi.create = async (...args) => { const result = await originalCreate(...args); if (loseCreate) { loseCreate = false; throw new Error('Connection lost after creating session') } return result }
const lostCreateRunner = createChapterUploader({ api: lostCreateApi })
await lostCreateRunner.run(lostCreateDraft); await lostCreateRunner.run(lostCreateDraft)
check(lostCreateApi.sessions.size === 1 && lostCreateApi.calls.filter(call => call[0] === 'create').every(call => call[1] === lostCreateDraft.idempotencyKey), 'Retry after a lost create response must reuse the same idempotency key')

const expiredDraft = await draft(), expiredApi = mockApi(), oldKey = expiredDraft.idempotencyKey
expiredDraft.sessionId = 'expired'; expiredApi.status = async () => { throw { response: { status: 410 } } }
await createChapterUploader({ api: expiredApi }).run(expiredDraft)
check(expiredDraft.status === 'complete' && expiredDraft.idempotencyKey !== oldKey, 'Expired staging must restart safely with a fresh session key and original files')

const expiredLostCreateDraft = await draft(), expiredLostCreateApi = mockApi(), expiredLostCreateOriginal = expiredLostCreateApi.create
const staleCreateKey = expiredLostCreateDraft.idempotencyKey, retainedFiles = [...expiredLostCreateDraft.pages], expiredCreateKeys = []
let lostThenExpired = true
expiredLostCreateApi.create = async data => {
  expiredCreateKeys.push(data.idempotency_key)
  if (lostThenExpired) { lostThenExpired = false; await expiredLostCreateOriginal(data); throw new Error('Lost session creation response') }
  if (data.idempotency_key === staleCreateKey) throw { response: { status: 410 } }
  return expiredLostCreateOriginal(data)
}
const expiredLostCreateRunner = createChapterUploader({ api: expiredLostCreateApi })
await expiredLostCreateRunner.run(expiredLostCreateDraft)
check(expiredLostCreateDraft.sessionId === null && expiredLostCreateDraft.status === 'failed', 'A lost create response must retain its idempotency key without inventing a local session ID')
await expiredLostCreateRunner.run(expiredLostCreateDraft)
check(expiredLostCreateDraft.status === 'complete' && expiredCreateKeys.length === 3 && expiredCreateKeys[0] === expiredCreateKeys[1] && expiredCreateKeys[2] !== staleCreateKey && expiredLostCreateDraft.pages.every((page, index) => page === retainedFiles[index]), 'Retrying a lost create response after key expiry must replace the key exactly once and preserve the original files and ordering')
const repeatedExpiredDraft = await draft(), repeatedExpiredKeys = []
await createChapterUploader({ api: { async create(data) { repeatedExpiredKeys.push(data.idempotency_key); throw { response: { status: 410 } } } } }).run(repeatedExpiredDraft)
check(repeatedExpiredDraft.status === 'failed' && repeatedExpiredKeys.length === 2, 'Repeated create expiry must stop after one replacement rather than loop')
const duplicateCreateDraft = await draft(), duplicateCreateKeys = []
await createChapterUploader({ api: { async create(data) { duplicateCreateKeys.push(data.idempotency_key); throw { response: { status: 409 } } } } }).run(duplicateCreateDraft)
check(duplicateCreateDraft.status === 'failed' && duplicateCreateKeys.length === 1 && duplicateCreateDraft.idempotencyKey === duplicateCreateKeys[0], 'A duplicate chapter conflict must not be retried with another session key')

const switchedDraft = await draft(), switchedApi = mockApi()
let owner = 'alice'
const accountUpload = switchedApi.upload
switchedApi.upload = async (...args) => { const result = await accountUpload(...args); owner = 'bob'; return result }
await createChapterUploader({ api: switchedApi, assertCurrent() { if (owner !== 'alice') throw new ImportError('account_changed') } }).run(switchedDraft)
check(switchedDraft.status === 'paused' && switchedApi.uploaded.size === 1 && !switchedApi.calls.some(call => call[0] === 'finalize'), 'An account switch must prevent every subsequent request')
await assert.rejects(() => createDraftStorage(null).load('staff'), error => error.code === 'storage_unavailable'); checks++

// In-memory IndexedDB/HTTP adapters isolate the Pinia integration from real data.
function memoryIndexedDB() {
  const rows = new Map()
  let initialized = false, failWrites = false, reverseReads = false
  const database = {
    createObjectStore() { return { createIndex() {} } },
    transaction(name, mode) {
      const transaction = { objectStore() {
        const operation = action => {
          const request = {}
          queueMicrotask(() => {
            if (mode === 'readwrite' && failWrites) { transaction.error = Object.assign(new Error('Full'), { name: 'QuotaExceededError' }); transaction.onabort?.(); return }
            request.result = action(); request.onsuccess?.(); transaction.oncomplete?.()
          })
          return request
        }
        return {
          put: row => operation(() => { rows.set(row.key, structuredClone(row)); return row.key }),
          delete: key => operation(() => rows.delete(key)),
          index: () => ({ getAll: owner => operation(() => { const result = [...rows.values()].filter(row => row.owner === owner).map(row => structuredClone(row)); return reverseReads ? result.reverse() : result }) })
        }
      } }
      return transaction
    }
  }
  return { rows, setFailWrites(value) { failWrites = value }, setReverseReads(value) { reverseReads = value }, open() { const request = { result: database }; queueMicrotask(() => { if (!initialized) { initialized = true; request.onupgradeneeded?.() } request.onsuccess?.() }); return request } }
}
const local = new Map(), idb = memoryIndexedDB()
globalThis.indexedDB = idb
globalThis.localStorage = { getItem: key => local.get(key) ?? null, setItem: (key, value) => local.set(key, String(value)), removeItem: key => local.delete(key) }
globalThis.window = { addEventListener() {}, dispatchEvent() {}, location: { assign() {} } }
globalThis.CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options?.detail } }
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'Chapter import regression' }, configurable: true })
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
try {
  const { useAuthStore } = await server.ssrLoadModule('/src/stores/auth.js')
  const { useChapterImportStore } = await server.ssrLoadModule('/src/stores/chapterImport.js')
  const { default: apiClient } = await server.ssrLoadModule('/src/api/client.js')
  const pinia = createPinia(), auth = useAuthStore(pinia)
  auth.token = 'alice-token'; auth.staff = { id: 10, role: { name: 'superadmin' } }
  localStorage.setItem('webtoonhub_staff_token', 'alice-token')
  const queue = useChapterImportStore(pinia)
  await queue.restore()
  const imported = await queue.importFiles([image('2.png'), image('1.png')], context)
  check(imported.length === 1 && idb.rows.size === 1 && !queue.storageError, 'Files and metadata must be saved together for draft recovery')
  queue.movePage(imported[0].id, 0, 1); queue.updateDraft(imported[0].id, { chapterNumber: 9, publish: true }); await queue.flush()
  check([...idb.rows.values()][0].draft.pages[0].name === '2.png' && [...idb.rows.values()][0].draft.publish === true, 'Saved recovery must preserve manual page ordering and chapter options')
  auth.token = 'bob-token'; localStorage.setItem('webtoonhub_staff_token', 'bob-token'); auth.staff = { id: 11, role: { name: 'superadmin' } }
  await queue.restore()
  check(queue.drafts.length === 0, 'Drafts must be isolated from a different staff account')
  auth.token = 'alice-token'; localStorage.setItem('webtoonhub_staff_token', 'alice-token'); auth.staff = { id: 10, role: { name: 'superadmin' } }
  await queue.restore()
  check(queue.drafts.length === 1 && queue.drafts[0].pages[0].name === '2.png' && !queue.isRunning, 'Returning to the original account must restore ordered files without automatic upload')
  await queue.removeDraft(queue.drafts[0].id)
  check(!queue.drafts.length && idb.rows.size === 0, 'Removing a draft must not be undone by an earlier queued metadata save')
  const orderedChapters = await queue.importFiles([
    image('1.png', 'Series/Chapter 30/1.png'), image('2.png', 'Series/Chapter 30/2.png'), image('3.png', 'Series/Chapter 30/3.png'), image('4.png', 'Series/Chapter 30/4.png'),
    image('1.png', 'Series/Chapter 31/1.png'), image('2.png', 'Series/Chapter 31/2.png'), image('3.png', 'Series/Chapter 31/3.png')
  ], context)
  orderedChapters.forEach(chapter => { chapter.createdAt = 123 })
  const originalChapterOrder = queue.drafts.map(chapter => chapter.id)
  await queue.flush(); idb.setReverseReads(true)
  auth.token = 'bob-token'; localStorage.setItem('webtoonhub_staff_token', 'bob-token'); auth.staff = { id: 11, role: { name: 'superadmin' } }; await queue.restore()
  auth.token = 'alice-token'; localStorage.setItem('webtoonhub_staff_token', 'alice-token'); auth.staff = { id: 10, role: { name: 'superadmin' } }; await queue.restore()
  assert.deepEqual(queue.drafts.map(chapter => chapter.id), originalChapterOrder); checks++
  check(queue.drafts.map(chapter => chapter.pages.length).join(',') === '4,3', 'Restoring equal-timestamp chapter groups from arbitrary IndexedDB key order must preserve the saved queue order')
  auth.token = 'bob-token'; localStorage.setItem('webtoonhub_staff_token', 'bob-token'); auth.staff = { id: 11, role: { name: 'superadmin' } }; await queue.restore()
  for (const row of idb.rows.values()) if (row.owner === '10') delete row.draft.queueOrder
  auth.token = 'alice-token'; localStorage.setItem('webtoonhub_staff_token', 'alice-token'); auth.staff = { id: 10, role: { name: 'superadmin' } }; await queue.restore()
  assert.deepEqual(queue.drafts.map(chapter => chapter.chapterNumber), [30, 31]); checks++
  for (const chapter of [...queue.drafts]) await queue.removeDraft(chapter.id)
  idb.setReverseReads(false)
  idb.setFailWrites(true)
  const temporary = await queue.importFiles([image('1.png')], context)
  check(temporary.length === 1 && queue.storageError && idb.rows.size === 0, 'Storage exhaustion must keep the current files available and explicitly warn that refresh recovery is unavailable')
  idb.setFailWrites(false)
  await queue.flush()
  let storedPages = new Set(), finalized = false, requests = []
  apiClient.defaults.adapter = async config => {
    requests.push(config.url)
    let data
    if (config.method === 'post' && config.url === '/chapter-imports') data = { id: 'integration', status: 'uploading', uploaded_pages: [] }
    else if (config.method === 'put') { storedPages.add(Number(config.url.split('/').pop())); data = { index: 0 } }
    else if (config.url.endsWith('/finalize')) { finalized = true; data = { id: 'integration', status: 'finalized', chapter_id: 777 } }
    else data = { id: 'integration', status: finalized ? 'finalized' : 'uploading', chapter_id: finalized ? 777 : null, uploaded_pages: [...storedPages].map(index => ({ index })) }
    return { status: 200, statusText: 'OK', headers: {}, config, data: { success: true, data } }
  }
  await queue.enqueue([temporary[0].id])
  for (let tick = 0; tick < 40 && queue.isRunning; tick++) await new Promise(resolve => setTimeout(resolve, 5))
  check(queue.drafts[0].status === 'complete' && finalized && requests.length === 3, 'The Pinia queue must upload and finalize through the real API adapter contract')
  await queue.clearCompleted()
  check(!queue.drafts.length && !idb.rows.size, 'Clearing completed local drafts must not delete the uploaded chapter')

  const [lostLocal] = await queue.importFiles([image('1.png')], { ...context, chapterNumber: 15 })
  lostLocal.sessionId = 'already-finalized'; lostLocal.status = 'failed'
  const finalizedRequests = []
  apiClient.defaults.adapter = async config => {
    finalizedRequests.push(config.method)
    return { status: 200, statusText: 'OK', headers: {}, config, data: { success: true, data: { id: 'already-finalized', status: 'finalized', chapter_id: 778 } } }
  }
  await queue.removeDraft(lostLocal.id)
  check(finalizedRequests.join(',') === 'get' && !queue.drafts.length, 'Removing a draft after a lost finalize response must retain the created chapter and avoid cancelling it')

  const [firstQueued] = await queue.importFiles([image('1.png'), image('2.png')], { ...context, chapterNumber: 20 })
  const [secondQueued] = await queue.importFiles([image('1.png')], { ...context, chapterNumber: 21 })
  secondQueued.sessionId = 'cancel-me'; secondQueued.status = 'paused'
  let startedFirst, releaseFirst, startedCancel, releaseCancel
  const firstStarted = new Promise(resolve => { startedFirst = resolve }), firstRelease = new Promise(resolve => { releaseFirst = resolve })
  const cancelStarted = new Promise(resolve => { startedCancel = resolve }), cancelRelease = new Promise(resolve => { releaseCancel = resolve })
  const cancellationRequests = []
  apiClient.defaults.adapter = async config => {
    cancellationRequests.push(config.url)
    let data
    if (config.method === 'get') data = { id: 'cancel-me', status: 'uploading', uploaded_pages: [] }
    else if (config.method === 'delete') { startedCancel(); await cancelRelease; data = { id: 'cancel-me', status: 'cancelled' } }
    else if (config.url === '/chapter-imports') data = { id: 'first-queued', status: 'uploading', uploaded_pages: [] }
    else if (config.method === 'put') {
      if (config.url.endsWith('/0')) { startedFirst(); await firstRelease }
      data = { index: Number(config.url.split('/').pop()) }
    } else data = { id: 'first-queued', status: 'finalized', chapter_id: 779 }
    return { status: 200, statusText: 'OK', headers: {}, config, data: { success: true, data } }
  }
  await queue.enqueue([firstQueued.id, secondQueued.id]); await firstStarted
  const removing = queue.removeDraft(secondQueued.id); await cancelStarted
  releaseFirst()
  for (let tick = 0; tick < 40 && queue.isRunning; tick++) await new Promise(resolve => setTimeout(resolve, 5))
  check(!cancellationRequests.some(url => url.startsWith('/chapter-imports/cancel-me/pages/')), 'Cancelling a queued session must remove it before the queue advances, even while DELETE is pending')
  releaseCancel(); await removing; await queue.clearCompleted()
  check(!queue.drafts.length, 'Queued cancellation must leave no unfinished local record after successful cancellation')

  const [switching] = await queue.importFiles([image('1.png'), image('2.png')], { ...context, chapterNumber: 25 })
  let startedSwitch, releaseSwitch
  const switchingStarted = new Promise(resolve => { startedSwitch = resolve }), switchingRelease = new Promise(resolve => { releaseSwitch = resolve })
  const switchingRequests = []
  apiClient.defaults.adapter = async config => {
    switchingRequests.push({ url: config.url, token: config.headers.Authorization })
    let data
    if (config.url === '/chapter-imports') data = { id: 'switching', status: 'uploading', uploaded_pages: [] }
    else if (config.method === 'put') { startedSwitch(); await switchingRelease; data = { index: 0 } }
    else data = { id: 'switching', status: 'finalized', chapter_id: 780 }
    return { status: 200, statusText: 'OK', headers: {}, config, data: { success: true, data } }
  }
  await queue.enqueue([switching.id]); await switchingStarted
  auth.token = 'bob-token'; localStorage.setItem('webtoonhub_staff_token', 'bob-token'); auth.staff = { id: 11, role: { name: 'superadmin' } }
  await queue.restore(); releaseSwitch(); await new Promise(resolve => setTimeout(resolve, 20))
  check(queue.drafts.length === 0 && !queue.isRunning && switchingRequests.length === 2 && switchingRequests.every(request => request.token === 'Bearer alice-token'), 'Switching staff while a page request is pending must abort the previous queue and never send subsequent pages with the new account token')
  auth.token = 'alice-token'; localStorage.setItem('webtoonhub_staff_token', 'alice-token'); auth.staff = { id: 10, role: { name: 'superadmin' } }
  await queue.restore()
  check(queue.drafts[0]?.status === 'paused' && !queue.isRunning, 'An interrupted account queue must remain manually resumable for the original account')
} finally { await server.close() }

console.log(`Chapter import regression: ${checks} checks passed (in-memory API and storage; no real content changed).`)
