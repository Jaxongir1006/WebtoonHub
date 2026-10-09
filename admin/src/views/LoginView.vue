<template>
  <div class="min-h-screen bg-slate-50 dark:bg-studio-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden transition-colors duration-200">
    <!-- Top Bar: Language & Theme Switcher on Login Page -->
    <div class="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-2">
      <!-- Language Picker -->
      <div class="relative">
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-studio-850 hover:bg-slate-100 dark:hover:bg-studio-800 text-slate-700 dark:text-studio-200 border border-slate-200 dark:border-white/10 shadow-sm transition-colors"
          :aria-label="`${$t('lang.title')}: ${currentLanguage.label}`" :title="currentLanguage.label" :aria-expanded="showLangDropdown"
          @click="showLangDropdown = !showLangDropdown; showThemeDropdown = false"
        >
          <img :src="currentLanguage.flag" alt="" aria-hidden="true" width="24" height="16" class="w-6 h-4 object-contain rounded-sm" />
          <svg class="w-3 h-3 text-slate-600 dark:text-studio-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div
          v-if="showLangDropdown"
          class="absolute right-0 mt-2 w-36 glass-panel rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 p-1.5 z-50 text-xs"
        >
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
              <img :src="l.flag" alt="" aria-hidden="true" width="24" height="16" class="w-6 h-4 object-contain rounded-sm" />
              <span>{{ l.label }}</span>
            </span>
            <span v-if="systemStore.currentLocale === l.code" class="text-brand-700 dark:text-brand-500">✓</span>
          </button>
        </div>
      </div>

      <!-- Theme Switcher -->
      <div class="relative">
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-studio-850 hover:bg-slate-100 dark:hover:bg-studio-800 text-slate-700 dark:text-studio-200 border border-slate-200 dark:border-white/10 shadow-sm transition-colors"
          @click="showThemeDropdown = !showThemeDropdown; showLangDropdown = false"
        >
          <span v-if="systemStore.currentTheme === 'white'">☀️</span>
          <span v-else-if="systemStore.currentTheme === 'black'">🌙</span>
          <span v-else>💻</span>
          <span class="capitalize hidden sm:inline">{{ systemStore.currentTheme }}</span>
        </button>

        <div
          v-if="showThemeDropdown"
          class="absolute right-0 mt-2 w-40 glass-panel rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 p-1.5 z-50 text-xs"
        >
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
            <span>{{ t.icon }} {{ $t(t.labelKey) }}</span>
            <span v-if="systemStore.currentTheme === t.value" class="text-brand-700 dark:text-brand-500">✓</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Ambient Background Glows -->
    <div class="absolute -top-40 -left-40 w-96 h-96 bg-brand-500/10 dark:bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />
    <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

    <div class="w-full max-w-md relative z-10">
      <!-- Brand Header -->
      <div class="text-center mb-8">
        <div class="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 items-center justify-center shadow-glow-brand mb-4">
          <svg class="w-9 h-9 text-slate-950 fill-current" viewBox="0 0 24 24">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight"> {{ $t('staff.s033') }} <span class="text-brand-700 dark:text-brand-500 dark:text-brand-400"> {{ $t('staff.s034') }} </span> {{ $t('staff.s383') }} </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-studio-400 mt-1 font-mono">
          {{ $t('login.subtitle') }}
        </p>
      </div>

      <!-- Login Card -->
      <div class="glass-panel rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-2xl border border-slate-200 dark:border-white/10">
        <form @submit.prevent="handleLogin" class="space-y-4">
          <!-- Staff identifier -->
          <div>
            <label for="LoginView-field-1" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
              {{ $t('login.email_label') }}
            </label>
            <input
              id="LoginView-field-1"
              v-model="email"
              type="text"
              required
              autocomplete="username"
              :placeholder="$t('staff.s384')"
              class="w-full px-4 py-2.5 text-sm bg-white dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 placeholder-slate-400 dark:placeholder-studio-500 focus:outline-none focus:border-brand-500/70 focus:ring-1 focus:ring-brand-500/50 transition-all font-mono"
            />
          </div>

          <!-- Password Field -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label for="LoginView-label-5794" class="text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider">
                {{ $t('login.password_label') }}
              </label>
            </div>
            <input id="LoginView-label-5794"
              v-model="password"
              type="password"
              required
              placeholder="••••••••••••"
              class="w-full px-4 py-2.5 text-sm bg-white dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 placeholder-slate-400 dark:placeholder-studio-500 focus:outline-none focus:border-brand-500/70 focus:ring-1 focus:ring-brand-500/50 transition-all font-mono"
            />
          </div>

          <!-- Error Alert -->
          <div
            v-if="errorMessage"
            role="alert"
            class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2"
          >
            <svg class="w-4 h-4 text-rose-700 dark:text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Submit Button -->
          <Button
            type="submit"
            variant="primary"
            size="lg"
            class="w-full font-bold uppercase tracking-wider"
            :loading="isLoading"
          >
            {{ $t('login.btn_login') }}
          </Button>
        </form>

      </div>

      <!-- Footer Info -->
      <div class="text-center mt-6 text-xs text-slate-500 dark:text-studio-500">
        <p> {{ $t('staff.s385') }} </p>
        <p class="text-[11px] text-slate-600 dark:text-studio-400 dark:text-studio-600 mt-0.5"> {{ $t('staff.s386') }} </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import i18n from '../i18n/index.js'
const tr = (...args) => i18n.global.t(...args)

import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useSystemStore } from '../stores/system'
import Button from '../components/common/Button.vue'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const authStore = useAuthStore()
const systemStore = useSystemStore()

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

const showLangDropdown = ref(false)
const showThemeDropdown = ref(false)

const languages = [
  { code: 'uz', flag: `${import.meta.env.BASE_URL}flags/uz.svg`, get label() { return tr('staff.s026') } },
  { code: 'ru', flag: `${import.meta.env.BASE_URL}flags/ru.svg`, get label() { return tr('staff.s027') } },
  { code: 'en', flag: `${import.meta.env.BASE_URL}flags/gb.svg`, get label() { return tr('staff.s028') } }
]

const themeOptions = [
  { value: 'white', icon: '☀️', labelKey: 'theme.white' },
  { value: 'black', icon: '🌙', labelKey: 'theme.black' },
  { value: 'system', icon: '💻', labelKey: 'theme.system' }
]

const currentLanguage = computed(() => languages.find((l) => l.code === systemStore.currentLocale) || languages[0])

function selectLang(code) {
  systemStore.setLocale(code)
  showLangDropdown.value = false
}

function selectTheme(theme) {
  systemStore.setTheme(theme)
  showThemeDropdown.value = false
}

async function handleLogin() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const res = await authStore.login(email.value, password.value)
    systemStore.addToast({
      type: 'success',
      title: t('login.welcome_toast'),
      message: tr('staff.s387', { value0: t('dashboard.welcome'), value1: authStore.staff.username })
    })
    router.push(typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') && !route.query.redirect.startsWith('//') ? route.query.redirect : '/dashboard')
  } catch (err) {
    errorMessage.value = err.response?.data?.error?.message || err.message || tr('staff.s388')
  } finally {
    isLoading.value = false
  }
}
</script>
