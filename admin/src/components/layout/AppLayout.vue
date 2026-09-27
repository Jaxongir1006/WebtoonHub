<template>
  <div class="min-h-screen bg-studio-950 text-studio-100 flex">
    <!-- Sidebar Navigation -->
    <Sidebar />

    <!-- Main Content Area -->
    <div
      :class="[
        'flex-1 flex flex-col min-w-0 transition-all duration-300',
        systemStore.isSidebarOpen ? 'lg:pl-64' : 'lg:pl-20'
      ]"
    >
      <Header />

      <main class="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
        <router-view v-slot="{ Component }">
          <transition
            enter-active-class="transition-opacity duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            mode="out-in"
          >
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <!-- Notification Toasts -->
    <ToastContainer />
  </div>
</template>

<script setup>
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'
import ToastContainer from '../common/ToastContainer.vue'
import { useSystemStore } from '../../stores/system'

const systemStore = useSystemStore()
</script>
