import { unzip, strFromU8 } from 'fflate'

export const IMPORT_LIMITS = Object.freeze({ pages: 100, pageBytes: 20 * 1024 * 1024, chapterBytes: 50 * 1024 * 1024, stagingBytes: 300 * 1024 * 1024, archiveEntries: 1000 })
const imageExtension = /\.(?:jpe?g|png|webp|gif)$/i
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })
const mimeTypes = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }

export class ImportError extends Error {
  constructor(code, details = {}) { super(code); this.name = 'ImportError'; this.code = code; this.details = details }
}

export function importId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  const bytes = new Uint8Array(16)
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes)
  else for (let index = 0; index < bytes.length; index++) bytes[index] = Math.floor(Math.random() * 256)
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function safeImportPath(value) {
  const path = String(value || '').replace(/\\/g, '/')
  if (!path || path.startsWith('/') || /^[a-z]:/i.test(path) || /[\u0000-\u001f]/.test(path)) return null
  const segments = path.split('/')
  if (segments.some(segment => segment === '..' || segment === '.')) return null
  return segments.filter(Boolean).join('/')
}

export function chapterNumberFromName(value) {
  const name = String(value || '').replace(/\.zip$/i, '').trim()
  const match = name.match(/(?:^|\b)(?:chapter|chap|ch|episode|ep)[\s_.#-]*(\d+(?:\.\d+)?)(?=$|\s|[-_])/i)
    || name.match(/^(\d+(?:\.\d+)?)(?=$|\s|[-_])/)
    || name.match(/\s(\d+(?:\.\d+)?)$/)
  return match ? Number(match[1]) : null
}

export function naturalPageOrder(pages) {
  return [...pages].sort((left, right) => collator.compare(left.path || left.name, right.path || right.name))
}

// Inspect the central directory before allocating inflated image buffers. ZIP64,
// encryption, malformed metadata and excessive output are rejected as a whole.
export function inspectZip(bytes, limits = IMPORT_LIMITS) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let end = -1
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
    if (view.getUint32(offset, true) === 0x06054b50 && offset + 22 + view.getUint16(offset + 20, true) === bytes.length) { end = offset; break }
  }
  if (end < 0) throw new ImportError('invalid_zip')
  const entries = view.getUint16(end + 10, true)
  const directorySize = view.getUint32(end + 12, true)
  let offset = view.getUint32(end + 16, true)
  if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true) || entries !== view.getUint16(end + 8, true)) throw new ImportError('unsupported_zip')
  if (entries === 65535 || offset === 0xffffffff || directorySize === 0xffffffff) throw new ImportError('unsupported_zip')
  if (entries > limits.archiveEntries) throw new ImportError('archive_entries', { limit: limits.archiveEntries })
  if (offset + directorySize > end) throw new ImportError('invalid_zip')
  const records = [], names = new Set()
  let inflatedBytes = 0
  for (let index = 0; index < entries; index++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) throw new ImportError('invalid_zip')
    const flags = view.getUint16(offset + 8, true), method = view.getUint16(offset + 10, true)
    const size = view.getUint32(offset + 24, true), nameLength = view.getUint16(offset + 28, true)
    const recordLength = 46 + nameLength + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true)
    if (offset + recordLength > end || size === 0xffffffff) throw new ImportError('invalid_zip')
    if (flags & 1) throw new ImportError('encrypted_zip')
    if (method !== 0 && method !== 8) throw new ImportError('unsupported_zip')
    const name = strFromU8(bytes.subarray(offset + 46, offset + 46 + nameLength), !(flags & 2048))
    const path = safeImportPath(name)
    if (!path) throw new ImportError('invalid_path', { name })
    if (names.has(path)) throw new ImportError('duplicate_file', { name: path })
    names.add(path)
    inflatedBytes += size
    if (inflatedBytes > limits.stagingBytes) throw new ImportError('staging_size', { limit: limits.stagingBytes })
    if (imageExtension.test(path) && size > limits.pageBytes) throw new ImportError('file_size', { name: path, limit: limits.pageBytes })
    records.push({ name, path, size, directory: name.endsWith('/') })
    offset += recordLength
  }
  return records
}

async function extractArchive(file, limits) {
  if (file.size > limits.stagingBytes) throw new ImportError('staging_size', { limit: limits.stagingBytes })
  const bytes = new Uint8Array(await file.arrayBuffer())
  const records = inspectZip(bytes, limits)
  const wanted = new Map(records.filter(record => !record.directory && imageExtension.test(record.path) && !record.path.startsWith('__MACOSX/')).map(record => [record.name, record]))
  const result = await new Promise((resolve, reject) => {
    try { unzip(bytes, { filter: entry => wanted.has(entry.name) && entry.originalSize === wanted.get(entry.name).size }, (error, data) => error ? reject(new ImportError('invalid_zip')) : resolve(data)) }
    catch { reject(new ImportError('invalid_zip')) }
  })
  const pages = []
  for (const record of wanted.values()) {
    const data = result[record.name]
    if (!data || data.length !== record.size) throw new ImportError('invalid_zip')
    const name = record.path.split('/').pop()
    pages.push({ file: new File([data], name, { type: mimeTypes[name.split('.').pop().toLowerCase()], lastModified: file.lastModified }), path: record.path, source: file.name })
  }
  const ignored = records.filter(record => !record.directory && !wanted.has(record.name)).map(record => ({ code: 'ignored_file', name: record.path }))
  return { pages, warnings: ignored }
}

export function validateDraft(draft, existingNumbers = [], allDrafts = [], limits = IMPORT_LIMITS) {
  const errors = [], number = Number(draft.chapterNumber)
  if (draft.chapterNumber === null || draft.chapterNumber === '' || !Number.isFinite(number) || number <= 0) errors.push({ code: 'chapter_number' })
  if ((existingNumbers || []).some(existing => Number(existing) === number) || allDrafts.some(other => other.id !== draft.id && Number(other.webtoonId) === Number(draft.webtoonId) && other.status !== 'complete' && other.chapterNumber !== null && Number(other.chapterNumber) === number)) errors.push({ code: 'duplicate_chapter', number })
  if (!draft.pages.length || draft.pages.length > limits.pages) errors.push({ code: 'page_count', limit: limits.pages })
  if (draft.pages.some(page => page.size <= 0 || page.size > limits.pageBytes)) errors.push({ code: 'file_size', limit: limits.pageBytes })
  if (draft.pages.reduce((sum, page) => sum + page.size, 0) > limits.chapterBytes) errors.push({ code: 'chapter_size', limit: limits.chapterBytes })
  if (String(draft.title || '').length > 255) errors.push({ code: 'title' })
  if (!Number.isInteger(Number(draft.rewardCoins)) || Number(draft.rewardCoins) < 0 || Number(draft.rewardCoins) > 1000000) errors.push({ code: 'reward_coins' })
  return errors
}

export async function prepareChapterImport(files, context = {}, limits = IMPORT_LIMITS) {
  const pages = [], warnings = []
  let totalBytes = 0
  for (const file of Array.from(files || [])) {
    if (/\.zip$/i.test(file.name)) {
      // Include images already unpacked from earlier archives in the output
      // budget before this archive is inflated, rather than rejecting it later.
      const extracted = await extractArchive(file, { ...limits, stagingBytes: limits.stagingBytes - totalBytes, archiveEntries: limits.archiveEntries - pages.length })
      pages.push(...extracted.pages); warnings.push(...extracted.warnings)
    } else {
      const path = safeImportPath(file.importPath || file.webkitRelativePath || file.name)
      if (!path) { warnings.push({ code: 'invalid_path', name: file.name }); continue }
      if (!imageExtension.test(path)) { warnings.push({ code: 'ignored_file', name: path }); continue }
      if (totalBytes + file.size > limits.stagingBytes) throw new ImportError('staging_size', { limit: limits.stagingBytes })
      if (pages.length >= limits.archiveEntries) throw new ImportError('archive_entries', { limit: limits.archiveEntries })
      pages.push({ file, path, source: '' })
    }
    totalBytes = pages.reduce((sum, page) => sum + page.file.size, 0)
    if (totalBytes > limits.stagingBytes || pages.length > limits.archiveEntries) throw new ImportError('staging_size', { limit: limits.stagingBytes })
  }
  const groups = new Map()
  for (const page of pages) {
    const folders = page.path.split('/').slice(0, -1)
    let chapterFolder = folders.length - 1
    for (let index = folders.length - 1; index >= 0; index--) if (chapterNumberFromName(folders[index]) !== null) { chapterFolder = index; break }
    const folder = folders.slice(0, chapterFolder + 1).join('/')
    const key = `${page.source}\u0000${folder}`
    if (!groups.has(key)) groups.set(key, { folder: folders[chapterFolder] || page.source, pages: [] })
    groups.get(key).pages.push(page)
  }
  const drafts = []
  for (const group of groups.values()) {
    const detected = chapterNumberFromName(group.folder)
    const number = detected ?? (!group.folder || (groups.size === 1 && !group.folder.includes('/')) ? context.chapterNumber ?? null : null)
    const seenNames = new Set(), groupWarnings = []
    const draftPages = naturalPageOrder(group.pages).map(page => {
      if (seenNames.has(page.path)) groupWarnings.push({ code: 'duplicate_file', name: page.path })
      seenNames.add(page.path)
      return { id: importId(), name: page.file.name, path: page.path, size: page.file.size, file: page.file }
    })
    const draft = { id: importId(), idempotencyKey: importId(), webtoonId: Number(context.webtoonId), seriesTitle: context.seriesTitle || '', chapterNumber: number, title: '', rewardCoins: context.rewardCoins ?? 5, folder: group.folder || '', pages: draftPages, warnings: groupWarnings, validationErrors: [], status: 'draft', progress: 0, uploadedCount: 0, totalPages: draftPages.length, error: null, sessionId: null, chapterId: null, publish: false, createdAt: Date.now() }
    drafts.push(draft)
  }
  drafts.sort((left, right) => (left.chapterNumber ?? Infinity) - (right.chapterNumber ?? Infinity) || collator.compare(left.folder, right.folder))
  drafts.forEach(draft => { draft.validationErrors = validateDraft(draft, context.existingNumbers, drafts, limits) })
  if (!drafts.length) warnings.push({ code: 'no_images' })
  return { drafts, warnings }
}

export async function pageManifest(pages) {
  const manifest = []
  for (const page of pages) {
    const info = { name: page.name, size: page.size, last_modified: page.file.lastModified || 0 }
    if (globalThis.crypto?.subtle) {
      const digest = await globalThis.crypto.subtle.digest('SHA-256', await page.file.arrayBuffer())
      info.sha256 = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('')
    }
    manifest.push(info)
  }
  return manifest
}

export function createDraftStorage(indexedDB = globalThis.indexedDB) {
  let opening
  const database = () => {
    if (!indexedDB) return Promise.reject(new ImportError('storage_unavailable'))
    if (!opening) opening = new Promise((resolve, reject) => {
      const request = indexedDB.open('webtoonhub-chapter-imports', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('drafts', { keyPath: 'key' }).createIndex('owner', 'owner')
      request.onerror = () => reject(request.error || new ImportError('storage_unavailable'))
      request.onblocked = () => reject(new ImportError('storage_unavailable'))
      request.onsuccess = () => resolve(request.result)
    }).catch(error => { opening = null; throw error })
    return opening
  }
  const transact = async (mode, action) => {
    const db = await database()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('drafts', mode), request = action(transaction.objectStore('drafts'))
      let result
      request.onsuccess = () => { result = request.result }
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => resolve(result)
      transaction.onerror = transaction.onabort = () => reject(transaction.error || new ImportError('storage_unavailable'))
    })
  }
  return {
    async load(owner) { return (await transact('readonly', store => store.index('owner').getAll(owner))).map(row => row.draft) },
    async save(owner, draft) { return transact('readwrite', store => store.put({ key: `${owner}:${draft.id}`, owner, draft })) },
    async remove(owner, id) { return transact('readwrite', store => store.delete(`${owner}:${id}`)) }
  }
}

// Separate from Pinia so interruptions and lost network responses can be tested
// without mounting UI or contacting the real database.
export function createChapterUploader({ api, persist = async () => {}, assertCurrent = () => {}, onProgress = () => {} }) {
  let paused = false
  const setProgress = (draft, uploaded, fraction = 0) => {
    draft.uploadedCount = uploaded; draft.totalPages = draft.pages.length
    draft.progress = Math.min(99, Math.round((uploaded + fraction) / draft.pages.length * 100))
    onProgress(draft)
  }
  const updateSession = async (draft, session) => {
    if (session.status === 'finalized') {
      draft.chapterId = session.chapter_id; draft.status = 'complete'; draft.progress = 100; draft.uploadedCount = draft.pages.length
      await persist(draft); return true
    }
    if (session.status === 'expired' || session.status === 'cancelled') {
      draft.sessionId = null; draft.idempotencyKey = importId(); draft.manifest = null
      setProgress(draft, 0); await persist(draft)
    }
    return false
  }
  return {
    pause() { paused = true },
    async run(draft) {
      paused = false; draft.status = 'uploading'; draft.error = null
      try {
        assertCurrent(); await persist(draft)
        let session
        if (draft.sessionId) {
          try { session = await api.status(draft.sessionId) }
          catch (error) {
            if (error.response?.status !== 410 && error.response?.status !== 404) throw error
            session = { status: 'expired' }
          }
          assertCurrent()
          if (await updateSession(draft, session)) return
        }
        if (paused) { draft.status = 'paused'; await persist(draft); return }
        if (!draft.sessionId) {
          for (let attempt = 0; attempt < 2; attempt++) {
            if (!draft.manifest) { draft.manifest = await pageManifest(draft.pages); assertCurrent(); await persist(draft) }
            if (paused) { draft.status = 'paused'; await persist(draft); return }
            try {
              session = await api.create({ webtoon_id: draft.webtoonId, chapter_number: Number(draft.chapterNumber), title: draft.title || null, reward_coins: Number(draft.rewardCoins), pages: draft.manifest, idempotency_key: draft.idempotencyKey })
              break
            } catch (error) {
              assertCurrent()
              // A lost create response leaves no local session ID. Its retained
              // idempotency key may expire before Retry; replace only an expired
              // key once, preserving the original files and their ordering.
              if (attempt !== 0 || error.response?.status !== 410) throw error
              await updateSession(draft, { status: 'expired' })
            }
          }
          assertCurrent(); draft.sessionId = session.id
          if (await updateSession(draft, session)) return
          await persist(draft)
        }
        const uploaded = new Set((session?.uploaded_pages || []).map(page => page.index))
        setProgress(draft, uploaded.size)
        for (let index = 0; index < draft.pages.length; index++) {
          if (uploaded.has(index)) continue
          assertCurrent()
          if (paused) { draft.status = 'paused'; await persist(draft); return }
          await api.upload(draft.sessionId, index, draft.pages[index].file, fraction => setProgress(draft, uploaded.size, fraction))
          assertCurrent(); uploaded.add(index); setProgress(draft, uploaded.size); await persist(draft)
        }
        if (paused) { draft.status = 'paused'; await persist(draft); return }
        assertCurrent()
        session = await api.finalize(draft.sessionId, { publish: !!draft.publish })
        assertCurrent()
        if (!await updateSession(draft, session)) throw new ImportError('finalize_incomplete')
      } catch (error) {
        try { assertCurrent() } catch { draft.status = 'paused'; return }
        draft.status = paused ? 'paused' : 'failed'
        draft.error = paused ? null : error.userMessage || error.message || 'Upload failed'
        draft.errorCode = error.code || null
        await persist(draft)
      }
    }
  }
}
