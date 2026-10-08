import apiClient from '../api/client'

const memory = new Map()
const storageKey = (owner, kind) => `webtoonhub_staff_operation:${owner}:${kind}`

export function pendingOperation(owner, kind) {
  if (owner == null) return null
  const name = storageKey(owner, kind)
  try {
    const saved = JSON.parse(localStorage.getItem(name) || 'null')
    return saved?.key && saved?.payload ? saved : memory.get(name) || null
  } catch { return memory.get(name) || null }
}

export function prepareOperation(owner, kind, payload) {
  if (owner == null) throw new Error('Sign in again before changing coin balances.')
  const name = storageKey(owner, kind), fingerprint = JSON.stringify(payload)
  const previous = pendingOperation(owner, kind)
  if (previous?.fingerprint === fingerprint) return previous
  const intent = { key: crypto.randomUUID(), fingerprint, payload }
  memory.set(name, intent)
  try { localStorage.setItem(name, JSON.stringify(intent)) } catch { /* In-tab retries remain safe when browser storage is unavailable. */ }
  return intent
}

export function completeOperation(owner, kind, key) {
  const name = storageKey(owner, kind)
  if (pendingOperation(owner, kind)?.key !== key) return
  memory.delete(name)
  try { localStorage.removeItem(name) } catch {}
}

export function coinRequestConfig(key) {
  const capturedToken = localStorage.getItem('webtoonhub_staff_token')
  return {
    timeout: 120000,
    headers: { 'Idempotency-Key': key },
    transformRequest: [function (data) {
      if (localStorage.getItem('webtoonhub_staff_token') !== capturedToken) throw new Error('The staff account changed. Sign in again before retrying.')
      return data
    }, ...apiClient.defaults.transformRequest]
  }
}
