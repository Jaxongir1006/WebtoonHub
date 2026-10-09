<template>
  <div class="space-y-6">
    <LoadState :error="loadError" @retry="loadItems" />
    <!-- Top Action Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <svg class="w-6 h-6 text-brand-700 dark:text-brand-500 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          {{ $t('shop.title') }}
        </h2>
        <p class="text-xs text-slate-500 dark:text-studio-400 mt-1">
          {{ $t('collectibleCards.shopSubtitle') }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <a :href="cardGuideUrl" target="_blank" rel="noopener" class="text-xs font-semibold text-brand-700 underline dark:text-brand-400">{{ $t('collectibleCards.guide') }} ↗</a>
        <Button v-if="authStore.hasPermission('shop:manage')" variant="secondary" size="md" @click="openCreateModal('card')">{{ $t('collectibleCards.new') }}</Button>
        <Button
          v-if="authStore.hasPermission('shop:manage')"
          variant="primary"
          size="md"
          @click="openCreateModal()"
        >
          {{ $t('shop.btn_new') }}
        </Button>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="glass-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-200 dark:border-white/5">
      <div class="p-1 rounded-xl bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/10 flex flex-wrap items-center gap-1">
        <button
          v-for="tab in filterTabs"
          :key="tab.value"
          :class="[
            'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
            currentType === tab.value
              ? 'bg-brand-500 text-slate-950 font-bold shadow-sm'
              : 'text-slate-600 dark:text-studio-400 hover:text-slate-900 dark:hover:text-white'
          ]"
          @click="currentType = tab.value"
          :aria-pressed="currentType === tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <span class="text-xs font-mono text-slate-500 dark:text-studio-400"> {{ $t('staff.s201') }} <strong>{{ filteredItems.length }}</strong> {{ $t('shop.in_stock') }}
      </span>
    </div>

    <!-- Items Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="glass-card rounded-2xl p-5 border border-slate-200 dark:border-white/5 hover:border-brand-500/40 hover:shadow-xl transition-all flex flex-col justify-between group"
      >
        <div>
          <!-- Live Preview Simulator Box -->
          <div class="rounded-xl overflow-hidden mb-4 border border-slate-200 dark:border-white/10 bg-slate-900 dark:bg-studio-950 p-4 flex items-center justify-center min-h-[140px] relative">
            <!-- If Frame: Circular Avatar with Glow -->
            <div v-if="item.item_type === 'frame'" class="relative flex items-center justify-center w-16 h-16">
              <div class="w-full h-full rounded-full bg-slate-100 dark:bg-studio-800 border-2 border-slate-200 dark:border-white/20 overflow-hidden relative z-0 shadow-inner">
                <img
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
                  class="w-full h-full object-cover"
                />
              </div>
              <img
                v-if="item.asset_url"
                :src="item.asset_url"
                class="absolute -inset-3 h-[calc(100%+1.5rem)] w-[calc(100%+1.5rem)] max-w-none pointer-events-none z-10 object-contain drop-shadow"
              />
            </div>

            <CardArtPreview v-else-if="item.item_type === 'card'" :item="item" />

            <!-- If Background: Wide Banner -->
            <div
              v-else
              class="w-full h-28 rounded-lg overflow-hidden bg-cover bg-center flex items-center justify-center p-3 relative"
              :class="item.border_style || ''"
              :style="item.asset_url ? { backgroundImage: `url(${item.asset_url})` } : {}"
            >
              <div class="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
              <span class="relative z-10 text-xs font-bold text-slate-900 dark:text-white drop-shadow font-mono"> {{ $t('staff.s469') }} </span>
            </div>
          </div>

          <!-- Metadata -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <Badge :variant="item.item_type === 'frame' ? 'warning' : 'purple'">
                {{ item.item_type === 'card' ? $t('collectibleCards.type') : item.item_type === 'frame' ? $t('shop.frame_type') : $t('shop.bg_type') }}
              </Badge>
              <Badge :variant="item.is_available ? 'success' : 'default'">
                {{ item.is_available ? $t('shop.available') : $t('shop.unavailable') }}
              </Badge>
            </div>

            <h3 class="font-bold text-base text-slate-900 dark:text-white group-hover:text-brand-500 dark:group-hover:text-brand-300 transition-colors">
              {{ item.name }}
            </h3>
            <dl v-if="item.item_type === 'card'" class="space-y-1 text-xs text-slate-600 dark:text-studio-300">
              <div><dt class="inline font-semibold">{{ $t('collectibleCards.character') }}: </dt><dd class="inline">{{ item.character_name }}</dd></div>
              <div><dt class="inline font-semibold">{{ $t('collectibleCards.rarity') }}: </dt><dd class="inline">{{ $t('collectibleCards.rarities.' + item.rarity) }}</dd></div>
              <div v-if="item.series_title"><dt class="inline font-semibold">{{ $t('collectibleCards.series') }}: </dt><dd class="inline">{{ item.series_title }}</dd></div>
              <p>{{ $t(item.asset_animated ? 'collectibleCards.animatedArt' : 'collectibleCards.staticArt') }}<span v-if="item.owned_count"> · {{ $t('collectibleCards.collected', { count: item.owned_count }) }}</span></p>
            </dl>

            <p v-if="item.item_type === 'card'" class="pt-2 text-xs font-semibold text-brand-700 dark:text-brand-300">{{ $t('gacha.exclusive') }}</p>
            <div v-else class="flex items-center justify-between pt-1">
              <span class="text-xs text-slate-500 dark:text-studio-400">{{ $t('shop.price') }}</span>
              <span class="text-sm font-extrabold text-brand-700 dark:text-brand-400 font-mono flex items-center gap-1">
                ⚡ {{ item.price_coins }} {{ $t('staff.s104') }} </span>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="pt-4 mt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <button
              class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-studio-800 hover:bg-slate-200 dark:hover:bg-studio-700 text-slate-700 dark:text-studio-200 transition-colors"
              @click="toggleAvailability(item)"
            >
              {{ item.is_available ? $t('shop.btn_hide') : $t('shop.btn_activate') }}
            </button>

            <!-- EDIT ITEM BUTTON -->
            <button
              v-if="authStore.hasPermission('shop:manage')"
              class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-700 dark:text-brand-400 border border-brand-500/30 transition-colors flex items-center gap-1"
              @click="openEditModal(item)"
            >
              ✏️ {{ $t('common.edit') }}
            </button>
          </div>

          <button
            v-if="authStore.hasPermission('shop:manage')"
            class="p-1.5 rounded-lg text-slate-600 dark:text-studio-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            :title="$t('common.delete')"
            @click="deleteItem(item.id)"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <ShopItemModal
      v-model="showModal"
      :item="editingItem"
      :initial-type="createType"
      :on-save="onItemSaved"
    />
  </div>
</template>

<script setup>
import i18n from '../i18n/index.js'
const tr = (...args) => i18n.global.t(...args)

import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import LoadState from '../components/common/LoadState.vue'
import { getErrorMessage } from '../utils/forms'
import { useSystemStore } from '../stores/system'
import { shopApi } from '../api/shop'
import Badge from '../components/common/Badge.vue'
import Button from '../components/common/Button.vue'
import ShopItemModal from '../components/shop/ShopItemModal.vue'
import CardArtPreview from '../components/shop/CardArtPreview.vue'

const { t } = useI18n()
const authStore = useAuthStore()
const systemStore = useSystemStore()

const currentType = ref('all')
const showModal = ref(false)
const editingItem = ref(null)
const createType = ref('frame')
const cardGuideUrl = computed(() => import.meta.env.BASE_URL + 'guides/character-cards-guide.html#' + i18n.global.locale.value)
const loadError = ref('')
const loading = ref(false)
const items = ref([])

const filterTabs = computed(() => [
  { label: t('shop.tab_all'), value: 'all' },
  { label: t('shop.tab_frames'), value: 'frame' },
  { label: t('shop.tab_backgrounds'), value: 'background' },
  { label: t('collectibleCards.tab'), value: 'card' }
])

const filteredItems = computed(() => {
  if (currentType.value === 'all') return items.value
  return items.value.filter((i) => i.item_type === currentType.value)
})

async function loadItems() {
  loadError.value = ''
  loading.value = true
  try {
    const res = await shopApi.getItems()
    items.value = res.data || []
  } catch (err) {
    loadError.value = getErrorMessage(err)
    systemStore.addToast({
      type: 'error',
      title: tr('staff.s024'),
      message: tr('staff.s470')
    })
  } finally {
    loading.value = false
  }
}

function openCreateModal(type = currentType.value === 'card' ? 'card' : 'frame') {
  editingItem.value = null
  createType.value = type
  showModal.value = true
}

function openEditModal(item) {
  editingItem.value = item
  showModal.value = true
}

async function toggleAvailability(item) {
  try {
    const newStatus = !item.is_available
    await shopApi.toggleAvailability(item.id, newStatus)
    item.is_available = newStatus
    systemStore.addToast({
      type: 'info',
      title: tr('staff.s471'),
      message: tr('staff.s472', { value0: item.name, value1: newStatus ? tr('common.available_for_sale') : tr('common.disabled') })
    })
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: tr('staff.s024'),
      message: err.response?.data?.detail || tr('staff.s473')
    })
  }
}

async function deleteItem(id) {
  if (confirm(tr('staff.s474'))) {
    try {
      await shopApi.deleteItem(id)
      items.value = items.value.filter((i) => i.id !== id)
      systemStore.addToast({
        type: 'info',
        title: tr('staff.s475'),
        message: tr('staff.s476')
      })
    } catch (err) {
      systemStore.addToast({
        type: 'error',
        title: tr('staff.s024'),
        message: err.response?.data?.detail || tr('staff.s477')
      })
    }
  }
}

async function onItemSaved(formData) {
  try {
    if (editingItem.value) {
      await shopApi.updateItem(editingItem.value.id, formData)
      systemStore.addToast({
        type: 'success',
        title: tr('staff.s478'),
        message: tr('staff.s479', { value0: formData.name })
      })
    } else {
      await shopApi.createItem(formData)
      systemStore.addToast({
        type: 'success',
        title: tr('staff.s480'),
        message: tr('staff.s481', { value0: formData.name })
      })
    }
    await loadItems()
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: tr('staff.s024'),
      message: err.response?.data?.error?.message || err.response?.data?.detail || err.message || tr('staff.s482')
    })
    throw err
  }
}

onMounted(() => {
  loadItems()
})
</script>
