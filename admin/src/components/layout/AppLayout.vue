<template>
  <div class="min-h-screen bg-slate-50 dark:bg-studio-950 text-slate-900 dark:text-studio-100 flex">
    <!-- Sidebar Navigation -->
    <Sidebar />

    <!-- Main Content Area -->
    <div
      :inert="systemStore.isMobileMenuOpen"
      :class="[
        'flex-1 flex flex-col min-w-0 transition-all duration-300',
        systemStore.isSidebarOpen ? 'lg:pl-64' : 'lg:pl-20'
      ]"
    >
      <Header />

      <main class="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
        <router-view v-slot="{ Component, route }">
          <transition
            enter-active-class="transition-opacity duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            mode="out-in"
          >
            <div :key="route.path">
              <component :is="Component" />
            </div>
          </transition>
        </router-view>
      </main>
    </div>

    <!-- Notification Toasts -->

  </div>
</template>

<script setup>
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'

import { useSystemStore } from '../../stores/system'

const systemStore = useSystemStore()
</script>
