export function getErrorMessage(error, fallback = 'Unable to complete this action.') {
  if (error?.userMessage) return error.userMessage
  const payload = error?.response?.data
  if (typeof payload?.error?.message === 'string') return payload.error.message
  if (typeof payload?.detail === 'string') return payload.detail
  if (Array.isArray(payload?.detail)) return payload.detail.map((item) => item.msg || item.issue).filter(Boolean).join('; ')
  return error?.message || fallback
}

export function webtoonFormData(data) {
  if (data instanceof FormData) return data
  const body = new FormData()
  for (const key of ['title', 'type', 'description', 'author_name', 'status']) {
    if (data[key] !== undefined && data[key] !== null) body.append(key, data[key])
  }
  if (data.genre_ids !== undefined) body.append('genre_ids', JSON.stringify(data.genre_ids))
  if (data.cover_image_file) body.append('cover_image', data.cover_image_file)
  return body
}

export function chapterFormData(data) {
  if (data instanceof FormData) return data
  const body = new FormData()
  for (const key of ['webtoon_id', 'chapter_number', 'title', 'reward_coins', 'content_text']) {
    if (data[key] !== undefined && data[key] !== null) body.append(key, data[key])
  }
  for (const file of data.rawFiles || []) body.append('images', file)
  return body
}

export function pageCount(total, limit) {
  return Math.max(1, Math.ceil(Number(total || 0) / limit))
}

export function moveItem(items, index, direction) {
  const target = index + direction
  if (target < 0 || target >= items.length) return
  const [item] = items.splice(index, 1)
  items.splice(target, 0, item)
}
