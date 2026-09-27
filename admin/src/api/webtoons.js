import apiClient, { mockDb } from './client'

export const webtoonsApi = {
  async getGenres() {
    try {
      const res = await apiClient.get('/genres')
      return res.data
    } catch {
      return {
        success: true,
        data: mockDb.genres
      }
    }
  },

  async getWebtoons(params = {}) {
    try {
      const res = await apiClient.get('/webtoons', { params })
      return res.data
    } catch {
      let items = [...mockDb.webtoons]
      if (params.search) {
        const q = params.search.toLowerCase()
        items = items.filter(
          (w) =>
            w.title.toLowerCase().includes(q) ||
            w.author_name?.toLowerCase().includes(q)
        )
      }
      if (params.status) {
        items = items.filter((w) => w.status === params.status)
      }
      if (params.genre_id) {
        items = items.filter((w) => w.genre_ids.includes(Number(params.genre_id)))
      }

      return {
        success: true,
        data: {
          items,
          total: items.length,
          page: 1,
          limit: 50,
          pages: 1
        }
      }
    }
  },

  async getWebtoon(id) {
    try {
      const res = await apiClient.get(`/webtoons/${id}`)
      return res.data
    } catch {
      const webtoon = mockDb.webtoons.find((w) => w.id === Number(id))
      if (!webtoon) throw new Error('Webtoon topilmadi')
      const chapters = mockDb.chapters.filter((c) => c.webtoon_id === Number(id))
      return {
        success: true,
        data: {
          ...webtoon,
          chapters
        }
      }
    }
  },

  async createWebtoon(formData) {
    try {
      const res = await apiClient.post('/webtoons', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return res.data
    } catch {
      const title = formData.get ? formData.get('title') : formData.title
      const author_name = formData.get ? formData.get('author_name') : formData.author_name
      const description = formData.get ? formData.get('description') : formData.description
      const status = (formData.get ? formData.get('status') : formData.status) || 'ongoing'
      const genre_ids = (formData.get ? JSON.parse(formData.get('genre_ids') || '[]') : formData.genre_ids) || [1]
      const cover_image_url = formData.cover_image_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80'

      const newId = (mockDb.webtoons[mockDb.webtoons.length - 1]?.id || 0) + 1
      const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')

      const genreNames = mockDb.genres
        .filter((g) => genre_ids.includes(g.id))
        .map((g) => g.name)

      const newItem = {
        id: newId,
        title,
        slug,
        author_name,
        description,
        status,
        view_count: 0,
        cover_image_url,
        genres: genreNames,
        genre_ids,
        uploader_staff_id: 1,
        created_at: new Date().toISOString(),
        chapters_count: 0
      }

      mockDb.webtoons.unshift(newItem)
      mockDb.save('webtoons')

      return {
        success: true,
        data: newItem,
        message: 'Yangi manhva muvaffaqiyatli yaratildi'
      }
    }
  },

  async updateWebtoon(id, data) {
    try {
      const res = await apiClient.patch(`/webtoons/${id}`, data)
      return res.data
    } catch {
      const idx = mockDb.webtoons.findIndex((w) => w.id === Number(id))
      if (idx !== -1) {
        mockDb.webtoons[idx] = { ...mockDb.webtoons[idx], ...data }
        mockDb.save('webtoons')
        return {
          success: true,
          data: mockDb.webtoons[idx],
          message: 'Manhva muvaffaqiyatli yangilandi'
        }
      }
      throw new Error('Manhva topilmadi')
    }
  },

  async deleteWebtoon(id) {
    try {
      const res = await apiClient.delete(`/webtoons/${id}`)
      return res.data
    } catch {
      mockDb.webtoons = mockDb.webtoons.filter((w) => w.id !== Number(id))
      mockDb.chapters = mockDb.chapters.filter((c) => c.webtoon_id !== Number(id))
      mockDb.save('webtoons')
      mockDb.save('chapters')
      return {
        success: true,
        data: null,
        message: 'Manhva o\'chirildi'
      }
    }
  },

  async uploadChapter(formData) {
    try {
      const res = await apiClient.post('/chapters', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return res.data
    } catch {
      const webtoon_id = Number(formData.get ? formData.get('webtoon_id') : formData.webtoon_id)
      const chapter_number = parseFloat(formData.get ? formData.get('chapter_number') : formData.chapter_number)
      const title = formData.get ? formData.get('title') : formData.title
      const images = formData.images || [
        'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80'
      ]

      const newId = (mockDb.chapters[mockDb.chapters.length - 1]?.id || 100) + 1
      const newChapter = {
        id: newId,
        webtoon_id,
        chapter_number,
        title: title || `${chapter_number}-bob`,
        status: 'pending',
        reward_coins: 5,
        created_at: new Date().toISOString(),
        images
      }

      mockDb.chapters.push(newChapter)
      const targetWebtoon = mockDb.webtoons.find((w) => w.id === webtoon_id)
      if (targetWebtoon) {
        targetWebtoon.chapters_count = (targetWebtoon.chapters_count || 0) + 1
        mockDb.save('webtoons')
      }
      mockDb.save('chapters')

      return {
        success: true,
        data: newChapter,
        message: 'Bob rasmlari muvaffaqiyatli yuklandi va moderatorlar tekshiruviga yuborildi'
      }
    }
  },

  async updateChapter(id, data) {
    try {
      const res = await apiClient.patch(`/chapters/${id}`, data)
      return res.data
    } catch {
      const chapter = mockDb.chapters.find((c) => c.id === Number(id))
      if (!chapter) throw new Error('Bob topilmadi')

      if (data.chapter_number !== undefined) chapter.chapter_number = parseFloat(data.chapter_number)
      if (data.title !== undefined) chapter.title = data.title
      if (data.reward_coins !== undefined) chapter.reward_coins = Number(data.reward_coins)
      if (data.status !== undefined) chapter.status = data.status
      if (data.images !== undefined) chapter.images = [...data.images]

      mockDb.save('chapters')

      return {
        success: true,
        data: chapter,
        message: 'Bob muvaffaqiyatli tahrirlandi'
      }
    }
  },

  async deleteChapter(id) {
    try {
      const res = await apiClient.delete(`/chapters/${id}`)
      return res.data
    } catch {
      const target = mockDb.chapters.find((c) => c.id === Number(id))
      if (target) {
        const webtoon = mockDb.webtoons.find((w) => w.id === target.webtoon_id)
        if (webtoon && webtoon.chapters_count > 0) {
          webtoon.chapters_count -= 1
          mockDb.save('webtoons')
        }
      }
      mockDb.chapters = mockDb.chapters.filter((c) => c.id !== Number(id))
      mockDb.save('chapters')
      return {
        success: true,
        data: null,
        message: 'Bob muvaffaqiyatli o\'chirildi'
      }
    }
  }
}
