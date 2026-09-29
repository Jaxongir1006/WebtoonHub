<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-slate-950 shrink-0 shadow-glow-brand">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
          </div>
          Klanlar & Darajalar Boshqaruvi
        </h2>
        <p class="text-xs text-slate-500 dark:text-studio-400 mt-1">
          Klan tashkil qilish narxi (Chaqmoq), darajalar shartlari (XP va narx) hamda mavjud klanlarni nazorat qilish.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/10 text-slate-700 dark:text-studio-300 hover:bg-slate-100 dark:hover:bg-studio-850 flex items-center gap-1.5 transition-all"
          @click="loadData"
        >
          <svg class="w-4 h-4" :class="{ 'animate-spin': loading }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Yangilash
        </button>
      </div>
    </div>

    <!-- Top Settings & Stats Banner -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <!-- Clan Creation Cost Card -->
      <div class="glass-card rounded-2xl p-5 border border-slate-200 dark:border-white/5 relative overflow-hidden">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-studio-400">
            Klan Ochish Narxi
          </span>
          <span class="p-2 rounded-xl bg-amber-500/10 text-amber-500 font-mono text-xs font-black">
            ⚡ CHAQMOQ
          </span>
        </div>

        <form @submit.prevent="saveCreationCost" class="space-y-3">
          <div class="flex items-center gap-2">
            <div class="relative flex-1">
              <input
                v-model.number="creationCost"
                type="number"
                min="0"
                max="100000"
                class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-base font-bold font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Masalan: 300"
                required
              />
              <span class="absolute right-3 top-2.5 text-xs text-amber-400 font-bold">⚡</span>
            </div>
            <button
              type="submit"
              :disabled="savingCost"
              class="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs shadow-glow-brand transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <svg v-if="savingCost" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Saqlash
            </button>
          </div>
          <p class="text-[11px] text-slate-500 dark:text-studio-400">
            Foydalanuvchi yangi klan tuzayotganda ushbu miqdorda Chaqmoq yechiladi.
          </p>
        </form>
      </div>

      <!-- Clans Count Stat -->
      <div class="glass-card rounded-2xl p-5 border border-slate-200 dark:border-white/5 flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-studio-400">
            Faol Klanlar
          </span>
          <span class="p-2 rounded-xl bg-blue-500/10 text-blue-400">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </span>
        </div>
        <div>
          <div class="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
            {{ clans.length }}
          </div>
          <p class="text-xs text-slate-500 dark:text-studio-400 mt-1">
            Jami tizimda mavjud klanlar soni
          </p>
        </div>
      </div>

      <!-- Max Level Configured -->
      <div class="glass-card rounded-2xl p-5 border border-slate-200 dark:border-white/5 flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-studio-400">
            Sozlangan Darajalar
          </span>
          <span class="p-2 rounded-xl bg-purple-500/10 text-purple-400">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </span>
        </div>
        <div>
          <div class="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
            {{ levels.length }} ta daraja
          </div>
          <p class="text-xs text-slate-500 dark:text-studio-400 mt-1">
            Maksimal daraja: {{ levels.length ? Math.max(...levels.map(l => l.level)) : 0 }}
          </p>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex items-center gap-2 border-b border-slate-200 dark:border-white/5 pb-2">
      <button
        :class="[
          'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
          activeTab === 'levels'
            ? 'bg-brand-500 text-slate-950 shadow-glow-brand'
            : 'text-slate-600 dark:text-studio-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-studio-850'
        ]"
        @click="activeTab = 'levels'"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Darajalar Sozlamalari ({{ levels.length }})
      </button>

      <button
        :class="[
          'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
          activeTab === 'clans'
            ? 'bg-brand-500 text-slate-950 shadow-glow-brand'
            : 'text-slate-600 dark:text-studio-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-studio-850'
        ]"
        @click="activeTab = 'clans'"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        Mavjud Klanlar ({{ clans.length }})
      </button>
    </div>

    <!-- TAB 1: LEVELS CONFIGURATION -->
    <div v-if="activeTab === 'levels'" class="space-y-4">
      <!-- Actions Bar & Notice -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-500/20">
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span><strong>Shart:</strong> Klan keyingi darajaga o'tishi uchun kerakli XP 100% to'la bo'lishi shart. So'ng ko'rsatilgan Chaqmoq yechiladi.</span>
        </div>

        <button
          class="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs shadow-glow-brand transition-all flex items-center gap-2 self-start sm:self-auto shrink-0"
          @click="openAddLevelModal"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Yangi Daraja Qo'shish
        </button>
      </div>

      <!-- Levels Table -->
      <div class="glass-card rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-studio-900/50 text-slate-400 dark:text-studio-400 font-bold uppercase tracking-wider">
                <th class="py-3 px-4">Daraja (Level)</th>
                <th class="py-3 px-4">Kerakli XP (To'ldirish shart)</th>
                <th class="py-3 px-4">O'tish To'lovi (Chaqmoq)</th>
                <th class="py-3 px-4">Max A'zolar</th>
                <th class="py-3 px-4">Imtiyozlar / Tavsif</th>
                <th class="py-3 px-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-white/5">
              <tr
                v-for="lvl in levels"
                :key="lvl.level"
                class="hover:bg-slate-50/80 dark:hover:bg-studio-850/50 transition-colors"
              >
                <!-- Level Badge -->
                <td class="py-3.5 px-4">
                  <div class="flex items-center gap-2">
                    <span class="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-400 text-slate-950 font-black text-xs flex items-center justify-center font-mono">
                      {{ lvl.level }}
                    </span>
                    <span class="font-bold text-slate-900 dark:text-white">
                      {{ lvl.level }}-Daraja
                    </span>
                  </div>
                </td>

                <!-- Required XP -->
                <td class="py-3.5 px-4 font-mono font-bold text-purple-600 dark:text-purple-400">
                  {{ lvl.required_xp.toLocaleString() }} XP
                </td>

                <!-- Upgrade Cost Coins -->
                <td class="py-3.5 px-4 font-mono font-bold text-amber-500">
                  <span v-if="lvl.upgrade_cost_coins > 0" class="flex items-center gap-1">
                    ⚡ {{ lvl.upgrade_cost_coins.toLocaleString() }}
                  </span>
                  <span v-else class="text-slate-400 dark:text-studio-500 font-normal">
                    0 (Boshlang'ich)
                  </span>
                </td>

                <!-- Max Members -->
                <td class="py-3.5 px-4 font-mono text-slate-700 dark:text-studio-200 font-semibold">
                  {{ lvl.max_members }} nafar
                </td>

                <!-- Perks -->
                <td class="py-3.5 px-4 text-slate-600 dark:text-studio-300 max-w-xs truncate">
                  {{ lvl.perks_description || 'Standart imtiyozlar' }}
                </td>

                <!-- Actions -->
                <td class="py-3.5 px-4 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <button
                      class="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-studio-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-studio-800 transition-all"
                      title="Tahrirlash"
                      @click="openEditLevelModal(lvl)"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      class="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-all"
                      title="O'chirish"
                      @click="deleteLevel(lvl.level)"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="levels.length === 0">
                <td colspan="6" class="py-8 text-center text-slate-400 dark:text-studio-400">
                  Hozircha daraja sozlamalari mavjud emas. Yuqoridagi tugma orqali yangi daraja qo'shing.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 2: REGISTERED CLANS -->
    <div v-if="activeTab === 'clans'" class="space-y-4">
      <!-- Search & Filters -->
      <div class="glass-card rounded-2xl p-4 border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="relative flex-1 max-w-md">
          <svg class="w-4 h-4 absolute left-3.5 top-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="clanSearch"
            type="text"
            class="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Klan nomi yoki tegi bo'yicha qidirish..."
          />
        </div>

        <span class="text-xs font-mono text-slate-500 dark:text-studio-400">
          Natija: <strong>{{ filteredClans.length }}</strong> ta klan
        </span>
      </div>

      <!-- Clans Table -->
      <div class="glass-card rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-studio-900/50 text-slate-400 dark:text-studio-400 font-bold uppercase tracking-wider">
                <th class="py-3 px-4">Klan</th>
                <th class="py-3 px-4">Boshliq</th>
                <th class="py-3 px-4">Daraja & XP</th>
                <th class="py-3 px-4">A'zolar</th>
                <th class="py-3 px-4">Qabul Holati</th>
                <th class="py-3 px-4">Tashkil Etilgan</th>
                <th class="py-3 px-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-white/5">
              <tr
                v-for="clan in filteredClans"
                :key="clan.id"
                class="hover:bg-slate-50/80 dark:hover:bg-studio-850/50 transition-colors"
              >
                <!-- Clan Info -->
                <td class="py-3.5 px-4">
                  <div class="flex items-center gap-3">
                    <img
                      :src="clan.avatar_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150'"
                      alt="avatar"
                      class="w-9 h-9 rounded-xl object-cover border border-brand-500/30 shrink-0"
                    />
                    <div>
                      <div class="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                        <span>{{ clan.name }}</span>
                        <span class="px-1.5 py-0.5 rounded-md bg-brand-500/10 text-brand-500 font-mono text-[10px] font-black border border-brand-500/20">
                          [{{ clan.tag }}]
                        </span>
                      </div>
                      <p class="text-[11px] text-slate-400 dark:text-studio-400 truncate max-w-xs mt-0.5">
                        {{ clan.description || 'Tavsif berilmagan' }}
                      </p>
                    </div>
                  </div>
                </td>

                <!-- Leader -->
                <td class="py-3.5 px-4">
                  <span class="font-bold text-slate-800 dark:text-studio-200 flex items-center gap-1">
                    👑 {{ clan.leader_username }}
                  </span>
                </td>

                <!-- Level & XP -->
                <td class="py-3.5 px-4">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <span class="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-bold font-mono text-[10px]">
                        Lvl {{ clan.level }}
                      </span>
                      <span class="font-mono text-[11px] text-slate-500 dark:text-studio-400">
                        {{ clan.xp }} XP
                      </span>
                    </div>
                  </div>
                </td>

                <!-- Members -->
                <td class="py-3.5 px-4 font-mono">
                  <span class="font-bold text-slate-900 dark:text-white">{{ clan.member_count }}</span>
                  <span class="text-slate-400"> / {{ clan.max_members }}</span>
                </td>

                <!-- Recruiting -->
                <td class="py-3.5 px-4">
                  <span
                    :class="[
                      'px-2 py-0.5 rounded-full text-[10px] font-bold font-mono',
                      clan.is_recruiting
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                    ]"
                  >
                    {{ clan.is_recruiting ? 'Ochiq' : 'Yopiq' }}
                  </span>
                </td>

                <!-- Created At -->
                <td class="py-3.5 px-4 text-slate-500 dark:text-studio-400 text-[11px] font-mono">
                  {{ formatDate(clan.created_at) }}
                </td>

                <!-- Actions -->
                <td class="py-3.5 px-4 text-right">
                  <button
                    class="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-all"
                    title="Klanni o'chirish"
                    @click="deleteClan(clan)"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>

              <tr v-if="filteredClans.length === 0">
                <td colspan="7" class="py-8 text-center text-slate-400 dark:text-studio-400">
                  Mos keladigan klanlar topilmadi.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- LEVEL CREATE / EDIT MODAL -->
    <div
      v-if="showLevelModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div class="glass-card rounded-2xl border border-slate-200 dark:border-white/10 w-full max-w-md p-6 bg-white dark:bg-studio-900 shadow-2xl relative">
        <div class="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/5 mb-4">
          <h3 class="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <svg class="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {{ isEditingLevel ? `${levelForm.level}-Darajani Tahrirlash` : "Yangi Daraja Sozlash" }}
          </h3>
          <button
            class="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
            @click="showLevelModal = false"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="submitLevelForm" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1">
              Daraja Raqami (Level)
            </label>
            <input
              v-model.number="levelForm.level"
              type="number"
              min="1"
              max="100"
              :disabled="isEditingLevel"
              class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-studio-950 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white disabled:opacity-60"
              required
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1">
              Kerakli XP (To'ldirish shart)
            </label>
            <input
              v-model.number="levelForm.required_xp"
              type="number"
              min="10"
              class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-studio-950 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white"
              required
            />
            <p class="text-[10px] text-slate-400 mt-1">Ushbu darajani to'ldirib keyingisiga o'tish uchun klan jamg'arishi shart bo'lgan umumiy XP.</p>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1">
              Keyingi darajaga o'tish to'lovi (⚡ Chaqmoq)
            </label>
            <input
              v-model.number="levelForm.upgrade_cost_coins"
              type="number"
              min="0"
              class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-studio-950 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white"
              required
            />
            <p class="text-[10px] text-slate-400 mt-1">XP 100% to'lgach, boshliq yoki o'rinbosardan yechiladigan tanga miqdori.</p>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1">
              Maksimal A'zolar Soni
            </label>
            <input
              v-model.number="levelForm.max_members"
              type="number"
              min="1"
              max="1000"
              class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-studio-950 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1">
              Imtiyozlar Tavsifi (Ixtiyoriy)
            </label>
            <input
              v-model="levelForm.perks_description"
              type="text"
              maxlength="255"
              placeholder="Masalan: +5% XP bonus, maxsus stikerlar"
              class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-studio-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/5">
            <button
              type="button"
              class="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-studio-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-studio-800"
              @click="showLevelModal = false"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              :disabled="savingLevel"
              class="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs shadow-glow-brand transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <svg v-if="savingLevel" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Saqlash
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { clansApi } from '../api/clans'
import { useSystemStore } from '../stores/system'

const systemStore = useSystemStore()

const loading = ref(false)
const activeTab = ref('levels') // 'levels' | 'clans'

const creationCost = ref(300)
const savingCost = ref(false)

const levels = ref([])
const clans = ref([])
const clanSearch = ref('')

const showLevelModal = ref(false)
const isEditingLevel = ref(false)
const savingLevel = ref(false)

const levelForm = ref({
  level: 1,
  required_xp: 500,
  upgrade_cost_coins: 100,
  max_members: 15,
  perks_description: ''
})

const filteredClans = computed(() => {
  if (!clanSearch.value.trim()) return clans.value
  const q = clanSearch.value.toLowerCase().trim()
  return clans.value.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.tag.toLowerCase().includes(q) ||
      (c.leader_username && c.leader_username.toLowerCase().includes(q))
  )
})

async function loadData() {
  loading.value = true
  try {
    const [settingsRes, clansRes] = await Promise.all([
      clansApi.getClanSettings(),
      clansApi.getClans()
    ])

    if (settingsRes.success && settingsRes.data) {
      creationCost.value = settingsRes.data.clan_creation_cost || 300
      levels.value = settingsRes.data.levels || []
    }

    if (clansRes.success && clansRes.data) {
      clans.value = clansRes.data || []
    }
  } catch (err) {
    systemStore.addToast({
      type: 'danger',
      title: 'Xatolik',
      message: err.response?.data?.detail || 'Klan ma\'lumotlarini yuklashda xatolik yuz berdi'
    })
  } finally {
    loading.value = false
  }
}

async function saveCreationCost() {
  savingCost.value = true
  try {
    const res = await clansApi.updateClanCreationCost(creationCost.value)
    systemStore.addToast({
      type: 'success',
      title: 'Muvaffaqiyatli',
      message: res.message || 'Klan ochish narxi yangilandi'
    })
  } catch (err) {
    systemStore.addToast({
      type: 'danger',
      title: 'Xatolik',
      message: err.response?.data?.detail || 'Narxni saqlashda xatolik yuz berdi'
    })
  } finally {
    savingCost.value = false
  }
}

function openAddLevelModal() {
  isEditingLevel.value = false
  const nextLevel = levels.value.length ? Math.max(...levels.value.map((l) => l.level)) + 1 : 1
  levelForm.value = {
    level: nextLevel,
    required_xp: nextLevel * 500,
    upgrade_cost_coins: nextLevel * 100,
    max_members: 15 + nextLevel * 5,
    perks_description: ''
  }
  showLevelModal.value = true
}

function openEditLevelModal(lvl) {
  isEditingLevel.value = true
  levelForm.value = {
    level: lvl.level,
    required_xp: lvl.required_xp,
    upgrade_cost_coins: lvl.upgrade_cost_coins,
    max_members: lvl.max_members,
    perks_description: lvl.perks_description || ''
  }
  showLevelModal.value = true
}

async function submitLevelForm() {
  savingLevel.value = true
  try {
    const res = await clansApi.saveLevelConfig(levelForm.value)
    systemStore.addToast({
      type: 'success',
      title: 'Saqlandi',
      message: res.message || 'Daraja sozlamalari muvaffaqiyatli saqlandi'
    })
    showLevelModal.value = false
    await loadData()
  } catch (err) {
    systemStore.addToast({
      type: 'danger',
      title: 'Xatolik',
      message: err.response?.data?.detail || 'Daraja sozlamasini saqlashda xatolik yuz berdi'
    })
  } finally {
    savingLevel.value = false
  }
}

async function deleteLevel(level) {
  if (confirm(`${level}-daraja sozlamasini tizimdan o'chirmoqchimisiz?`)) {
    try {
      const res = await clansApi.deleteLevelConfig(level)
      systemStore.addToast({
        type: 'info',
        title: 'O\'chirildi',
        message: res.message || `${level}-daraja sozlamasi o'chirildi`
      })
      await loadData()
    } catch (err) {
      systemStore.addToast({
        type: 'danger',
        title: 'Xatolik',
        message: err.response?.data?.detail || 'O\'chirishda xatolik yuz berdi'
      })
    }
  }
}

async function deleteClan(clan) {
  if (confirm(`Rostdan ham '${clan.name}' [${clan.tag}] klanini tizimdan butunlay o'chirmoqchimisiz? Barcha a'zoliklar bekor qilinadi.`)) {
    try {
      const res = await clansApi.deleteClan(clan.id)
      systemStore.addToast({
        type: 'info',
        title: 'Klan o\'chirildi',
        message: res.message || `'${clan.name}' klani o'chirildi`
      })
      await loadData()
    } catch (err) {
      systemStore.addToast({
        type: 'danger',
        title: 'Xatolik',
        message: err.response?.data?.detail || 'Klanni o\'chirishda xatolik yuz berdi'
      })
    }
  }
}

function formatDate(isoStr) {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  return d.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'short', day: 'numeric' })
}

onMounted(() => {
  loadData()
})
</script>
