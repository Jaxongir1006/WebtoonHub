<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <svg class="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Sharhlar Moderatsiyasi
        </h2>
        <p class="text-xs text-studio-400 mt-1">
          Har bir bob ostida qoldirilgan fikr-mulohazalar va spamlarni tozalash
        </p>
      </div>

      <div class="text-xs font-mono text-studio-400">
        Jami: <strong>{{ comments.length }}</strong> ta sharh
      </div>
    </div>

    <!-- Comments List -->
    <div class="space-y-3">
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="glass-card rounded-2xl p-5 border border-white/5 hover:border-brand-500/30 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4"
      >
        <div class="space-y-2 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-bold text-white text-sm">{{ comment.username }}</span>
            <span class="text-studio-600">•</span>
            <span class="text-xs text-brand-400 font-semibold">
              {{ comment.webtoon_title }} ({{ comment.chapter_number }}-bob)
            </span>
            <span class="text-studio-600">•</span>
            <span class="text-xs text-studio-500 font-mono">{{ formatDate(comment.created_at) }}</span>
          </div>

          <p class="text-xs sm:text-sm text-studio-200 leading-relaxed bg-studio-900/40 p-3 rounded-xl border border-white/5">
            {{ comment.content }}
          </p>
        </div>

        <button
          v-if="authStore.hasPermission('comments:moderate')"
          class="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors shrink-0 self-end sm:self-start"
          @click="deleteComment(comment.id)"
        >
          🗑 Sharhni O'chirish
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useSystemStore } from '../stores/system'
import { mockDb } from '../api/client'

const authStore = useAuthStore()
const systemStore = useSystemStore()

const comments = computed(() => mockDb.comments)

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('uz-UZ', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function deleteComment(id) {
  if (confirm('Ushbu sharhni o\'chirmoqchimisiz?')) {
    mockDb.comments = mockDb.comments.filter((c) => c.id !== id)
    mockDb.save('comments')
    systemStore.addToast({
      type: 'info',
      title: 'Sharh o\'chirildi',
      message: 'Sharh muvaffaqiyatli olib tashlandi'
    })
  }
}
</script>
