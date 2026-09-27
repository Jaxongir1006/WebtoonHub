# API: Chaqmoq Iqtisodiyoti va Mukofot Sozlamalari (Economy Settings)

Ushbu endpointlar orqali adminlar o'quvchilar va creatorlarga beriladigan barcha turdagi ⚡ Chaqmoq mukofotlari miqdorini, sutkalik limitlarni va yangilanish vaqtini boshqaradilar.

---

### 1. Sozlamalarni Olish
* **Method:** `GET`
* **URL:** `/api/v1/staff/economy/settings`
* **Talab qilinadigan ruxsat:** `users:manage`

#### Muvaffaqiyatli Javob (`200 OK`):
```json
{
  "success": true,
  "data": {
    "chapter_read_reward": 5,
    "daily_checkin_reward": 15,
    "welcome_bonus": 50,
    "creator_chapter_reward": 25,
    "comment_reward": 2,
    "daily_max_limit": 100,
    "reset_timezone": "Asia/Tashkent",
    "reset_time": "00:00",
    "anti_farming_cooldown_min": 3
  }
}
```

---

### 2. Sozlamalarni Yangilash / Tahrirlash
* **Method:** `PATCH`
* **URL:** `/api/v1/staff/economy/settings`
* **Talab qilinadigan ruxsat:** `users:manage`

#### So'rov Tanasi (JSON):
```json
{
  "chapter_read_reward": 10,
  "daily_checkin_reward": 20,
  "welcome_bonus": 50,
  "creator_chapter_reward": 30,
  "comment_reward": 2,
  "daily_max_limit": 150
}
```

#### Muvaffaqiyatli Javob (`200 OK`):
```json
{
  "success": true,
  "data": {
    "chapter_read_reward": 10,
    "daily_checkin_reward": 20,
    "welcome_bonus": 50,
    "creator_chapter_reward": 30,
    "comment_reward": 2,
    "daily_max_limit": 150,
    "reset_timezone": "Asia/Tashkent",
    "reset_time": "00:00",
    "anti_farming_cooldown_min": 3
  },
  "message": "Chaqmoq berilishi va iqtisodiyot sozlamalari muvaffaqiyatli saqlandi"
}
```
