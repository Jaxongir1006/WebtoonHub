<template>
  <header class="h-16 px-4 sm:px-6 glass-panel border-b border-slate-200 dark:border-white/5 flex items-center justify-between sticky top-0 z-30 transition-colors">
    <!-- Left: Mobile Toggle & Page Title -->
    <div class="flex items-center gap-3 min-w-0">
      <button
        class="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-studio-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-studio-800 transition-colors"
        :aria-label="$t('nav.menu')" :aria-expanded="systemStore.isMobileMenuOpen" aria-controls="staff-sidebar"
        @click="systemStore.toggleMobileMenu()"
      >
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div class="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-studio-400">
        <span class="text-slate-800 dark:text-studio-200 font-semibold truncate">{{ currentRouteTitle }}</span>
      </div>
    </div>

    <!-- Right: Language, Theme, Role, Profile -->
    <div class="flex items-center gap-2 sm:gap-3">
      <!-- Live Backend Status Pill -->
      <div
        class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
        :title="$t('common.connection_' + connectionStatus)"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-current" />
        <span>{{ $t('common.connection_' + connectionStatus) }}</span>
      </div>

      <!-- Language Switcher Dropdown -->
      <div class="relative">
        <button
          class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-studio-850 hover:bg-slate-200 dark:hover:bg-studio-800 text-slate-700 dark:text-studio-200 border border-slate-200 dark:border-white/10 transition-colors"
          :aria-label="$t('lang.title')" :aria-expanded="showLangDropdown" @click="showLangDropdown = !showLangDropdown; showThemeDropdown = false"
        >
          <span>{{ currentLangFlag }}</span>
          <span class="uppercase font-mono">{{ systemStore.currentLocale }}</span>
          <svg class="w-3 h-3 text-slate-600 dark:text-studio-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div
          v-if="showLangDropdown"
          class="absolute right-0 mt-2 w-40 glass-panel rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 p-1.5 z-50 text-xs"
        >
          <div class="px-2 py-1 text-[10px] uppercase font-bold text-slate-600 dark:text-studio-400">
            {{ $t('lang.title') }}
          </div>
          <button
            v-for="l in languages"
            :key="l.code"
            :class="[
              'w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between font-medium transition-colors',
              systemStore.currentLocale === l.code
                ? 'bg-brand-500/15 text-brand-700 dark:text-brand-300 font-bold'
                : 'text-slate-700 dark:text-studio-300 hover:bg-slate-100 dark:hover:bg-studio-800'
            ]"
            @click="selectLang(l.code)"
          >
            <span class="flex items-center gap-2">
              <span>{{ l.flag }}</span>
              <span>{{ l.label }}</span>
            </span>
            <span v-if="systemStore.currentLocale === l.code" class="text-brand-700 dark:text-brand-500">✓</span>
          </button>
        </div>
      </div>

      <!-- Theme Switcher Dropdown (White / Black / System) -->
      <div class="relative">
        <button
          class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-studio-850 hover:bg-slate-200 dark:hover:bg-studio-800 text-slate-700 dark:text-studio-200 border border-slate-200 dark:border-white/10 transition-colors"
          :aria-label="$t('theme.title')" :aria-expanded="showThemeDropdown" @click="showThemeDropdown = !showThemeDropdown; showLangDropdown = false"
          :title="$t('theme.title')"
        >
          <!-- Active Theme Icon -->
          <span v-if="systemStore.currentTheme === 'white'">☀️</span>
          <span v-else-if="systemStore.currentTheme === 'black'">🌙</span>
          <span v-else>💻</span>
          <span class="capitalize hidden sm:inline">{{ getThemeLabel(systemStore.currentTheme) }}</span>
          <svg class="w-3 h-3 text-slate-600 dark:text-studio-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div
          v-if="showThemeDropdown"
          class="absolute right-0 mt-2 w-44 glass-panel rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 p-1.5 z-50 text-xs"
        >
          <div class="px-2 py-1 text-[10px] uppercase font-bold text-slate-600 dark:text-studio-400">
            {{ $t('theme.title') }}
          </div>
          <button
            v-for="t in themeOptions"
            :key="t.value"
            :class="[
              'w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between font-medium transition-colors',
              systemStore.currentTheme === t.value
                ? 'bg-brand-500/15 text-brand-700 dark:text-brand-300 font-bold'
                : 'text-slate-700 dark:text-studio-300 hover:bg-slate-100 dark:hover:bg-studio-800'
            ]"
            @click="selectTheme(t.value)"
          >
            <span class="flex items-center gap-2">
              <span>{{ t.icon }}</span>
              <span>{{ $t(t.labelKey) }}</span>
            </span>
            <span v-if="systemStore.currentTheme === t.value" class="text-brand-700 dark:text-brand-500">✓</span>
          </button>
        </div>
      </div>

      <!-- Staff Role Badge -->
      <div class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-100 dark:bg-studio-850 text-slate-700 dark:text-studio-200 border border-slate-200 dark:border-white/10">
        <span class="text-slate-600 dark:text-studio-400">{{ $t('nav.current_role') }}:</span>
        <span class="font-bold text-brand-700 dark:text-brand-400 uppercase font-mono">{{ authStore.userRole }}</span>
      </div>

      <!-- User Profile & Logout -->
      <div class="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-200 dark:border-white/10">
        <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-500 to-amber-300 flex items-center justify-center text-slate-950 font-bold text-xs shadow-md shrink-0">
          {{ authStore.staff?.username?.charAt(0).toUpperCase() || 'A' }}
        </div>
        <div class="hidden md:block">
          <p class="text-xs font-bold text-slate-900 dark:text-studio-100 leading-tight">
            {{ authStore.staff?.username }}
          </p>
          <p class="text-[10px] text-slate-500 dark:text-studio-400">
            {{ authStore.staff?.email }}
          </p>
        </div>

        <button
          class="p-2 rounded-xl text-slate-500 hover:text-rose-600 dark:text-studio-400 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          :title="$t('common.logout')" :aria-label="$t('common.logout')"
          @click="logout"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import i18n from '../../i18n/index.js'
const tr = (...args) => i18n.global.t(...args)

import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSystemStore } from '../../stores/system'
import { useAuthStore } from '../../stores/auth'
import { apiConnectionStatus } from '../../api/client'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const systemStore = useSystemStore()
const authStore = useAuthStore()

const connectionStatus = apiConnectionStatus
const showLangDropdown = ref(false)
const showThemeDropdown = ref(false)

const languages = [
  { code: 'uz', flag: '🇺🇿', get label() { return tr('staff.s026') } },
  { code: 'ru', flag: '🇷🇺', get label() { return tr('staff.s027') } },
  { code: 'en', flag: '🇬🇧', get label() { return tr('staff.s028') } }
]

const themeOptions = [
  { value: 'white', icon: '☀️', labelKey: 'theme.white' },
  { value: 'black', icon: '🌙', labelKey: 'theme.black' },
  { value: 'system', icon: '💻', labelKey: 'theme.system' }
]

const currentLangFlag = computed(() => {
  const match = languages.find((l) => l.code === systemStore.currentLocale)
  return match ? match.flag : '🇺🇿'
})

const currentRouteTitle = computed(() => {
  return route.meta?.titleKey ? t(route.meta.titleKey) : tr('staff.s029')
})

function getThemeLabel(theme) {
  return t('theme.' + theme)
}

function selectLang(code) {
  systemStore.setLocale(code)
  showLangDropdown.value = false
  systemStore.addToast({
    type: 'success',
    title: t('lang.title'),
    message: tr('staff.s030', { value0: t('lang.title'), value1: code.toUpperCase() })
  })
}

function selectTheme(theme) {
  systemStore.setTheme(theme)
  showThemeDropdown.value = false
  systemStore.addToast({
    type: 'info',
    title: t('theme.title'),
    message: tr('staff.s030', { value0: t('theme.title'), value1: getThemeLabel(theme) })
  })
}


async function logout() {
  try { await authStore.logout() } catch { /* local session is cleared even if revocation is unavailable */ }
  router.push('/login')
  systemStore.addToast({
    type: 'info',
    title: tr('staff.s031'),
    message: tr('staff.s032')
  })
}
</script>
