<template>
  <aside
    :class="[
      'fixed inset-y-0 left-0 z-40 bg-white dark:bg-studio-900 border-r border-slate-200 dark:border-white/5 flex flex-col transition-all duration-300 shadow-sm dark:shadow-none',
      systemStore.isSidebarOpen ? 'w-64' : 'w-20',
      'max-lg:translate-x-0 max-lg:w-64',
      !systemStore.isMobileMenuOpen ? 'max-lg:-translate-x-full' : ''
    ]"
  >
    <!-- Brand / Logo -->
    <div class="h-16 px-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
      <router-link to="/dashboard" class="flex items-center gap-3 overflow-hidden">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-glow-brand shrink-0">
          <svg class="w-6 h-6 text-slate-950 fill-current" viewBox="0 0 24 24">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <div v-show="systemStore.isSidebarOpen" class="transition-opacity duration-200">
          <h1 class="font-extrabold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
            Webtoon<span class="text-brand-500 dark:text-brand-400">Hub</span>
          </h1>
          <span class="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-studio-400 font-mono">
            STUDIO ADMIN
          </span>
        </div>
      </router-link>

      <!-- Mobile close button -->
      <button
        class="lg:hidden text-slate-500 hover:text-slate-900 dark:text-studio-400 dark:hover:text-white"
        @click="systemStore.setMobileMenu(false)"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Navigation List -->
    <div class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      <div v-for="section in navSections" :key="section.titleKey" class="pt-2 pb-1">
        <div
          v-if="systemStore.isSidebarOpen && section.titleKey"
          class="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-studio-400"
        >
          {{ $t(section.titleKey) }}
        </div>

        <template v-for="item in section.items" :key="item.path">
          <router-link
            v-if="!item.permission || authStore.hasPermission(item.permission)"
            :to="item.path"
            :class="[
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative',
              $route.path === item.path
                ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/30 font-semibold shadow-sm dark:shadow-none'
                : 'text-slate-600 dark:text-studio-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-studio-850/80 border border-transparent'
            ]"
            @click="systemStore.setMobileMenu(false)"
          >
            <!-- Active Indicator Pill -->
            <span
              v-if="$route.path === item.path"
              class="absolute -left-1 top-2.5 bottom-2.5 w-1.5 rounded-r-full bg-brand-500 dark:bg-brand-400 shadow-glow-brand"
            />

            <!-- Icon -->
            <component :is="item.icon" class="w-5 h-5 shrink-0" />

            <!-- Title -->
            <span v-show="systemStore.isSidebarOpen" class="flex-1 truncate">
              {{ $t(item.titleKey) }}
            </span>

            <!-- Badge (e.g. pending chapters or creator requests) -->
            <span
              v-if="item.badge && item.badge() > 0"
              class="px-1.5 py-0.5 text-[11px] font-bold rounded-full bg-brand-500 text-slate-950 font-mono shadow-sm"
              :class="!systemStore.isSidebarOpen ? 'absolute top-1 right-1 px-1 text-[9px]' : ''"
            >
              {{ item.badge() }}
            </span>
          </router-link>
        </template>
      </div>
    </div>

    <!-- Role Indicator & Collapse button -->
    <div class="p-3 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-studio-950/40">
      <div
        v-if="systemStore.isSidebarOpen"
        class="px-3 py-2 rounded-xl bg-white dark:bg-studio-850/60 border border-slate-200 dark:border-white/5 mb-2 flex items-center justify-between shadow-sm dark:shadow-none"
      >
        <div class="min-w-0">
          <p class="text-xs text-slate-400 dark:text-studio-400 truncate">{{ $t('nav.current_role') }}:</p>
          <p class="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase font-mono tracking-wider truncate">
            {{ authStore.userRole }}
          </p>
        </div>
        <span class="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
      </div>

      <button
        class="w-full hidden lg:flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-studio-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-studio-800 transition-colors"
        @click="systemStore.toggleSidebar()"
      >
        <svg
          class="w-5 h-5 transition-transform duration-200"
          :class="!systemStore.isSidebarOpen ? 'rotate-180' : ''"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
      </button>
    </div>
  </aside>

  <!-- Mobile Overlay -->
  <div
    v-if="systemStore.isMobileMenuOpen"
    class="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
    @click="systemStore.setMobileMenu(false)"
  />
</template>

<script setup>
import { h, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSystemStore } from '../../stores/system'
import { useAuthStore } from '../../stores/auth'
import { analyticsApi } from '../../api/analytics'

const route = useRoute()
const systemStore = useSystemStore()
const authStore = useAuthStore()

const pendingChapters = ref(0)
const pendingCreatorRequests = ref(0)

onMounted(async () => {
  if (authStore.isAuthenticated) {
    try {
      const res = await analyticsApi.getDashboardStats()
      if (res.data) {
        pendingChapters.value = res.data.pending_chapters || 0
        pendingCreatorRequests.value = res.data.pending_creator_requests || 0
      }
    } catch (e) {
      // ignore
    }
  }
})

// SVG Icon Helpers
const IconDashboard = () =>
  h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' })
  ])

const IconBook = () =>
  h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' })
  ])

const IconShieldCheck = () =>
  h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' })
  ])

const IconShoppingBag = () =>
  h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' })
  ])

const IconSparkles = () =>
  h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' })
  ])

const IconKey = () =>
  h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' })
  ])

const IconUserCheck = () =>
  h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' })
  ])

const IconUsers = () =>
  h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' })
  ])

const IconChat = () =>
  h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' })
  ])

const IconDevices = () =>
  h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' })
  ])

const IconLightning = () =>
  h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M13 10V3L4 14h7v7l9-11h-7z' })
  ])

const IconClan = () =>
  h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9' })
  ])

const navSections = [
  {
    titleKey: 'nav.general',
    items: [
      { titleKey: 'nav.dashboard', path: '/dashboard', icon: IconDashboard }
    ]
  },
  {
    titleKey: 'nav.content',
    items: [
      { titleKey: 'nav.webtoons', path: '/webtoons', icon: IconBook, permission: 'webtoons:create' },
      {
        titleKey: 'nav.moderation',
        path: '/moderation',
        icon: IconShieldCheck,
        permission: 'chapters:approve',
        badge: () => pendingChapters.value
      },
      { titleKey: 'nav.shop', path: '/shop', icon: IconShoppingBag, permission: 'shop:manage' },
      { titleKey: 'nav.wheels', path: '/wheels', icon: IconSparkles, permission: 'wheel:manage' }
    ]
  },
  {
    titleKey: 'nav.staff_security',
    items: [
      { titleKey: 'nav.rbac', path: '/rbac', icon: IconKey, permission: 'roles:manage' },
      {
        titleKey: 'nav.creator_requests',
        path: '/creator-requests',
        icon: IconUserCheck,
        permission: 'roles:manage',
        badge: () => pendingCreatorRequests.value
      },
      { titleKey: 'nav.users', path: '/users', icon: IconUsers, permission: 'users:manage' },
      { titleKey: 'nav.economy', path: '/economy', icon: IconLightning, permission: 'users:manage' },
      { titleKey: 'nav.clans', path: '/clans', icon: IconClan, permission: 'users:manage' },
      { titleKey: 'nav.comments', path: '/comments', icon: IconChat, permission: 'comments:moderate' },
      { titleKey: 'nav.sessions', path: '/sessions', icon: IconDevices }
    ]
  }
]
</script>
