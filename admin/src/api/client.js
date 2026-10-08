import axios from 'axios'
import { ref } from 'vue'
import i18n from '../i18n'
import { isStaffLoginRequest, localizeApiError } from '../utils/apiErrors'

export const apiConnectionStatus = ref('checking')
const configuredTimeout = Number(import.meta.env?.VITE_API_TIMEOUT_MS)
const apiTimeout = Number.isFinite(configuredTimeout) && configuredTimeout >= 1000 && configuredTimeout <= 120000
  ? configuredTimeout : 10000

// Axios instance
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1/staff',
  timeout: apiTimeout,
  headers: {
    'Content-Type': 'application/json',
    'X-Device-Type': /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop'
  }
})

apiClient.interceptors.response.use((response) => {
  apiConnectionStatus.value = 'online'
  window.dispatchEvent(new CustomEvent('staff-connection', { detail: 'online' }))
  return response
}, (error) => {
  apiConnectionStatus.value = error.response ? 'online' : 'offline'
  window.dispatchEvent(new CustomEvent('staff-connection', { detail: error.response ? 'online' : 'offline' }))
  const requestToken = String(error.config?.headers?.Authorization || '').replace(/^Bearer\s+/i, '')
  const currentToken = localStorage.getItem('webtoonhub_staff_token') || ''
  if (error.response?.status === 401 && !isStaffLoginRequest(error.config) && requestToken && requestToken === currentToken) {
    window.dispatchEvent(new CustomEvent('staff-session-expired'))
  }
  const message = localizeApiError(error)
  error.userMessage = message
  error.message = message
  if (error.response?.data) {
    error.response.data.detail = message
    if (error.response.data.error) error.response.data.error.message = message
  }
  return Promise.reject(error)
})

// Request interceptor: attach bearer token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('webtoonhub_staff_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  config.headers['Accept-Language'] = i18n.global.locale.value
  return config
})

export default apiClient
