<template>
  <Modal
    :model-value="modelValue"
    :title="isEdit ? 'Xodimni Tahrirlash' : 'Yangi Xodim Qo\'shish'"
    :description="isEdit ? `${staff?.username} ma'lumotlarini o'zgartirish` : 'Admin paneliga kirish huquqiga ega yangi xodim yaratish'"
    max-width="md"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Username -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
          Taxallus (Username) *
        </label>
        <input
          v-model="form.username"
          type="text"
          required
          placeholder="Masalan: translator_aziz"
          class="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70"
        />
      </div>

      <!-- Email -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
          Email Manzili *
        </label>
        <input
          v-model="form.email"
          type="email"
          required
          placeholder="aziz@webtoonhub.uz"
          class="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70"
        />
      </div>

      <!-- Password -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
          {{ isEdit ? 'Yangi Parol (Bo\'sh qoldirilsa o\'zgarmaydi)' : 'Parol *' }}
        </label>
        <input
          v-model="form.password"
          type="password"
          :required="!isEdit"
          placeholder="••••••••"
          class="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70"
        />
      </div>

      <!-- Role Selection -->
      <div>
        <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
          Biriktirilgan Rol *
        </label>
        <select
          v-model="form.role_id"
          required
          class="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70 font-mono"
        >
          <option v-for="r in roles" :key="r.id" :value="r.id">
            {{ r.name }} ({{ r.permissions_count || r.permission_ids?.length || 0 }} ta ruxsat)
          </option>
        </select>
      </div>

      <!-- Active Status Toggle (if editing) -->
      <div v-if="isEdit && staff?.username !== 'superadmin'">
        <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
          Faollik Holati
        </label>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            :class="[
              'py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1',
              form.is_active
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-slate-100 dark:bg-studio-900 text-slate-500 dark:text-studio-400 border-slate-200 dark:border-white/5'
            ]"
            @click="form.is_active = true"
          >
            <span>✓</span> Faol
          </button>
          <button
            type="button"
            :class="[
              'py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1',
              !form.is_active
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                : 'bg-slate-100 dark:bg-studio-900 text-slate-500 dark:text-studio-400 border-slate-200 dark:border-white/5'
            ]"
            @click="form.is_active = false"
          >
            <span>🚫</span> To'xtatilgan
          </button>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/5">
        <Button variant="ghost" size="sm" @click="$emit('update:modelValue', false)">
          Bekor qilish
        </Button>
        <Button type="submit" variant="primary" size="sm" :loading="isSubmitting">
          {{ isEdit ? 'Saqlash' : 'Xodimni Yaratish' }}
        </Button>
      </div>
    </form>
  </Modal>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { mockDb } from '../../api/client'
import Modal from '../common/Modal.vue'
import Button from '../common/Button.vue'

const props = defineProps({
  modelValue: Boolean,
  staff: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'save'])
const isSubmitting = ref(false)

const isEdit = computed(() => !!props.staff)
const roles = computed(() => mockDb.roles)

const form = reactive({
  username: '',
  email: '',
  password: '',
  role_id: 2,
  is_active: true
})

watch(
  () => props.staff,
  (newStaff) => {
    if (newStaff) {
      form.username = newStaff.username || ''
      form.email = newStaff.email || ''
      form.password = ''
      form.role_id = newStaff.role_id || roles.value[0]?.id || 2
      form.is_active = newStaff.is_active ?? true
    } else {
      form.username = ''
      form.email = ''
      form.password = ''
      form.role_id = roles.value[0]?.id || 2
      form.is_active = true
    }
  },
  { immediate: true }
)

function handleSubmit() {
  isSubmitting.value = true
  setTimeout(() => {
    emit('save', {
      ...(props.staff ? { id: props.staff.id } : {}),
      ...form
    })
    isSubmitting.value = false
    emit('update:modelValue', false)
  }, 250)
}
</script>
