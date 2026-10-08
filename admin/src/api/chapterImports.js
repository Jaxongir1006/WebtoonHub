import apiClient from './client'

const result = response => response.data.data
export const chapterImportsApi = {
  async create(data, config = {}) { return result(await apiClient.post('/chapter-imports', data, { timeout: 120000, ...config })) },
  async status(id, config = {}) { return result(await apiClient.get(`/chapter-imports/${id}`, config)) },
  async upload(id, index, file, progress, config = {}) {
    const body = new FormData()
    body.append('image', file, file.name)
    return result(await apiClient.put(`/chapter-imports/${id}/pages/${index}`, body, {
      timeout: 120000, headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: event => progress?.(event.total ? event.loaded / event.total : 0), ...config
    }))
  },
  async finalize(id, data, config = {}) { return result(await apiClient.post(`/chapter-imports/${id}/finalize`, data, { timeout: 120000, ...config })) },
  async cancel(id, config = {}) { return result(await apiClient.delete(`/chapter-imports/${id}`, config)) }
}

export function scopedChapterImportsApi(assertCurrent, signal) {
  // Request interceptors run before transforms. Checking here prevents an old
  // queue from being sent with a newly logged-in account's bearer token.
  const config = () => ({ signal, transformRequest: [function (data) { assertCurrent(); return data }, ...apiClient.defaults.transformRequest] })
  return {
    create: data => chapterImportsApi.create(data, config()),
    status: id => chapterImportsApi.status(id, config()),
    upload: (id, index, file, progress) => chapterImportsApi.upload(id, index, file, progress, config()),
    finalize: (id, data) => chapterImportsApi.finalize(id, data, config()),
    cancel: id => chapterImportsApi.cancel(id, config())
  }
}
