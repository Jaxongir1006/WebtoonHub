<template>
  <Modal
    :model-value="modelValue"
    title="Yangi Bob Rasmlarini Yuklash"
    description="20-50 tagacha vertikal komiks sahifalarini bir vaqtning o'zida yuklash va tartiblash"
    max-width="3xl"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form @submit.prevent="handleSubmit" class="space-y-5">
      <!-- Webtoon & Chapter Number -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <!-- Webtoon Selector -->
        <div class="sm:col-span-2">
          <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-1.5">
            Manhwa *
          </label>
          <select
            v-model="form.webtoon_id"
            required
            class="w-full px-3.5 py-2 text-sm bg-studio-900 border border-white/10 rounded-xl text-studio-100 focus:outline-none focus:border-brand-500/70"
          >
            <option v-for="w in availableWebtoons" :key="w.id" :value="w.id">
              {{ w.title }} (Mavjud boblar: {{ w.chapters_count || 0 }})
            </option>
          </select>
        </div>

        <!-- Chapter Number -->
        <div>
          <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-1.5">
            Bob Raqami *
          </label>
          <input
            v-model.number="form.chapter_number"
            type="number"
            step="0.1"
            min="0.1"
            required
            placeholder="1.0"
            class="w-full px-3.5 py-2 text-sm bg-studio-900 border border-white/10 rounded-xl text-studio-100 font-mono focus:outline-none focus:border-brand-500/70"
          />
        </div>
      </div>

      <!-- Chapter Title & Reward -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="sm:col-span-2">
          <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-1.5">
            Bob Sarlavhasi (Ixtiyoriy)
          </label>
          <input
            v-model="form.title"
            type="text"
            placeholder="Masalan: 3-bob: Birinchi amr"
            class="w-full px-3.5 py-2 text-sm bg-studio-900 border border-white/10 rounded-xl text-studio-100 focus:outline-none focus:border-brand-500/70"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-1.5">
            Mukofot (⚡ Chaqmoq)
          </label>
          <input
            v-model.number="form.reward_coins"
            type="number"
            min="0"
            required
            class="w-full px-3.5 py-2 text-sm bg-studio-900 border border-white/10 rounded-xl text-brand-400 font-bold font-mono focus:outline-none focus:border-brand-500/70"
          />
        </div>
      </div>

      <!-- Advanced Multi-File Drag & Drop Zone -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs font-semibold text-studio-300 uppercase tracking-wider">
            Sahifalar To'plami ({{ uploadedImages.length }} ta rasm tanlandi) *
          </label>
          <button
            v-if="uploadedImages.length > 0"
            type="button"
            class="text-xs text-rose-400 hover:text-rose-300 transition-colors"
            @click="clearImages"
          >
            Hammasini tozalash
          </button>
        </div>

        <!-- Dropzone Container -->
        <div
          :class="[
            'border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer relative',
            isDragging
              ? 'border-brand-500 bg-brand-500/10'
              : 'border-white/15 hover:border-brand-500/50 bg-studio-900/40 hover:bg-studio-900/60'
          ]"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          @click="$refs.fileInput.click()"
        >
          <input
            ref="fileInput"
            type="file"
            multiple
            accept="image/*"
            class="hidden"
            @change="handleFileInput"
          />

          <div class="flex flex-col items-center justify-center gap-2">
            <div class="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-semibold text-studio-100">
                Rasmlarni bu yerga sudrab olib keling yoki <span class="text-brand-400 underline">fayllarni tanlang</span>
              </p>
              <p class="text-xs text-studio-400 mt-1">
                PNG, JPG, WebP formatlari. MinIO <code class="text-brand-400 font-mono">chapter-images</code> savatiga ketma-ket joylanadi.
              </p>
            </div>
          </div>
        </div>

        <!-- Preview Grid & Reordering -->
        <div v-if="uploadedImages.length > 0" class="mt-4">
          <p class="text-xs text-studio-400 mb-2">
            Tartib bo'yicha vertikal skroll qilinadi. Sahifa tartibini o'zgartirish uchun tugmalardan foydalaning:
          </p>

          <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-56 overflow-y-auto p-2 rounded-xl bg-studio-900/60 border border-white/5">
            <div
              v-for="(img, idx) in uploadedImages"
              :key="idx"
              class="relative group rounded-xl overflow-hidden bg-studio-950 border border-white/10 aspect-[3/4] flex items-center justify-center"
            >
              <img :src="img" alt="Preview" class="w-full h-full object-cover" />

              <!-- Order Index Badge -->
              <span class="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-white font-mono text-[10px] font-bold">
                #{{ idx + 1 }}
              </span>

              <!-- Action Controls Overlay -->
              <div class="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                <button
                  v-if="idx > 0"
                  type="button"
                  class="p-1 rounded bg-studio-800 text-white hover:bg-brand-500 hover:text-black transition-colors"
                  title="Oldinga siljitish"
                  @click.stop="moveImage(idx, -1)"
                >
                  ◀
                </button>
                <button
                  type="button"
                  class="p-1 rounded bg-rose-600/80 text-white hover:bg-rose-600 transition-colors"
                  title="O'chirish"
                  @click.stop="removeImage(idx)"
                >
                  ✕
                </button>
                <button
                  v-if="idx < uploadedImages.length - 1"
                  type="button"
                  class="p-1 rounded bg-studio-800 text-white hover:bg-brand-500 hover:text-black transition-colors"
                  title="Keyinga siljitish"
                  @click.stop="moveImage(idx, 1)"
                >
                  ▶
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Moderation Status Notice -->
      <div class="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-300 flex items-start gap-2.5">
        <svg class="w-4 h-4 text-brand-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="leading-relaxed">
          <strong>Moderatsiya zanjiri:</strong> Bob rasmlari yuklangach avtomatik ravishda <code class="font-mono text-brand-400">pending</code> (kutilmoqda) holatida saqlanadi. Moderator tekshiruvidan o'tgach saytda ommaga e'lon qilinadi va o'quvchilarga +5 ⚡ Chaqmoq berishni boshlaydi.
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
        <Button variant="ghost" size="sm" @click="$emit('update:modelValue', false)">
          Bekor qilish
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          :loading="isSubmitting"
          :disabled="uploadedImages.length === 0"
        >
          {{ isSubmitting ? 'Yuklanmoqda...' : `${uploadedImages.length} ta rasmni yuklash` }}
        </Button>
      </div>
    </form>
  </Modal>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import Modal from '../common/Modal.vue'
import Button from '../common/Button.vue'
import { mockDb } from '../../api/client'

const props = defineProps({
  modelValue: Boolean,
  preselectedWebtoonId: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'upload-success'])

const isDragging = ref(false)
const isSubmitting = ref(false)
const fileInput = ref(null)

const availableWebtoons = computed(() => mockDb.webtoons)

const form = reactive({
  webtoon_id: props.preselectedWebtoonId || availableWebtoons.value[0]?.id || 1,
  chapter_number: 1.0,
  title: '',
  reward_coins: mockDb.economySettings?.chapter_read_reward ?? 5
})

// Demo initial sample images
const uploadedImages = ref([
  'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop&q=80'
])

function handleDrop(e) {
  isDragging.value = false
  const files = Array.from(e.dataTransfer.files)
  processFiles(files)
}

function handleFileInput(e) {
  const files = Array.from(e.target.files)
  processFiles(files)
}

function processFiles(files) {
  files.forEach((file) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        uploadedImages.value.push(event.target.result)
      }
      reader.readAsDataURL(file)
    }
  })
}

function moveImage(index, dir) {
  const target = index + dir
  if (target < 0 || target >= uploadedImages.value.length) return
  const item = uploadedImages.value.splice(index, 1)[0]
  uploadedImages.value.splice(target, 0, item)
}

function removeImage(index) {
  uploadedImages.value.splice(index, 1)
}

function clearImages() {
  uploadedImages.value = []
}

function handleSubmit() {
  if (uploadedImages.value.length === 0) return
  isSubmitting.value = true

  setTimeout(() => {
    emit('upload-success', {
      webtoon_id: form.webtoon_id,
      chapter_number: form.chapter_number,
      title: form.title || `${form.chapter_number}-bob`,
      reward_coins: form.reward_coins,
      images: [...uploadedImages.value]
    })
    isSubmitting.value = false
    emit('update:modelValue', false)
  }, 600)
}
</script>
