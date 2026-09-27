# 📄 API: Moderatsiya Uchun Barcha Sharhlar Ro'yxati (List All Comments)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/staff/comments`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `comments:moderate`
* **Tavsif:** Admin yoki Moderatorlar uchun tizimdagi eng so'nggi sharhlar ro'yxatini bob va muallif ma'lumotlari bilan birga qaytaradi.

---

## So'rov Parametrlari (Request)

### Query Parametrlari:
* `page`: integer (default: 1)
* `limit`: integer (default: 20)

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
  "data": {
    "items": [
      {
        "id": 1,
        "chapter_id": 10,
        "chapter_title": "1-bob: Boshlanish",
        "webtoon_title": "Yakkaxon Ko'tarilish",
        "user": {
          "id": 5,
          "username": "otaku_uz"
        },
        "content": "Juda qiziq joyida tugadi!",
        "created_at": "2026-09-27T17:00:00Z"
      }
    ],
    "total": 120,
    "page": 1,
    "limit": 20
  }
}
```
