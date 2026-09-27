<template>
  <Modal
    :model-value="modelValue"
    :title="isEdit ? 'Rolni Tahrirlash' : 'Yangi Dinamik Rol Yaratish'"
    description="Tizimga yangi rol kiritish va unga ruxsatlar matritsasidan tegishli huquqlarni biriktirish"
    max-width="2xl"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Role Name -->
      <div>
        <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-1.5">
          Rol Nomi (Identifier) *
        </label>
        <input
          v-model="form.name"
          type="text"
          required
          :disabled="isEdit && form.name === 'superadmin'"
          placeholder="Masalan: tarjimon, kontent_moderator"
          class="w-full px-3.5 py-2 text-sm bg-studio-900 border border-white/10 rounded-xl text-studio-100 font-mono focus:outline-none focus:border-brand-500/70 disabled:opacity-50"
        />
      </div>

      <!-- Description -->
      <div>
        <label class="block text-xs font-semibold text-studio-300 uppercase tracking-wider mb-1.5">
          Tavsif (Mas'uliyat sohasi)
        </label>
        <input
          v-model="form.description"
          type="text"
          placeholder="Xodim nimalarga javob berishi haqida qisqacha ma'lumot"
          class="w-full px-3.5 py-2 text-sm bg-studio-900 border border-white/10 rounded-xl text-studio-100 focus:outline-none focus:border-brand-500/70"
        />
      </div>

      <!-- Permissions Selection -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs font-semibold text-studio-300 uppercase tracking-wider">
            Biriktirilgan Ruxsatlar ({{ form.permission_ids.length }} ta)
          </label>
          <div class="flex gap-2">
            <button
              type="button"
              class="text-xs text-brand-400 hover:underline"
              @click="selectAll"
            >
              Barchasini tanlash
            </button>
            <span class="text-studio-500">|</span>
            <button
              type="button"
              class="text-xs text-studio-400 hover:text-white"
              @click="deselectAll"
            >
              Tozalash
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto p-2 bg-studio-900/60 rounded-xl border border-white/5">
          <label
            v-for="perm in availablePermissions"
            :key="perm.id"
            :class="[
              'p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all',
              form.permission_ids.includes(perm.id)
                ? 'bg-brand-500/10 border-brand-500/30 text-white'
                : 'bg-studio-850/50 border-white/5 text-studio-400 hover:border-white/10'
            ]"
          >
            <input
              type="checkbox"
              :value="perm.id"
              :checked="form.permission_ids.includes(perm.id)"
              class="mt-1 accent-brand-500 rounded"
              @change="togglePerm(perm.id)"
            />
            <div class="min-w-0">
              <span class="block text-xs font-mono font-bold text-brand-300">
                {{ perm.code }}
              </span>
              <span class="text-[11px] text-studio-400 leading-tight">
                {{ perm.description }}
              </span>
            </div>
          </label>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
        <Button variant="ghost" size="sm" @click="$emit('update:modelValue', false)">
          Bekor qilish
        </Button>
        <Button type="submit" variant="primary" size="sm" :loading="isSubmitting">
          {{ isEdit ? 'Yangilash' : 'Rolni Yaratish' }}
        </Button>
      </div>
    </form>
  </Modal>
</template>

<script setup>
import { reactive, watch, ref } from 'vue'
import Modal from '../common/Modal.vue'
import Button from '../common/Button.vue'
import { mockDb } from '../../api/client'

const props = defineProps({
  modelValue: Boolean,
  role: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'save'])

const isEdit = ref(false)
const isSubmitting = ref(false)
const availablePermissions = mockDb.permissions

const form = reactive({
  name: '',
  description: '',
  permission_ids: []
})

watch(
  () => props.role,
  (val) => {
    if (val) {
      isEdit.value = true
      form.name = val.name
      form.description = val.description || ''
      form.permission_ids = val.permission_ids ? [...val.permission_ids] : []
    } else {
      isEdit.value = false
      form.name = ''
      form.description = ''
      form.permission_ids = [1, 3]
    }
  },
  { immediate: true }
)

function togglePerm(id) {
  const idx = form.permission_ids.indexOf(id)
  if (idx > -1) {
    form.permission_ids.splice(idx, 1)
  } else {
    form.permission_ids.push(id)
  }
}

function selectAll() {
  form.permission_ids = availablePermissions.map((p) => p.id)
}

function deselectAll() {
  form.permission_ids = []
}

function handleSubmit() {
  isSubmitting.value = true
  setTimeout(() => {
    emit('save', { ...form, id: props.role?.id })
    isSubmitting.value = false
    emit('update:modelValue', false)
  }, 400)
}
</script>
