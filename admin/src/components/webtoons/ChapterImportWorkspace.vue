<template>
  <Modal :model-value="modelValue" :title="$t('chapterImport.title')" :description="$t('chapterImport.subtitle')" max-width="4xl" :preserve-on-close="true" @update:model-value="closeWorkspace">
    <div class="space-y-5 text-slate-900 dark:text-studio-100">
      <div v-if="store.storageError" role="alert" class="rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">{{ $t('chapterImport.savingError') }}</div>
      <div v-else class="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-200">
        <strong>{{ $t(store.isRestoring ? 'chapterImport.restoring' : 'chapterImport.saved') }}</strong>
        <p class="mt-1">{{ $t('chapterImport.savedDetail') }}</p>
      </div>
      <div class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label :for="inputId + '-series'" class="block text-sm font-semibold">{{ $t('chapterImport.series') }}</label>
          <select :id="inputId + '-series'" v-model="selectedWebtoonId" :disabled="loadingSeries || importing" class="import-input mt-1 w-full">
            <option :value="null">{{ $t(loadingSeries ? 'chapterImport.loadingSeries' : 'chapterImport.chooseSeries') }}</option>
            <option v-for="series in availableSeries" :key="series.id" :value="series.id">{{ series.title }} · {{ series.type === 'manga' ? 'Manga' : 'Manhwa' }}</option>
          </select>
        </div>
        <span v-if="seriesDrafts.length" class="text-xs text-slate-500 dark:text-studio-400">{{ $t('chapterImport.draftCount', { count: seriesDrafts.length }) }}</span>
      </div>
      <div v-if="loadError || importError" role="alert" class="rounded-xl border border-rose-400/40 bg-rose-50 dark:bg-rose-500/10 p-3 text-sm text-rose-800 dark:text-rose-200">
        {{ loadError || importError }}
        <button v-if="loadError" class="ml-2 underline font-semibold" type="button" @click="loadSeries">{{ $t('common.retry') }}</button>
      </div>
      <div v-if="existingNumbers.length" class="text-xs text-slate-600 dark:text-studio-300">
        <p>{{ $t('chapterImport.existing', { numbers: existingNumbers.join(', ') }) }}</p>
        <p class="mt-1">{{ $t('chapterImport.duplicateHint') }}</p>
      </div>
      <div class="rounded-2xl border-2 border-dashed p-5 text-center transition-colors" :class="isDragging ? 'border-brand-500 bg-brand-500/10' : 'border-slate-300 dark:border-studio-700 bg-slate-50 dark:bg-studio-950/40'" @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false" @drop.prevent="handleDrop">
        <p class="font-bold">{{ $t(importing ? 'chapterImport.importing' : 'chapterImport.dropTitle') }}</p>
        <p class="mt-1 text-xs text-slate-500 dark:text-studio-400">{{ $t('chapterImport.dropHint') }}</p>
        <p class="mt-2 text-[11px] text-slate-500 dark:text-studio-400">{{ $t('chapterImport.limits') }}</p>
        <div class="mt-4 flex flex-wrap justify-center gap-2">
          <Button :disabled="!canImport" variant="primary" @click="folderInput?.click()">{{ $t('chapterImport.chooseFolder') }}</Button>
          <Button :disabled="!canImport" variant="secondary" @click="zipInput?.click()">{{ $t('chapterImport.chooseZip') }}</Button>
          <Button :disabled="!canImport" variant="ghost" @click="imageInput?.click()">{{ $t('chapterImport.chooseImages') }}</Button>
        </div>
        <input ref="folderInput" class="hidden" type="file" webkitdirectory directory multiple :aria-label="$t('chapterImport.chooseFolder')" @change="handleFiles" />
        <input ref="zipInput" class="hidden" type="file" accept=".zip,application/zip,application/x-zip-compressed" :aria-label="$t('chapterImport.chooseZip')" @change="handleFiles" />
        <input ref="imageInput" class="hidden" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple :aria-label="$t('chapterImport.chooseImages')" @change="handleFiles" />
      </div>
      <details class="rounded-xl border border-slate-200 dark:border-studio-700 p-3 text-xs">
        <summary class="cursor-pointer font-bold">{{ $t('chapterImport.help') }}</summary>
        <p class="mt-3 text-slate-600 dark:text-studio-300">{{ $t('chapterImport.helpIntro') }}</p>
        <pre class="my-3 overflow-x-auto rounded-lg bg-slate-100 dark:bg-studio-950 p-3 font-mono leading-5">Series/
  Chapter 01/
    001.jpg
    002.jpg
  Chapter 02/
    001.jpg
    002.jpg</pre>
        <ol class="list-decimal space-y-1 pl-5 text-slate-600 dark:text-studio-300">
          <li>{{ $t('chapterImport.helpStep1') }}</li><li>{{ $t('chapterImport.helpStep2') }}</li><li>{{ $t('chapterImport.helpStep3') }}</li>
        </ol>
        <div class="mt-3 flex flex-wrap gap-4 font-semibold text-brand-700 dark:text-brand-400">
          <a :href="templateUrl" download>{{ $t('chapterImport.template') }}</a>
          <a :href="guideUrl" target="_blank" rel="noopener">{{ $t('chapterImport.guide') }} ↗</a>
        </div>
      </details>
      <ul v-if="store.importWarnings?.length" class="space-y-1 rounded-xl bg-amber-50 dark:bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
        <li v-for="(warning, index) in store.importWarnings.slice(0, 8)" :key="index">{{ issueText(warning, 'warning') }}<span v-if="warning.name || warning.path" class="ml-1 break-all">{{ warning.name || warning.path }}</span></li>
      </ul>
      <div v-if="!seriesDrafts.length" class="rounded-xl border border-slate-200 dark:border-studio-700 py-8 text-center text-sm text-slate-500 dark:text-studio-400">{{ $t('chapterImport.noDrafts') }}</div>
      <div v-else class="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside class="min-w-0 space-y-3">
          <div class="flex items-center justify-between gap-2"><h4 class="text-sm font-bold">{{ $t('chapterImport.chapterList') }}</h4><span class="text-xs">{{ $t('chapterImport.selected', { count: selectedIds.length }) }}</span></div>
          <button type="button" class="text-xs font-semibold text-brand-700 dark:text-brand-400 underline" @click="selectReady">{{ $t('chapterImport.selectAll') }}</button>
          <div class="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            <div v-for="draft in seriesDrafts" :key="draft.id" class="rounded-xl border p-3" :class="activeDraft?.id === draft.id ? 'border-brand-500 bg-brand-500/5' : 'border-slate-200 dark:border-studio-700'">
              <div class="flex items-start gap-2">
                <input :checked="selectedIds.includes(draft.id)" :disabled="!isReady(draft)" type="checkbox" class="mt-1 h-4 w-4 accent-brand-500" :aria-label="chapterLabel(draft)" :aria-describedby="draft.validationErrors?.length ? inputId + '-issue-' + draft.id : undefined" @change="toggleSelection(draft.id, $event.target.checked)" />
                <button type="button" class="min-w-0 flex-1 text-left" :aria-pressed="activeDraft?.id === draft.id" @click="activeDraftId = draft.id">
                  <strong class="block text-sm">{{ chapterLabel(draft) }}</strong>
                  <span v-if="draft.title" class="block truncate text-xs text-slate-500 dark:text-studio-400">{{ draft.title }}</span>
                  <span v-if="draft.folder" class="block truncate text-[11px] text-slate-500 dark:text-studio-400" :title="draft.folder">{{ draft.folder }}</span>
                  <span class="mt-1 block text-xs text-slate-500 dark:text-studio-400">{{ $t('chapterImport.pages', { count: draft.pages.length }) }} · {{ $t('chapterImport.status.' + draft.status) }}</span>
                </button>
              </div>
              <p v-if="draft.validationErrors?.length" :id="inputId + '-issue-' + draft.id" class="mt-2 text-xs text-amber-800 dark:text-amber-300">{{ issueText(draft.validationErrors[0], 'validation') }}</p>
              <progress v-if="['uploading', 'queued', 'paused'].includes(draft.status)" class="mt-2 h-1.5 w-full accent-brand-500" :value="draft.progress" max="100" :aria-label="chapterLabel(draft)" />
            </div>
          </div>
        </aside>
        <section v-if="activeDraft" class="min-w-0 space-y-4">
          <div class="grid gap-3 sm:grid-cols-[140px_1fr_auto]">
            <div><label :for="inputId + '-number'" class="block text-xs font-semibold">{{ $t('chapterImport.chapterNumber') }}</label><input :id="inputId + '-number'" type="number" min="0.000001" step="any" class="import-input mt-1 w-full" :value="activeDraft.chapterNumber ?? ''" :disabled="!canEditActive" :aria-invalid="activeDraft.validationErrors?.some(issue => issue.code === 'chapter_number' || issue.code === 'duplicate_chapter')" @input="editDraft({ chapterNumber: $event.target.value === '' ? null : Number($event.target.value) })" /></div>
            <div><label :for="inputId + '-title'" class="block text-xs font-semibold">{{ $t('chapterImport.chapterTitle') }}</label><input :id="inputId + '-title'" class="import-input mt-1 w-full" maxlength="255" :value="activeDraft.title" :disabled="!canEditActive" @input="editDraft({ title: $event.target.value })" /></div>
            <Button variant="ghost" class="justify-self-end self-end text-rose-700 dark:text-rose-300" :disabled="activeDraft.status === 'uploading'" :aria-label="$t('chapterImport.removeChapter')" @click="removeDraft(activeDraft)">×</Button>
          </div>
          <p v-if="!canEditActive && activeDraft.status !== 'complete'" class="rounded-lg bg-slate-100 dark:bg-studio-950 p-2 text-xs text-slate-600 dark:text-studio-300">{{ $t('chapterImport.locked') }}</p>
          <p v-if="activeDraft.folder" class="break-all text-xs text-slate-500 dark:text-studio-400">{{ $t('chapterImport.source') }}: {{ activeDraft.folder }}</p>
          <ul v-if="activeDraft.validationErrors?.length" role="alert" class="space-y-1 text-xs text-rose-700 dark:text-rose-300"><li v-for="(issue, index) in activeDraft.validationErrors" :key="index">{{ issueText(issue, 'validation') }}</li></ul>
          <p v-if="activeDraft.error" role="alert" class="text-sm text-rose-700 dark:text-rose-300">{{ activeDraft.error }}</p>
          <details class="rounded-xl border border-slate-200 dark:border-studio-700 p-3">
            <summary class="cursor-pointer text-xs font-bold">{{ $t('chapterImport.advanced') }}</summary>
            <div class="mt-3 flex flex-wrap items-center gap-3"><label :for="inputId + '-reward'" class="text-xs font-semibold">{{ $t('chapterImport.reward') }}</label><input :id="inputId + '-reward'" class="import-input w-24" type="number" min="0" max="1000000" step="1" :disabled="!canEditActive" :value="activeDraft.rewardCoins ?? 5" @input="editDraft({ rewardCoins: Number($event.target.value) })" /></div>
            <label v-if="canPublish" class="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" class="accent-brand-500" :disabled="!canEditActive" :checked="activeDraft.publish" @change="editDraft({ publish: $event.target.checked })" />{{ $t('chapterImport.publish') }}</label>
            <p class="mt-2 text-xs text-slate-500 dark:text-studio-400">{{ $t('chapterImport.publishHint') }}</p>
          </details>
          <ul v-if="activeDraft.warnings?.length" class="space-y-1 text-xs text-amber-800 dark:text-amber-300"><li v-for="(warning, index) in activeDraft.warnings" :key="index">{{ issueText(warning, 'warning') }} <span class="break-all">{{ warning.name || '' }}</span></li></ul>
          <div>
            <div class="mb-2 flex flex-wrap items-center justify-between gap-2"><div><h4 class="text-sm font-bold">{{ $t('chapterImport.pageOrder') }}</h4><p class="mt-1 text-xs text-slate-500 dark:text-studio-400">{{ $t('chapterImport.orderHint') }}</p></div><Button variant="secondary" size="sm" :disabled="!activeDraft.pages.length" @click="showPreview = true">{{ $t('chapterImport.fullPreview') }}</Button></div>
            <ol class="max-h-[350px] space-y-2 overflow-y-auto pr-1">
              <li v-for="(page, index) in activeDraft.pages" :key="page.id" :draggable="canEditActive" class="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-studio-700 p-2" @dragstart="dragPageIndex = index" @dragover.prevent @drop.prevent.stop="reorderPage(index)" @dragend="dragPageIndex = null">
                <button type="button" class="h-14 w-12 shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-studio-950" @click="previewIndex = index; showPreview = true"><img v-if="previewUrl(page)" :src="previewUrl(page)" :alt="$t('chapterImport.imageAlt', { page: index + 1, name: page.name })" class="h-full w-full object-contain" loading="lazy" /><span v-else class="text-xs">{{ index + 1 }}</span></button>
                <div class="min-w-0 flex-1"><p class="break-all text-xs font-semibold" :title="page.path || page.name"><span class="mr-1 text-slate-400">{{ index + 1 }}.</span>{{ page.name }}</p><p class="mt-1 text-[11px] text-slate-500 dark:text-studio-400">{{ formatSize(page.size) }}</p></div>
                <div class="flex shrink-0 items-center"><button class="import-icon" type="button" :disabled="!canEditActive || index === 0" :aria-label="$t('chapterImport.moveUp', { name: page.name })" @click="store.movePage(activeDraft.id, index, index - 1)">↑</button><button class="import-icon" type="button" :disabled="!canEditActive || index === activeDraft.pages.length - 1" :aria-label="$t('chapterImport.moveDown', { name: page.name })" @click="store.movePage(activeDraft.id, index, index + 1)">↓</button><button class="import-icon text-rose-700 dark:text-rose-300" type="button" :disabled="!canEditActive" :aria-label="$t('chapterImport.removePage', { name: page.name })" @click="store.removePage(activeDraft.id, page.id)">×</button></div>
              </li>
            </ol>
            <p v-if="!activeDraft.pages.length" class="py-5 text-center text-xs text-slate-500">{{ $t('chapterImport.noPage') }}</p>
          </div>
          <div v-if="['paused', 'failed'].includes(activeDraft.status)" class="flex gap-2"><Button :disabled="!!activeDraft.validationErrors?.length" @click="retryDraft(activeDraft.id)">{{ $t(activeDraft.status === 'failed' ? 'chapterImport.retry' : 'chapterImport.resume') }}</Button></div>
        </section>
      </div>
    </div>
    <template #footer>
      <div class="flex w-full flex-wrap items-center justify-between gap-3">
        <p class="max-w-xs text-xs text-slate-500 dark:text-studio-400">{{ $t('chapterImport.background') }}</p>
        <div class="flex flex-wrap gap-2"><Button variant="secondary" @click="closeWorkspace(false)">{{ $t('chapterImport.close') }}</Button><Button :loading="startingUploads" :disabled="!selectedReady.length || importing || store.isRestoring" @click="startUploads">{{ $t('chapterImport.uploadSelected') }} ({{ selectedReady.length }})</Button></div>
      </div>
    </template>
  </Modal>
  <Modal v-model="showPreview" :title="$t('chapterImport.preview')" :description="activeDraft ? chapterLabel(activeDraft) : ''" max-width="3xl" :preserve-on-close="true">
    <div v-if="activeDraft" class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2"><div class="flex flex-wrap gap-2"><Button size="sm" :variant="previewMode === 'pages' ? 'primary' : 'secondary'" :aria-pressed="previewMode === 'pages'" @click="previewMode = 'pages'">{{ $t('chapterImport.pagePreview') }}</Button><Button size="sm" :variant="previewMode === 'strip' ? 'primary' : 'secondary'" :aria-pressed="previewMode === 'strip'" @click="previewMode = 'strip'">{{ $t('chapterImport.stripPreview') }}</Button></div><span class="text-xs text-slate-500">{{ $t('chapterImport.pages', { count: activeDraft.pages.length }) }}</span></div>
      <div v-if="previewMode === 'strip'" class="overflow-hidden rounded-xl bg-slate-950"><img v-for="(page, index) in activeDraft.pages" :key="page.id" :src="previewUrl(page)" :alt="$t('chapterImport.imageAlt', { page: index + 1, name: page.name })" class="block h-auto w-full" loading="lazy" /></div>
      <template v-else-if="previewPage"><div class="rounded-xl bg-slate-950 p-2"><img :src="previewUrl(previewPage)" :alt="$t('chapterImport.imageAlt', { page: previewIndex + 1, name: previewPage.name })" class="mx-auto max-h-[60vh] w-full object-contain" /></div><div class="flex items-center justify-between gap-2"><Button variant="secondary" :disabled="previewIndex === 0" :aria-label="$t('chapterImport.previousImage')" @click="previewIndex--">←</Button><span class="min-w-0 text-center text-xs text-slate-600 dark:text-studio-300">{{ $t('chapterImport.imagePosition', { page: previewIndex + 1, total: activeDraft.pages.length }) }}<span class="mt-1 block break-all">{{ previewPage.name }}</span></span><Button variant="secondary" :disabled="previewIndex >= activeDraft.pages.length - 1" :aria-label="$t('chapterImport.nextImage')" @click="previewIndex++">→</Button></div></template>
    </div>
  </Modal>
</template>

<script setup>
import { computed, ref, watch, onUnmounted, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '../common/Modal.vue'
import Button from '../common/Button.vue'
import { useAuthStore } from '../../stores/auth'
import { useChapterImportStore } from '../../stores/chapterImport'
import { webtoonsApi } from '../../api/webtoons'
import { getErrorMessage } from '../../utils/forms'

const props = defineProps({ modelValue: Boolean, preselectedWebtoonId: { type: Number, default: null }, preselectedDraftId: { type: String, default: null }, webtoons: { type: Array, default: () => [] } })
const emit = defineEmits(['update:modelValue', 'updated'])
const { t, te, locale } = useI18n()
const auth = useAuthStore()
const store = useChapterImportStore()
const inputId = useId()
const loadedSeries = ref([])
const selectedWebtoonId = ref(props.preselectedWebtoonId)
const existingNumbers = ref([])
const loadingSeries = ref(false)
const chaptersReady = ref(false)
const importing = ref(false)
const startingUploads = ref(false)
const isDragging = ref(false)
const loadError = ref('')
const importError = ref('')
const activeDraftId = ref(null)
const selectedIds = ref([])
const folderInput = ref(null), zipInput = ref(null), imageInput = ref(null)
const showPreview = ref(false), previewIndex = ref(0), previewMode = ref('pages')
const dragPageIndex = ref(null)
const urls = new Map()
let loadSequence = 0, chapterSequence = 0
const templateUrl = import.meta.env.BASE_URL + 'templates/chapter-import-template.zip'
const guideUrl = computed(() => import.meta.env.BASE_URL + 'guides/chapter-import-guide.html#' + (['en', 'uz', 'ru'].includes(locale.value) ? locale.value : 'uz'))
const availableSeries = computed(() => (loadedSeries.value.length ? loadedSeries.value : props.webtoons).filter(item => ['manga', 'manhwa'].includes(item.type)))
const selectedSeries = computed(() => availableSeries.value.find(item => item.id === selectedWebtoonId.value))
const seriesDrafts = computed(() => store.drafts.filter(draft => Number(draft.webtoonId) === Number(selectedWebtoonId.value)))
const activeDraft = computed(() => seriesDrafts.value.find(draft => draft.id === activeDraftId.value) || seriesDrafts.value.find(isReady) || seriesDrafts.value[0] || null)
const canEditActive = computed(() => activeDraft.value && store.canEdit(activeDraft.value.id))
const canPublish = computed(() => auth.hasPermission('chapters:approve'))
const canImport = computed(() => selectedSeries.value && chaptersReady.value && !loadingSeries.value && !importing.value && auth.hasPermission('chapters:create'))
const selectedReady = computed(() => seriesDrafts.value.filter(draft => selectedIds.value.includes(draft.id) && isReady(draft)))
const previewPage = computed(() => activeDraft.value?.pages[previewIndex.value])
function isReady(draft) { return ['draft', 'paused', 'failed'].includes(draft.status) && !draft.validationErrors?.length && draft.pages.length > 0 }
function chapterLabel(draft) { return draft.chapterNumber == null ? t('chapterImport.unnamed') : t('chapterImport.chapter', { number: draft.chapterNumber }) }
function issueText(issue, kind) { const code = typeof issue === 'string' ? issue : issue.code; const key = 'chapterImport.' + kind + '.' + code; return te(key) ? t(key) : t('chapterImport.issue') }
function formatSize(size) { return size >= 1024 * 1024 ? (size / 1024 / 1024).toFixed(1) + ' MB' : Math.ceil(size / 1024) + ' KB' }
function previewUrl(page) { if (!page?.file) return ''; if (!urls.has(page.file)) urls.set(page.file, URL.createObjectURL(page.file)); return urls.get(page.file) }
function clearPreviews() { urls.forEach(url => URL.revokeObjectURL(url)); urls.clear() }
function toggleSelection(id, checked) { selectedIds.value = checked ? [...new Set([...selectedIds.value, id])] : selectedIds.value.filter(value => value !== id) }
function selectReady() { selectedIds.value = seriesDrafts.value.filter(isReady).map(draft => draft.id) }
function editDraft(patch) { if (canEditActive.value) store.updateDraft(activeDraft.value.id, patch) }
function reorderPage(index) { if (canEditActive.value && dragPageIndex.value != null) store.movePage(activeDraft.value.id, dragPageIndex.value, index); dragPageIndex.value = null }
async function removeDraft(draft) { if (draft.status === 'uploading') return; if (!window.confirm(t('chapterImport.removeConfirm'))) return; try { await store.removeDraft(draft.id); selectedIds.value = selectedIds.value.filter(id => id !== draft.id) } catch (error) { importError.value = getErrorMessage(error) } }
function closeWorkspace(value) { if (value !== false) return; showPreview.value = false; store.flush().catch(() => {}); emit('update:modelValue', false) }

async function loadSeries() {
  const sequence = ++loadSequence
  loadingSeries.value = true; loadError.value = ''
  try {
    const items = []; let page = 1, total = Infinity
    while (items.length < total) {
      const result = await webtoonsApi.getWebtoons({ page, limit: 100 })
      const batch = result.data?.items || (Array.isArray(result.data) ? result.data : [])
      items.push(...batch); total = result.data?.total ?? items.length
      if (!batch.length) break
      page++
    }
    if (sequence !== loadSequence) return
    loadedSeries.value = items
    if (props.preselectedWebtoonId) selectedWebtoonId.value = props.preselectedWebtoonId
    await loadExisting(selectedWebtoonId.value)
  } catch (error) { if (sequence === loadSequence) loadError.value = getErrorMessage(error) }
  finally { if (sequence === loadSequence) loadingSeries.value = false }
}
async function loadExisting(id) {
  const sequence = ++chapterSequence
  chaptersReady.value = false; existingNumbers.value = []
  if (!id) return
  try {
    const result = await webtoonsApi.getWebtoon(id)
    if (sequence !== chapterSequence) return
    existingNumbers.value = (result.data?.chapters || []).map(chapter => Number(chapter.chapter_number)).sort((a, b) => a - b)
    store.setExistingNumbers(id, existingNumbers.value)
    chaptersReady.value = true
  } catch (error) { if (sequence === chapterSequence) loadError.value = getErrorMessage(error) }
}
async function importFiles(filesOrRead) {
  if (!canImport.value) return
  importing.value = true; importError.value = ''
  const id = selectedWebtoonId.value
  const staffId = auth.staff?.id
  const context = { webtoonId: id, seriesTitle: selectedSeries.value.title, chapterNumber: existingNumbers.value.length ? Math.max(...existingNumbers.value) + 1 : 1, existingNumbers: [...existingNumbers.value], rewardCoins: 5 }
  try {
    const files = typeof filesOrRead === 'function' ? await filesOrRead() : filesOrRead
    if (auth.staff?.id !== staffId || !auth.hasPermission('chapters:create')) throw Object.assign(new Error(t('chapterImport.warning.account_changed')), { code: 'account_changed' })
    if (!files.length) return
    const drafts = await store.importFiles(files, context)
    if (selectedWebtoonId.value === id) {
      const created = Array.isArray(drafts) ? drafts : []
      selectedIds.value = [...new Set([...selectedIds.value, ...created.filter(isReady).map(draft => draft.id)])]
      if (created.length) activeDraftId.value = (created.find(isReady) || created[0]).id
    }
  } catch (error) { const key = 'chapterImport.warning.' + error.code; importError.value = error.code && te(key) ? t(key) : getErrorMessage(error) }
  finally { importing.value = false }
}
async function handleFiles(event) { const files = [...(event.target.files || [])]; event.target.value = ''; await importFiles(files) }
async function readEntry(entry, prefix = '', depth = 0) {
  if (depth > 24) throw new Error(t('chapterImport.issue'))
  const path = prefix + entry.name
  if (entry.isFile) return new Promise((resolve, reject) => entry.file(file => { file.importPath = path; resolve([file]) }, reject))
  if (!entry.isDirectory) return []
  const reader = entry.createReader(), entries = []
  while (true) { const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject)); if (!batch.length) break; entries.push(...batch) }
  const files = []
  for (const child of entries) files.push(...await readEntry(child, path + '/', depth + 1))
  return files
}
async function handleDrop(event) {
  isDragging.value = false
  if (!canImport.value) return
  const entries = [...(event.dataTransfer.items || [])].filter(item => item.kind === 'file').map(item => item.webkitGetAsEntry?.()).filter(Boolean)
  const directFiles = [...(event.dataTransfer.files || [])]
  await importFiles(async () => {
    if (!entries.length) return directFiles
    const files = []
    for (const entry of entries) files.push(...await readEntry(entry))
    return files
  })
}
async function startUploads() {
  if (!selectedReady.value.length || importing.value || startingUploads.value || store.isRestoring) return
  importError.value = ''; startingUploads.value = true
  try { await store.enqueue(selectedReady.value.map(draft => draft.id), canPublish.value ? {} : { publish: false }); emit('updated') }
  catch (error) { importError.value = getErrorMessage(error) }
  finally { startingUploads.value = false }
}
async function retryDraft(id) { importError.value = ''; try { await store.enqueue([id], canPublish.value ? {} : { publish: false }) } catch (error) { importError.value = getErrorMessage(error) } }
watch(() => props.modelValue, open => { if (open) { if (props.preselectedDraftId) activeDraftId.value = props.preselectedDraftId; loadSeries() } else { loadSequence++; chapterSequence++; showPreview.value = false; clearPreviews() } }, { immediate: true })
watch(selectedWebtoonId, id => { activeDraftId.value = null; selectedIds.value = []; importError.value = ''; loadError.value = ''; previewMode.value = selectedSeries.value?.type === 'manhwa' ? 'strip' : 'pages'; loadExisting(id) })
watch(() => activeDraft.value?.id, id => {
  // Retain the chosen editor while a number is temporarily invalid during typing.
  if (id && !seriesDrafts.value.some(draft => draft.id === activeDraftId.value)) activeDraftId.value = id
  previewIndex.value = 0; previewMode.value = selectedSeries.value?.type === 'manhwa' ? 'strip' : 'pages'
}, { immediate: true })
watch(() => selectedSeries.value?.type, type => { previewMode.value = type === 'manhwa' ? 'strip' : 'pages' })
watch(() => activeDraft.value?.pages.length, count => { previewIndex.value = Math.max(0, Math.min(previewIndex.value, (count || 1) - 1)) })
watch(() => store.drafts.filter(draft => draft.status === 'complete').length, () => { if (props.modelValue) { loadExisting(selectedWebtoonId.value); emit('updated') } })
onUnmounted(() => { loadSequence++; chapterSequence++; clearPreviews() })
</script>

<style scoped>
.import-input { min-height: 42px; border: 1px solid rgb(148 163 184 / .4); border-radius: .65rem; background: transparent; padding: .5rem .65rem; font-size: .8rem; color: inherit; }
.import-input:focus-visible { outline: 2px solid #d79a26; outline-offset: 2px; }
.import-input:disabled { opacity: .6; }
.import-icon { display: inline-flex; min-width: 38px; min-height: 42px; align-items: center; justify-content: center; border-radius: .5rem; }
.import-icon:hover { background: rgb(148 163 184 / .15); }
.import-icon:disabled { opacity: .35; cursor: not-allowed; }
.import-icon:focus-visible { outline: 2px solid #d79a26; }
</style>
