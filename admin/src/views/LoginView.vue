<template>
  <div class="min-h-screen bg-slate-50 dark:bg-studio-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden transition-colors duration-200">
    <!-- Top Bar: Language & Theme Switcher on Login Page -->
    <div class="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-2">
      <!-- Language Picker -->
      <div class="relative">
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-studio-850 hover:bg-slate-100 dark:hover:bg-studio-800 text-slate-700 dark:text-studio-200 border border-slate-200 dark:border-white/10 shadow-sm transition-colors"
          @click="showLangDropdown = !showLangDropdown; showThemeDropdown = false"
        >
          <span>{{ currentLangFlag }}</span>
          <span class="uppercase font-mono">{{ systemStore.currentLocale }}</span>
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
                ? 'bg-brand-500/15 text-brand-600 dark:text-brand-300 font-bold'
                : 'text-slate-700 dark:text-studio-300 hover:bg-slate-100 dark:hover:bg-studio-800'
            ]"
            @click="selectLang(l.code)"
          >
            <span>{{ l.flag }} {{ l.label }}</span>
            <span v-if="systemStore.currentLocale === l.code" class="text-brand-500">✓</span>
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
                ? 'bg-brand-500/15 text-brand-600 dark:text-brand-300 font-bold'
                : 'text-slate-700 dark:text-studio-300 hover:bg-slate-100 dark:hover:bg-studio-800'
            ]"
            @click="selectTheme(t.value)"
          >
            <span>{{ t.icon }} {{ $t(t.labelKey) }}</span>
            <span v-if="systemStore.currentTheme === t.value" class="text-brand-500">✓</span>
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
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Webtoon<span class="text-brand-500 dark:text-brand-400">Hub</span> Studio
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-studio-400 mt-1 font-mono">
          {{ $t('login.subtitle') }}
        </p>
      </div>

      <!-- Login Card -->
      <div class="glass-panel rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-2xl border border-slate-200 dark:border-white/10">
        <form @submit.prevent="handleLogin" class="space-y-4">
          <!-- Email Field -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
              {{ $t('login.email_label') }}
            </label>
            <input
              v-model="email"
              type="email"
              required
              placeholder="admin@webtoonhub.uz"
              class="w-full px-4 py-2.5 text-sm bg-white dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 placeholder-slate-400 dark:placeholder-studio-500 focus:outline-none focus:border-brand-500/70 focus:ring-1 focus:ring-brand-500/50 transition-all font-mono"
            />
          </div>

          <!-- Password Field -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider">
                {{ $t('login.password_label') }}
              </label>
            </div>
            <input
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
            class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2"
          >
            <svg class="w-4 h-4 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

        <!-- Demo Accounts Quick Fill (1-click login) -->
        <div class="mt-6 pt-6 border-t border-slate-200 dark:border-white/5">
          <p class="text-[11px] font-bold text-slate-500 dark:text-studio-400 uppercase tracking-wider mb-2.5 text-center">
            {{ $t('login.demo_accounts') }}
          </p>

          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              class="p-2 rounded-xl bg-slate-100 dark:bg-studio-900 hover:bg-brand-500/10 border border-slate-200 dark:border-white/5 hover:border-brand-500/30 text-center transition-all group"
              @click="quickFill('admin@webtoonhub.uz', 'AdminPassword123')"
            >
              <span class="block text-xs font-bold text-slate-800 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-300">Superadmin</span>
              <span class="text-[10px] text-slate-500 dark:text-studio-500 font-mono">{{ $t('login.superadmin_desc') }}</span>
            </button>

            <button
              type="button"
              class="p-2 rounded-xl bg-slate-100 dark:bg-studio-900 hover:bg-cyan-500/10 border border-slate-200 dark:border-white/5 hover:border-cyan-500/30 text-center transition-all group"
              @click="quickFill('creator@webtoonhub.uz', 'CreatorPassword123')"
            >
              <span class="block text-xs font-bold text-slate-800 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300">Creator</span>
              <span class="text-[10px] text-slate-500 dark:text-studio-500 font-mono">{{ $t('login.creator_desc') }}</span>
            </button>

            <button
              type="button"
              class="p-2 rounded-xl bg-slate-100 dark:bg-studio-900 hover:bg-purple-500/10 border border-slate-200 dark:border-white/5 hover:border-purple-500/30 text-center transition-all group"
              @click="quickFill('moderator@webtoonhub.uz', 'ModeratorPassword123')"
            >
              <span class="block text-xs font-bold text-slate-800 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300">Moderator</span>
              <span class="text-[10px] text-slate-500 dark:text-studio-500 font-mono">{{ $t('login.moderator_desc') }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Footer Info -->
      <div class="text-center mt-6 text-xs text-slate-500 dark:text-studio-500">
        <p>KIMYO INTERNATIONAL UNIVERSITY IN TASHKENT (KIUT)</p>
        <p class="text-[11px] text-slate-400 dark:text-studio-600 mt-0.5">Amaliy Informatika · Project Based Learning III (PBL3)</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useSystemStore } from '../stores/system'
import Button from '../components/common/Button.vue'

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const systemStore = useSystemStore()

const email = ref('admin@webtoonhub.uz')
const password = ref('AdminPassword123')
const isLoading = ref(false)
const errorMessage = ref('')

const showLangDropdown = ref(false)
const showThemeDropdown = ref(false)

const languages = [
  { code: 'uz', flag: '🇺🇿', label: 'O\'zbekcha' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
  { code: 'en', flag: '🇬🇧', label: 'English' }
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

function selectLang(code) {
  systemStore.setLocale(code)
  showLangDropdown.value = false
}

function selectTheme(theme) {
  systemStore.setTheme(theme)
  showThemeDropdown.value = false
}

function quickFill(e, p) {
  email.value = e
  password.value = p
  errorMessage.value = ''
}

async function handleLogin() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const res = await authStore.login(email.value, password.value)
    systemStore.addToast({
      type: 'success',
      title: t('login.welcome_toast'),
      message: res.message || `${t('dashboard.welcome')}, ${authStore.staff.username}!`
    })
    router.push('/dashboard')
  } catch (err) {
    errorMessage.value = err.response?.data?.error?.message || err.message || 'Xatolik yuz berdi'
  } finally {
    isLoading.value = false
  }
}
</script>
