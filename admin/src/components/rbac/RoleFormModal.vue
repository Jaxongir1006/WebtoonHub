<template>
  <Modal ref="draftDialog" :draft="form"
    :busy="isSubmitting"
    :model-value="modelValue"
    :title="isEdit ? $t('staff.s048') : $t('staff.s049')"
    :description="$t('staff.s050')"
    max-width="2xl"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form @submit.prevent="handleSubmit">
      <fieldset :disabled="isSubmitting" class="space-y-4">
      <p v-if="submitError" role="alert" class="text-sm text-rose-600 dark:text-rose-300">{{ submitError }}</p>
      <!-- Role Name -->
      <div>
        <label for="RoleFormModal-field-1" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5"> {{ $t('staff.s051') }} </label>
        <input
          id="RoleFormModal-field-1"
          v-model="form.name"
          type="text"
          required
          :placeholder="$t('staff.s052')"
          class="w-full px-3.5 py-2 text-sm bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 font-mono focus:outline-none focus:border-brand-500/70 disabled:opacity-50"
        />
      </div>

      <div class="rounded-xl border border-slate-200 p-3 text-xs dark:border-white/10">
        <p class="font-semibold">{{ $t('studioFixes.scope') }}: {{ $t('studioFixes.' + (role?.scope || 'global')) }}</p>
        <p class="mt-1 text-slate-500 dark:text-studio-400">{{ $t('studioFixes.scopeHelp') }}</p>
      </div>

      <!-- Description -->
      <div>
        <label for="RoleFormModal-field-2" class="block text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider mb-1.5"> {{ $t('staff.s053') }} </label>
        <input
          id="RoleFormModal-field-2"
          v-model="form.description"
          type="text"
          :placeholder="$t('staff.s054')"
          class="w-full px-3.5 py-2 text-sm bg-slate-100 dark:bg-studio-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-studio-100 focus:outline-none focus:border-brand-500/70"
        />
      </div>

      <!-- Permissions Selection -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs font-semibold text-slate-700 dark:text-studio-300 uppercase tracking-wider"> {{ $t('staff.s055') }} {{ form.permission_ids.length }} {{ $t('staff.s056') }} </label>
          <div class="flex gap-2">
            <button
              type="button"
              class="text-xs text-brand-700 dark:text-brand-400 hover:underline"
              @click="selectAll"
            > {{ $t('staff.s057') }} </button>
            <span class="text-slate-500 dark:text-studio-500">|</span>
            <button
              type="button"
              class="text-xs text-slate-500 dark:text-studio-400 hover:text-white"
              @click="deselectAll"
            > {{ $t('staff.s058') }} </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto p-2 bg-slate-100 dark:bg-studio-900/60 rounded-xl border border-slate-200 dark:border-white/5">
          <label
            v-for="perm in availablePermissions"
            :key="perm.id"
            :class="[
              'p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all',
              form.permission_ids.includes(perm.id)
                ? 'bg-brand-500/10 border-brand-500/30 text-white'
                : 'bg-slate-100/50 dark:bg-studio-850/50 border-slate-300 dark:border-white/5 text-slate-600 dark:text-studio-400 hover:border-white/10'
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
              <span class="text-[11px] text-slate-500 dark:text-studio-400 leading-tight">
                {{ perm.description }}
              </span>
            </div>
          </label>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/5">
        <Button variant="ghost" size="sm" :disabled="isSubmitting" @click="$refs.draftDialog.close()"> {{ $t('staff.s019') }} </Button>
        <Button type="submit" variant="primary" size="sm" :loading="isSubmitting">
          {{ isEdit ? $t('staff.s061') : $t('staff.s059') }}
        </Button>
      </div>

      </fieldset>
    </form>
  </Modal>
</template>

<script setup>
import { reactive, watch, ref, computed } from 'vue'
import { getErrorMessage } from '../../utils/forms'
import Modal from '../common/Modal.vue'
import Button from '../common/Button.vue'

const props = defineProps({
  modelValue: Boolean,
  onSave: { type: Function, required: true },
  role: {
    type: Object,
    default: null
  },
  permissions: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'save'])

const isEdit = ref(false)
const isSubmitting = ref(false)
const submitError = ref('')
const availablePermissions = computed(() => props.permissions)

const form = reactive({
  name: '',
  description: '',
  permission_ids: []
})

watch(
  () => [props.role, props.modelValue],
  ([val, open]) => {
    if (!open) return
    submitError.value = ''
    if (val) {
      isEdit.value = true
      form.name = val.name
      form.description = val.description || ''
      form.permission_ids = val.permission_ids ? [...val.permission_ids] : []
    } else {
      isEdit.value = false
      form.name = ''
      form.description = ''
      form.permission_ids = []
    }
  },
  { immediate: true }
)

function togglePerm(id) {
  const idx = form.permission_ids.indexOf(id)
  if (idx> -1) {
    form.permission_ids.splice(idx, 1)
  } else {
    form.permission_ids.push(id)
  }
}

function selectAll() {
  form.permission_ids = availablePermissions.value.map((p) => p.id)
}

function deselectAll() {
  form.permission_ids = []
}

async function handleSubmit() {
  if (isSubmitting.value) return
  submitError.value = ''
  isSubmitting.value = true
  try {
    await props.onSave({ ...form, id: props.role?.id })
    emit('update:modelValue', false)
  } catch (error) {
    submitError.value = getErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>
