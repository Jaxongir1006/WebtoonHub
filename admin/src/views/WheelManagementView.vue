<template>
  <div class="space-y-6">
    <!-- Top Action Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <svg class="w-6 h-6 text-brand-500 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V3m0 5l4 4m-4-4l-4 4m13-1a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Omad Charxi (Ruletka) Studiyasi
        </h2>
        <p class="text-xs text-slate-500 dark:text-studio-400 mt-1">
          Foydalanuvchilar uchun omad charxlarini yaratish, sektorlar, yutuq ehtimolliklari va narxlarni boshqarish
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button
          class="px-4 py-2 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-400 text-slate-950 transition-all shadow-glow-brand flex items-center gap-2"
          @click="openCreateWheelModal"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Yangi Charx Yaratish
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="p-12 text-center text-slate-400">
      <div class="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      Charxlar ma'lumotlari yuklanmoqda...
    </div>

    <div v-else-if="wheels.length === 0" class="glass-card rounded-2xl p-12 text-center border border-slate-200 dark:border-white/5">
      <div class="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 class="text-base font-bold text-slate-900 dark:text-white mb-1">Hozircha omad charxi mavjud emas</h3>
      <p class="text-xs text-slate-500 dark:text-studio-400 max-w-sm mx-auto mb-4">
        O'quvchilaringiz chaqmoq sarflab yutuq olishlari uchun yangi omad charxi yarating.
      </p>
      <button
        class="px-4 py-2 rounded-xl text-xs font-bold bg-brand-500 text-slate-950 hover:bg-brand-400"
        @click="openCreateWheelModal"
      >
        Ilk Charxni Yaratish
      </button>
    </div>

    <div v-else class="space-y-6">
      <!-- Wheel Selector Bar (Cards) -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          v-for="w in wheels"
          :key="w.id"
          :class="[
            'glass-card rounded-2xl p-4 border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between',
            selectedWheel?.id === w.id
              ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-lg bg-brand-500/5'
              : 'border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15'
          ]"
          @click="selectWheel(w)"
        >
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg text-white shrink-0 shadow-sm"
                :style="{ backgroundColor: w.color || '#F59E0B' }"
              >
                ⚡
              </div>
              <div>
                <h4 class="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  {{ w.title }}
                </h4>
                <p class="text-[11px] text-slate-400">
                  {{ w.cost_coins }} ⚡ Chaqmoq / aylantirish
                </p>
              </div>
            </div>
            <span
              :class="[
                'px-2 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider uppercase',
                w.is_active ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
              ]"
            >
              {{ w.is_active ? 'Faol' : 'O\'chirilgan' }}
            </span>
          </div>

          <div class="flex items-center justify-between text-xs pt-3 border-t border-slate-100 dark:border-white/5 font-mono text-slate-400">
            <span>Sektorlar: <strong>{{ w.items?.length || 0 }} ta</strong></span>
            <span>Aylantirishlar: <strong>{{ w.total_spins_count || 0 }}</strong></span>
            <span v-if="w.has_daily_free_spin" class="text-amber-500 font-bold">1x Kunlik Bepul</span>
          </div>
        </div>
      </div>

      <!-- Active Selected Wheel Workspace -->
      <div v-if="selectedWheel" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Left Column: Wheel Preview & Quick Stats (4 cols) -->
        <div class="lg:col-span-5 space-y-6">
          <!-- Live Interactive Wheel Visualizer -->
          <div class="glass-card rounded-2xl p-6 border border-slate-200 dark:border-white/5 flex flex-col items-center">
            <div class="w-full flex items-center justify-between mb-4">
              <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>🎯</span> Jonli Ko'rinish
              </h3>
              <span class="text-[11px] font-mono text-slate-400">
                Jami og'irlik: {{ totalWeight }} ({{ selectedWheel.items?.length || 0 }} sektor)
              </span>
            </div>

            <!-- SVG Slices Wheel Simulator -->
            <div class="relative w-64 h-64 sm:w-72 sm:h-72 my-2 flex items-center justify-center">
              <!-- Outer Glow Rim -->
              <div class="absolute inset-0 rounded-full border-4 border-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.2)] pointer-events-none" />

              <svg class="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                <g v-if="selectedWheel.items && selectedWheel.items.length > 0">
                  <path
                    v-for="(slice, idx) in computedWheelSlices"
                    :key="slice.id"
                    :d="slice.pathD"
                    :fill="slice.color"
                    stroke="#0F172A"
                    stroke-width="1.5"
                  />
                  <!-- Slice Labels -->
                  <text
                    v-for="(slice, idx) in computedWheelSlices"
                    :key="'t-' + slice.id"
                    :x="slice.textX"
                    :y="slice.textY"
                    :fill="slice.text_color || '#FFFFFF'"
                    font-size="6.5"
                    font-weight="bold"
                    text-anchor="middle"
                    alignment-baseline="middle"
                    :transform="`rotate(${slice.textAngle}, ${slice.textX}, ${slice.textY})`"
                  >
                    {{ truncateLabel(slice.label) }}
                  </text>
                </g>
                <circle cx="100" cy="100" r="16" fill="#0F172A" stroke="#F59E0B" stroke-width="3" />
                <circle cx="100" cy="100" r="6" fill="#F59E0B" />
              </svg>

              <!-- Center Pointer Indicator at top -->
              <div class="absolute -top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <div class="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
              </div>
            </div>

            <!-- Wheel Configuration Summary Info -->
            <div class="w-full mt-5 pt-4 border-t border-slate-200 dark:border-white/5 space-y-2 text-xs">
              <div class="flex justify-between items-center">
                <span class="text-slate-400">Aylantirish narxi:</span>
                <span class="font-bold font-mono text-amber-500">{{ selectedWheel.cost_coins }} ⚡ Chaqmoq</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-slate-400">Kunlik bepul imkoniyat:</span>
                <span :class="selectedWheel.has_daily_free_spin ? 'text-emerald-400 font-bold' : 'text-slate-500'">
                  {{ selectedWheel.has_daily_free_spin ? 'Mavjud (1x / kun)' : 'Yo\'q' }}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-slate-400">Holati:</span>
                <span :class="selectedWheel.is_active ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'">
                  {{ selectedWheel.is_active ? 'Foydalanuvchilarga ochiq' : 'Nofaol' }}
                </span>
              </div>
            </div>

            <div class="w-full mt-4 flex items-center gap-2">
              <button
                class="flex-1 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-studio-800 hover:bg-slate-200 dark:hover:bg-studio-700 text-slate-800 dark:text-slate-200 transition-all"
                @click="openEditWheelModal(selectedWheel)"
              >
                Charx Sozlamalari
              </button>
              <button
                class="px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-all"
                title="Charxni o'chirish"
                @click="deleteWheel(selectedWheel.id)"
              >
                O'chirish
              </button>
            </div>
          </div>

          <!-- Recent Spins Log on this Wheel -->
          <div class="glass-card rounded-2xl p-5 border border-slate-200 dark:border-white/5">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span>So'nggi Yutuqlar Tarixi</span>
              <button class="text-brand-500 hover:underline text-[11px]" @click="loadSpinsHistory(selectedWheel.id)">
                Yangilash
              </button>
            </h4>

            <div v-if="spinsLoading" class="py-6 text-center text-xs text-slate-400">
              Yuklanmoqda...
            </div>
            <div v-else-if="wheelSpins.length === 0" class="py-6 text-center text-xs text-slate-500 font-mono">
              Hali hech kim aylantirmagan
            </div>
            <div v-else class="space-y-2 max-h-60 overflow-y-auto pr-1">
              <div
                v-for="spin in wheelSpins"
                :key="spin.id"
                class="p-2.5 rounded-xl bg-slate-50 dark:bg-studio-900/60 border border-slate-200 dark:border-white/5 flex items-center justify-between text-xs"
              >
                <div>
                  <div class="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>@{{ spin.user_name }}</span>
                    <span v-if="spin.is_free_spin" class="px-1.5 py-0.2 text-[9px] bg-emerald-500/10 text-emerald-400 rounded-full font-mono">
                      BEPUL
                    </span>
                  </div>
                  <div class="text-[11px] text-slate-400">
                    {{ formatDate(spin.created_at) }}
                  </div>
                </div>
                <div class="text-right">
                  <div class="font-bold text-amber-500">
                    {{ spin.reward_label }}
                  </div>
                  <div class="text-[10px] text-slate-400 font-mono">
                    {{ spin.cost_paid > 0 ? `-${spin.cost_paid} ⚡` : 'Bepul' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Wheel Sectors List & Management (7 cols) -->
        <div class="lg:col-span-7 space-y-6">
          <div class="glass-card rounded-2xl p-6 border border-slate-200 dark:border-white/5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 class="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>🎡</span> Sektorlar va Yutuqlar Siyosati
                </h3>
                <p class="text-xs text-slate-500 dark:text-studio-400 mt-0.5">
                  Har bir sektorning rangi, turi, og'irligi va yutish foizini belgilang
                </p>
              </div>

              <div class="flex items-center gap-2">
                <button
                  v-if="selectedWheel.items && selectedWheel.items.length === 0"
                  type="button"
                  class="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center gap-1.5 shadow-sm"
                  :disabled="saving"
                  @click="populatePresetSectors(selectedWheel.id)"
                >
                  <span>⚡</span>
                  Standart 8 Sektorni Yuklash
                </button>

                <button
                  class="px-3.5 py-2 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-400 text-slate-950 transition-all flex items-center gap-1.5 shadow-sm"
                  @click="openCreateSectorModal"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                  Yangi Sektor Qo'shish
                </button>
              </div>
            </div>

            <!-- Sectors Table -->
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-slate-200 dark:border-white/10 text-slate-400 uppercase text-[10px] font-mono tracking-wider">
                    <th class="pb-3 pl-2">Tartib</th>
                    <th class="pb-3">Sektor</th>
                    <th class="pb-3">Mukofot turi</th>
                    <th class="pb-3">Ehtimollik (%)</th>
                    <th class="pb-3">Jackpot?</th>
                    <th class="pb-3 text-right pr-2">Amallar</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-white/5">
                  <tr
                    v-for="(item, idx) in selectedWheel.items"
                    :key="item.id"
                    class="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors group"
                  >
                    <!-- Order Index & Color Dot -->
                    <td class="py-3 pl-2 font-mono text-slate-400">
                      <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ backgroundColor: item.color }" />
                        #{{ idx + 1 }}
                      </div>
                    </td>

                    <!-- Label & Preview -->
                    <td class="py-3 font-semibold text-slate-900 dark:text-white">
                      <div class="flex items-center gap-2">
                        <span
                          class="px-2 py-0.5 rounded text-[11px] font-bold"
                          :style="{ backgroundColor: item.color, color: item.text_color || '#FFFFFF' }"
                        >
                          {{ item.label }}
                        </span>
                      </div>
                    </td>

                    <!-- Reward Details -->
                    <td class="py-3">
                      <div v-if="item.reward_type === 'coins'" class="flex items-center gap-1.5 font-mono text-amber-500 font-bold">
                        <span>⚡ +{{ item.reward_coins }} Chaqmoq</span>
                      </div>
                      <div v-else class="flex items-center gap-1.5 text-purple-400 font-medium">
                        <span>🎁 {{ item.shop_item?.name || 'Do\'kon Buyumi' }}</span>
                      </div>
                    </td>

                    <!-- Probability & Weight -->
                    <td class="py-3 font-mono">
                      <div class="flex items-center gap-2">
                        <div class="w-16 h-2 rounded-full bg-slate-200 dark:bg-studio-800 overflow-hidden">
                          <div
                            class="h-full bg-brand-500 rounded-full"
                            :style="{ width: `${item.probability_percent}%` }"
                          />
                        </div>
                        <span class="font-bold text-slate-700 dark:text-slate-200">{{ item.probability_percent }}%</span>
                        <span class="text-[10px] text-slate-400">({{ item.weight }})</span>
                      </div>
                    </td>

                    <!-- Jackpot badge -->
                    <td class="py-3">
                      <span
                        v-if="item.is_jackpot"
                        class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20"
                      >
                        🔥 JACKPOT
                      </span>
                      <span v-else class="text-slate-400 text-[11px]">-</span>
                    </td>

                    <!-- Actions -->
                    <td class="py-3 text-right pr-2">
                      <div class="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-studio-800 text-slate-500 dark:text-studio-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                          title="Tahrirlash"
                          @click="openEditSectorModal(item)"
                        >
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          class="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors"
                          title="O'chirish"
                          @click="deleteSector(item.id)"
                        >
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Empty Slices Warning -->
            <div v-if="!selectedWheel.items || selectedWheel.items.length === 0" class="py-12 text-center text-slate-400 space-y-4">
              <div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-xl">
                🎡
              </div>
              <div>
                <h4 class="font-bold text-slate-900 dark:text-white text-sm">Bu charxda hozircha yutuq sektorlari yo'q</h4>
                <p class="text-xs text-slate-500 dark:text-studio-400 mt-1 max-w-sm mx-auto">
                  Charx to'g'ri ishlashi va o'quvchilarga yutuq berishi uchun kamida 4-8 ta sektor bo'lishi kerak.
                </p>
              </div>
              <div class="flex flex-wrap items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  class="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center gap-2 shadow-sm"
                  :disabled="saving"
                  @click="populatePresetSectors(selectedWheel.id)"
                >
                  <span>⚡</span>
                  Standart 8 Sektorni Yuklash (Tavsiya)
                </button>
                <button
                  type="button"
                  class="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-studio-800 hover:bg-slate-200 dark:hover:bg-studio-700 text-slate-800 dark:text-slate-200 transition-all flex items-center gap-1.5"
                  @click="openCreateSectorModal"
                >
                  <span>+</span>
                  O'zim Qatnashaman
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================= -->
    <!-- MODAL: Wheel Create / Edit                              -->
    <!-- ======================================================= -->
    <div
      v-if="showWheelModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
      @click.self="showWheelModal = false"
    >
      <div class="glass-card rounded-2xl p-6 border border-slate-200 dark:border-white/10 w-full max-w-lg shadow-2xl space-y-4">
        <h3 class="text-base font-extrabold text-slate-900 dark:text-white">
          {{ editingWheel ? 'Omad Charxini Tahrirlash' : 'Yangi Omad Charxi Yaratish' }}
        </h3>

        <form class="space-y-4" @submit.prevent="saveWheel">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 mb-1">Nomi</label>
            <input
              v-model="wheelForm.title"
              type="text"
              required
              placeholder="Masalan: VIP Omad Charxi"
              class="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-brand-500"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 mb-1">Narxi (⚡ Chaqmoq)</label>
              <input
                v-model.number="wheelForm.cost_coins"
                type="number"
                min="0"
                required
                class="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 mb-1">Asosiy Rangi</label>
              <input
                v-model="wheelForm.color"
                type="color"
                class="w-full h-9 rounded-xl cursor-pointer bg-transparent border border-slate-200 dark:border-white/10 p-0.5"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 mb-1">Tavsif (ixtiyoriy)</label>
            <textarea
              v-model="wheelForm.description"
              rows="2"
              placeholder="Charx haqida qisqacha ma'lumot..."
              class="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-brand-500"
            />
          </div>

          <div class="space-y-2 pt-1">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="wheelForm.has_daily_free_spin"
                type="checkbox"
                class="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
              />
              <span class="text-xs text-slate-700 dark:text-studio-300 font-medium">
                Kuniga 1 marta BEPUL aylantirish imkoniyati (00:00 da yangilanadi)
              </span>
            </label>

            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="wheelForm.is_active"
                type="checkbox"
                class="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
              />
              <span class="text-xs text-slate-700 dark:text-studio-300 font-medium">
                Charx faol va saytda ko'rinadi
              </span>
            </label>
          </div>

          <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-white/10">
            <button
              type="button"
              class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-studio-400 hover:bg-slate-100 dark:hover:bg-studio-800"
              @click="showWheelModal = false"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="px-4 py-2 rounded-xl text-xs font-bold bg-brand-500 text-slate-950 hover:bg-brand-400 shadow-sm"
            >
              {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ======================================================= -->
    <!-- MODAL: Sector Create / Edit                             -->
    <!-- ======================================================= -->
    <div
      v-if="showSectorModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
      @click.self="showSectorModal = false"
    >
      <div class="glass-card rounded-2xl p-6 border border-slate-200 dark:border-white/10 w-full max-w-lg shadow-2xl space-y-4">
        <h3 class="text-base font-extrabold text-slate-900 dark:text-white">
          {{ editingSector ? 'Sektorni Tahrirlash' : 'Yangi Sektor Qo\'shish' }}
        </h3>

        <form class="space-y-4" @submit.prevent="saveSector">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 mb-1">Sektor Matni (Label)</label>
            <input
              v-model="sectorForm.label"
              type="text"
              required
              placeholder="Masalan: +50 ⚡ yoki Oltin Ramka"
              class="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-brand-500"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 mb-1">Mukofot turi</label>
              <select
                v-model="sectorForm.reward_type"
                class="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-brand-500"
              >
                <option value="coins">⚡ Chaqmoq Tangalari</option>
                <option value="shop_item">🎁 Do'kon Buyumi (Ramka/Fon)</option>
              </select>
            </div>

            <div v-if="sectorForm.reward_type === 'coins'">
              <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 mb-1">Tanga miqdori (⚡)</label>
              <input
                v-model.number="sectorForm.reward_coins"
                type="number"
                min="0"
                required
                placeholder="0 yoki undan ko'p"
                class="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-brand-500"
              />
            </div>

            <div v-else>
              <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 mb-1">Do'kon Buyumini tanlang</label>
              <select
                v-if="availableShopItems.length > 0"
                v-model.number="sectorForm.shop_item_id"
                required
                class="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-brand-500"
              >
                <option :value="null" disabled>Buyumni tanlang</option>
                <option v-for="item in availableShopItems" :key="item.id" :value="item.id">
                  {{ item.name }} ({{ item.price_coins }} ⚡)
                </option>
              </select>
              <div v-else class="text-[11px] text-amber-500 p-2 rounded-lg bg-amber-500/10">
                Do'konda hozircha buyum yo'q
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 mb-1">Ehtimollik Og'irligi (Weight)</label>
              <input
                v-model.number="sectorForm.weight"
                type="number"
                min="1"
                max="1000"
                required
                class="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-brand-500"
              />
              <p class="text-[10px] text-slate-400 mt-0.5">Yuqori raqam = tushish ehtimoli yuqori</p>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 mb-1">Sektor Rangi</label>
              <div class="flex items-center gap-2">
                <input
                  v-model="sectorForm.color"
                  type="color"
                  class="w-12 h-9 rounded-xl cursor-pointer bg-transparent border border-slate-200 dark:border-white/10 p-0.5"
                />
                <input
                  v-model="sectorForm.color"
                  type="text"
                  class="flex-1 px-2 py-2 rounded-xl text-xs font-mono bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>
          </div>

          <!-- Color Presets -->
          <div>
            <label class="block text-[11px] font-semibold text-slate-400 mb-1.5">Ranglar to'plami:</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="c in colorPalette"
                :key="c"
                type="button"
                class="w-6 h-6 rounded-full border border-white/20 transition-transform hover:scale-110"
                :style="{ backgroundColor: c }"
                @click="sectorForm.color = c"
              />
            </div>
          </div>

          <div class="pt-1">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="sectorForm.is_jackpot"
                type="checkbox"
                class="rounded border-slate-300 text-rose-500 focus:ring-rose-500"
              />
              <span class="text-xs text-rose-500 font-bold">
                🔥 Bu JACKPOT sektori (maxsus effektlar bilan chiqadi)
              </span>
            </label>
          </div>

          <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-white/10">
            <button
              type="button"
              class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-studio-400 hover:bg-slate-100 dark:hover:bg-studio-800"
              @click="showSectorModal = false"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="px-4 py-2 rounded-xl text-xs font-bold bg-brand-500 text-slate-950 hover:bg-brand-400 shadow-sm"
            >
              {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { wheelApi } from '../api/wheel'
import { shopApi } from '../api/shop'
import { useSystemStore } from '../stores/system'

const systemStore = useSystemStore()

const wheels = ref([])
const selectedWheel = ref(null)
const wheelSpins = ref([])
const availableShopItems = ref([])

const loading = ref(true)
const spinsLoading = ref(false)
const saving = ref(false)

const showWheelModal = ref(false)
const editingWheel = ref(null)
const wheelForm = ref({
  title: '',
  description: '',
  cost_coins: 100,
  has_daily_free_spin: true,
  color: '#F59E0B',
  is_active: true
})

const showSectorModal = ref(false)
const editingSector = ref(null)
const sectorForm = ref({
  label: '',
  reward_type: 'coins',
  reward_coins: 25,
  shop_item_id: null,
  color: '#0F766E',
  text_color: '#FFFFFF',
  weight: 20,
  is_jackpot: false
})

const colorPalette = [
  '#1E293B', '#0F766E', '#0369A1', '#4338CA', '#7C3AED',
  '#B45309', '#BE185D', '#E11D48', '#059669', '#D97706'
]

const totalWeight = computed(() => {
  if (!selectedWheel.value?.items) return 0
  return selectedWheel.value.items.reduce((acc, it) => acc + (it.weight || 0), 0)
})

// Calculate SVG slices geometry for live preview
const computedWheelSlices = computed(() => {
  if (!selectedWheel.value?.items || selectedWheel.value.items.length === 0) return []
  const items = selectedWheel.value.items
  const n = items.length
  const anglePerSlice = 360 / n
  const r = 90
  const cx = 100
  const cy = 100

  return items.map((it, idx) => {
    const startAngle = idx * anglePerSlice
    const endAngle = (idx + 1) * anglePerSlice

    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180

    const x1 = cx + r * Math.cos(startRad)
    const y1 = cy + r * Math.sin(startRad)
    const x2 = cx + r * Math.cos(endRad)
    const y2 = cy + r * Math.sin(endRad)

    const pathD = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`

    const midAngle = startAngle + anglePerSlice / 2
    const midRad = (midAngle * Math.PI) / 180
    const textRadius = r * 0.65
    const textX = cx + textRadius * Math.cos(midRad)
    const textY = cy + textRadius * Math.sin(midRad)

    return {
      ...it,
      pathD,
      textX,
      textY,
      textAngle: midAngle + 90
    }
  })
})

function truncateLabel(text) {
  if (!text) return ''
  return text.length > 12 ? text.substring(0, 10) + '..' : text
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function loadWheels(preferredWheelId = null, isSilent = false) {
  if (!isSilent) {
    loading.value = true
  }
  try {
    const res = await wheelApi.getStaffWheels()
    wheels.value = res.data || []
    if (wheels.value.length > 0) {
      if (preferredWheelId) {
        selectedWheel.value = wheels.value.find((w) => w.id === preferredWheelId) || wheels.value[0]
      } else if (!selectedWheel.value) {
        selectedWheel.value = wheels.value[0]
      } else {
        selectedWheel.value = wheels.value.find((w) => w.id === selectedWheel.value.id) || wheels.value[0]
      }
      if (selectedWheel.value) {
        await loadSpinsHistory(selectedWheel.value.id)
      }
    } else {
      selectedWheel.value = null
    }
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: 'Xatolik',
      message: 'Charxlar ro\'yxatini yuklashda xatolik yuz berdi'
    })
  } finally {
    loading.value = false
  }
}

async function loadSpinsHistory(wheelId) {
  spinsLoading.value = true
  try {
    const res = await wheelApi.getWheelSpins(wheelId, 25)
    wheelSpins.value = res.data || []
  } catch (err) {
    // ignore
  } finally {
    spinsLoading.value = false
  }
}

async function loadShopItems() {
  try {
    const res = await shopApi.getItems()
    availableShopItems.value = res.data || []
  } catch (err) {
    // ignore
  }
}

function selectWheel(w) {
  selectedWheel.value = w
  loadSpinsHistory(w.id)
}

function openCreateWheelModal() {
  editingWheel.value = null
  wheelForm.value = {
    title: '',
    description: '',
    cost_coins: 100,
    has_daily_free_spin: true,
    color: '#F59E0B',
    is_active: true
  }
  showWheelModal.value = true
}

function openEditWheelModal(w) {
  editingWheel.value = w
  wheelForm.value = {
    title: w.title,
    description: w.description || '',
    cost_coins: w.cost_coins,
    has_daily_free_spin: w.has_daily_free_spin,
    color: w.color || '#F59E0B',
    is_active: w.is_active
  }
  showWheelModal.value = true
}

async function saveWheel() {
  saving.value = true
  try {
    let targetWheelId = editingWheel.value ? editingWheel.value.id : null
    if (editingWheel.value) {
      await wheelApi.updateWheel(editingWheel.value.id, wheelForm.value)
      systemStore.addToast({
        type: 'success',
        title: 'Muvaffaqiyatli',
        message: 'Charx ma\'lumotlari yangilandi'
      })
    } else {
      const res = await wheelApi.createWheel(wheelForm.value)
      targetWheelId = res.data?.id
      systemStore.addToast({
        type: 'success',
        title: 'Muvaffaqiyatli',
        message: 'Yangi omad charxi yaratildi'
      })
    }
    showWheelModal.value = false
    await loadWheels(targetWheelId, true)
  } catch (err) {
    const errorMsg =
      err.response?.data?.error?.details?.[0]?.issue ||
      err.response?.data?.error?.message ||
      err.response?.data?.detail ||
      'Charxni saqlashda xatolik yuz berdi'
    systemStore.addToast({
      type: 'error',
      title: 'Xatolik',
      message: errorMsg
    })
  } finally {
    saving.value = false
  }
}

async function deleteWheel(id) {
  if (confirm('Ushbu charxni va barcha yutuq sektorlarini butunlay o\'chirmoqchimisiz?')) {
    try {
      await wheelApi.deleteWheel(id)
      systemStore.addToast({
        type: 'info',
        title: 'O\'chirildi',
        message: 'Charx tizimdan o\'chirildi'
      })
      selectedWheel.value = null
      await loadWheels()
    } catch (err) {
      systemStore.addToast({
        type: 'error',
        title: 'Xatolik',
        message: 'Charxni o\'chirishda xatolik yuz berdi'
      })
    }
  }
}

function openCreateSectorModal() {
  editingSector.value = null
  sectorForm.value = {
    label: '',
    reward_type: 'coins',
    reward_coins: 50,
    shop_item_id: availableShopItems.value[0]?.id || null,
    color: '#0F766E',
    text_color: '#FFFFFF',
    weight: 15,
    is_jackpot: false
  }
  showSectorModal.value = true
}

function openEditSectorModal(item) {
  editingSector.value = item
  sectorForm.value = {
    label: item.label,
    reward_type: item.reward_type,
    reward_coins: item.reward_coins ?? 0,
    shop_item_id: item.shop_item_id || availableShopItems.value[0]?.id || null,
    color: item.color || '#0F766E',
    text_color: item.text_color || '#FFFFFF',
    weight: item.weight || 10,
    is_jackpot: Boolean(item.is_jackpot)
  }
  showSectorModal.value = true
}

async function saveSector() {
  if (!selectedWheel.value) return
  saving.value = true
  try {
    const payload = {
      label: (sectorForm.value.label || '').trim(),
      reward_type: sectorForm.value.reward_type,
      reward_coins: sectorForm.value.reward_type === 'coins' ? (Number(sectorForm.value.reward_coins) || 0) : 0,
      shop_item_id: sectorForm.value.reward_type === 'shop_item' ? sectorForm.value.shop_item_id : null,
      color: sectorForm.value.color,
      text_color: sectorForm.value.text_color || '#FFFFFF',
      weight: Number(sectorForm.value.weight) || 1,
      is_jackpot: Boolean(sectorForm.value.is_jackpot),
      order_index: editingSector.value ? editingSector.value.order_index : (selectedWheel.value.items?.length || 0)
    }

    if (payload.reward_type === 'shop_item' && !payload.shop_item_id) {
      systemStore.addToast({
        type: 'warning',
        title: 'Diqqat',
        message: 'Do\'kon buyumi mukofoti uchun buyumni tanlang'
      })
      saving.value = false
      return
    }

    if (editingSector.value) {
      await wheelApi.updateWheelItem(editingSector.value.id, payload)
      systemStore.addToast({
        type: 'success',
        title: 'Muvaffaqiyatli',
        message: 'Sektor muvaffaqiyatli yangilandi'
      })
    } else {
      await wheelApi.createWheelItem(selectedWheel.value.id, payload)
      systemStore.addToast({
        type: 'success',
        title: 'Muvaffaqiyatli',
        message: 'Yangi yutuq sektori qo\'shildi'
      })
    }
    showSectorModal.value = false
    await loadWheels(selectedWheel.value.id, true)
  } catch (err) {
    const errorMsg =
      err.response?.data?.error?.details?.[0]?.issue ||
      err.response?.data?.error?.message ||
      err.response?.data?.detail ||
      'Sektorni saqlashda xatolik yuz berdi'
    systemStore.addToast({
      type: 'error',
      title: 'Xatolik',
      message: errorMsg
    })
  } finally {
    saving.value = false
  }
}

async function populatePresetSectors(wheelId) {
  saving.value = true
  try {
    await wheelApi.populatePresetItems(wheelId)
    systemStore.addToast({
      type: 'success',
      title: 'Muvaffaqiyatli',
      message: 'Standart 8 ta sektor charxga joylandi'
    })
    await loadWheels(wheelId, true)
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: 'Xatolik',
      message: err.response?.data?.error?.message || 'Standart sektorlarni yuklashda xatolik yuz berdi'
    })
  } finally {
    saving.value = false
  }
}

async function deleteSector(itemId) {
  if (confirm('Ushbu yutuq sektorini o\'chirmoqchimisiz?')) {
    try {
      await wheelApi.deleteWheelItem(itemId)
      systemStore.addToast({
        type: 'info',
        title: 'O\'chirildi',
        message: 'Sektor o\'chirildi'
      })
      await loadWheels(selectedWheel.value?.id, true)
    } catch (err) {
      systemStore.addToast({
        type: 'error',
        title: 'Xatolik',
        message: 'Sektorni o\'chirishda xatolik yuz berdi'
      })
    }
  }
}

onMounted(() => {
  loadWheels()
  loadShopItems()
})
</script>
