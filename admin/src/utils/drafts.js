const fileIds = new WeakMap()
let nextFileId = 0

// Compare the draft itself, including ordered pages and locally selected files.
// Native input events do not cover buttons that reorder, remove or select items.
export function draftFingerprint(value) {
  return JSON.stringify(value, (_key, item) => {
    if (typeof Blob !== 'undefined' && item instanceof Blob) {
      if (!fileIds.has(item)) fileIds.set(item, ++nextFileId)
      return { fileId: fileIds.get(item), name: item.name, size: item.size, type: item.type, modified: item.lastModified }
    }
    return item
  })
}
