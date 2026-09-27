<template>
  <div class="space-y-6">
    <!-- Top Action Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <svg class="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          Do'kon & Profil Bezaklari Studiyasi
        </h2>
        <p class="text-xs text-studio-400 mt-1">
          O'quvchilar yig'ilgan Chaqmoq (⚡) ballariga xarid qiladigan avatar ramkalari va profil fonlari
        </p>
      </div>

      <div class="flex items-center gap-3">
        <Button
          v-if="authStore.hasPermission('shop:manage')"
          variant="primary"
          size="md"
          @click="showCreateModal = true"
        >
          + Yangi Bezak Qo'shish
        </Button>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="glass-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="p-1 rounded-xl bg-studio-900 border border-white/10 flex items-center gap-1">
        <button
          v-for="tab in filterTabs"
          :key="tab.value"
          :class="[
            'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
            currentType === tab.value
              ? 'bg-brand-500 text-slate-950 font-bold shadow-sm'
              : 'text-studio-400 hover:text-white'
          ]"
          @click="currentType = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <span class="text-xs font-mono text-studio-400">
        Jami: <strong>{{ filteredItems.length }}</strong> ta buyum sotuvda
      </span>
    </div>

    <!-- Items Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="glass-card rounded-2xl p-5 border border-white/5 hover:border-brand-500/30 transition-all flex flex-col justify-between group"
      >
        <div>
          <!-- Live Preview Simulator Box -->
          <div class="rounded-xl overflow-hidden mb-4 border border-white/10 bg-studio-950 p-4 flex items-center justify-center min-h-[140px] relative">
            <!-- If Frame: Circular Avatar with Glow -->
            <div v-if="item.item_type === 'frame'" class="relative">
              <div
                class="absolute -inset-2 rounded-full pointer-events-none"
                :class="item.border_style || 'ring-4 ring-amber-400 shadow-glow-brand'"
              />
              <div class="w-16 h-16 rounded-full bg-studio-800 border-2 border-white/20 overflow-hidden relative z-0">
                <img
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
                  class="w-full h-full object-cover"
                />
              </div>
            </div>

            <!-- If Background: Wide Banner -->
            <div
              v-else
              class="w-full h-28 rounded-lg overflow-hidden bg-cover bg-center flex items-center justify-center p-3 relative"
              :class="item.border_style || ''"
              :style="item.asset_url ? { backgroundImage: `url(${item.asset_url})` } : {}"
            >
              <div class="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
              <span class="relative z-10 text-xs font-bold text-white drop-shadow font-mono">
                Profil Foni Namunasi
              </span>
            </div>
          </div>

          <!-- Metadata -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <Badge :variant="item.item_type === 'frame' ? 'warning' : 'purple'">
                {{ item.item_type === 'frame' ? 'Avatar Ramkasi' : 'Profil Foni' }}
              </Badge>
              <Badge :variant="item.is_available ? 'success' : 'default'">
                {{ item.is_available ? 'Sotuvda' : 'Nofaol' }}
              </Badge>
            </div>

            <h3 class="font-bold text-base text-white group-hover:text-brand-300 transition-colors">
              {{ item.name }}
            </h3>

            <div class="flex items-center justify-between pt-1">
              <span class="text-xs text-studio-400">Narxi:</span>
              <span class="text-sm font-extrabold text-brand-400 font-mono flex items-center gap-1">
                ⚡ {{ item.price_coins }} Chaqmoq
              </span>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="pt-4 mt-4 border-t border-white/5 flex items-center justify-between gap-2">
          <button
            class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-studio-800 hover:bg-studio-700 text-studio-200 transition-colors"
            @click="toggleAvailability(item)"
          >
            {{ item.is_available ? 'Yashirish' : 'Faollashtirish' }}
          </button>

          <button
            v-if="authStore.hasPermission('shop:manage')"
            class="p-1.5 rounded-lg text-studio-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="O'chirish"
            @click="deleteItem(item.id)"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <ShopItemModal
      v-model="showCreateModal"
      @save="onItemCreated"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useSystemStore } from '../stores/system'
import { mockDb } from '../api/client'
import Badge from '../components/common/Badge.vue'
import Button from '../components/common/Button.vue'
import ShopItemModal from '../components/shop/ShopItemModal.vue'

const authStore = useAuthStore()
const systemStore = useSystemStore()

const currentType = ref('all')
const showCreateModal = ref(false)

const filterTabs = [
  { label: 'Barchasi', value: 'all' },
  { label: 'Avatar Ramkalari', value: 'frame' },
  { label: 'Profil Fonlari', value: 'background' }
]

const items = computed(() => mockDb.shopItems)

const filteredItems = computed(() => {
  if (currentType.value === 'all') return items.value
  return items.value.filter((i) => i.item_type === currentType.value)
})

function toggleAvailability(item) {
  item.is_available = !item.is_available
  mockDb.save('shopItems')
  systemStore.addToast({
    type: 'info',
    title: 'Holat yangilandi',
    message: `"${item.name}" ${item.is_available ? 'sotuvga chiqarildi' : 'nofaol qilindi'}`
  })
}

function deleteItem(id) {
  if (confirm('Ushbu bezakni do\'kondan o\'chirmoqchimisiz?')) {
    mockDb.shopItems = mockDb.shopItems.filter((i) => i.id !== id)
    mockDb.save('shopItems')
    systemStore.addToast({
      type: 'info',
      title: 'Buyum o\'chirildi',
      message: 'Buyum do\'kondan olib tashlandi'
    })
  }
}

function onItemCreated(newItem) {
  mockDb.shopItems.unshift(newItem)
  mockDb.save('shopItems')
  systemStore.addToast({
    type: 'success',
    title: 'Buyum qo\'shildi',
    message: `"${newItem.name}" muvaffaqiyatli do'konga joylandi`
  })
}
</script>
