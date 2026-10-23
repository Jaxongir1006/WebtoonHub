<template>
  <Modal ref="dialog" :model-value="modelValue" :title="$t('pdfUpload.title')" :description="$t('pdfUpload.subtitle')" :busy="busy" :draft="{ ...form, pdfFile }" max-width="2xl" @update:model-value="$emit('update:modelValue', $event)">
    <form :id="inputId" @submit.prevent="submit">
      <fieldset :disabled="busy || loading" class="space-y-5">
        <p v-if="error" role="alert" class="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ error }}</p>
        <div>
          <label :for="inputId + '-series'" class="block text-sm font-semibold">{{ $t('chapterImport.series') }}</label>
          <select :id="inputId + '-series'" v-model="form.webtoon_id" required class="pdf-input mt-1 w-full">
            <option :value="null" disabled>{{ $t(loading ? 'chapterImport.loadingSeries' : 'chapterImport.chooseSeries') }}</option>
            <option v-for="series in availableSeries" :key="series.id" :value="series.id">{{ series.title }}</option>
          </select>
          <p v-if="!loading && !availableSeries.length" class="mt-2 text-xs text-slate-500 dark:text-studio-400">{{ $t('pdfUpload.noSeries') }}</p>
          <button v-if="loadFailed" type="button" class="mt-2 text-sm font-semibold underline" @click="loadSeries">{{ $t('common.retry') }}</button>
        </div>
        <div class="grid gap-4 sm:grid-cols-[140px_1fr]">
          <div><label :for="inputId + '-number'" class="block text-sm font-semibold">{{ $t('chapterImport.chapterNumber') }}</label><input :id="inputId + '-number'" v-model.number="form.chapter_number" required type="number" min="0.000001" step="any" class="pdf-input mt-1 w-full" /></div>
          <div><label :for="inputId + '-title'" class="block text-sm font-semibold">{{ $t('chapterImport.chapterTitle') }}</label><input :id="inputId + '-title'" v-model="form.title" maxlength="255" class="pdf-input mt-1 w-full" /></div>
        </div>
        <div class="rounded-xl border border-dashed border-slate-300 p-4 dark:border-studio-600">
          <label :for="inputId + '-file'" class="block text-sm font-semibold">{{ $t('pdfUpload.file') }}</label>
          <input :id="inputId + '-file'" :key="fileInputKey" type="file" accept=".pdf,application/pdf" required class="mt-3 block w-full min-w-0 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-400 file:px-3 file:py-2 file:font-semibold file:text-slate-950" @change="selectFile" />
          <p class="mt-3 text-xs leading-relaxed text-slate-500 dark:text-studio-400">{{ $t('pdfUpload.limits') }}</p>
        </div>
        <details class="rounded-xl border border-slate-200 p-3 dark:border-studio-700">
          <summary class="cursor-pointer text-sm font-semibold">{{ $t('chapterImport.advanced') }}</summary>
          <label class="mt-3 flex items-center justify-between gap-3 text-sm">{{ $t('chapterImport.reward') }}<input v-model.number="form.reward_coins" type="number" min="0" max="1000000" step="1" required class="pdf-input w-24" /></label>
          <label v-if="canPublish" class="mt-3 flex items-center gap-2 text-sm"><input v-model="form.publish" type="checkbox" class="accent-brand-500" />{{ $t('chapterImport.publish') }}</label>
          <p class="mt-2 text-xs text-slate-500 dark:text-studio-400">{{ $t('chapterImport.publishHint') }}</p>
        </details>
      </fieldset>
      <div v-if="busy" role="status" aria-live="polite" class="mt-4 space-y-2 text-sm text-slate-600 dark:text-studio-300">
        <p>{{ $t(progress < 100 ? 'common.upload_progress' : 'pdfUpload.processing', { percent: progress }) }}</p>
        <progress v-if="progress < 100" :value="progress" max="100" class="h-2 w-full accent-brand-500" :aria-label="$t('pdfUpload.title')" />
      </div>
    </form>
    <template #footer>
      <Button variant="secondary" :disabled="busy" @click="dialog?.close()">{{ $t('common.cancel') }}</Button>
      <Button type="submit" :form="inputId" :loading="busy" :disabled="loading || !pdfFile || !availableSeries.some(series => series.id === form.webtoon_id) || !auth.hasPermission('chapters:create')">{{ $t('pdfUpload.upload') }}</Button>
    </template>
  </Modal>
</template>

<script setup>
import { computed, reactive, ref, watch, onUnmounted, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '../common/Modal.vue'
import Button from '../common/Button.vue'
import { useAuthStore } from '../../stores/auth'
import { webtoonsApi } from '../../api/webtoons'
import { getErrorMessage } from '../../utils/forms'
import { importId } from '../../utils/chapterImport'

const props = defineProps({ modelValue: Boolean, preselectedWebtoonId: { type: Number, default: null }, webtoons: { type: Array, default: () => [] } })
const emit = defineEmits(['update:modelValue', 'updated'])
const { t } = useI18n()
const auth = useAuthStore()
const inputId = useId(), dialog = ref(null)
const busy = ref(false), loading = ref(false), loadFailed = ref(false), error = ref(''), progress = ref(0)
const loadedSeries = ref([]), pdfFile = ref(null), fileInputKey = ref(0)
const form = reactive({ webtoon_id: null, chapter_number: 1, title: '', reward_coins: 5, publish: false })
const availableSeries = computed(() => (loadedSeries.value.length ? loadedSeries.value : props.webtoons).filter(series => ['manga', 'manhwa'].includes(series.type)))
const canPublish = computed(() => auth.hasPermission('chapters:approve'))
let scope = 0, detailRequest = 0, uploadKey = importId(), controller

async function loadSeries() {
  const captured = scope
  loading.value = true; loadFailed.value = false; error.value = ''
  try {
    const items = []; let page = 1, total = Infinity
    while (items.length < total) {
      const response = await webtoonsApi.getWebtoons({ page, limit: 100 })
      if (captured !== scope) return
      const batch = response.data?.items || []
      items.push(...batch); total = response.data?.total ?? items.length
      if (!batch.length) break
      page++
    }
    loadedSeries.value = items
    if (props.preselectedWebtoonId) form.webtoon_id = props.preselectedWebtoonId
  } catch (cause) { if (captured === scope) { error.value = getErrorMessage(cause); loadFailed.value = true } }
  finally { if (captured === scope) loading.value = false }
}

watch(() => [props.modelValue, auth.staff?.id], () => {
  scope++; detailRequest++; controller?.abort(); busy.value = false; loading.value = false
  error.value = ''; loadFailed.value = false; loadedSeries.value = []; pdfFile.value = null; fileInputKey.value++
  Object.assign(form, { webtoon_id: props.preselectedWebtoonId, chapter_number: 1, title: '', reward_coins: 5, publish: false })
  if (props.modelValue && auth.hasPermission('chapters:create')) { void loadSeries(); void suggestNumber(form.webtoon_id) }
}, { immediate: true })
watch(() => form.webtoon_id, id => { void suggestNumber(id) })
async function suggestNumber(id) {
  const captured = scope, request = ++detailRequest, number = form.chapter_number
  if (!id) return
  try {
    const response = await webtoonsApi.getWebtoon(id)
    if (captured !== scope || request !== detailRequest || form.webtoon_id !== id || form.chapter_number !== number || busy.value) return
    const chapters = response.data?.chapters || []
    form.chapter_number = chapters.length ? Math.max(...chapters.map(chapter => Number(chapter.chapter_number))) + 1 : 1
  } catch (cause) { if (captured === scope && request === detailRequest) error.value = getErrorMessage(cause) }
}
watch(() => [form.webtoon_id, form.chapter_number, form.title, form.reward_coins, form.publish, pdfFile.value], () => { uploadKey = importId() }, { flush: 'sync' })
function selectFile(event) {
  pdfFile.value = null; error.value = ''
  const files = [...(event.target.files || [])]
  if (files.length !== 1 || !/\.pdf$/i.test(files[0].name) || !files[0].size || files[0].size > 20 * 1024 * 1024) {
    event.target.value = ''; error.value = t('pdfUpload.invalidFile'); return
  }
  pdfFile.value = files[0]
}
async function submit() {
  if (busy.value || loading.value || !pdfFile.value || !availableSeries.value.some(series => series.id === form.webtoon_id) || !auth.hasPermission('chapters:create')) return
  const captured = scope, actor = auth.staff?.id
  controller = new AbortController(); busy.value = true; error.value = ''; progress.value = 0
  try {
    await webtoonsApi.uploadPdfChapter({ ...form, publish: canPublish.value && form.publish, pdf: pdfFile.value, idempotency_key: uploadKey }, percent => {
      if (captured === scope) progress.value = percent ?? progress.value
    }, { signal: controller.signal })
    if (captured !== scope || auth.staff?.id !== actor) return
    emit('updated'); emit('update:modelValue', false)
  } catch (cause) { if (captured === scope) error.value = getErrorMessage(cause) }
  finally { if (captured === scope) busy.value = false }
}
onUnmounted(() => { scope++; controller?.abort() })
</script>

<style scoped>
.pdf-input { @apply rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-studio-600 dark:bg-studio-950 dark:text-studio-100; }
</style>
