# 📄 API: Bob Rasmlarini Yuklash (Upload Chapter)

## Umumiy Ma'lumot
* **Metod:** `POST`
* **Yo'l:** `/api/v1/staff/chapters`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `chapters:create`
* **Tavsif:** Creator tomonidan yangi bob ochilib, 20–50 tagacha vertikal rasm to‘plami MinIO `chapter-images` savatiga tartiblangan holda yuklanadi. Bob avtomatik ravishda `status = 'pending'` bo‘ladi.

---

## So'rov Parametrlari (Request)

### Sarlavhalar (Headers):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: multipart/form-data
```

### Form Ma'lumotlari:
| Maydon | Tipi | Qoidalar | Tavsif |
| :--- | :--- | :--- | :--- |
| `webtoon_id` | `integer` | Majburiy | Qaysi manhvaga tegishli |
| `chapter_number` | `float` | Majburiy (masalan `1.0`, `2.5`) | Bob raqami |
| `title` | `string` | Ixtiyoriy | Bob sarlavhasi |
| `images` | `file[]` | Majburiy (kamida 1 ta fayl) | Rasmlar to‘plami |

---

## Javoblar (Responses)

### 201 Created (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "id": 105,
    "webtoon_id": 1,
    "chapter_number": 2.0,
    "title": "2-bob: Yangi kuchning uyg'onishi",
    "status": "pending",
    "images_count": 32,
    "reward_coins": 5
  },
  "message": "Bob rasmlari muvaffaqiyatli yuklandi va moderatorlar tekshiruviga yuborildi"
}
```

### 409 Conflict (Bu raqamli bob allaqachon mavjud)
```json
{
  "success": false,
  "error": {
    "code": "CHAPTER_ALREADY_EXISTS",
    "message": "Ushbu manhvada 2.0 raqamli bob allaqachon mavjud",
    "details": null
  }
}
```
