<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <svg class="w-6 h-6 text-brand-500 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          {{ $t('comments.title') }}
        </h2>
        <p class="text-xs text-slate-500 dark:text-studio-400 mt-1">
          {{ $t('comments.subtitle') }}
        </p>
      </div>

      <div class="text-xs font-mono text-slate-500 dark:text-studio-400">
        Jami: <strong>{{ totalComments }}</strong> {{ $t('comments.total') }}
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center p-16 space-y-4">
      <div class="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-xs text-studio-400 font-medium">Sharhlar yuklanmoqda...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="comments.length === 0" class="glass-card rounded-2xl p-12 text-center border border-slate-200 dark:border-white/5 space-y-3">
      <div class="w-12 h-12 rounded-2xl bg-studio-800 text-studio-400 mx-auto flex items-center justify-center text-lg">
        💬
      </div>
      <h3 class="font-bold text-white text-base">Sharhlar mavjud emas</h3>
      <p class="text-slate-400 dark:text-studio-400 text-xs">Hozirda foydalanuvchilar tomonidan qoldirilgan hech qanday sharh yo'q.</p>
    </div>

    <!-- Comments List -->
    <div v-else class="space-y-3">
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="glass-card rounded-2xl p-5 border border-slate-200 dark:border-white/5 hover:border-brand-500/30 hover:shadow-lg transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4"
      >
        <div class="space-y-2 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-bold text-slate-900 dark:text-white text-sm">
              {{ comment.author?.username || comment.username || 'Foydalanuvchi' }}
            </span>
            <span class="text-slate-300 dark:text-studio-600">•</span>
            <span class="text-xs text-brand-600 dark:text-brand-400 font-semibold">
              {{ comment.webtoon_title }} ({{ comment.chapter_title || (comment.chapter_number ? comment.chapter_number + '-bob' : '') }})
            </span>
            <span class="text-slate-300 dark:text-studio-600">•</span>
            <span class="text-xs text-slate-400 dark:text-studio-500 font-mono">{{ formatDate(comment.created_at) }}</span>
          </div>

          <p class="text-xs sm:text-sm text-slate-800 dark:text-studio-200 leading-relaxed bg-slate-100 dark:bg-studio-900/60 p-3 rounded-xl border border-slate-200 dark:border-white/5">
            {{ comment.content }}
          </p>
        </div>

        <div class="flex items-center gap-2 shrink-0 self-end sm:self-start pt-1">
          <!-- EDIT COMMENT BUTTON -->
          <button
            v-if="authStore.hasPermission('comments:moderate')"
            class="px-3 py-1.5 rounded-xl text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 transition-colors flex items-center gap-1"
            @click="openEditModal(comment)"
          >
            ✏️ {{ $t('common.edit') }}
          </button>

          <!-- DELETE COMMENT BUTTON -->
          <button
            v-if="authStore.hasPermission('comments:moderate')"
            class="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
            @click="deleteComment(comment.id)"
          >
            🗑 {{ $t('common.delete') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Comment Modal -->
    <CommentEditModal
      v-model="showEditModal"
      :comment="selectedComment"
      @save="onCommentUpdated"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useSystemStore } from '../stores/system'
import { commentsApi } from '../api/comments'
import CommentEditModal from '../components/comments/CommentEditModal.vue'

const authStore = useAuthStore()
const systemStore = useSystemStore()

const comments = ref([])
const totalComments = ref(0)
const loading = ref(false)
const showEditModal = ref(false)
const selectedComment = ref(null)

async function loadComments() {
  loading.value = true
  try {
    const res = await commentsApi.getComments({ limit: 100 })
    comments.value = res.data?.items || res.data || []
    totalComments.value = res.data?.total || comments.value.length
  } catch (err) {
    systemStore.addToast({
      type: 'danger',
      title: 'Xatolik',
      message: 'Sharhlarni yuklashda xatolik yuz berdi'
    })
  } finally {
    loading.value = false
  }
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('uz-UZ', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function openEditModal(comment) {
  selectedComment.value = comment
  showEditModal.value = true
}

async function onCommentUpdated({ id, content }) {
  try {
    await commentsApi.updateComment(id, content)
    systemStore.addToast({
      type: 'success',
      title: 'Sharh tahrirlandi',
      message: 'Sharh muvaffaqiyatli saqlandi'
    })
    await loadComments()
  } catch (err) {
    systemStore.addToast({
      type: 'error',
      title: 'Xatolik',
      message: err.response?.data?.detail || err.message || 'Sharhni yangilashda xatolik yuz berdi'
    })
  }
}

async function deleteComment(id) {
  if (confirm('Ushbu sharhni o\'chirmoqchimisiz?')) {
    try {
      await commentsApi.deleteComment(id)
      comments.value = comments.value.filter((c) => c.id !== id)
      systemStore.addToast({
        type: 'info',
        title: 'Sharh o\'chirildi',
        message: 'Sharh muvaffaqiyatli olib tashlandi'
      })
    } catch (err) {
      systemStore.addToast({
        type: 'danger',
        title: 'Xatolik',
        message: err.response?.data?.detail || 'Sharhni o\'chirishda xatolik yuz berdi'
      })
    }
  }
}

onMounted(() => {
  loadComments()
})
</script>
