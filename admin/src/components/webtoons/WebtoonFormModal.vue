<template>
  <Modal
    :model-value="modelValue"
    :title="isEdit ? 'Manhvani Tahrirlash' : 'Yangi Manhwa Qo\'shish'"
    description="Manhwa haqidagi asosiy ma'lumotlar va muqova rasmini kiriting"
    max-width="2xl"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Title -->
      <div>
        <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-1.5">
          Manhwa Nomi *
        </label>
        <input
          v-model="form.title"
          type="text"
          required
          placeholder="Masalan: Yakkaxon Ko'tarilish (Solo Leveling)"
          class="w-full px-3.5 py-2 text-sm bg-studio-900 border border-white/10 rounded-xl text-studio-100 focus:outline-none focus:border-brand-500/70 focus:ring-1 focus:ring-brand-500/50"
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Author Name -->
        <div>
          <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-1.5">
            Asl Muallif (Author / Artist)
          </label>
          <input
            v-model="form.author_name"
            type="text"
            placeholder="Masalan: Chugong / DUBU"
            class="w-full px-3.5 py-2 text-sm bg-studio-900 border border-white/10 rounded-xl text-studio-100 focus:outline-none focus:border-brand-500/70"
          />
        </div>

        <!-- Status -->
        <div>
          <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-1.5">
            Chiqarilish Holati *
          </label>
          <select
            v-model="form.status"
            class="w-full px-3.5 py-2 text-sm bg-studio-900 border border-white/10 rounded-xl text-studio-100 focus:outline-none focus:border-brand-500/70"
          >
            <option value="ongoing">Davom etmoqda (Ongoing)</option>
            <option value="completed">Tugallangan (Completed)</option>
          </select>
        </div>
      </div>

      <!-- Genres Multi-Select -->
      <div>
        <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-1.5">
          Janrlar (Bir nechta tanlang)
        </label>
        <div class="flex flex-wrap gap-2 p-3 bg-studio-900/50 rounded-xl border border-white/5">
          <button
            v-for="genre in availableGenres"
            :key="genre.id"
            type="button"
            :class="[
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
              form.genre_ids.includes(genre.id)
                ? 'bg-brand-500 text-slate-950 font-semibold shadow-sm'
                : 'bg-studio-800 text-studio-300 hover:text-white hover:bg-studio-700'
            ]"
            @click="toggleGenre(genre.id)"
          >
            {{ genre.name }}
          </button>
        </div>
      </div>

      <!-- Description -->
      <div>
        <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-1.5">
          Tavsif (Sinopsis)
        </label>
        <textarea
          v-model="form.description"
          rows="3"
          placeholder="Komiks syujeti haqida qisqacha ma'lumot..."
          class="w-full px-3.5 py-2 text-sm bg-studio-900 border border-white/10 rounded-xl text-studio-100 focus:outline-none focus:border-brand-500/70"
        />
      </div>

      <!-- Cover Image Upload & Preview -->
      <div>
        <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-1.5">
          Muqova Rasmi (Cover Image)
        </label>
        <div class="flex items-start gap-4">
          <!-- Thumbnail preview -->
          <div class="w-24 h-32 rounded-xl bg-studio-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center relative">
            <img
              v-if="form.cover_image_url"
              :src="form.cover_image_url"
              alt="Cover preview"
              class="w-full h-full object-cover"
            />
            <div v-else class="text-center p-2 text-studio-400 text-[10px]">
              Muqova yo'q
            </div>
          </div>

          <div class="flex-1 space-y-2">
            <input
              v-model="form.cover_image_url"
              type="text"
              placeholder="Rasm URL manzili yoki pastdan fayl tanlang"
              class="w-full px-3.5 py-2 text-xs bg-studio-900 border border-white/10 rounded-xl text-studio-100"
            />
            <label class="block cursor-pointer">
              <span class="inline-block px-3 py-1.5 text-xs font-medium rounded-lg bg-studio-800 hover:bg-studio-700 text-studio-200 border border-white/10 transition-colors">
                Fayl tanlash (JPG, PNG, WebP)
              </span>
              <input
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleFileUpload"
              />
            </label>
            <p class="text-[11px] text-studio-400">
              MinIO <code class="text-brand-400 font-mono">webtoon-covers</code> savatiga yuklanadi (Max: 5MB).
            </p>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
        <Button variant="ghost" size="sm" @click="$emit('update:modelValue', false)">
          Bekor qilish
        </Button>
        <Button type="submit" variant="primary" size="sm" :loading="isSubmitting">
          {{ isEdit ? 'Saqlash' : 'Yaratish' }}
        </Button>
      </div>
    </form>
  </Modal>
</template>

<script setup>
import { reactive, watch, ref, computed, onMounted } from 'vue'
import Modal from '../common/Modal.vue'
import Button from '../common/Button.vue'
import { webtoonsApi } from '../../api/webtoons'

const props = defineProps({
  modelValue: Boolean,
  webtoon: {
    type: Object,
    default: null
  },
  genres: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'save'])

const isEdit = ref(false)
const isSubmitting = ref(false)
const loadedGenres = ref([])

onMounted(async () => {
  if (!props.genres || props.genres.length === 0) {
    try {
      const res = await webtoonsApi.getGenres()
      loadedGenres.value = res.data || []
    } catch (e) {
      console.error(e)
    }
  }
})

const availableGenres = computed(() => {
  if (props.genres && props.genres.length > 0) return props.genres
  return loadedGenres.value
})

const form = reactive({
  title: '',
  author_name: '',
  status: 'ongoing',
  description: '',
  genre_ids: [1],
  cover_image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
  cover_image_file: null
})

watch(
  () => props.webtoon,
  (val) => {
    if (val) {
      isEdit.value = true
      form.title = val.title || ''
      form.author_name = val.author_name || ''
      form.status = val.status || 'ongoing'
      form.description = val.description || ''
      form.genre_ids = val.genre_ids ? [...val.genre_ids] : [1]
      form.cover_image_url = val.cover_image_url || ''
      form.cover_image_file = null
    } else {
      isEdit.value = false
      form.title = ''
      form.author_name = ''
      form.status = 'ongoing'
      form.description = ''
      form.genre_ids = [1, 2]
      form.cover_image_url = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80'
      form.cover_image_file = null
    }
  },
  { immediate: true }
)

function toggleGenre(id) {
  const index = form.genre_ids.indexOf(id)
  if (index > -1) {
    if (form.genre_ids.length > 1) {
      form.genre_ids.splice(index, 1)
    }
  } else {
    form.genre_ids.push(id)
  }
}

function handleFileUpload(e) {
  const file = e.target.files[0]
  if (file) {
    form.cover_image_file = file
    const reader = new FileReader()
    reader.onload = (event) => {
      form.cover_image_url = event.target.result
    }
    reader.readAsDataURL(file)
  }
}

function handleSubmit() {
  isSubmitting.value = true
  setTimeout(() => {
    emit('save', { ...form, id: props.webtoon?.id })
    isSubmitting.value = false
    emit('update:modelValue', false)
  }, 400)
}
</script>
