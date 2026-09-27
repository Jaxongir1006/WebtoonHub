import apiClient, { mockDb } from './client'

export const moderationApi = {
  async getChapters(params = {}) {
    try {
      const res = await apiClient.get('/chapters', { params })
      return res.data
    } catch {
      let items = [...mockDb.chapters]
      if (params.status) {
        items = items.filter((c) => c.status === params.status)
      }
      // Populate webtoon info
      items = items.map((c) => {
        const w = mockDb.webtoons.find((item) => item.id === c.webtoon_id)
        return {
          ...c,
          webtoon_title: w ? w.title : `Webtoon #${c.webtoon_id}`,
          webtoon_cover: w ? w.cover_image_url : null
        }
      })

      return {
        success: true,
        data: {
          items,
          total: items.length
        }
      }
    }
  },

  async moderateChapter(id, status) {
    try {
      const res = await apiClient.patch(`/chapters/${id}/status`, { status })
      return res.data
    } catch {
      const chapter = mockDb.chapters.find((c) => c.id === Number(id))
      if (!chapter) throw new Error('Bob topilmadi')

      chapter.status = status
      mockDb.save('chapters')

      return {
        success: true,
        data: chapter,
        message:
          status === 'published'
            ? 'Bob muvaffaqiyatli tasdiqlandi va e\'lon qilindi!'
            : 'Bob rad etildi.'
      }
    }
  }
}
