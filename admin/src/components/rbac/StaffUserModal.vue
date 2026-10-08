<template>
  <Modal ref="draftDialog" :draft="form"
    :busy="isSubmitting"
    :model-value="modelValue"
    :title="isEdit ? $t('staff.s062') : $t('staff.s063')"
    :description="isEdit ? $t('staff.s064', { value0: staff?.username }) : $t('staff.s065')"
    max-width="md"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form @submit.prevent="handleSubmit">
      <fieldset :disabled="isSubmitting" class="space-y-4">
      <p v-if="submitError" role="alert" class="text-sm text-rose-600 dark:text-rose-300">{{ submitError }}</p>
      <!-- Username -->
      <div>
        <label for="StaffUserModal-field-1" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5"> {{ $t('staff.s066') }} </label>
        <input
          id="StaffUserModal-field-1"
          v-model="form.username"
          type="text"
          required
          :placeholder="$t('staff.s067')"
          class="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70"
        />
      </div>

      <!-- Email -->
      <div>
        <label for="StaffUserModal-field-2" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5"> {{ $t('staff.s068') }} </label>
        <input
          id="StaffUserModal-field-2"
          v-model="form.email"
          type="email"
          required
          :placeholder="$t('staff.s069')"
          class="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70"
        />
      </div>

      <!-- Password -->
      <div>
        <label for="StaffUserModal-field-3" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5">
          {{ isEdit ? $t('staff.s070') : $t('staff.s071') }}
        </label>
        <input
          id="StaffUserModal-field-3"
          v-model="form.password"
          type="password"
          :required="!isEdit"
          placeholder="••••••••"
          class="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70"
        />
      </div>

      <!-- Role Selection -->
      <div>
        <label for="StaffUserModal-field-4" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5"> {{ $t('staff.s072') }} </label>
        <select
          id="StaffUserModal-field-4"
          v-model.number="form.role_id"
          required
          class="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70 font-mono"
        >
          <option disabled value="">{{ $t('common.choose_role') }}</option>
          <option v-for="r in roles" :key="r.id" :value="r.id">
            {{ r.name }} ({{ r.permissions_count || r.permission_ids?.length || 0 }} {{ $t('staff.s073') }} </option>
        </select>
      </div>

      <!-- Active Status Toggle (if editing) -->
      <div v-if="isEdit && !isSystemRole(staff?.role, 'superadmin')">
        <label class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5"> {{ $t('staff.s074') }} </label>
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
            <span>✓</span> {{ $t('staff.s075') }} </button>
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
            <span>🚫</span> {{ $t('staff.s076') }} </button>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/5">
        <Button variant="ghost" size="sm" :disabled="isSubmitting" @click="$refs.draftDialog.close()"> {{ $t('staff.s019') }} </Button>
        <Button type="submit" variant="primary" size="sm" :loading="isSubmitting">
          {{ isEdit ? $t('staff.s077') : $t('staff.s078') }}
        </Button>
      </div>

      </fieldset>
    </form>
  </Modal>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { getErrorMessage } from '../../utils/forms'
import { isSystemRole } from '../../utils/permissions'
import Modal from '../common/Modal.vue'
import Button from '../common/Button.vue'

const props = defineProps({
  modelValue: Boolean,
  onSave: { type: Function, required: true },
  staff: {
    type: Object,
    default: null
  },
  roles: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'save'])
const isSubmitting = ref(false)
const submitError = ref('')

const isEdit = computed(() => !!props.staff)
const roles = computed(() => props.roles)

const form = reactive({
  username: '',
  email: '',
  password: '',
  role_id: '',
  is_active: true
})

watch(
  () => [props.staff, props.modelValue],
  ([newStaff, open]) => {
    if (!open) return
    submitError.value = ''
    if (newStaff) {
      form.username = newStaff.username || ''
      form.email = newStaff.email || ''
      form.password = ''
      form.role_id = newStaff.role_id ?? ''
      form.is_active = newStaff.is_active ?? true
    } else {
      form.username = ''
      form.email = ''
      form.password = ''
      form.role_id = ''
      form.is_active = true
    }
  },
  { immediate: true }
)

async function handleSubmit() {
  if (isSubmitting.value) return
  submitError.value = ''
  isSubmitting.value = true
  try {
    await props.onSave({
      ...(props.staff ? { id: props.staff.id } : {}),
      ...form
    })
    emit('update:modelValue', false)
  } catch (error) {
    submitError.value = getErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>
