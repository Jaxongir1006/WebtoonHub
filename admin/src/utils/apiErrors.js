import i18n from '../i18n'

export function isStaffLoginRequest(config) {
  const path = String(config?.url || '').split(/[?#]/, 1)[0]
  return /(?:^|\/)auth\/login\/?$/.test(path)
}

export function localizeApiError(error) {
  const locale = i18n.global.locale.value
  const status = error.response?.status
  const payload = error.response?.data
  const detail = typeof payload?.detail === 'string' ? payload.detail : payload?.error?.message
  if (status === 401 && isStaffLoginRequest(error.config)) {
    return i18n.global.t('apiErrors.invalid_credentials')
  }
  if (locale === 'uz' && detail) return detail
  const text = String(detail || '').toLowerCase()
  const known = [
    [/owned or used by a wheel|hide it from sale/, 'shop_in_use'],
    [/daily.*(?:limit|cap)|kunlik.*(?:chegara|limit)/, 'daily_limit'],
    [/please wait|cooldown|kut.*(?:daqiq|vaqt)/, 'wait_reward'],
    [/insufficient|yetarli emas|mablag.*yetarli/, 'insufficient_coins'],
    [/chapter.*number.*exists|bob.*raqam.*mavjud/, 'duplicate_chapter'],
    [/already.*(?:exists|used)|allaqachon mavjud|band/, 'duplicate'],
    [/max(?:imum)?.*20.*mb|large|hajm/, 'file_size'],
    [/format|mime|raster|image.*(?:invalid|supported)/, 'file_type']
  ]
  const match = known.find(([pattern]) => pattern.test(text))
  if (match) return i18n.global.t('apiErrors.' + match[1])
  const type = status === 401 ? 'session' : status === 403 ? 'access' : status === 404 ? 'not_found' : status === 409 ? 'conflict' : [400,422].includes(status) ? 'validation' : status === 429 ? 'rate_limit' : !error.response ? 'offline' : 'server'
  return i18n.global.t('apiErrors.' + type)
}
