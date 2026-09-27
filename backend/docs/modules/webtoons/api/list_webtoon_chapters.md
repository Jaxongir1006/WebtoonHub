# 📄 API: Manhvaning Barcha Boblarini Olish (List All Webtoon Chapters - Staff)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/staff/webtoons/{id}/chapters`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `chapters:create` yoki `chapters:approve`
* **Tavsif:** Muayyan manhvaning barcha boblari (shu jumladan `pending` va `rejected` holatidagilari ham) ro'yxatini qaytaradi.

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: integer (Manhwa ID si)

### Sarlavhalar (Headers):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": [
    {
      "id": 105,
      "chapter_number": 2.0,
      "title": "2-bob: Yangi kuchning uyg'onishi",
      "status": "pending",
      "reward_coins": 5,
      "images_count": 32,
      "created_at": "2026-09-27T16:00:00Z"
    }
  ]
}
```
