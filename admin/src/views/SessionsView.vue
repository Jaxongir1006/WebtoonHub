<template>
  <div class="space-y-6">
    <LoadState :error="loadError" @retry="loadSessions()" />
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <svg class="w-6 h-6 text-brand-700 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg> {{ $t('staff.s450') }} </h2>
        <p class="text-xs text-slate-500 dark:text-studio-400 mt-1"> {{ $t('staff.s451') }} </p>
      </div>

      <div class="flex items-center gap-3">
        <Button
          variant="danger"
          size="sm"
          :disabled="sessions.length <= 1 || !!actionLoading"
          @click="revokeOthers"
        > {{ $t('staff.s452') }} </Button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center p-16 space-y-4">
      <div class="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-xs text-slate-500 dark:text-studio-400 font-medium"> {{ $t('staff.s453') }} </p>
    </div>

    <!-- Sessions List -->
    <div v-else class="space-y-4">
      <div
        v-for="s in sessions"
        :key="s.id"
        class="glass-card rounded-2xl p-5 border border-slate-200 dark:border-white/5 hover:border-brand-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div class="flex items-start gap-4">
          <!-- Device Icon -->
          <div class="w-12 h-12 rounded-xl bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/10 flex items-center justify-center text-brand-700 dark:text-brand-400 shrink-0">
            <svg
              v-if="s.device_type === 'Desktop'"
              class="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <svg
              v-else
              class="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>

          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-900 dark:text-white text-base">
                {{ s.device_type || $t('common.browser') }}
              </span>
              <Badge v-if="s.is_current" variant="success" :dot="true"> {{ $t('staff.s454') }} </Badge>
            </div>

            <p class="text-xs text-slate-500 dark:text-studio-400 font-mono"> {{ $t('staff.s455') }} {{ s.ip_address || $t('common.unknown') }} {{ $t('staff.s456') }} {{ String(s.id).substring(0, 8) }}...
            </p>

            <p class="text-[11px] text-slate-500 dark:text-studio-500 line-clamp-1 max-w-xl">
              {{ s.user_agent || $t('staff.s457') }}
            </p>

            <p class="text-[11px] text-slate-500 dark:text-studio-400 font-mono pt-1"> {{ $t('staff.s458') }} {{ formatDate(s.last_active_at || s.created_at) }}
            </p>
          </div>
        </div>

        <div class="self-end md:self-center">
          <Button
            v-if="!s.is_current"
            variant="danger"
            size="xs"
            :disabled="actionLoading === s.id"
            @click="revoke(s.id)"
          > {{ $t('staff.s459') }} </Button>
          <span v-else class="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-semibold"> {{ $t('staff.s460') }} </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import i18n from '../i18n/index.js'
const tr = (...args) => i18n.global.t(...args)

import { ref, onMounted } from 'vue'
import LoadState from '../components/common/LoadState.vue'
import { getErrorMessage } from '../utils/forms'
import { useSystemStore } from '../stores/system'
import { authApi } from '../api/auth'
import Badge from '../components/common/Badge.vue'
import Button from '../components/common/Button.vue'

const systemStore = useSystemStore()
const sessions = ref([])
const loadError = ref('')
const loading = ref(false)
const actionLoading = ref(null)

async function loadSessions() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await authApi.getSessions()
    sessions.value = res.data || []
  } catch (err) {
    loadError.value = getErrorMessage(err)
    systemStore.addToast({
      type: 'error',
      title: tr('staff.s024'),
      message: tr('staff.s461')
    })
  } finally {
    loading.value = false
  }
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString(i18n.global.locale.value, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function revoke(id) {
  actionLoading.value = id
  try {
    await authApi.revokeSession(id)
    sessions.value = sessions.value.filter((s) => s.id !== id)
    systemStore.addToast({
      type: 'info',
      title: tr('staff.s462'),
      message: tr('staff.s463')
    })
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: tr('staff.s024'),
      message: err.response?.data?.detail || tr('staff.s464')
    })
  } finally {
    actionLoading.value = null
  }
}

async function revokeOthers() {
  if (actionLoading.value) return
  if (!confirm(tr('staff.s465'))) return
  actionLoading.value = 'others'
  try {
    await authApi.revokeOtherSessions()
    sessions.value = sessions.value.filter((s) => s.is_current)
    systemStore.addToast({
      type: 'success',
      title: tr('staff.s466'),
      message: tr('staff.s467')
    })
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: tr('staff.s024'),
      message: err.response?.data?.detail || tr('staff.s468')
    })
  } finally { actionLoading.value = null }
}

onMounted(() => {
  loadSessions()
})
</script>
