<template>
  <Modal
    :model-value="modelValue"
    :title="isEdit ? 'Loyiha Ma\'lumotlarini Tahrirlash' : 'Yangi Loyiha Qo\'shish'"
    description="Format turi (Manhwa/Manga/Novel), asosiy ma'lumotlar va muqova rasmini kiriting"
    max-width="2xl"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Content Format / Type -->
      <div>
        <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-2">
          Format (Turi) *
        </label>
        <div class="grid grid-cols-3 gap-3">
          <button
            type="button"
            :class="[
              'p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1',
              form.type === 'manhwa'
                ? 'border-indigo-500/80 bg-indigo-500/15 text-white shadow-sm ring-1 ring-indigo-500/50'
                : 'border-white/10 bg-studio-900/60 text-studio-400 hover:border-white/20 hover:text-studio-200'
            ]"
            @click="form.type = 'manhwa'"
          >
            <div class="flex items-center gap-1.5 font-bold text-xs">
              <span>📱</span> Manhwa
            </div>
            <p class="text-[10px] text-studio-400">Vertikal skroll</p>
          </button>

          <button
            type="button"
            :class="[
              'p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1',
              form.type === 'manga'
                ? 'border-rose-500/80 bg-rose-500/15 text-white shadow-sm ring-1 ring-rose-500/50'
                : 'border-white/10 bg-studio-900/60 text-studio-400 hover:border-white/20 hover:text-studio-200'
            ]"
            @click="form.type = 'manga'"
          >
            <div class="flex items-center gap-1.5 font-bold text-xs">
              <span>📖</span> Manga
            </div>
            <p class="text-[10px] text-studio-400">RTL sahifali</p>
          </button>

          <button
            type="button"
            :class="[
              'p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1',
              form.type === 'novel'
                ? 'border-emerald-500/80 bg-emerald-500/15 text-white shadow-sm ring-1 ring-emerald-500/50'
                : 'border-white/10 bg-studio-900/60 text-studio-400 hover:border-white/20 hover:text-studio-200'
            ]"
            @click="form.type = 'novel'"
          >
            <div class="flex items-center gap-1.5 font-bold text-xs">
              <span>📜</span> Novel
            </div>
            <p class="text-[10px] text-studio-400">Ranobe matni</p>
          </button>
        </div>
      </div>

      <!-- Title -->
      <div>
        <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-1.5">
          Loyiha Nomi *
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
          <p v-if="availableGenres.length === 0" class="text-xs text-studio-400">
            Avval «Janrlar» bo'limida janr yarating.
          </p>
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
            <div
              class="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors border-white/15 hover:border-brand-500/50 bg-studio-950/60"
              @click="$refs.coverFileInput.click()"
            >
              <input
                ref="coverFileInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleFileUpload"
              />
              <div class="flex flex-col items-center justify-center gap-1.5">
                <svg class="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span class="text-xs font-semibold text-studio-200">
                  {{ form.cover_image_file ? form.cover_image_file.name : "Kompyuterdan muqova rasmini tanlang" }}
                </span>
                <span class="text-[11px] text-studio-400">
                  JPG, PNG, WebP formatlar (Maksimal: 5MB)
                </span>
              </div>
            </div>
            <div v-if="form.cover_image_url" class="flex items-center justify-between text-xs text-studio-400">
              <span class="text-emerald-400 font-semibold flex items-center gap-1">
                ✓ Muqova yuklandi
              </span>
              <button
                type="button"
                class="text-rose-400 hover:text-rose-300 font-semibold"
                @click="form.cover_image_url = ''; form.cover_image_file = null"
              >
                O'chirish
              </button>
            </div>
          </div>
        </div>
      </div>

      <p v-if="formError" class="text-xs text-rose-400">{{ formError }}</p>

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
const formError = ref('')
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
  type: 'manhwa',
  author_name: '',
  status: 'ongoing',
  description: '',
  genre_ids: [],
  cover_image_url: '',
  cover_image_file: null
})

watch(
  () => props.webtoon,
  (val) => {
    formError.value = ''
    if (val) {
      isEdit.value = true
      form.title = val.title || ''
      form.type = val.type || 'manhwa'
      form.author_name = val.author_name || ''
      form.status = val.status || 'ongoing'
      form.description = val.description || ''
      form.genre_ids = val.genre_ids ? [...val.genre_ids] : []
      form.cover_image_url = val.cover_image_url || ''
      form.cover_image_file = null
    } else {
      isEdit.value = false
      form.title = ''
      form.type = 'manhwa'
      form.author_name = ''
      form.status = 'ongoing'
      form.description = ''
      form.genre_ids = []
      form.cover_image_url = ''
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
  formError.value = ''
  if (!isEdit.value && !form.cover_image_file) {
    formError.value = 'Haqiqiy muqova rasmini tanlang.'
    return
  }
  isSubmitting.value = true
  setTimeout(() => {
    emit('save', { ...form, id: props.webtoon?.id })
    isSubmitting.value = false
    emit('update:modelValue', false)
  }, 400)
}
</script>
