import axios from 'axios'
import {
  initialPermissions,
  initialRoles,
  initialStaffUsers,
  initialGenres,
  initialWebtoons,
  initialChapters,
  initialShopItems,
  initialCreatorRequests,
  initialUsers,
  initialComments,
  initialSessions
} from './mockData'

// Initialize state from LocalStorage or mock data
function loadStorage(key, fallback) {
  try {
    const val = localStorage.getItem(`webtoonhub_admin_${key}`)
    return val ? JSON.parse(val) : fallback
  } catch {
    return fallback
  }
}

function saveStorage(key, val) {
  try {
    localStorage.setItem(`webtoonhub_admin_${key}`, JSON.stringify(val))
  } catch (e) {
    console.error('Failed to save to localStorage', e)
  }
}

// Persistent Mock DB
export const mockDb = {
  permissions: initialPermissions,
  roles: loadStorage('roles', initialRoles),
  staffUsers: loadStorage('staffUsers', initialStaffUsers),
  genres: initialGenres,
  webtoons: loadStorage('webtoons', initialWebtoons),
  chapters: loadStorage('chapters', initialChapters),
  shopItems: loadStorage('shopItems', initialShopItems),
  creatorRequests: loadStorage('creatorRequests', initialCreatorRequests),
  users: loadStorage('users', initialUsers),
  comments: loadStorage('comments', initialComments),
  sessions: loadStorage('sessions', initialSessions),
  save(key) {
    if (this[key]) {
      saveStorage(key, this[key])
    }
  }
}

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
