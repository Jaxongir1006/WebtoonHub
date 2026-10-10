import { isAnimatedCardBytes } from './cardMedia.js'

export const BACKGROUND_MEDIA_LIMITS = Object.freeze({ bytes: 20 * 1024 * 1024, pixels: 4000000 })

export function backgroundFileError(file) {
  if (!file || !/\.(?:svg|jpe?g|png|webp|gif)$/i.test(file.name || '') || (file.type && !['image/svg+xml', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type))) return 'file_type'
  if (file.size <= 0 || file.size > BACKGROUND_MEDIA_LIMITS.bytes) return 'file_size'
  return null
}

export function backgroundPreviewSource(item, playing = false) {
  if (item?.asset_animated === true) return playing ? item.asset_url || '' : item.asset_preview_url || ''
  return item?.asset_preview_url || item?.asset_url || ''
}

/** Keep local previews still until Play is chosen. Server validates frame count and duration. */
export async function createLocalBackgroundMedia(file) {
  const error = backgroundFileError(file)
  if (error) throw Object.assign(new Error(error), { code: error })
  const animated = isAnimatedCardBytes(new Uint8Array(await file.arrayBuffer()))
  const original = URL.createObjectURL(file)
  if (!animated) return { asset_url: original, asset_preview_url: original, asset_animated: false }
  let bitmap, poster = ''
  try {
    if (typeof createImageBitmap === 'function') bitmap = await createImageBitmap(file)
    else bitmap = await new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = original })
    const width = bitmap.width || bitmap.naturalWidth, height = bitmap.height || bitmap.naturalHeight
    if (!width || !height || width * height > BACKGROUND_MEDIA_LIMITS.pixels) throw Object.assign(new Error('file_pixels'), { code: 'file_pixels' })
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
    canvas.getContext('2d').drawImage(bitmap, 0, 0)
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('file_decode')
    poster = URL.createObjectURL(blob)
    return { asset_url: original, asset_preview_url: poster, asset_animated: true }
  } catch (error) {
    URL.revokeObjectURL(original)
    if (poster) URL.revokeObjectURL(poster)
    throw Object.assign(error instanceof Error ? error : new Error('file_decode'), { code: error?.code || 'file_decode' })
  } finally { bitmap?.close?.() }
}
