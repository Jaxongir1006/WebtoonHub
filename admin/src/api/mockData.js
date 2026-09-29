// Realistic mock dataset matching backend/docs schemas and API formats
export const initialPermissions = [
  { id: 1, code: 'webtoons:create', description: 'Yangi manhwa kartochkasi yaratish' },
  { id: 2, code: 'webtoons:edit', description: 'Mavjud manhvalarni tahrirlash' },
  { id: 3, code: 'webtoons:delete', description: 'Manhvalarni tizimdan o\'chirish' },
  { id: 4, code: 'chapters:create', description: 'Bob ochish va rasmlarni yuklash' },
  { id: 5, code: 'chapters:edit', description: 'Bob ma\'lumotlarini tahrirlash' },
  { id: 6, code: 'chapters:delete', description: 'Bobni tizimdan o\'chirish' },
  { id: 7, code: 'chapters:approve', description: 'Bob moderatsiyasidan o\'tkazish' },
  { id: 8, code: 'genres:manage', description: 'Janrlarni boshqarish' },
  { id: 9, code: 'shop:manage', description: 'Shop buyumlarini kiritish va tahrirlash' },
  { id: 10, code: 'users:manage', description: 'Foydalanuvchilar chaqmoq balansi va bloklash' },
  { id: 11, code: 'coins:view', description: 'Chaqmoq tranzaksiyalari va statistikasini ko\'rish' },
  { id: 12, code: 'coins:adjust', description: 'Foydalanuvchi chaqmoq balansini o\'zgartirish' },
  { id: 13, code: 'coins:distribute', description: 'Ommaviy chaqmoq ulashish' },
  { id: 14, code: 'roles:manage', description: 'Rollar va ruxsatlarni boshqarish' },
  { id: 15, code: 'staff:manage', description: 'Xodimlarni boshqarish va rol tayinlash' },
  { id: 16, code: 'settings:manage', description: 'Tizim sozlamalarini boshqarish' },
  { id: 17, code: 'comments:moderate', description: 'Nomaqbul sharhlarni o\'chirish' },
  { id: 18, code: 'analytics:view', description: 'Statistika va hisobotlarni ko\'rish' }
]

export const initialRoles = [
  {
    id: 1,
    name: 'superadmin',
    description: 'To\'liq boshqaruv huquqiga ega tizim rahbari',
    permission_ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
    permissions_count: 18
  },
  {
    id: 2,
    name: 'creator',
    description: 'Komiks yuklovchi tarjimon talaba',
    permission_ids: [1, 2, 4, 5],
    permissions_count: 4
  },
  {
    id: 3,
    name: 'moderator',
    description: 'Boblar va sharhlarni tekshiruvchi mas\'ul',
    permission_ids: [7, 10, 17],
    permissions_count: 3
  },
  {
    id: 4,
    name: 'viewer',
    description: 'Faqat statistikani kuzatuvchi mehmon',
    permission_ids: [11, 18],
    permissions_count: 2
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
    type: 'manhwa',
    author_name: 'Chugong & DUBU (REDICE Studio)',
    status: 'completed',
    view_count: 98450,
    cover_image_url: '/content/covers/solo-leveling.jpg',
    description: 'O\'n yil muqaddam dunyo bo\'ylab sirli "Darvozalar" ochildi va insoniyat orasida sehrli qudratga ega "Ovchilar" paydo bo\'ldi. Seong Jinwoo butun insoniyatdagi eng zaif E-darajali ovchi hisoblanadi. Biroq D-darajali erosti xandaqidagi dahshatli sirli ibodatxonada unga yangi o\'yin tizimi taqdim etiladi.',
    genres: ['Jangari (Action)', 'Fantaziya (Fantasy)', 'Tizim / Reinkarnatsiya'],
    genre_ids: [1, 2, 7],
    uploader_staff_id: 1,
    created_at: '2026-09-01T12:00:00Z',
    chapters_count: 1
  },
  {
    id: 2,
    title: 'O\'lim Daftari (Death Note)',
    slug: 'death-note',
    type: 'manga',
    author_name: 'Tsugumi Ohba & Takeshi Obata',
    status: 'completed',
    view_count: 84200,
    cover_image_url: '/content/covers/death-note.jpg',
    description: 'Yagami Light — Yaponiyaning eng iqtidorli namunali o\'quvchisi. Maktab hovlisidan topilgan sirli qora daftar unga istalgan insonning ismini yozish orqali uni o\'ldirish qudratini beradi. O\'lim xudosi Ryuk bilan yuzlashgan Light yangi dunyo xudosiga aylanishga intiladi.',
    genres: ['Drama', 'Jangari (Action)'],
    genre_ids: [1, 5],
    uploader_staff_id: 1,
    created_at: '2026-09-10T10:00:00Z',
    chapters_count: 1
  },
  {
    id: 3,
    title: 'Sirli Sirlar Hukmdori (Lord of Mysteries)',
    slug: 'lord-of-mysteries',
    type: 'novel',
    author_name: 'Cuttlefish That Loves Diving',
    status: 'ongoing',
    view_count: 67100,
    cover_image_url: '/content/covers/lord-of-mysteries.jpg',
    description: 'Bug\' mashinalari, qadimiy cherkovlar, viktoriya uslubidagi tumanli London xiyobonlari va g\'ayritabiiy okkultik maxluqlar uyg\'unlashgan sirli dunyo. Chjou Minrui uyg\'onib, o\'zini Klayn Moretti ismli yigit tanasida, qonga belangan revolver yonida ko\'radi. Qizil oy nuri ostida u Tarot kartalari va "Tentak" (The Fool) taxtiga tomon sirli sayohatini boshlaydi.',
    genres: ['Fantaziya (Fantasy)', 'Drama'],
    genre_ids: [2, 5],
    uploader_staff_id: 1,
    created_at: '2026-09-15T16:00:00Z',
    chapters_count: 1
  }
]

export const initialChapters = [
  {
    id: 101,
    webtoon_id: 1,
    chapter_number: 1.0,
    title: '1-bob: Eng zaif E-darajali ovchi',
    status: 'published',
    reward_coins: 5,
    created_at: '2026-09-15T12:00:00Z',
    images: [
      '/content/manhwa/solo-leveling/ch1/p01.jpg',
      '/content/manhwa/solo-leveling/ch1/p02.jpg',
      '/content/manhwa/solo-leveling/ch1/p03.jpg',
      '/content/manhwa/solo-leveling/ch1/p04.jpg',
      '/content/manhwa/solo-leveling/ch1/p05.jpg',
      '/content/manhwa/solo-leveling/ch1/p06.jpg',
      '/content/manhwa/solo-leveling/ch1/p07.jpg',
      '/content/manhwa/solo-leveling/ch1/p08.jpg',
      '/content/manhwa/solo-leveling/ch1/p09.jpg',
      '/content/manhwa/solo-leveling/ch1/p10.jpg',
      '/content/manhwa/solo-leveling/ch1/p11.jpg',
      '/content/manhwa/solo-leveling/ch1/p12.jpg'
    ]
  },
  {
    id: 102,
    webtoon_id: 2,
    chapter_number: 1.0,
    title: '1-bob: Zerikish (Boredom)',
    status: 'published',
    reward_coins: 5,
    created_at: '2026-09-18T10:00:00Z',
    images: [
      '/content/manga/death-note/ch1/p01.jpg',
      '/content/manga/death-note/ch1/p02.jpg',
      '/content/manga/death-note/ch1/p03.jpg',
      '/content/manga/death-note/ch1/p04.jpg',
      '/content/manga/death-note/ch1/p05.jpg',
      '/content/manga/death-note/ch1/p06.jpg',
      '/content/manga/death-note/ch1/p07.jpg',
      '/content/manga/death-note/ch1/p08.jpg',
      '/content/manga/death-note/ch1/p09.jpg',
      '/content/manga/death-note/ch1/p10.jpg',
      '/content/manga/death-note/ch1/p11.jpg',
      '/content/manga/death-note/ch1/p12.jpg',
      '/content/manga/death-note/ch1/p13.jpg',
      '/content/manga/death-note/ch1/p14.jpg',
      '/content/manga/death-note/ch1/p15.jpg',
      '/content/manga/death-note/ch1/p16.jpg'
    ]
  },
  {
    id: 103,
    webtoon_id: 3,
    chapter_number: 1.0,
    title: '1-bob: Qizil Oy va Uyg\'onish',
    status: 'published',
    reward_coins: 5,
    content_text: `# 1-bob: Qizil Oy va Uyg'onish\n\nBosh suyagi go'yo o'tkir pichoq bilan tilkalangandek qattiq og'rirdi.\n\nQorong'ulik qa'ridan asta-sekin hushiga kelayotgan Chjou Minrui ongining tub-tubida jaranglayotgan g'alati ovozlarni eshitdi. Bu ovozlar shivirlashga, minglab odamlarning bir vaqtning o'zida telbalarcha pichirlashiga o'xshardi:\n\n> *"Tentak... Omad va sir-asrorlar hukmdori... Kulrang tuman ustidagi boqiy imperator..."*\n\nChjou Minrui ko'zlarini ochishga urindi, biroq qovoqlari qo'rg'oshin quygandek og'irlashib ketgan edi. Qon hidi — achchiq, nordon va temir ta'mini eslatuvchi qo'lansa hid butun xonani chulg'ab olgandi.\n\nNihoyat, kuchini to'plab ko'zlarini qiya ochdi.\n\nUning nigohi g'alati, umrida hech ko'rmagan manzaraga tushdi. Bu uning zamonaviy ijarada yashaydigan shinam xonasi emasdi.\n\n---\n\n### I. G'alati Xona va Qon Izlari\n\nXonaning devorlari eskirgan sarg'ish gulqog'ozlar bilan qoplangan, burchakda esa misdan yasalgan ingichka quvurli gaz chirog'i miltillab yonardi. Stol ustida qadimgi uslubdagi patqalam, to'ntarilgan siyohdon va ochilgan qalin charm muqovali daftar yotardi.\n\nLekin eng dahshatlisi — stol chetida yaltirab turgan qora metall buyum edi.\n\n— Bu... revolver?! — Chjou Minrui titrab ketdi.\n\nU qo'lini asta ko'tarib, o'ng chakkasini ushlab ko'rdi. Barmoqlari nimadir quyuq, yopishqoq va iliq suyuqlikka tegdi. Qo'liga qaradi: qon!\n\nUning o'ng chakkasida teshik bor edi. O'q kalla suyagini yorib o'tgan, miya to'qimalariga shikast yetkazgan bo'lishi kerak edi. Ammo nega u hali ham tirik? Nega u nafas olyapti va fikrlay olyapti?!\n\n---\n\n### II. Begona Xotiralar: Klayn Moretti\n\nXotiralar toshqin daryodek uning ongini qamrab oldi:\n\n*Bu shaxsning ismi — Klayn Moretti.*\n*U Loen Qirolligining Aksen okrugi, Tingen shahrida yashovchi 22 yoshli yigit.*\n*U yaqindagina Khoy Universitetining tarix fakultetini tamomlagan edi.*\n*Uning katta akasi Benson kompaniyada mirza bo'lib ishlaydi, kichik singlisi Melissa esa texnik bilim yurtida o'qiydi...*\n\n— Men... boshqa dunyoga tushib qoldimmi? — Chjou Minrui karaxt ahvolda shivirladi.\n\n---\n\n### III. Stol Ustidagi Qora Sir\n\nKlayn chuqur nafas oldi va gavdasini zo'rg'a rostlab o'rnidan turdi. Stol tomon yaqinlashib, qon sachragan daftarga qaradi.\n\nDaftarda Loen tilining qadimiy kalligrafik yozuvida so'nggi jumla qoldirilgan edi:\n\n> **"Hammamiz o'lamiz. Hech kim omon qolmaydi, shu jumladan men ham."**\n\nKlaynning yuragi orqaga tortib ketdi. Stol ustidagi revolver 6 o'qli, po'lat barabanli klassik politsiya quroli edi. Baraban ochilganida, bitta gilza bo'sh ekanligi ko'rindi.\n\nKlayn deraza tomon burildi. Pardani ohista chetga surdi.\n\nTashqarida tumanli, bug' motorlari shovqini ostidagi shahar osmonida dahshatli va aqlbovar qilmas manzara namoyon bo'ldi:\n\nOsmon markazida ulkan, qon kabi qip-qizil to'lin oy porlab turardi!\n\n---\n\n### IV. Ko'zgudagi Mo''jiza\n\nXona burchagidagi singan ko'zgu oldiga borib, o'z aksiga boqdi.\n\nKo'zgudan qora sochli, chuqur jigarrang ko'zli, ozg'in, ammo ma'noli yuz tuzilishiga ega ziyoli yigit boqib turardi. Uning o'ng chakkasidagi daxshatli o'q yarasi qonab turgan bo'lsa-da, qizil oy nuri ostida yara qirralari o'z-o'zidan birikayotgan, go'yo ko'rinmas iplar bilan tikilayotgandek edi.\n\nBesh daqiqa ichida ochiq yara qotib, faqatgina qoraygan chandiqqa aylandi.\n\nKlayn Moretti tirik qolgan edi. Uning yangi hayoti, sir-sinoatlar, qadimiy xudolar, Beyonderlar va Tarot Kengashi tomon ilk qadami aynan shu qonli tunning qizil yog'dusida boshlandi...`,
    created_at: '2026-09-28T10:00:00Z',
    images: []
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

export const initialEconomySettings = {
  chapter_read_reward: 5,        // Bob o'qiganda beriladigan chaqmoq
  daily_checkin_reward: 15,      // Kunlik kirish bonusi (00:00 da yangilanadi)
  welcome_bonus: 50,             // Yangi ro'yxatdan o'tgan o'quvchiga beriladigan chaqmoq
  creator_chapter_reward: 25,    // Creator yangi bob yuklaganda beriladigan rag'bat
  comment_reward: 2,             // Sharh qoldirgan o'quvchiga
  daily_max_limit: 100,          // Bir kunda o'quvchi to'plashi mumkin bo'lgan maksimal limit (0 bo'lsa cheksiz)
  reset_timezone: 'Asia/Tashkent',
  reset_time: '00:00',
  anti_farming_cooldown_min: 3   // Boblar orasidagi minimal kutish vaqti (daqiqa)
}

export const initialRewardTransactions = [
  {
    id: 1,
    user_id: 1,
    username: 'otaku_king',
    type: 'chapter_reward',
    title: 'Solo Leveling (1-bob o\'qildi)',
    amount: 5,
    created_at: '2026-09-27T17:40:00Z'
  },
  {
    id: 2,
    user_id: 2,
    username: 'sakura_uz',
    type: 'daily_checkin',
    title: 'Kunlik Kirish Bonusi (Streak #5)',
    amount: 15,
    created_at: '2026-09-27T12:15:00Z'
  },
  {
    id: 3,
    user_id: 3,
    username: 'manhwa_fanat',
    type: 'welcome_bonus',
    title: 'Yangi Foydalanuvchi Bonusi',
    amount: 50,
    created_at: '2026-09-27T09:00:00Z'
  },
  {
    id: 4,
    user_id: 1,
    username: 'otaku_king',
    type: 'comment_reward',
    title: 'Bobga sharh qoldirgani uchun',
    amount: 2,
    created_at: '2026-09-27T17:42:00Z'
  },
  {
    id: 5,
    user_id: 2,
    username: 'creator_ali',
    type: 'creator_reward',
    title: 'Yangi bob muvaffaqiyatli chop etildi',
    amount: 25,
    created_at: '2026-09-27T14:30:00Z'
  }
]

