// Realistic mock dataset matching backend/docs schemas and API formats
export const initialPermissions = [
  { id: 1, code: 'webtoons:create', description: 'Yangi manhwa kartochkasi yaratish' },
  { id: 2, code: 'webtoons:edit', description: 'Mavjud manhvalarni tahrirlash' },
  { id: 3, code: 'chapters:create', description: 'Bob ochish va rasmlarni yuklash' },
  { id: 4, code: 'chapters:approve', description: 'Bob moderatsiyasidan o\'tkazish' },
  { id: 5, code: 'shop:manage', description: 'Shop buyumlarini kiritish va tahrirlash' },
  { id: 6, code: 'users:manage', description: 'Foydalanuvchilar chaqmoq balansi va bloklash' },
  { id: 7, code: 'roles:manage', description: 'Rollar va xodimlarni boshqarish' },
  { id: 8, code: 'comments:moderate', description: 'Nomaqbul sharhlarni o\'chirish' }
]

export const initialRoles = [
  {
    id: 1,
    name: 'superadmin',
    description: 'To\'liq boshqaruv huquqiga ega tizim rahbari',
    permission_ids: [1, 2, 3, 4, 5, 6, 7, 8],
    permissions_count: 8
  },
  {
    id: 2,
    name: 'creator',
    description: 'Komiks yuklovchi tarjimon talaba',
    permission_ids: [1, 2, 3],
    permissions_count: 3
  },
  {
    id: 3,
    name: 'moderator',
    description: 'Boblar va sharhlarni tekshiruvchi mas\'ul',
    permission_ids: [4, 8],
    permissions_count: 2
  },
  {
    id: 4,
    name: 'viewer',
    description: 'Faqat statistikani kuzatuvchi mehmon',
    permission_ids: [],
    permissions_count: 0
  }
]

export const initialStaffUsers = [
  {
    id: 1,
    username: 'superadmin',
    email: 'admin@webtoonhub.uz',
    role_id: 1,
    role_name: 'superadmin',
    is_active: true,
    created_at: '2026-09-01T10:00:00Z'
  },
  {
    id: 2,
    username: 'creator_ali',
    email: 'ali@webtoonhub.uz',
    role_id: 2,
    role_name: 'creator',
    is_active: true,
    created_at: '2026-09-10T12:00:00Z'
  },
  {
    id: 3,
    username: 'moderator_nodir',
    email: 'nodir@webtoonhub.uz',
    role_id: 3,
    role_name: 'moderator',
    is_active: true,
    created_at: '2026-09-15T15:30:00Z'
  }
]

export const initialGenres = [
  { id: 1, name: 'Jangari (Action)', slug: 'action' },
  { id: 2, name: 'Fantaziya (Fantasy)', slug: 'fantasy' },
  { id: 3, name: 'Sarguzasht (Adventure)', slug: 'adventure' },
  { id: 4, name: 'Romantika (Romance)', slug: 'romance' },
  { id: 5, name: 'Drama', slug: 'drama' },
  { id: 6, name: 'Komediya (Comedy)', slug: 'comedy' },
  { id: 7, name: 'Tizim / Reinkarnatsiya', slug: 'system' }
]

export const initialWebtoons = [
  {
    id: 1,
    title: 'Yakkaxon Ko\'tarilish (Solo Leveling)',
    slug: 'solo-leveling',
    author_name: 'Chugong / DUBU',
    status: 'completed',
    view_count: 48920,
    cover_image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    description: 'Eng kuchsiz E-darajali ovchidan eng qudratli soyalar hukmdorigacha bo\'lgan hayratlanarli yo\'l...',
    genres: ['Jangari (Action)', 'Fantaziya (Fantasy)', 'Tizim / Reinkarnatsiya'],
    genre_ids: [1, 2, 7],
    uploader_staff_id: 1,
    created_at: '2026-09-01T12:00:00Z',
    chapters_count: 3
  },
  {
    id: 2,
    title: 'Har Narsani Biluvchi O\'quvchi (ORV)',
    slug: 'omniscient-reader',
    author_name: 'Sing Shong / Sleepy-C',
    status: 'ongoing',
    view_count: 31250,
    cover_image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    description: 'Dunyo uzoq yillar davomida faqat bitta o\'quvchi o\'qigan roman senariysi bo\'yicha qulashni boshlaydi...',
    genres: ['Jangari (Action)', 'Fantaziya (Fantasy)', 'Sarguzasht (Adventure)'],
    genre_ids: [1, 2, 3],
    uploader_staff_id: 2,
    created_at: '2026-09-05T08:00:00Z',
    chapters_count: 2
  },
  {
    id: 3,
    title: 'Oxiratdan So\'ng Boshlanish (TBATE)',
    slug: 'tbate',
    author_name: 'TurtleMe / Fuyuki23',
    status: 'ongoing',
    view_count: 24700,
    cover_image_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    description: 'Qudratli qirol Grey sirli sehr va dahshatli maxluqlar dunyosida yangi bola bo\'lib qayta tug\'iladi...',
    genres: ['Fantaziya (Fantasy)', 'Sarguzasht (Adventure)'],
    genre_ids: [2, 3],
    uploader_staff_id: 2,
    created_at: '2026-09-12T14:30:00Z',
    chapters_count: 1
  }
]

export const initialChapters = [
  {
    id: 101,
    webtoon_id: 1,
    chapter_number: 1.0,
    title: '1-bob: D-darajali xandaqdagi fojia',
    status: 'published',
    reward_coins: 5,
    created_at: '2026-09-15T12:00:00Z',
    images: [
      'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 102,
    webtoon_id: 1,
    chapter_number: 2.0,
    title: '2-bob: Qo\'shaloq xandaq va ibodatxona',
    status: 'published',
    reward_coins: 5,
    created_at: '2026-09-18T10:00:00Z',
    images: [
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 103,
    webtoon_id: 1,
    chapter_number: 3.0,
    title: '3-bob: Birinchi amr — Rabbiyga sajda qiling',
    status: 'pending',
    reward_coins: 5,
    created_at: '2026-09-26T20:30:00Z',
    images: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 104,
    webtoon_id: 2,
    chapter_number: 1.0,
    title: '1-bob: Epilogdan boshlanish',
    status: 'published',
    reward_coins: 5,
    created_at: '2026-09-20T16:00:00Z',
    images: [
      'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 105,
    webtoon_id: 2,
    chapter_number: 2.0,
    title: '2-bob: Metro vagonidagi birinchi stsenariy',
    status: 'pending',
    reward_coins: 5,
    created_at: '2026-09-27T14:15:00Z',
    images: [
      'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80'
    ]
  }
]

export const initialShopItems = [
  {
    id: 1,
    name: 'Oltin Chaqmoq Ramkasi',
    item_type: 'frame',
    price_coins: 50,
    asset_url: 'https://api.iconify.design/solar:crown-star-bold.svg?color=%23f59e0b',
    border_style: 'ring-4 ring-amber-400 shadow-glow-brand',
    is_available: true,
    created_at: '2026-09-10T12:00:00Z'
  },
  {
    id: 2,
    name: 'Kiber Neon Ramka',
    item_type: 'frame',
    price_coins: 75,
    asset_url: 'https://api.iconify.design/solar:shield-star-bold.svg?color=%2306b6d4',
    border_style: 'ring-4 ring-cyan-400 shadow-glow-cyan',
    is_available: true,
    created_at: '2026-09-12T15:00:00Z'
  },
  {
    id: 3,
    name: 'Binafsharang Ajdar Ramkasi',
    item_type: 'frame',
    price_coins: 120,
    asset_url: 'https://api.iconify.design/solar:fire-bold.svg?color=%238b5cf6',
    border_style: 'ring-4 ring-purple-500 shadow-glow-purple',
    is_available: true,
    created_at: '2026-09-14T18:00:00Z'
  },
  {
    id: 4,
    name: 'Qorong\'u Kecha Kosmik Foni',
    item_type: 'background',
    price_coins: 100,
    asset_url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop&q=80',
    border_style: 'bg-gradient-to-r from-purple-900 to-indigo-950',
    is_available: true,
    created_at: '2026-09-16T11:00:00Z'
  },
  {
    id: 5,
    name: 'Kiberpank Neon Shahri Foni',
    item_type: 'background',
    price_coins: 150,
    asset_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
    border_style: 'bg-gradient-to-r from-cyan-900 to-blue-950',
    is_available: true,
    created_at: '2026-09-18T13:00:00Z'
  }
]

export const initialCreatorRequests = [
  {
    id: 1,
    user_id: 10,
    username: 'manhwa_lover',
    email: 'reader10@mail.uz',
    message: 'Salom, men koreys tilidan erkin tarjima qila olaman. "Solo Bug Player" manhvasini o\'zbek tiliga to\'liq tarjima qilib WebtoonHub ga joylamoqchiman. Namuna sifatida 3 ta bob tayyor.',
    sample_links: 'https://t.me/manhwa_sample_pbl',
    status: 'pending',
    reviewed_by: null,
    reviewed_at: null,
    created_at: '2026-09-26T14:30:00Z'
  },
  {
    id: 2,
    user_id: 14,
    username: 'translator_uz',
    email: 'tarjimon@gmail.com',
    message: 'PBL3 loyihasi doirasida o\'zbekcha manhva kontentini ko\'paytirishni maqsad qilganman. Photoshopda klind va tayp qilishda 2 yillik tajribam bor.',
    sample_links: 'https://drive.google.com/drive/folders/sample',
    status: 'pending',
    reviewed_by: null,
    reviewed_at: null,
    created_at: '2026-09-27T09:15:00Z'
  }
]

export const initialUsers = [
  {
    id: 1,
    username: 'otaku_king',
    email: 'king@webtoonhub.uz',
    lightning_coins: 135,
    last_daily_login: '2026-09-27T08:15:00Z',
    is_active: true,
    created_at: '2026-09-02T10:00:00Z',
    read_chapters_count: 17,
    equipped_frame: 'Oltin Chaqmoq Ramkasi',
    equipped_background: 'Qorong\'u Kecha Kosmik Foni'
  },
  {
    id: 2,
    username: 'sakura_uz',
    email: 'sakura@mail.uz',
    lightning_coins: 85,
    last_daily_login: '2026-09-26T19:00:00Z',
    is_active: true,
    created_at: '2026-09-05T14:20:00Z',
    read_chapters_count: 7,
    equipped_frame: 'Binafsharang Ajdar Ramkasi',
    equipped_background: null
  },
  {
    id: 3,
    username: 'shadow_hunter',
    email: 'shadow@inbox.uz',
    lightning_coins: 210,
    last_daily_login: '2026-09-27T11:45:00Z',
    is_active: true,
    created_at: '2026-09-08T09:30:00Z',
    read_chapters_count: 32,
    equipped_frame: 'Kiber Neon Ramka',
    equipped_background: 'Kiberpank Neon Shahri Foni'
  },
  {
    id: 4,
    username: 'spammer_bot',
    email: 'fake_bot@trashmail.com',
    lightning_coins: 50,
    last_daily_login: null,
    is_active: false,
    created_at: '2026-09-20T18:00:00Z',
    read_chapters_count: 0,
    equipped_frame: null,
    equipped_background: null
  }
]

export const initialComments = [
  {
    id: 1,
    chapter_id: 101,
    webtoon_title: 'Solo Leveling',
    chapter_number: 1.0,
    user_id: 1,
    username: 'otaku_king',
    content: 'Juda ajoyib sifatda yuklanibdi! Tarjima ham, rasmlar tiniqligi ham 10/10!',
    created_at: '2026-09-25T11:00:00Z'
  },
  {
    id: 2,
    chapter_id: 101,
    webtoon_title: 'Solo Leveling',
    chapter_number: 1.0,
    user_id: 4,
    username: 'spammer_bot',
    content: 'Tez kunda yangi kanalimizga obuna bo\'ling @reklama_bot',
    created_at: '2026-09-26T18:05:00Z'
  },
  {
    id: 3,
    chapter_id: 102,
    webtoon_title: 'Solo Leveling',
    chapter_number: 2.0,
    user_id: 2,
    username: 'sakura_uz',
    content: 'Qo\'shaloq xandaq sahnasi eng daxshatlisi bo\'lgan edi, o\'qiyotganda qaltirab ketdim.',
    created_at: '2026-09-27T08:30:00Z'
  }
]

export const initialSessions = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    ip_address: '178.218.201.5',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    device_type: 'Desktop',
    is_current: true,
    last_active_at: new Date().toISOString(),
    created_at: '2026-09-27T12:00:00Z'
  },
  {
    id: 'a89c201e-76f1-4ab8-9311-536ef0182c44',
    ip_address: '84.54.120.33',
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    device_type: 'Mobile',
    is_current: false,
    last_active_at: '2026-09-26T19:30:00Z',
    created_at: '2026-09-26T19:30:00Z'
  }
]
