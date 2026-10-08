<template>
  <nav v-if="total> 0" class="flex flex-wrap items-center justify-between gap-3 py-4" :aria-label="$t('common.pagination')">
    <p class="text-sm text-slate-600 dark:text-studio-300">{{ $t('common.page_of', { page, pages }) }} · {{ $t('common.total_items', { total }) }}</p>
    <div class="flex gap-2">
      <Button variant="outline" :disabled="page <= 1 || loading" @click="$emit('update:page', page - 1)">{{ $t('common.previous') }}</Button>
      <Button variant="outline" :disabled="page>= pages || loading" @click="$emit('update:page', page + 1)">{{ $t('common.next') }}</Button>
    </div>
  </nav>
</template>
<script setup>
import { computed } from 'vue'
import Button from './Button.vue'
import { pageCount } from '../../utils/forms'
const props = defineProps({ page: { type: Number, default: 1 }, limit: { type: Number, default: 25 }, total: { type: Number, default: 0 }, loading: Boolean })
const pages = computed(() => pageCount(props.total, props.limit))
defineEmits(['update:page'])
</script>
