<template>
  <div class="space-y-8">
    <LoadState :loading="settingsLoading" :error="loadError" @retry="loadSettings" />
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <svg class="w-6 h-6 text-brand-700 dark:text-brand-500 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {{ $t('economy.title') }}
        </h2>
        <p class="text-xs text-slate-500 dark:text-studio-400 mt-1">
          {{ $t('economy.subtitle') }}
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <Button
          variant="primary"
          size="sm"
          class="flex items-center gap-1.5 shadow-sm shadow-brand-500/20"
          v-if="authStore.hasPermission('coins:distribute')" @click="showDistributeModal = true"
        >
          <span>🎁</span>
          <span> {{ $t('staff.s354') }} </span>
        </Button>

        <div v-if="settingsLoaded" class="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-600 dark:text-studio-300 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{{ settings.reset_timezone }} ({{ settings.reset_time }})</span>
        </div>
      </div>
    </div>

    <!-- Active Rates KPI Cards -->
    <div v-if="settingsLoaded" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
      <!-- 1. Chapter Read -->
      <div class="glass-card rounded-2xl p-4 border border-slate-200 dark:border-white/5 flex flex-col justify-between">
        <span class="text-[11px] font-semibold text-slate-500 dark:text-studio-400">📖 {{ $t('economy.kpi_chapter_reward') }}</span>
        <div class="mt-2 flex items-baseline gap-1">
          <span class="text-2xl font-extrabold text-brand-700 dark:text-brand-400 font-mono">+{{ settings.chapter_read_reward }}</span>
          <span class="text-xs font-bold text-brand-700 dark:text-brand-400">⚡</span>
        </div>
        <span class="text-[10px] text-slate-600 dark:text-studio-400 dark:text-studio-500 mt-1"> {{ $t('staff.s355') }} </span>
      </div>

      <!-- 2. Daily Check-in -->
      <div class="glass-card rounded-2xl p-4 border border-slate-200 dark:border-white/5 flex flex-col justify-between">
        <span class="text-[11px] font-semibold text-slate-500 dark:text-studio-400">📅 {{ $t('economy.kpi_daily_checkin') }}</span>
        <div class="mt-2 flex items-baseline gap-1">
          <span class="text-2xl font-extrabold text-brand-700 dark:text-brand-400 font-mono">+{{ settings.daily_checkin_reward }}</span>
          <span class="text-xs font-bold text-brand-700 dark:text-brand-400">⚡</span>
        </div>
        <span class="text-[10px] text-slate-600 dark:text-studio-400 dark:text-studio-500 mt-1"> {{ $t('staff.s356') }} </span>
      </div>

      <!-- 3. Welcome Bonus -->
      <div class="glass-card rounded-2xl p-4 border border-slate-200 dark:border-white/5 flex flex-col justify-between">
        <span class="text-[11px] font-semibold text-slate-500 dark:text-studio-400">🎉 {{ $t('economy.kpi_welcome_bonus') }}</span>
        <div class="mt-2 flex items-baseline gap-1">
          <span class="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">+{{ settings.welcome_bonus }}</span>
          <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400">⚡</span>
        </div>
        <span class="text-[10px] text-slate-600 dark:text-studio-400 dark:text-studio-500 mt-1"> {{ $t('staff.s357') }} </span>
      </div>

      <!-- 6. Daily Cap -->
      <div class="glass-card rounded-2xl p-4 border border-slate-200 dark:border-white/5 flex flex-col justify-between">
        <span class="text-[11px] font-semibold text-slate-500 dark:text-studio-400">🛡 {{ $t('economy.kpi_daily_cap') }}</span>
        <div class="mt-2 flex items-baseline gap-1">
          <span class="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">{{ settings.daily_max_limit === 0 ? '∞' : settings.daily_max_limit }}</span>
          <span v-if="settings.daily_max_limit" class="text-xs font-bold text-amber-600 dark:text-amber-400">⚡</span>
        </div>
        <span class="text-[10px] text-slate-600 dark:text-studio-400 dark:text-studio-500 mt-1"> {{ $t('staff.s358') }} </span>
      </div>
    </div>

    <!-- Main Configuration Form Card -->
    <div v-if="settingsLoaded" class="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/5">
      <div class="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-white/5 mb-6">
        <div>
          <h3 class="font-bold text-slate-900 dark:text-white text-lg"> {{ $t('staff.s359') }} </h3>
          <p class="text-xs text-slate-500 dark:text-studio-400 mt-0.5"> {{ $t('staff.s360') }} </p>
        </div>
        <Button variant="ghost" size="sm" :disabled="isSaving" @click="resetToDefaults">
          {{ $t('economy.btn_reset') }}
        </Button>
      </div>

      <form @submit.prevent="saveSettings" class="space-y-6">
        <fieldset :disabled="isSaving" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Rate 1: Chapter Read Reward -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-studio-900/60 border border-slate-200 dark:border-white/5 space-y-3">
            <div class="flex items-center justify-between">
              <label for="EconomyView-label-5604" class="text-xs font-bold text-slate-800 dark:text-studio-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>📖</span> {{ $t('staff.s361') }} </label>
              <div class="flex items-center gap-1">
                <button
                  v-for="amt in [5, 10, 15]"
                  :key="amt"
                  type="button"
                  class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-brand-500/10 text-brand-700 dark:text-brand-400 hover:bg-brand-500/20"
                  @click="form.chapter_read_reward = amt"
                >
                  {{ amt }} ⚡
                </button>
              </div>
            </div>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-700 dark:text-brand-500 font-bold text-sm">⚡</span>
              <input id="EconomyView-label-5604"
                v-model.number="form.chapter_read_reward"
                type="number"
                min="0"
                required
                class="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-studio-850 border border-slate-200 dark:border-white/10 rounded-xl text-brand-700 dark:text-brand-400 font-mono font-bold focus:outline-none focus:border-brand-500"
              />
            </div>
            <p class="text-[11px] text-slate-500 dark:text-studio-400 leading-normal"> {{ $t('staff.s362') }} </p>
          </div>

          <!-- Rate 2: Daily Check-in -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-studio-900/60 border border-slate-200 dark:border-white/5 space-y-3">
            <div class="flex items-center justify-between">
              <label for="EconomyView-label-7249" class="text-xs font-bold text-slate-800 dark:text-studio-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>📅</span> {{ $t('staff.s363') }} </label>
              <div class="flex items-center gap-1">
                <button
                  v-for="amt in [10, 15, 25]"
                  :key="amt"
                  type="button"
                  class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-brand-500/10 text-brand-700 dark:text-brand-400 hover:bg-brand-500/20"
                  @click="form.daily_checkin_reward = amt"
                >
                  {{ amt }} ⚡
                </button>
              </div>
            </div>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-700 dark:text-brand-500 font-bold text-sm">⚡</span>
              <input id="EconomyView-label-7249"
                v-model.number="form.daily_checkin_reward"
                type="number"
                min="0"
                required
                class="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-studio-850 border border-slate-200 dark:border-white/10 rounded-xl text-brand-700 dark:text-brand-400 font-mono font-bold focus:outline-none focus:border-brand-500"
              />
            </div>
            <p class="text-[11px] text-slate-500 dark:text-studio-400 leading-normal"> {{ $t('staff.s364') }} </p>
          </div>

          <!-- Rate 3: Welcome Bonus -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-studio-900/60 border border-slate-200 dark:border-white/5 space-y-3">
            <div class="flex items-center justify-between">
              <label for="EconomyView-label-8896" class="text-xs font-bold text-slate-800 dark:text-studio-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>🎉</span> {{ $t('staff.s365') }} </label>
              <div class="flex items-center gap-1">
                <button
                  v-for="amt in [25, 50, 100]"
                  :key="amt"
                  type="button"
                  class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                  @click="form.welcome_bonus = amt"
                >
                  {{ amt }} ⚡
                </button>
              </div>
            </div>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700 dark:text-emerald-500 font-bold text-sm">⚡</span>
              <input id="EconomyView-label-8896"
                v-model.number="form.welcome_bonus"
                type="number"
                min="0"
                required
                class="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-studio-850 border border-slate-200 dark:border-white/10 rounded-xl text-emerald-600 dark:text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
            <p class="text-[11px] text-slate-500 dark:text-studio-400 leading-normal"> {{ $t('staff.s366') }} </p>
          </div>

          <!-- Rate 6: Daily Cap & Anti-Farming -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-studio-900/60 border border-slate-200 dark:border-white/5 space-y-3">
            <div class="flex items-center justify-between">
              <label for="EconomyView-label-10557" class="text-xs font-bold text-slate-800 dark:text-studio-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>🛡</span> {{ $t('staff.s367') }} </label>
              <div class="flex items-center gap-1">
                <button
                  v-for="amt in [50, 100, 200]"
                  :key="amt"
                  type="button"
                  class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                  @click="form.daily_max_limit = amt"
                >
                  {{ amt }} ⚡
                </button>
              </div>
            </div>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-700 dark:text-amber-500 font-bold text-sm">⚡</span>
              <input id="EconomyView-label-10557"
                v-model.number="form.daily_max_limit"
                type="number"
                min="0"
                :placeholder="$t('staff.s368')" :aria-label="$t('staff.s368')"
                class="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-studio-850 border border-slate-200 dark:border-white/10 rounded-xl text-amber-600 dark:text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
            <p class="text-[11px] text-slate-500 dark:text-studio-400 leading-normal"> {{ $t('staff.s369') }} </p>
          </div>
        </div>

        <label class="block text-sm">{{ $t('common.cooldown') }}<input v-model.number="form.anti_farming_cooldown_min" type="number" min="0" max="1440" required class="mt-2 block w-full rounded-xl border border-slate-300 dark:border-studio-700 bg-white dark:bg-studio-900 p-3" /></label>
        <!-- Submit Button -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
          <Button type="submit" variant="primary" size="md" :loading="isSaving">
            💾 {{ $t('economy.btn_save') }}
          </Button>
        </div>
        </fieldset>
      </form>
    </div>

    <!-- Live Economy Health & Projection Simulator -->
    <div v-if="settingsLoaded" class="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/5 space-y-6">
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 class="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
            <span>📊</span> {{ $t('economy.sim_title') }}
          </h3>
          <p class="text-xs text-slate-500 dark:text-studio-400 mt-0.5"> {{ $t('staff.s370') }} </p>
        </div>
        <Badge variant="primary"> {{ $t('staff.s371') }} </Badge>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Input Sliders -->
        <div class="space-y-4">
          <div>
            <div class="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-studio-300 mb-2">
              <span>{{ $t('economy.sim_active_readers') }}:</span>
              <span class="font-mono text-brand-700 dark:text-brand-400 font-bold text-sm">{{ simReaders.toLocaleString() }} {{ $t('staff.s372') }} </span>
            </div>
            <input
              v-model.number="simReaders"
              :aria-label="$t('economy.sim_active_readers')"
              type="range"
              min="50"
              max="10000"
              step="50"
              class="w-full accent-brand-500 cursor-pointer"
            />
          </div>

          <div>
            <div class="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-studio-300 mb-2">
              <span>{{ $t('economy.sim_avg_chapters') }}:</span>
              <span class="font-mono text-brand-700 dark:text-brand-400 font-bold text-sm">{{ simAvgChapters }} {{ $t('staff.s373') }} </span>
            </div>
            <input
              v-model.number="simAvgChapters"
              :aria-label="$t('economy.sim_avg_chapters')"
              type="range"
              min="1"
              max="20"
              step="1"
              class="w-full accent-brand-500 cursor-pointer"
            />
          </div>
        </div>

        <!-- Calculated Live Metrics -->
        <div class="p-5 rounded-2xl bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/5 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/5">
            <span class="text-xs text-slate-600 dark:text-studio-400">{{ $t('economy.sim_daily_emission') }}:</span>
            <span class="text-base font-extrabold text-brand-700 dark:text-brand-400 font-mono">
              ⚡ {{ projectedDailyCoins.toLocaleString() }} {{ $t('staff.s104') }} </span>
          </div>

          <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/5">
            <span class="text-xs text-slate-600 dark:text-studio-400">{{ $t('economy.sim_monthly_emission') }}:</span>
            <span class="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              ⚡ {{ projectedMonthlyCoins.toLocaleString() }} {{ $t('staff.s104') }} </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-600 dark:text-studio-400"> {{ $t('staff.s374') }} </span>
            <span class="text-xs font-mono font-bold text-slate-800 dark:text-studio-200">
              ~{{ Math.floor(projectedMonthlyCoins / 50).toLocaleString() }} {{ $t('staff.s375') }} </span>
          </div>
        </div>
      </div>
    </div>

    <LoadState v-if="canReadTransactions" :loading="txLoading" :error="txError" :empty="!txLoading && !txError && !transactions.length" @retry="loadTransactions" />
    <!-- Recent Reward Distribution Log -->
    <div v-if="canReadTransactions" class="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5">
      <div class="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
        <div>
          <h3 class="font-bold text-slate-900 dark:text-white text-base">{{ $t('economy.tx_title') }}</h3>
          <p class="text-xs text-slate-500 dark:text-studio-400 mt-0.5"> {{ $t('staff.s376') }} </p>
        </div>
        <span class="text-xs font-mono text-slate-600 dark:text-studio-400 dark:text-studio-500"> {{ $t('staff.s201') }} <strong>{{ txTotal }}</strong> {{ $t('staff.s377') }} </span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-100 dark:bg-studio-900/80 text-xs uppercase font-bold text-slate-600 dark:text-studio-400 border-b border-slate-200 dark:border-white/5">
            <tr>
              <th class="px-6 py-3.5">{{ $t('economy.th_user') }}</th>
              <th class="px-6 py-3.5">{{ $t('economy.th_type') }}</th>
              <th class="px-6 py-3.5"> {{ $t('staff.s378') }} </th>
              <th class="px-6 py-3.5">{{ $t('economy.th_amount') }}</th>
              <th class="px-6 py-3.5 text-right">{{ $t('economy.th_date') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-white/5">
            <tr
              v-for="tx in transactions"
              :key="tx.id"
              class="hover:bg-slate-50 dark:hover:bg-studio-850/40 transition-colors"
            >
              <td class="px-6 py-3.5 font-bold text-slate-900 dark:text-white">
                {{ tx.username }}
              </td>
              <td class="px-6 py-3.5">
                <Badge :variant="getTxBadgeVariant(tx.type)">
                  {{ getTxTypeLabel(tx.type) }}
                </Badge>
              </td>
              <td class="px-6 py-3.5 text-xs text-slate-600 dark:text-studio-300">
                {{ tx.title }}
              </td>
              <td class="px-6 py-3.5 font-mono font-bold text-brand-700 dark:text-brand-400">
                {{ tx.amount> 0 ? '+' : '' }}{{ tx.amount }} ⚡
              </td>
              <td class="px-6 py-3.5 text-xs font-mono text-slate-600 dark:text-studio-400 dark:text-studio-500 text-right">
                {{ new Date(tx.created_at).toLocaleString(i18n.global.locale.value) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Pagination v-if="canReadTransactions" v-model:page="txPage" :limit="25" :total="txTotal" :loading="txLoading" />
    <!-- Mass Coins Distribution Modal -->
    <DistributeCoinsModal
      v-model="showDistributeModal"
      @distributed="onDistributed"
    />
  </div>
</template>

<script setup>
import i18n from '../i18n/index.js'
const tr = (...args) => i18n.global.t(...args)

import { reactive, ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import LoadState from '../components/common/LoadState.vue'
import Pagination from '../components/common/Pagination.vue'
import { getErrorMessage, pageCount } from '../utils/forms'
import { useSystemStore } from '../stores/system'
import { economyApi } from '../api/economy'
import Badge from '../components/common/Badge.vue'
import Button from '../components/common/Button.vue'
import DistributeCoinsModal from '../components/economy/DistributeCoinsModal.vue'

const { t } = useI18n()
const authStore = useAuthStore()
const canReadTransactions = computed(() => ['users:manage','coins:view'].some(code => authStore.hasPermission(code)))
const settingsLoaded = ref(false)
const settingsLoading = ref(false)
const loadError = ref('')
const txPage = ref(1)
const txTotal = ref(0)
const txLoading = ref(false)
const txError = ref('')
const systemStore = useSystemStore()

const isSaving = ref(false)
const showDistributeModal = ref(false)

const settings = ref({
  chapter_read_reward: 5,
  daily_checkin_reward: 15,
  welcome_bonus: 50,


  daily_max_limit: 100,
  reset_timezone: 'Asia/Tashkent',
  reset_time: '00:00'
})

const transactions = ref([])

const form = reactive({
  chapter_read_reward: 5,
  daily_checkin_reward: 15,
  welcome_bonus: 50,


  daily_max_limit: 100,
  anti_farming_cooldown_min: 0
})

async function loadSettings() {
  if (!authStore.hasPermission('users:manage')) return
  loadError.value = ''
  settingsLoading.value = true
  try {
    const result = await economyApi.getSettings()
    settings.value = { ...result.data }
    for (const key of Object.keys(form)) form[key] = result.data[key] ?? form[key]
    settingsLoaded.value = true
  } catch (error) { loadError.value = getErrorMessage(error) }
  finally { settingsLoading.value = false }
}
let txSequence = 0
async function loadTransactions() {
  if (!canReadTransactions.value) return
  const sequence = ++txSequence
  txLoading.value = true; txError.value = ''
  try {
    const result = await economyApi.getTransactions({ page: txPage.value, limit: 25 })
    if (sequence !== txSequence) return
    transactions.value = result.data?.items || []
    txTotal.value = result.data?.total ?? transactions.value.length
    if (txPage.value> pageCount(txTotal.value, 25)) { txPage.value = pageCount(txTotal.value, 25); return }
  } catch (error) { if (sequence === txSequence) txError.value = getErrorMessage(error) }
  finally { if (sequence === txSequence) txLoading.value = false }
}
async function loadData() { await Promise.all([loadSettings(), loadTransactions()]) }
watch(txPage, loadTransactions)

async function onDistributed(data) {
  await loadData()
}

// Simulator inputs
const simReaders = ref(500)
const simAvgChapters = ref(3)

const projectedDailyCoins = computed(() => {
  const chapterCoins = simAvgChapters.value * form.chapter_read_reward
  const cappedChapterCoins = form.daily_max_limit> 0 ? Math.min(chapterCoins, form.daily_max_limit) : chapterCoins
  return simReaders.value * (cappedChapterCoins + form.daily_checkin_reward)
})

const projectedMonthlyCoins = computed(() => {
  return projectedDailyCoins.value * 30
})

function getTxBadgeVariant(type) {
  switch (type) {
    case 'chapter_read': return 'primary'
    case 'daily_checkin': return 'warning'
    case 'register_bonus': return 'success'
    case 'creator_reward': return 'purple'
    default: return 'default'
  }
}

function getTxTypeLabel(type) {
  const known = ['chapter_read','daily_checkin','register_bonus','shop_purchase','admin_adjustment','admin_gift','wheel_spin','wheel_reward','clan_create','clan_upgrade']
  return known.includes(type) ? t('transactions.' + type) : type
}

function resetToDefaults() {
  form.chapter_read_reward = 5
  form.daily_checkin_reward = 15
  form.welcome_bonus = 50
  form.daily_max_limit = 100
  form.anti_farming_cooldown_min = 0
  systemStore.addToast({
    type: 'info',
    title: tr('staff.s379'),
    message: tr('staff.s380')
  })
}

async function saveSettings() {
  if (isSaving.value) return
  loadError.value = ''
  isSaving.value = true
  try {
    const res = await economyApi.updateSettings({ ...form })
    if (res.data) {
      settings.value = { ...settings.value, ...res.data }
    }
    systemStore.addToast({
      type: 'success',
      title: tr('staff.s299'),
      message: tr('staff.s381')
    })
  } catch (err) {
    loadError.value = getErrorMessage(err)
    systemStore.addToast({
      type: 'error',
      title: tr('staff.s024'),
      message: err.response?.data?.detail || err.message || tr('staff.s382')
    })
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>
