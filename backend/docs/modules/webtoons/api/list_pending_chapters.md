# 📄 API: Kutilayotgan Boblar Ro'yxati (List Pending Chapters)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/staff/chapters/pending`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `chapters:approve`
* **Tavsif:** Moderatorlar tekshiruvi uchun navbatda turgan (`status = 'pending'`) barcha boblar ro'yxatini qaytaradi.

---

## So'rov Parametrlari (Request)

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
      "webtoon_id": 1,
      "webtoon_title": "Yakkaxon Ko'tarilish",
      "chapter_number": 2.0,
      "title": "2-bob: Yangi kuchning uyg'onishi",
      "status": "pending",
      "images_count": 32,
      "created_at": "2026-09-27T16:00:00Z"
    }
  ]
}
```
