<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <svg class="w-6 h-6 text-brand-500 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {{ $t('economy.title') }}
        </h2>
        <p class="text-xs text-slate-500 dark:text-studio-400 mt-1">
          {{ $t('economy.subtitle') }}
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <div class="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-600 dark:text-studio-300 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{{ settings.reset_timezone }} ({{ settings.reset_time }})</span>
        </div>
      </div>
    </div>

    <!-- Active Rates KPI Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
      <!-- 1. Chapter Read -->
      <div class="glass-card rounded-2xl p-4 border border-slate-200 dark:border-white/5 flex flex-col justify-between">
        <span class="text-[11px] font-semibold text-slate-500 dark:text-studio-400">📖 {{ $t('economy.kpi_chapter_reward') }}</span>
        <div class="mt-2 flex items-baseline gap-1">
          <span class="text-2xl font-extrabold text-brand-600 dark:text-brand-400 font-mono">+{{ settings.chapter_read_reward }}</span>
          <span class="text-xs font-bold text-brand-600 dark:text-brand-400">⚡</span>
        </div>
        <span class="text-[10px] text-slate-400 dark:text-studio-500 mt-1">har bir bob uchun</span>
      </div>

      <!-- 2. Daily Check-in -->
      <div class="glass-card rounded-2xl p-4 border border-slate-200 dark:border-white/5 flex flex-col justify-between">
        <span class="text-[11px] font-semibold text-slate-500 dark:text-studio-400">📅 {{ $t('economy.kpi_daily_checkin') }}</span>
        <div class="mt-2 flex items-baseline gap-1">
          <span class="text-2xl font-extrabold text-brand-600 dark:text-brand-400 font-mono">+{{ settings.daily_checkin_reward }}</span>
          <span class="text-xs font-bold text-brand-600 dark:text-brand-400">⚡</span>
        </div>
        <span class="text-[10px] text-slate-400 dark:text-studio-500 mt-1">kuniga bir marta</span>
      </div>

      <!-- 3. Welcome Bonus -->
      <div class="glass-card rounded-2xl p-4 border border-slate-200 dark:border-white/5 flex flex-col justify-between">
        <span class="text-[11px] font-semibold text-slate-500 dark:text-studio-400">🎉 {{ $t('economy.kpi_welcome_bonus') }}</span>
        <div class="mt-2 flex items-baseline gap-1">
          <span class="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">+{{ settings.welcome_bonus }}</span>
          <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400">⚡</span>
        </div>
        <span class="text-[10px] text-slate-400 dark:text-studio-500 mt-1">yangi ro'yxatdan o'tganda</span>
      </div>

      <!-- 4. Creator Upload -->
      <div class="glass-card rounded-2xl p-4 border border-slate-200 dark:border-white/5 flex flex-col justify-between">
        <span class="text-[11px] font-semibold text-slate-500 dark:text-studio-400">✍️ {{ $t('economy.kpi_creator_reward') }}</span>
        <div class="mt-2 flex items-baseline gap-1">
          <span class="text-2xl font-extrabold text-purple-600 dark:text-purple-400 font-mono">+{{ settings.creator_chapter_reward }}</span>
          <span class="text-xs font-bold text-purple-600 dark:text-purple-400">⚡</span>
        </div>
        <span class="text-[10px] text-slate-400 dark:text-studio-500 mt-1">tasdiqlangan bob uchun</span>
      </div>

      <!-- 5. Comment Reward -->
      <div class="glass-card rounded-2xl p-4 border border-slate-200 dark:border-white/5 flex flex-col justify-between">
        <span class="text-[11px] font-semibold text-slate-500 dark:text-studio-400">💬 {{ $t('economy.kpi_comment_reward') }}</span>
        <div class="mt-2 flex items-baseline gap-1">
          <span class="text-2xl font-extrabold text-cyan-600 dark:text-cyan-400 font-mono">+{{ settings.comment_reward }}</span>
          <span class="text-xs font-bold text-cyan-600 dark:text-cyan-400">⚡</span>
        </div>
        <span class="text-[10px] text-slate-400 dark:text-studio-500 mt-1">sharh qoldirganda</span>
      </div>

      <!-- 6. Daily Cap -->
      <div class="glass-card rounded-2xl p-4 border border-slate-200 dark:border-white/5 flex flex-col justify-between">
        <span class="text-[11px] font-semibold text-slate-500 dark:text-studio-400">🛡 {{ $t('economy.kpi_daily_cap') }}</span>
        <div class="mt-2 flex items-baseline gap-1">
          <span class="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">{{ settings.daily_max_limit || '∞' }}</span>
          <span v-if="settings.daily_max_limit" class="text-xs font-bold text-amber-600 dark:text-amber-400">⚡</span>
        </div>
        <span class="text-[10px] text-slate-400 dark:text-studio-500 mt-1">sutkalik daromad chegarasi</span>
      </div>
    </div>

    <!-- Main Configuration Form Card -->
    <div class="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/5">
      <div class="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-white/5 mb-6">
        <div>
          <h3 class="font-bold text-slate-900 dark:text-white text-lg">⚡ Beriladigan Chaqmoqlar Miqdorini Sozlash</h3>
          <p class="text-xs text-slate-500 dark:text-studio-400 mt-0.5">
            O'quvchilar harakatlariga qarab avtomatik taqsimlanadigan tangalar balansini o'zgartiring
          </p>
        </div>
        <Button variant="ghost" size="sm" @click="resetToDefaults">
          {{ $t('economy.btn_reset') }}
        </Button>
      </div>

      <form @submit.prevent="saveSettings" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Rate 1: Chapter Read Reward -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-studio-900/60 border border-slate-200 dark:border-white/5 space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-slate-800 dark:text-studio-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>📖</span> Bob o'qish uchun mukofot
              </label>
              <div class="flex items-center gap-1">
                <button
                  v-for="amt in [5, 10, 15]"
                  :key="amt"
                  type="button"
                  class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20"
                  @click="form.chapter_read_reward = amt"
                >
                  {{ amt }} ⚡
                </button>
              </div>
            </div>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-500 font-bold text-sm">⚡</span>
              <input
                v-model.number="form.chapter_read_reward"
                type="number"
                min="0"
                required
                class="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-studio-850 border border-slate-200 dark:border-white/10 rounded-xl text-brand-600 dark:text-brand-400 font-mono font-bold focus:outline-none focus:border-brand-500"
              />
            </div>
            <p class="text-[11px] text-slate-500 dark:text-studio-400 leading-normal">
              O'quvchi sahifalarni oxirigacha ko'rib chiqqanda beriladigan standart mukofot (har bir alohida bobda o'zgartirish mumkin).
            </p>
          </div>

          <!-- Rate 2: Daily Check-in -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-studio-900/60 border border-slate-200 dark:border-white/5 space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-slate-800 dark:text-studio-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>📅</span> Kunlik kirish bonusi (Daily Check-in)
              </label>
              <div class="flex items-center gap-1">
                <button
                  v-for="amt in [10, 15, 25]"
                  :key="amt"
                  type="button"
                  class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20"
                  @click="form.daily_checkin_reward = amt"
                >
                  {{ amt }} ⚡
                </button>
              </div>
            </div>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-500 font-bold text-sm">⚡</span>
              <input
                v-model.number="form.daily_checkin_reward"
                type="number"
                min="0"
                required
                class="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-studio-850 border border-slate-200 dark:border-white/10 rounded-xl text-brand-600 dark:text-brand-400 font-mono font-bold focus:outline-none focus:border-brand-500"
              />
            </div>
            <p class="text-[11px] text-slate-500 dark:text-studio-400 leading-normal">
              Har kuni Toshkent vaqti bilan soat 00:00 dan keyin birinchi kirgan o'quvchining balansi oshiriladi.
            </p>
          </div>

          <!-- Rate 3: Welcome Bonus -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-studio-900/60 border border-slate-200 dark:border-white/5 space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-slate-800 dark:text-studio-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>🎉</span> Ro'yxatdan o'tish (Welcome bonus)
              </label>
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
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-sm">⚡</span>
              <input
                v-model.number="form.welcome_bonus"
                type="number"
                min="0"
                required
                class="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-studio-850 border border-slate-200 dark:border-white/10 rounded-xl text-emerald-600 dark:text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
            <p class="text-[11px] text-slate-500 dark:text-studio-400 leading-normal">
              Yangi hisob ochgan o'quvchiga darhol beriladigan boshlang'ich Chaqmoq miqdori.
            </p>
          </div>

          <!-- Rate 4: Creator Upload Reward -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-studio-900/60 border border-slate-200 dark:border-white/5 space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-slate-800 dark:text-studio-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>✍️</span> Creator yangi bob yuklaganda
              </label>
              <div class="flex items-center gap-1">
                <button
                  v-for="amt in [20, 25, 50]"
                  :key="amt"
                  type="button"
                  class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20"
                  @click="form.creator_chapter_reward = amt"
                >
                  {{ amt }} ⚡
                </button>
              </div>
            </div>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-500 font-bold text-sm">⚡</span>
              <input
                v-model.number="form.creator_chapter_reward"
                type="number"
                min="0"
                required
                class="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-studio-850 border border-slate-200 dark:border-white/10 rounded-xl text-purple-600 dark:text-purple-400 font-mono font-bold focus:outline-none focus:border-purple-500"
              />
            </div>
            <p class="text-[11px] text-slate-500 dark:text-studio-400 leading-normal">
              Tarjimon talaba yangi bob yuklab, u moderatsiyadan o'tib chop etilganda creatorga beriladi.
            </p>
          </div>

          <!-- Rate 5: Comment Reward -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-studio-900/60 border border-slate-200 dark:border-white/5 space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-slate-800 dark:text-studio-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>💬</span> Sharh yozgani uchun mukofot
              </label>
              <div class="flex items-center gap-1">
                <button
                  v-for="amt in [0, 1, 2, 5]"
                  :key="amt"
                  type="button"
                  class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20"
                  @click="form.comment_reward = amt"
                >
                  {{ amt }} ⚡
                </button>
              </div>
            </div>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-500 font-bold text-sm">⚡</span>
              <input
                v-model.number="form.comment_reward"
                type="number"
                min="0"
                required
                class="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-studio-850 border border-slate-200 dark:border-white/10 rounded-xl text-cyan-600 dark:text-cyan-400 font-mono font-bold focus:outline-none focus:border-cyan-500"
              />
            </div>
            <p class="text-[11px] text-slate-500 dark:text-studio-400 leading-normal">
              O'quvchi bob ostida fikr qoldirganda (spamdan saqlash uchun 0 yoki 1-2 ⚡ tavsiya etiladi).
            </p>
          </div>

          <!-- Rate 6: Daily Cap & Anti-Farming -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-studio-900/60 border border-slate-200 dark:border-white/5 space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-slate-800 dark:text-studio-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>🛡</span> Kunlik maksimal daromad limiti
              </label>
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
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500 font-bold text-sm">⚡</span>
              <input
                v-model.number="form.daily_max_limit"
                type="number"
                min="0"
                placeholder="0 = cheksiz"
                class="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-studio-850 border border-slate-200 dark:border-white/10 rounded-xl text-amber-600 dark:text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
            <p class="text-[11px] text-slate-500 dark:text-studio-400 leading-normal">
              Bitta o'quvchi 1 kunda yig'ishi mumkin bo'lgan maksimal limit (0 qo'yilsa limit o'chiriladi).
            </p>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
          <Button type="submit" variant="primary" size="md" :loading="isSaving">
            💾 {{ $t('economy.btn_save') }}
          </Button>
        </div>
      </form>
    </div>

    <!-- Live Economy Health & Projection Simulator -->
    <div class="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/5 space-y-6">
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 class="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
            <span>📊</span> {{ $t('economy.sim_title') }}
          </h3>
          <p class="text-xs text-slate-500 dark:text-studio-400 mt-0.5">
            O'quvchilar oqimi va kunlik o'qish statistikasi asosida Chaqmoq emissiyasini bashorat qilish
          </p>
        </div>
        <Badge variant="primary">Jonli Kalkulyator</Badge>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Input Sliders -->
        <div class="space-y-4">
          <div>
            <div class="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-studio-300 mb-2">
              <span>{{ $t('economy.sim_active_readers') }}:</span>
              <span class="font-mono text-brand-600 dark:text-brand-400 font-bold text-sm">{{ simReaders.toLocaleString() }} kishi</span>
            </div>
            <input
              v-model.number="simReaders"
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
              <span class="font-mono text-brand-600 dark:text-brand-400 font-bold text-sm">{{ simAvgChapters }} ta bob</span>
            </div>
            <input
              v-model.number="simAvgChapters"
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
            <span class="text-base font-extrabold text-brand-600 dark:text-brand-400 font-mono">
              ⚡ {{ projectedDailyCoins.toLocaleString() }} Chaqmoq
            </span>
          </div>

          <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/5">
            <span class="text-xs text-slate-600 dark:text-studio-400">{{ $t('economy.sim_monthly_emission') }}:</span>
            <span class="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              ⚡ {{ projectedMonthlyCoins.toLocaleString() }} Chaqmoq
            </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-600 dark:text-studio-400">Do'konga qaytish salohiyati (50 ⚡ ramkalar):</span>
            <span class="text-xs font-mono font-bold text-slate-800 dark:text-studio-200">
              ~{{ Math.floor(projectedMonthlyCoins / 50).toLocaleString() }} ta xarid
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Reward Distribution Log -->
    <div class="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5">
      <div class="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
        <div>
          <h3 class="font-bold text-slate-900 dark:text-white text-base">{{ $t('economy.tx_title') }}</h3>
          <p class="text-xs text-slate-500 dark:text-studio-400 mt-0.5">
            O'quvchilar va creatorlar olgan so'nggi Chaqmoq mukofotlari jurnali
          </p>
        </div>
        <span class="text-xs font-mono text-slate-400 dark:text-studio-500">
          Jami: <strong>{{ transactions.length }}</strong> ta tranzaksiya
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-100 dark:bg-studio-900/80 text-xs uppercase font-bold text-slate-600 dark:text-studio-400 border-b border-slate-200 dark:border-white/5">
            <tr>
              <th class="px-6 py-3.5">{{ $t('economy.th_user') }}</th>
              <th class="px-6 py-3.5">{{ $t('economy.th_type') }}</th>
              <th class="px-6 py-3.5">Tafsilot</th>
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
              <td class="px-6 py-3.5 font-mono font-bold text-brand-600 dark:text-brand-400">
                +{{ tx.amount }} ⚡
              </td>
              <td class="px-6 py-3.5 text-xs font-mono text-slate-400 dark:text-studio-500 text-right">
                {{ new Date(tx.created_at).toLocaleString('uz-UZ') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSystemStore } from '../stores/system'
import { mockDb } from '../api/client'
import { economyApi } from '../api/economy'
import Badge from '../components/common/Badge.vue'
import Button from '../components/common/Button.vue'

const { t } = useI18n()
const systemStore = useSystemStore()

const isSaving = ref(false)
const settings = computed(() => mockDb.economySettings)
const transactions = computed(() => mockDb.rewardTransactions)

const form = reactive({
  chapter_read_reward: settings.value.chapter_read_reward,
  daily_checkin_reward: settings.value.daily_checkin_reward,
  welcome_bonus: settings.value.welcome_bonus,
  creator_chapter_reward: settings.value.creator_chapter_reward,
  comment_reward: settings.value.comment_reward,
  daily_max_limit: settings.value.daily_max_limit
})

// Simulator inputs
const simReaders = ref(500)
const simAvgChapters = ref(3)

const projectedDailyCoins = computed(() => {
  const perUserDaily = (simAvgChapters.value * form.chapter_read_reward) + form.daily_checkin_reward
  return simReaders.value * perUserDaily
})

const projectedMonthlyCoins = computed(() => {
  return projectedDailyCoins.value * 30
})

function getTxBadgeVariant(type) {
  switch (type) {
    case 'chapter_reward': return 'primary'
    case 'daily_checkin': return 'warning'
    case 'welcome_bonus': return 'success'
    case 'creator_reward': return 'purple'
    default: return 'default'
  }
}

function getTxTypeLabel(type) {
  switch (type) {
    case 'chapter_reward': return 'Bob o\'qish'
    case 'daily_checkin': return 'Kunlik kirish'
    case 'welcome_bonus': return 'Xush kelibsiz'
    case 'creator_reward': return 'Creator mukofoti'
    case 'comment_reward': return 'Sharh'
    default: return 'Mukofot'
  }
}

function resetToDefaults() {
  form.chapter_read_reward = 5
  form.daily_checkin_reward = 15
  form.welcome_bonus = 50
  form.creator_chapter_reward = 25
  form.comment_reward = 2
  form.daily_max_limit = 100
  systemStore.addToast({
    type: 'info',
    title: 'Standart qiymatlar',
    message: 'Qiymatlar dastlabki holatga keltirildi. Saqlash tugmasini bosing.'
  })
}

async function saveSettings() {
  isSaving.value = true
  try {
    await economyApi.updateSettings({ ...form })
    systemStore.addToast({
      type: 'success',
      title: 'Saqlandi',
      message: 'Chaqmoq berilishi va iqtisodiyot sozlamalari muvaffaqiyatli saqlandi'
    })
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: 'Xatolik',
      message: err.message || 'Sozlamalarni saqlashda xatolik yuz berdi'
    })
  } finally {
    isSaving.value = false
  }
}
</script>
