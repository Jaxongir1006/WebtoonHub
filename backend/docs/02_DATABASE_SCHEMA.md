# 🗄 WebtoonHub — Ma'lumotlar Bazasi Sxemasi (Database Schema)

Ushbu hujjat PostgreSQL uchun mo‘ljallangan barcha relying jadvallar, ularning maydonlari, tiplari va cheklovlarini (constraints) belgilaydi.

---

## 1. Foydalanuvchilar va Seanslar (Users & Sessions)

### 1.1 `users` — Oddiy O‘quvchilar
| Maydon | Tipi | Cheklovlar | Tavsif |
| :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` | PRIMARY KEY | Foydalanuvchi ID |
| `username` | `VARCHAR(50)` | UNIQUE, NOT NULL, INDEX | Taxallus (faqat lotin harflari va raqamlar) |
| `email` | `VARCHAR(255)` | UNIQUE, NOT NULL, INDEX | Asosiy login pochtasi |
| `hashed_password`| `VARCHAR(255)` | NOT NULL | Bcrypt bilan shifrlangan parol |
| `lightning_coins` | `INTEGER` | NOT NULL, DEFAULT 50 | Boshlang'ich 50 Chaqmoq balansi |
| `last_daily_login`| `TIMESTAMPTZ` | NULLABLE | Oxirgi marta kunlik bonus olingan vaqt |
| `is_active` | `BOOLEAN` | NOT NULL, DEFAULT TRUE | Profil faolligi (bloklanganmi) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Ro'yxatdan o'tgan sana |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Yangilangan sana |

### 1.2 `user_sessions` — O‘quvchi Seanslari
| Maydon | Tipi | Cheklovlar | Tavsif |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY | Seans takrorlanmas UUID identifikatori |
| `user_id` | `BIGINT` | FK -> `users.id` ON DELETE CASCADE | Qaysi foydalanuvchiga tegishli |
| `refresh_token_hash`| `VARCHAR(255)`| NOT NULL, INDEX | Refresh token heshi |
| `ip_address` | `VARCHAR(45)` | NULLABLE | Foydalanuvchi IP manzili (IPv4/IPv6) |
| `user_agent` | `TEXT` | NULLABLE | Brauzer va tizim matni |
| `device_type` | `VARCHAR(30)` | NULLABLE | Desktop, Mobile, Tablet |
| `is_active` | `BOOLEAN` | NOT NULL, DEFAULT TRUE | Seans faolmi yoki bekor qilinganmi |
| `last_active_at`| `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Oxirgi so'rov yuborilgan vaqt |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Tizimga kirilgan sana |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | Tokenning tugash muddati |

---

## 2. Boshqaruv Xodimlari va RBAC (Staff & Role-Based Access Control)

### 2.1 `roles` — Admin Panel Rollari
| Maydon | Tipi | Cheklovlar | Tavsif |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | PRIMARY KEY | Rol ID |
| `name` | `VARCHAR(50)` | UNIQUE, NOT NULL | Rol nomi (`superadmin`, `admin`, `creator`, `viewer`) |
| `description` | `VARCHAR(255)` | NULLABLE | Rol tavsifi |

### 2.2 `permissions` — Tizim Ruxsatlari
| Maydon | Tipi | Cheklovlar | Tavsif |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | PRIMARY KEY | Ruxsat ID |
| `code` | `VARCHAR(100)`| UNIQUE, NOT NULL, INDEX | Masalan: `webtoons:create`, `chapters:approve` |
| `description` | `VARCHAR(255)` | NULLABLE | Ruxsat tavsifi |

### 2.3 `role_permissions` — Rol va Ruxsatlar Bog‘liqligi
| Maydon | Tipi | Cheklovlar | Tavsif |
| :--- | :--- | :--- | :--- |
| `role_id` | `INTEGER` | FK -> `roles.id` ON DELETE CASCADE | Rol |
| `permission_id`| `INTEGER` | FK -> `permissions.id` ON DELETE CASCADE | Ruxsat |
| *Composite PK* | (`role_id`, `permission_id`) | PRIMARY KEY | |

### 2.4 `staff_users` — Admin Panel Xodimlari
| Maydon | Tipi | Cheklovlar | Tavsif |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | PRIMARY KEY | Xodim ID |
| `username` | `VARCHAR(50)` | UNIQUE, NOT NULL, INDEX | Xodim taxallusi |
| `email` | `VARCHAR(255)` | UNIQUE, NOT NULL, INDEX | Xodim pochtasi |
| `hashed_password`| `VARCHAR(255)` | NOT NULL | Parol heshi |
| `role_id` | `INTEGER` | FK -> `roles.id` ON DELETE RESTRICT | Biriktirilgan rol |
| `is_active` | `BOOLEAN` | NOT NULL, DEFAULT TRUE | Xodim faollik holati |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Yaratilgan sana |

### 2.5 `staff_sessions` — Xodim Seanslari
* Tuzilishi `user_sessions` bilan bir xil, lekin `staff_id` orqali `staff_users.id` ga bog‘lanadi.

---

## 3. Creator So‘rovlari (Creator Requests)

### 3.1 `creator_requests`
| Maydon | Tipi | Cheklovlar | Tavsif |
| :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` | PRIMARY KEY | So'rov ID |
| `user_id` | `BIGINT` | FK -> `users.id` ON DELETE CASCADE | Ariza beruvchi foydalanuvchi |
| `message` | `TEXT` | NOT NULL | Ariza sababi va portfolio ma'lumotlari |
| `status` | `VARCHAR(20)` | NOT NULL, DEFAULT 'pending' | `pending`, `approved`, `rejected` |
| `reviewed_by` | `INTEGER` | NULLABLE, FK -> `staff_users.id` | Kim tekshirdi |
| `reviewed_at` | `TIMESTAMPTZ` | NULLABLE | Tekshirilgan sana |
| `admin_feedback` | `TEXT` | NULLABLE | Admin/Moderatorning arizaga izohi yoki rad etish sababi |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Ariza topshirilgan sana |

---

## 4. Manhvalar va Kontent (Webtoons & Chapters)

### 4.1 `genres` — Janrlar
| Maydon | Tipi | Cheklovlar | Tavsif |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | PRIMARY KEY | Janr ID |
| `name` | `VARCHAR(50)` | UNIQUE, NOT NULL | Janr nomi (Jangari, Romantika, Fantaziya) |
| `slug` | `VARCHAR(60)` | UNIQUE, NOT NULL, INDEX | URL uchun sluggable nom |

### 4.2 `webtoons` — Manhvalar
| Maydon | Tipi | Cheklovlar | Tavsif |
| :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` | PRIMARY KEY | Manhwa ID |
| `title` | `VARCHAR(255)`| NOT NULL, INDEX | Manhwa nomi |
| `slug` | `VARCHAR(280)`| UNIQUE, NOT NULL, INDEX | URL uchun slug |
| `description` | `TEXT` | NULLABLE | Tavsif / mazmuni |
| `type` | `VARCHAR(20)` | NOT NULL, DEFAULT 'manhwa', INDEX | Kontent turi: `manhwa` (vertikal webtoon), `manga` (gorizontal komiks), `novel` (ranobe / matnli kitob) |
| `cover_image_url`| `VARCHAR(500)`| NOT NULL | MinIO dagi muqova rasmi manzili |
| `author_name` | `VARCHAR(100)`| NULLABLE | Asl muallif nomi |
| `uploader_staff_id`| `INTEGER` | FK -> `staff_users.id` | Joylagan Creator / Admin |
| `status` | `VARCHAR(20)` | NOT NULL, DEFAULT 'ongoing'| `ongoing`, `completed` |
| `view_count` | `BIGINT` | NOT NULL, DEFAULT 0 | Ko'rishlar soni |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Yaratilgan sana |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Yangilangan sana |

### 4.3 `webtoon_genres` — Manhwa va Janrlar Bog‘liqligi (N:M)
| Maydon | Tipi | Cheklovlar | Tavsif |
| :--- | :--- | :--- | :--- |
| `webtoon_id` | `BIGINT` | FK -> `webtoons.id` ON DELETE CASCADE | Manhwa |
| `genre_id` | `INTEGER` | FK -> `genres.id` ON DELETE CASCADE | Janr |
| *Composite PK* | (`webtoon_id`, `genre_id`) | PRIMARY KEY | |

### 4.4 `chapters` — Boblar
| Maydon | Tipi | Cheklovlar | Tavsif |
| :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` | PRIMARY KEY | Bob ID |
| `webtoon_id` | `BIGINT` | FK -> `webtoons.id` ON DELETE CASCADE | Qaysi manhvaga tegishli |
| `chapter_number`| `NUMERIC(6,1)`| NOT NULL, INDEX | Bob raqami (masalan 1, 2, 2.5) |
| `title` | `VARCHAR(255)`| NULLABLE | Bob sarlavhasi |
| `status` | `VARCHAR(20)` | NOT NULL, DEFAULT 'pending' | `pending` (moderatsiya), `published`, `rejected` |
| `content_text` | `TEXT` | NULLABLE | Novel boblari uchun boy matn / Markdown kontenti |
| `reward_coins` | `INTEGER` | NOT NULL, DEFAULT 5 | Bobni o'qiganda beriladigan chaqmoq |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Yuklangan sana |

### 4.5 `chapter_images` — Bob Rasmlari
| Maydon | Tipi | Cheklovlar | Tavsif |
| :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` | PRIMARY KEY | Rasm ID |
| `chapter_id` | `BIGINT` | FK -> `chapters.id` ON DELETE CASCADE | Tegishli bob |
| `image_url` | `VARCHAR(500)`| NOT NULL | MinIO dagi rasm manzili |
| `order_index` | `INTEGER` | NOT NULL, INDEX | Ketma-ketlik tartibi (1, 2, 3...) |

---

## 5. Gamifikatsiya va Mukofotlar (Rewards & Lightning)

### 5.1 `read_rewards` — O‘qish Mukofotlari Qaydnomasi
| Maydon | Tipi | Cheklovlar | Tavsif |
| :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` | PRIMARY KEY | Yozuv ID |
| `user_id` | `BIGINT` | FK -> `users.id` ON DELETE CASCADE | O'quvchi |
| `chapter_id` | `BIGINT` | FK -> `chapters.id` ON DELETE CASCADE | O'qilgan bob |
| `coins_earned` | `INTEGER` | NOT NULL, DEFAULT 5 | Berilgan chaqmoq miqdori |
| `claimed_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Olingan vaqt |
| *Unique Constraint* | (`user_id`, `chapter_id`) | UNIQUE | Bitta bobdan faqat 1 marta mukofot olish cheklovi |

### 5.2 `coin_transactions` — Chaqmoqlar Audit va Tranzaksiya Tarixi
| Maydon | Tipi | Cheklovlar | Tavsif |
| :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` | PRIMARY KEY | Tranzaksiya ID |
| `user_id` | `BIGINT` | FK -> `users.id` ON DELETE CASCADE, INDEX | O'quvchi ID |
| `amount` | `INTEGER` | NOT NULL | Miqdor (musbat: kirim, manfiy: chiqim) |
| `transaction_type` | `VARCHAR(50)` | NOT NULL, INDEX | `register_bonus`, `daily_checkin`, `chapter_read`, `shop_purchase`, `admin_adjustment`, `admin_gift` |
| `description` | `TEXT` | NULLABLE | Tranzaksiya sababi / tafsiloti |
| `created_by_staff_id`| `INTEGER` | NULLABLE, FK -> `staff_users.id` | Agar admin bajargan bo'lsa, xodim ID |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW(), INDEX | Tranzaksiya vaqti |

---

## 6. Do‘kon va Inventar (Shop & Inventory)

### 6.1 `shop_items` — Do‘kondagi Buyumlar
| Maydon | Tipi | Cheklovlar | Tavsif |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | PRIMARY KEY | Buyum ID |
| `name` | `VARCHAR(100)`| NOT NULL | Buyum nomi (masalan: "Oltin Chaqmoq Ramkasi") |
| `item_type` | `VARCHAR(20)` | NOT NULL, INDEX | `frame`, `background`, yoki `card` |
| `price_coins` | `INTEGER` | NOT NULL; card uchun 0 | Frame/background Chaqmoq narxi; card faqat gacha orqali olinadi |
| `asset_url` | `VARCHAR(500)`| NOT NULL | MinIO dagi rasm / aktiv manzili |
| `is_available` | `BOOLEAN` | NOT NULL, DEFAULT TRUE | Sotuvda bormi |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Qo'shilgan sana |

### 6.2 `user_inventory` — Olingan Buyumlar va Faolligi
| Maydon | Tipi | Cheklovlar | Tavsif |
| :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` | PRIMARY KEY | Inventar ID |
| `user_id` | `BIGINT` | FK -> `users.id` ON DELETE CASCADE | Egasi |
| `item_id` | `INTEGER` | FK -> `shop_items.id` ON DELETE CASCADE| Qaysi buyum |
| `is_active` | `BOOLEAN` | NOT NULL, DEFAULT FALSE | Profilga taqilganmi |
| `purchased_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Xarid qilingan sana |
| *Unique Constraint* | (`user_id`, `item_id`) | UNIQUE | Bitta buyumni faqat 1 marta sotib olish mumkin |

### 6.3 Character Card Gacha

Migration `b840f216da73` adds three backend-only tables. Existing card metadata and
the inventory-backed profile showcase remain on `shop_items` and
`user_featured_cards`. PostgreSQL enables RLS on all new tables and revokes access
from Supabase browser roles; reader requests use the existing backend auth.

| Table | Fields and invariants |
| :--- | :--- |
| `gacha_pools` | ID, title, description, positive `cost_coins`, active flag, positive configuration version, four `rarity_weights` in JSON, creation/update timestamps |
| `gacha_pool_cards` | ID, pool FK, card item FK, positive per-card weight; unique `(pool_id,item_id)` |
| `gacha_rolls` | ID, reader FK, pool FK, card item FK, pool title/version snapshot, card metadata/artwork snapshot, positive cost, duplicate flag, refund amount bounded by cost, timestamp |

History prevents deleting referenced cards or pools; archive pools instead. A new
card draw adds one inventory row; a duplicate refunds its full cost while keeping
the unique inventory row. The draw, wallet ledger, ownership and operation receipt
commit together. See [the complete configuration and API design](05_CHARACTER_CARD_GACHA.md).

---

## 7. Kutubxona va Sharhlar (Bookmarks & Comments)

### 7.1 `bookmarks` — Foydalanuvchi Kutubxonasi
| Maydon | Tipi | Cheklovlar | Tavsif |
| :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` | PRIMARY KEY | Xatcho'p ID |
| `user_id` | `BIGINT` | FK -> `users.id` ON DELETE CASCADE | O'quvchi |
| `webtoon_id` | `BIGINT` | FK -> `webtoons.id` ON DELETE CASCADE | Manhwa |
| `status` | `VARCHAR(20)` | NOT NULL, DEFAULT 'reading' | `reading`, `plan_to_read`, `completed`, `dropped` |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Status yangilangan sana |
| *Unique Constraint* | (`user_id`, `webtoon_id`)| UNIQUE | Har bir manhwa uchun yagona status |

### 7.2 `comments` — Sharhlar va Ierarxik Javoblar (Replies)
| Maydon | Tipi | Cheklovlar | Tavsif |
| :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` | PRIMARY KEY | Sharh ID |
| `chapter_id` | `BIGINT` | FK -> `chapters.id` ON DELETE CASCADE | Tegishli bob |
| `user_id` | `BIGINT` | FK -> `users.id` ON DELETE CASCADE | Yozgan o'quvchi |
| `parent_id` | `BIGINT` | NULLABLE, FK -> `comments.id` ON DELETE CASCADE | Asosiy sharh ID (agar javob bo'lsa) |
| `content` | `TEXT` | NOT NULL | Sharh matni (1-500 belgi) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Yozilgan sana |

---

## 8. Tizim Sozlamalari (System Settings)

### 8.1 `system_settings` — Dinamik Platforma Parametrlari
| Maydon | Tipi | Cheklovlar | Tavsif |
| :--- | :--- | :--- | :--- |
| `key` | `VARCHAR(50)` | PRIMARY KEY | Sozlama kaliti (`register_bonus_coins`, `daily_checkin_coins`, `chapter_read_coins`, `maintenance_mode`) |
| `value` | `VARCHAR(255)` | NOT NULL | Sozlama qiymati |
| `description` | `VARCHAR(255)` | NULLABLE | Sozlama tavsifi |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Oxirgi o'zgartirilgan sana |
