import axios from 'axios'

// Axios instance
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1/staff',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-Device-Type': 'Desktop'
  }
})

// Request interceptor: attach bearer token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('webtoonhub_staff_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default apiClient
