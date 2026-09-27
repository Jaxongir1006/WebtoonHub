import { defineStore } from 'pinia'
import { ref } from 'vue'
import i18n from '../i18n'

export const useSystemStore = defineStore('system', () => {
  const isSidebarOpen = ref(true)
  const isMobileMenuOpen = ref(false)
  const isMockMode = ref(true)
  const toasts = ref([])

  // Theme: 'black' (dark), 'white' (light), 'system'
  const currentTheme = ref(localStorage.getItem('webtoonhub_theme') || 'black')

  // Locale: 'uz', 'ru', 'en'
  const currentLocale = ref(localStorage.getItem('webtoonhub_lang') || 'uz')

  // Apply Theme on DOM
  function applyTheme(theme = currentTheme.value) {
    const root = document.documentElement
    let isDark = false

    if (theme === 'black') {
      isDark = true
    } else if (theme === 'white') {
      isDark = false
    } else if (theme === 'system') {
      isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  function setTheme(theme) {
    currentTheme.value = theme
    localStorage.setItem('webtoonhub_theme', theme)
    applyTheme(theme)
  }

  function setLocale(lang) {
    currentLocale.value = lang
    i18n.global.locale.value = lang
    localStorage.setItem('webtoonhub_lang', lang)
    document.documentElement.setAttribute('lang', lang)
  }

  // System listener for OS dark mode changes
  if (typeof window !== 'undefined' && window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (currentTheme.value === 'system') {
        applyTheme('system')
      }
    })
  }

  function toggleSidebar() {
    isSidebarOpen.value = !isSidebarOpen.value
  }

  function toggleMobileMenu() {
    isMobileMenuOpen.value = !isMobileMenuOpen.value
  }

  function setMobileMenu(val) {
    isMobileMenuOpen.value = val
  }

  function addToast({ type = 'info', title = '', message = '', duration = 4000 }) {
    const id = Date.now() + Math.random().toString(36).substring(2, 6)
    toasts.value.push({ id, type, title, message })
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }

  function removeToast(id) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return {
    isSidebarOpen,
    isMobileMenuOpen,
    isMockMode,
    toasts,
    currentTheme,
    currentLocale,
    applyTheme,
    setTheme,
    setLocale,
    toggleSidebar,
    toggleMobileMenu,
    setMobileMenu,
    addToast,
    removeToast
  }
})
