<template>
  <div class="space-y-6">
    <LoadState :error="loadError" @retry="loadRequests" />
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <svg class="w-6 h-6 text-brand-700 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg> {{ $t('staff.s321') }} </h2>
        <p class="text-xs text-slate-500 dark:text-studio-400 mt-1"> {{ $t('staff.s322') }} </p>
      </div>

      <!-- Status Filter -->
      <div class="p-1 rounded-xl bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/10 flex items-center gap-1">
        <button
          v-for="status in ['pending', 'approved', 'rejected', 'all']"
          :key="status"
          :class="[
            'px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all',
            currentStatus === status
              ? 'bg-brand-500 text-slate-950 font-bold shadow-sm'
              : 'text-slate-600 dark:text-studio-400 hover:text-slate-900 dark:hover:text-white'
          ]"
          @click="currentStatus = status"
        >
          {{ status === 'pending' ? $t('staff.s323') : (status === 'approved' ? $t('staff.s324') : (status === 'rejected' ? $t('staff.s325') : $t('common.all'))) }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center p-16 space-y-4">
      <div class="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-xs text-slate-500 dark:text-studio-400 font-medium"> {{ $t('staff.s326') }} </p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!loadError && filteredRequests.length === 0"
      class="glass-card rounded-2xl p-12 text-center border border-slate-200 dark:border-white/5 space-y-3"
    >
      <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-studio-800 text-slate-500 dark:text-studio-400 mx-auto flex items-center justify-center">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 class="font-bold text-slate-900 dark:text-white text-base"> {{ $t('staff.s327') }} </h3>
      <p class="text-xs text-slate-500 dark:text-studio-400"> {{ $t('staff.s328') }} </p>
    </div>

    <!-- Requests Cards -->
    <div v-else class="space-y-4">
      <div
        v-for="req in filteredRequests"
        :key="req.id"
        class="glass-card rounded-2xl p-6 border border-slate-200 dark:border-white/5 hover:border-brand-500/30 transition-all flex flex-col md:flex-row md:items-start justify-between gap-6"
      >
        <div class="space-y-3 flex-1">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20 font-bold flex items-center justify-center text-sm">
              {{ ((req.user?.username || req.username || 'U').charAt(0)).toUpperCase() }}
            </div>
            <div>
              <h3 class="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                {{ req.user?.username || req.username }}
                <Badge :variant="req.status === 'approved' ? 'success' : (req.status === 'pending' ? 'warning' : 'danger')">
                  {{ req.status === 'approved' ? $t('staff.s324') : (req.status === 'pending' ? $t('staff.s323') : $t('staff.s325')) }}
                </Badge>
              </h3>
              <p class="text-xs text-slate-500 dark:text-studio-400 font-mono">{{ req.user?.email || req.email }} {{ $t('staff.s329') }} {{ formatDate(req.created_at) }}</p>
            </div>
          </div>

          <!-- Message Body -->
          <div class="p-4 rounded-xl bg-slate-100 dark:bg-studio-900/60 border border-slate-200 dark:border-white/5 text-xs text-slate-800 dark:text-studio-200 leading-relaxed">
            <span class="font-bold text-slate-500 dark:text-studio-400 block mb-1"> {{ $t('staff.s330') }} </span>
            {{ req.message }}
          </div>

          <!-- Admin feedback if present -->
          <div v-if="req.admin_feedback" class="p-3 rounded-xl bg-slate-100 dark:bg-studio-950 border border-slate-200 dark:border-white/5 text-xs text-slate-500 dark:text-studio-400">
            <span class="font-bold text-slate-700 dark:text-studio-300"> {{ $t('staff.s331') }} </span> {{ req.admin_feedback }}
          </div>
        </div>

        <!-- Action Controls -->
        <div class="flex items-center gap-3 self-end md:self-start shrink-0 pt-2 md:pt-0">
          <template v-if="req.status === 'pending'">
            <Button
              variant="danger"
              size="sm"
              :disabled="!!actionLoading"
              @click="openRejection(req.id)"
            > {{ $t('staff.s332') }} </Button>
            <Button
              variant="success"
              size="sm"
              :disabled="!!actionLoading"
              @click="review(req.id, 'approved')"
            > {{ $t('staff.s333') }} </Button>
          </template>

          <template v-else>
            <span class="text-xs font-mono text-slate-500 dark:text-studio-400 italic">
              {{ req.reviewed_at ? $t('staff.s334', { value0: formatDate(req.reviewed_at) }) : $t('staff.s335') }}
            </span>
          </template>
        </div>
      </div>
    </div>
    <RejectionModal v-model="showRejection" :on-save="rejectWithReason" />
  </div>
</template>

<script setup>
import i18n from '../i18n/index.js'
const tr = (...args) => i18n.global.t(...args)

import { ref, computed, onMounted } from 'vue'
import RejectionModal from '../components/common/RejectionModal.vue'
import { getErrorMessage } from '../utils/forms'
import LoadState from '../components/common/LoadState.vue'
import { useSystemStore } from '../stores/system'
import { requestsApi } from '../api/requests'
import Badge from '../components/common/Badge.vue'
import Button from '../components/common/Button.vue'

const systemStore = useSystemStore()
const currentStatus = ref('pending')
const loading = ref(false)
const loadError = ref('')
const actionLoading = ref(null)
const requests = ref([])

const filteredRequests = computed(() => {
  if (currentStatus.value === 'all') return requests.value
  return requests.value.filter((r) => r.status === currentStatus.value)
})

async function loadRequests() {
  loadError.value = ''
  loading.value = true
  try {
    const res = await requestsApi.getRequests()
    requests.value = res.data || []
  } catch (err) {
    loadError.value = getErrorMessage(err)
    systemStore.addToast({
      type: 'error',
      title: tr('staff.s024'),
      message: tr('staff.s336')
    })
  } finally {
    loading.value = false
  }
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(i18n.global.locale.value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const showRejection = ref(false)
const rejectionId = ref(null)
function openRejection(id) { if (actionLoading.value) return; rejectionId.value = id; showRejection.value = true }
async function rejectWithReason(reason) { await review(rejectionId.value, 'rejected', reason) }
async function review(id, status, feedback = '') {
  if (actionLoading.value) throw new Error(tr('studioFixes.busy'))
  actionLoading.value = id
  try {
    await requestsApi.reviewRequest(id, status, feedback)

    // Update local item status
    const req = requests.value.find((r) => r.id === id)
    if (req) {
      req.status = status
      req.admin_feedback = feedback
      req.reviewed_at = new Date().toISOString()
    }

    systemStore.addToast({
      type: status === 'approved' ? 'success' : 'info',
      title: status === 'approved' ? tr('staff.s337') : tr('staff.s338'),
      message:
        status === 'approved'
          ? tr('staff.s339')
          : tr('staff.s338')
    })
    await loadRequests()
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: tr('staff.s024'),
      message: err.response?.data?.detail || tr('staff.s340')
    })
    if (status === 'rejected') throw err
  } finally {
    actionLoading.value = null
  }
}

onMounted(() => {
  loadRequests()
})
</script>
