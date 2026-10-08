export const CARD_MEDIA_LIMITS = Object.freeze({ bytes: 10 * 1024 * 1024, frames: 100, seconds: 10, pixels: 4000000, totalPixels: 60000000 })
export const CARD_RARITIES = ['common', 'rare', 'epic', 'legendary']
export const CARD_RARITY_CLASSES = {
  common: 'border-slate-400', rare: 'border-sky-400 shadow-sky-500/20',
  epic: 'border-violet-400 shadow-violet-500/20', legendary: 'border-amber-400 shadow-amber-500/25'
}

export function cardFileError(file) {
  if (!file || !/\.(?:jpe?g|png|webp|gif)$/i.test(file.name || '') || (file.type && !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type))) return 'file_type'
  if (file.size <= 0 || file.size > CARD_MEDIA_LIMITS.bytes) return 'file_size'
  return null
}

const text = (bytes, start, length) => String.fromCharCode(...bytes.subarray(start, start + length))
/** Inspect frame markers rather than assuming every GIF or WebP is animated. */
export function isAnimatedCardBytes(bytes) {
  if (bytes.length >= 13 && /^GIF8[79]a$/.test(text(bytes, 0, 6))) {
    let offset = 13 + ((bytes[10] & 128) ? 3 * (2 ** ((bytes[10] & 7) + 1)) : 0), frames = 0
    const skipBlocks = () => {
      while (offset < bytes.length) { const size = bytes[offset++]; if (!size) return true; offset += size }
      return false
    }
    while (offset < bytes.length) {
      const marker = bytes[offset++]
      if (marker === 0x3b) return false
      if (marker === 0x21) { offset++; if (!skipBlocks()) return false }
      else if (marker === 0x2c) {
        if (offset + 9 > bytes.length) return false
        const packed = bytes[offset + 8]; offset += 9
        if (packed & 128) offset += 3 * (2 ** ((packed & 7) + 1))
        if (offset >= bytes.length) return false
        offset++ // LZW minimum code size.
        if (!skipBlocks()) return false
        if (++frames > 1) return true
      } else return false
    }
  }
  if (bytes.length >= 20 && text(bytes, 0, 4) === 'RIFF' && text(bytes, 8, 4) === 'WEBP') {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    let frames = 0
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const name = text(bytes, offset, 4), size = view.getUint32(offset + 4, true)
      if (offset + 8 + size > bytes.length) return false
      if (name === 'ANMF' && ++frames > 1) return true
      offset += 8 + size + (size % 2)
    }
  }
  return false
}

export function cardPreviewSource(item, playing = false) {
  const animated = item?.asset_animated === true
  if (animated) return playing ? item.asset_url || '' : item.asset_preview_url || ''
  return item?.asset_preview_url || item?.asset_url || ''
}

export async function createLocalCardMedia(file) {
  const error = cardFileError(file)
  if (error) throw Object.assign(new Error(error), { code: error })
  const animated = isAnimatedCardBytes(new Uint8Array(await file.arrayBuffer()))
  const original = URL.createObjectURL(file)
  let bitmap, poster = ''
  try {
    if (typeof createImageBitmap === 'function') bitmap = await createImageBitmap(file)
    else bitmap = await new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = original })
    const width = bitmap.width || bitmap.naturalWidth, height = bitmap.height || bitmap.naturalHeight
    if (!width || !height || width * height > CARD_MEDIA_LIMITS.pixels) throw Object.assign(new Error('file_pixels'), { code: 'file_pixels' })
    if (animated) {
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
      canvas.getContext('2d').drawImage(bitmap, 0, 0)
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('file_decode')
      poster = URL.createObjectURL(blob)
    }
    return { asset_url: original, asset_preview_url: poster || original, asset_animated: animated, width, height }
  } catch (error) {
    URL.revokeObjectURL(original)
    if (poster) URL.revokeObjectURL(poster)
    throw Object.assign(error instanceof Error ? error : new Error('file_decode'), { code: error?.code || 'file_decode' })
  } finally { bitmap?.close?.() }
}

export function releaseLocalCardMedia(media) {
  new Set([media?.asset_url, media?.asset_preview_url]).forEach(url => { if (url?.startsWith('blob:')) URL.revokeObjectURL(url) })
}

export function cardItemMetadata(form) {
  if (form.item_type !== 'card') return {}
  return { rarity: form.rarity, character_name: String(form.character_name || '').trim(), series_title: String(form.series_title || '').trim() || null, webtoon_id: form.webtoon_id ? Number(form.webtoon_id) : null }
}
