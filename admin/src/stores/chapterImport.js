import { defineStore } from 'pinia'
import { computed, ref, watch, toRaw } from 'vue'
import { useAuthStore } from './auth'
import { scopedChapterImportsApi } from '../api/chapterImports'
import { IMPORT_LIMITS, ImportError, prepareChapterImport, validateDraft, createDraftStorage, createChapterUploader } from '../utils/chapterImport'

const serializedDraft = draft => ({
  ...toRaw(draft), pages: draft.pages.map(page => ({ ...toRaw(page), file: toRaw(page.file) })),
  warnings: draft.warnings.map(warning => ({ ...toRaw(warning) })), validationErrors: draft.validationErrors.map(error => ({ ...toRaw(error) })),
  manifest: draft.manifest?.map(page => ({ ...toRaw(page) }))
})

const restoredDraftOrder = (left, right) => {
  return Number(left.createdAt || 0) - Number(right.createdAt || 0)
    || (left.chapterNumber ?? Infinity) - (right.chapterNumber ?? Infinity)
    || String(left.id).localeCompare(String(right.id))
}

export const useChapterImportStore = defineStore('chapterImport', () => {
  const auth = useAuthStore(), storage = createDraftStorage()
  const drafts = ref([]), importWarnings = ref([]), storageError = ref(null), isRestoring = ref(false), isRunning = ref(false)
  const owner = computed(() => auth.staff?.id == null ? null : String(auth.staff.id))
  const existingNumbers = new Map()
  const removingIds = new Set()
  let generation = 0, restoredOwner = null, restorePromise = null, pendingIds = [], activeId = null, uploader = null, controller = null
  let saveTimer = null, pendingSave = Promise.resolve()

  function assertOwner(capturedOwner, capturedGeneration) {
    if (!capturedOwner || owner.value !== capturedOwner || generation !== capturedGeneration || !auth.token) throw new ImportError('account_changed')
  }
  function reportStorageError(error) {
    storageError.value = error?.name === 'QuotaExceededError'
      ? 'Browser storage is full. Keep this tab open while uploading; drafts may not survive a refresh.'
      : 'The browser could not save these files. Keep this tab open while uploading; drafts may not survive a refresh.'
  }
  async function persistDraft(draft, capturedOwner = owner.value) {
    if (!capturedOwner) return
    try { await storage.save(capturedOwner, serializedDraft(draft)); return true }
    catch (error) { if (owner.value === capturedOwner) reportStorageError(error); return false }
  }
  function validateAll() {
    for (const draft of drafts.value) {
      draft.totalPages = draft.pages.length
      draft.validationErrors = draft.status === 'complete' || draft.sessionId ? [] : validateDraft(draft, existingNumbers.get(draft.webtoonId) || [], drafts.value)
    }
  }
  function scheduleSave() {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => { flush().catch(reportStorageError) }, 250)
  }
  async function flush() {
    clearTimeout(saveTimer); saveTimer = null
    const capturedOwner = owner.value, records = drafts.value.map(serializedDraft)
    if (!capturedOwner) return
    pendingSave = pendingSave.catch(() => {}).then(async () => {
      let saved = true
      for (const draft of records) if (!await persistDraft(draft, capturedOwner)) saved = false
      if (records.length && saved && owner.value === capturedOwner) storageError.value = null
    })
    await pendingSave
  }
  function canEdit(id) {
    const draft = drafts.value.find(item => item.id === id)
    return !!draft && !removingIds.has(id) && !draft.sessionId && !['uploading', 'queued', 'complete'].includes(draft.status)
  }
  async function restore() {
    const capturedOwner = owner.value, capturedGeneration = generation
    if (!capturedOwner) return
    if (restoredOwner === capturedOwner) return restorePromise
    restoredOwner = capturedOwner; isRestoring.value = true
    restorePromise = (async () => {
      try {
        const saved = await storage.load(capturedOwner)
        assertOwner(capturedOwner, capturedGeneration)
        // Completed imports do not need page files; unfinished records retain
        // original Files and preserve the exact page order/session key.
        const ordered = saved.every(draft => Number.isFinite(draft.queueOrder))
          ? saved.sort((left, right) => left.queueOrder - right.queueOrder || restoredDraftOrder(left, right))
          : saved.sort(restoredDraftOrder)
        drafts.value = ordered.map((draft, index) => ({
          ...draft, queueOrder: index, status: draft.status === 'complete' ? 'complete' : draft.status === 'draft' ? 'draft' : 'paused',
          error: null, warnings: draft.warnings || [], validationErrors: [],
          pages: (draft.pages || []).map(page => ({ ...page, file: page.file?.name ? page.file : new File([page.file], page.name, { type: page.file?.type, lastModified: page.lastModified || 0 }) }))
        }))
        validateAll()
      } catch (error) {
        if (owner.value === capturedOwner && generation === capturedGeneration && error.code !== 'account_changed') reportStorageError(error)
      } finally {
        if (owner.value === capturedOwner && generation === capturedGeneration) isRestoring.value = false
      }
    })()
    return restorePromise
  }
  function setExistingNumbers(webtoonId, numbers) {
    existingNumbers.set(Number(webtoonId), (numbers || []).map(number => Number(number?.chapter_number ?? number)))
    validateAll(); scheduleSave()
  }
  function announceComplete(draft, chapterId = draft.chapterId) {
    const numbers = existingNumbers.get(draft.webtoonId) || []
    if (!numbers.includes(Number(draft.chapterNumber))) numbers.push(Number(draft.chapterNumber))
    existingNumbers.set(draft.webtoonId, numbers)
    window.dispatchEvent(new CustomEvent('chapter-import-complete', { detail: { webtoonId: draft.webtoonId, chapterId } }))
  }
  async function importFiles(files, context) {
    await restore()
    const capturedOwner = owner.value, capturedGeneration = generation
    assertOwner(capturedOwner, capturedGeneration)
    const stagedBytes = drafts.value.reduce((sum, draft) => sum + draft.pages.reduce((total, page) => total + page.size, 0), 0)
    const prepared = await prepareChapterImport(files, context, { ...IMPORT_LIMITS, stagingBytes: IMPORT_LIMITS.stagingBytes - stagedBytes })
    assertOwner(capturedOwner, capturedGeneration)
    if (context.existingNumbers) existingNumbers.set(Number(context.webtoonId), context.existingNumbers.map(number => Number(number?.chapter_number ?? number)))
    const nextOrder = drafts.value.reduce((max, draft) => Math.max(max, draft.queueOrder ?? -1), -1) + 1
    prepared.drafts.forEach((draft, index) => { draft.queueOrder = nextOrder + index })
    drafts.value.push(...prepared.drafts)
    importWarnings.value = prepared.warnings
    validateAll(); await flush()
    assertOwner(capturedOwner, capturedGeneration)
    return drafts.value.filter(draft => prepared.drafts.some(created => created.id === draft.id))
  }
  function updateDraft(id, patch) {
    const draft = drafts.value.find(item => item.id === id)
    if (!draft || !canEdit(id)) return false
    for (const key of ['chapterNumber', 'title', 'rewardCoins', 'publish']) if (Object.hasOwn(patch, key)) draft[key] = patch[key]
    draft.manifest = null; draft.error = null; draft.status = 'draft'
    validateAll(); scheduleSave(); return true
  }
  function movePage(id, from, to) {
    const draft = drafts.value.find(item => item.id === id)
    if (!draft || !canEdit(id) || from === to || from < 0 || to < 0 || from >= draft.pages.length || to >= draft.pages.length) return false
    const [page] = draft.pages.splice(from, 1); draft.pages.splice(to, 0, page)
    draft.manifest = null; validateAll(); scheduleSave(); return true
  }
  function removePage(id, pageId) {
    const draft = drafts.value.find(item => item.id === id)
    if (!draft || !canEdit(id)) return false
    draft.pages = draft.pages.filter(page => page.id !== pageId)
    draft.manifest = null; validateAll(); scheduleSave(); return true
  }
  async function removeDraft(id) {
    const draft = drafts.value.find(item => item.id === id)
    if (!draft || draft.status === 'uploading' || removingIds.has(id)) return false
    const capturedOwner = owner.value, capturedGeneration = generation
    assertOwner(capturedOwner, capturedGeneration)
    removingIds.add(id)
    // Remove queued work before the first await so cancelling an allocated
    // session cannot race against the queue starting to upload it again.
    pendingIds = pendingIds.filter(queuedId => queuedId !== id)
    if (draft.status === 'queued') draft.status = 'paused'
    try {
      if (draft.sessionId && draft.status !== 'complete') {
        const api = scopedChapterImportsApi(() => assertOwner(capturedOwner, capturedGeneration))
        try {
          const session = await api.status(draft.sessionId)
          assertOwner(capturedOwner, capturedGeneration)
          // A lost finalize response may leave a local failed record for an
          // already-created chapter. Clearing its draft must keep that chapter.
          if (session.status === 'finalized') announceComplete(draft, session.chapter_id)
          else {
            try { await api.cancel(draft.sessionId) }
            catch (error) {
              if (error.response?.status !== 409) throw error
              const latest = await api.status(draft.sessionId)
              assertOwner(capturedOwner, capturedGeneration)
              if (latest.status !== 'finalized') throw error
              announceComplete(draft, latest.chapter_id)
            }
          }
        } catch (error) { if (![404, 410].includes(error.response?.status)) throw error }
        assertOwner(capturedOwner, capturedGeneration)
      }
      // Remove from memory before draining older saves. Any new save snapshot
      // now excludes the row, and deletion follows all snapshots that included it.
      clearTimeout(saveTimer); saveTimer = null
      drafts.value = drafts.value.filter(item => item.id !== id)
      await pendingSave.catch(() => {}); assertOwner(capturedOwner, capturedGeneration)
      try { await storage.remove(capturedOwner, id) } catch (error) { reportStorageError(error) }
      validateAll(); scheduleSave(); return true
    } finally { removingIds.delete(id) }
  }
  async function pump() {
    if (isRunning.value || !owner.value) return
    const capturedOwner = owner.value, capturedGeneration = generation
    isRunning.value = true; controller = new AbortController()
    const assertCurrent = () => assertOwner(capturedOwner, capturedGeneration)
    const runner = createChapterUploader({
      api: scopedChapterImportsApi(assertCurrent, controller.signal), assertCurrent,
      persist: draft => persistDraft(draft, capturedOwner),
      onProgress: () => {}
    })
    uploader = runner
    try {
      while (pendingIds.length) {
        assertCurrent()
        const id = pendingIds.shift(), draft = drafts.value.find(item => item.id === id)
        if (!draft || draft.status !== 'queued') continue
        activeId = id
        await runner.run(draft)
        assertCurrent()
        if (draft.status === 'complete') {
          announceComplete(draft)
        }
        activeId = null
        validateAll()
      }
    } catch (error) { if (error.code !== 'account_changed') console.error('Chapter import queue stopped:', error) }
    finally {
      if (capturedGeneration === generation && capturedOwner === owner.value) { isRunning.value = false; activeId = null; uploader = null; controller = null }
    }
  }
  async function enqueue(ids, options = {}) {
    await restore(); validateAll()
    const capturedOwner = owner.value, capturedGeneration = generation
    assertOwner(capturedOwner, capturedGeneration)
    let accepted = 0
    for (const id of ids || []) {
      const draft = drafts.value.find(item => item.id === id)
      if (!draft || removingIds.has(id) || ['complete', 'uploading', 'queued'].includes(draft.status) || draft.validationErrors.length) continue
      // Changing publish intent after session allocation is safe: finalize is
      // the only publication operation and requires backend permission.
      if (Object.hasOwn(options, 'publish')) draft.publish = !!options.publish
      draft.status = 'queued'; draft.error = null
      if (!pendingIds.includes(id)) pendingIds.push(id)
      accepted++
    }
    await flush(); assertOwner(capturedOwner, capturedGeneration)
    void pump()
    return accepted
  }
  function pause(id) {
    const ids = id ? [id] : [...pendingIds, activeId].filter(Boolean)
    for (const pausedId of ids) {
      const draft = drafts.value.find(item => item.id === pausedId)
      if (!draft) continue
      if (pausedId === activeId) uploader?.pause()
      else if (draft.status === 'queued') draft.status = 'paused'
      pendingIds = pendingIds.filter(queuedId => queuedId !== pausedId)
    }
    scheduleSave()
  }
  async function retry(id) { return enqueue([id]) }
  async function clearCompleted() {
    for (const draft of [...drafts.value]) if (draft.status === 'complete') await removeDraft(draft.id)
  }

  watch(owner, (currentOwner, previousOwner) => {
    if (previousOwner && drafts.value.length) {
      for (const draft of drafts.value) {
        if (['queued', 'uploading'].includes(draft.status)) draft.status = 'paused'
        void persistDraft(draft, previousOwner)
      }
    }
    generation++; uploader?.pause(); controller?.abort(); clearTimeout(saveTimer)
    pendingIds = []; activeId = null; uploader = null; controller = null
    drafts.value = []; importWarnings.value = []; storageError.value = null; isRunning.value = false; isRestoring.value = false
    existingNumbers.clear(); removingIds.clear(); restoredOwner = null; restorePromise = null
    if (currentOwner) void restore()
  }, { immediate: true, flush: 'sync' })

  if (typeof window !== 'undefined') window.addEventListener('beforeunload', event => {
    if (isRunning.value || (storageError.value && drafts.value.some(draft => draft.status !== 'complete'))) {
      event.preventDefault(); event.returnValue = ''
    }
  })
  return { drafts, importWarnings, storageError, isRestoring, isRunning, restore, importFiles, updateDraft, movePage, removePage, removeDraft, enqueue, pause, retry, clearCompleted, flush, canEdit, setExistingNumbers }
})
