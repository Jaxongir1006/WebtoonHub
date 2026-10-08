<template>
  <aside v-if="visible" class="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-studio-700 dark:bg-studio-900 text-slate-900 dark:text-studio-100" :aria-label="$t('chapterImport.queue')">
    <button v-if="!expanded" type="button" class="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left" :aria-label="$t('chapterImport.openQueue')" @click="expanded = true">
      <div><strong class="block text-sm">{{ $t('chapterImport.queue') }}</strong><span class="mt-1 block text-xs text-slate-500 dark:text-studio-400" role="status">{{ $t('chapterImport.queueSummary', { active: activeCount, done: completedCount }) }}</span></div>
      <span v-if="activeCount" class="h-2 w-2 rounded-full bg-brand-500 animate-pulse" aria-hidden="true" /><span v-else aria-hidden="true">↑</span>
    </button>
    <template v-else>
      <div class="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-studio-700"><strong class="text-sm">{{ $t('chapterImport.queue') }}</strong><button class="min-h-9 min-w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-studio-800" type="button" :aria-label="$t('chapterImport.hideQueue')" @click="expanded = false">−</button></div>
      <p v-if="actionError" role="alert" class="mx-3 mt-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">{{ actionError }}</p>
      <p v-if="store.storageError" role="alert" class="mx-3 mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">{{ $t('chapterImport.savingError') }}</p>
      <div class="max-h-[min(55vh,420px)] overflow-y-auto px-3 py-2">
        <article v-for="draft in store.drafts" :key="draft.id" class="border-b border-slate-100 py-3 last:border-0 dark:border-studio-800">
          <div class="flex items-start justify-between gap-2"><div class="min-w-0"><p class="truncate text-xs text-slate-500 dark:text-studio-400">{{ draft.seriesTitle }}</p><h4 class="mt-1 truncate text-sm font-semibold">{{ chapterLabel(draft) }}<span v-if="draft.title"> · {{ draft.title }}</span></h4></div><span class="shrink-0 text-[11px]" :class="draft.status === 'failed' ? 'text-rose-700 dark:text-rose-300' : draft.status === 'complete' ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-studio-400'">{{ $t('chapterImport.status.' + draft.status) }}</span></div>
          <progress class="mt-2 h-1.5 w-full accent-brand-500" :value="draft.status === 'complete' ? 100 : draft.progress || 0" max="100" :aria-label="chapterLabel(draft)" />
          <p class="mt-1 text-[11px] text-slate-500 dark:text-studio-400">{{ $t('chapterImport.uploaded', { uploaded: draft.uploadedCount || 0, total: draft.totalPages || draft.pages.length }) }}</p>
          <p v-if="draft.error" role="alert" class="mt-1 break-words text-xs text-rose-700 dark:text-rose-300">{{ draft.error }}</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <Button variant="secondary" size="xs" @click="openWorkspace(draft)">{{ $t('chapterImport.inspect') }}</Button>
            <Button v-if="['uploading', 'queued'].includes(draft.status)" variant="ghost" size="xs" @click="runAction(() => store.pause(draft.id))">{{ $t('chapterImport.pause') }}</Button>
            <Button v-if="['failed', 'paused'].includes(draft.status)" variant="primary" size="xs" :disabled="!!draft.validationErrors?.length" @click="runAction(() => store.enqueue([draft.id], auth.hasPermission('chapters:approve') ? {} : { publish: false }))">{{ $t(draft.status === 'failed' ? 'chapterImport.retry' : 'chapterImport.resume') }}</Button>
            <Button v-if="draft.status !== 'uploading'" variant="ghost" size="xs" class="text-rose-700 dark:text-rose-300" @click="removeDraft(draft)">{{ $t('chapterImport.remove') }}</Button>
          </div>
        </article>
      </div>
      <div class="flex flex-wrap gap-2 border-t border-slate-200 px-3 py-3 dark:border-studio-700"><Button v-if="activeCount" variant="secondary" size="xs" @click="runAction(() => store.pause())">{{ $t('chapterImport.pauseAll') }}</Button><Button v-if="completedCount" variant="ghost" size="xs" @click="runAction(() => store.clearCompleted())">{{ $t('chapterImport.clearCompleted') }}</Button><p class="text-[11px] text-slate-500 dark:text-studio-400">{{ $t('chapterImport.background') }}</p></div>
    </template>
  </aside>
  <ChapterImportWorkspace v-if="showWorkspace" v-model="showWorkspace" :preselected-webtoon-id="workspaceWebtoonId" :preselected-draft-id="workspaceDraftId" />
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { useChapterImportStore } from '../../stores/chapterImport'
import { getErrorMessage } from '../../utils/forms'
import Button from '../common/Button.vue'
import ChapterImportWorkspace from './ChapterImportWorkspace.vue'
const auth = useAuthStore()
const store = useChapterImportStore()
const { t } = useI18n()
const expanded = ref(false)
const showWorkspace = ref(false)
const workspaceWebtoonId = ref(null)
const workspaceDraftId = ref(null)
const actionError = ref('')
const visible = computed(() => auth.isAuthenticated && auth.hasPermission('chapters:create') && store.drafts.length > 0)
const activeCount = computed(() => store.drafts.filter(draft => ['queued', 'uploading'].includes(draft.status)).length)
const completedCount = computed(() => store.drafts.filter(draft => draft.status === 'complete').length)
function chapterLabel(draft) { return draft.chapterNumber == null ? t('chapterImport.unnamed') : t('chapterImport.chapter', { number: draft.chapterNumber }) }
function openWorkspace(draft) { workspaceWebtoonId.value = Number(draft.webtoonId); workspaceDraftId.value = draft.id; showWorkspace.value = true; expanded.value = false }
async function runAction(action) { actionError.value = ''; try { await action() } catch (error) { actionError.value = getErrorMessage(error) } }
async function removeDraft(draft) { if (!window.confirm(t('chapterImport.removeConfirm'))) return; await runAction(() => store.removeDraft(draft.id)) }
watch(() => auth.staff?.id, () => { showWorkspace.value = false; actionError.value = ''; expanded.value = false })
watch(() => store.drafts.filter(draft => draft.status === 'failed').length, (count, previous) => { if (count > previous) expanded.value = true })
</script>
