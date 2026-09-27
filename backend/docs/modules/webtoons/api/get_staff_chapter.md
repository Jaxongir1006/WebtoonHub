# 📄 API: Bob Tafsilotlari va Rasmlarini Olish (Staff / Admin)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/staff/chapters/{id}`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `chapters:approve` yoki `chapters:create`
* **Tavsif:** Boshqaruv panelida moderator bob rasmlarini tekshirishi yoki tahrirlashi uchun bob tafsilotlarini rasmlari bilan olish.

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: integer (Bob ID si)

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "id": 15,
    "webtoon_id": 1,
    "webtoon_title": "Yakkaxon daraja ko'tarish",
    "chapter_number": 2.0,
    "title": "2-bob: Ikki karra uyg'onish",
    "status": "pending",
    "reward_coins": 5,
    "images": [
      {
        "id": 101,
        "image_url": "http://localhost:9000/chapter-images/ch15_01.webp",
        "order_index": 1
      }
    ],
    "created_at": "2026-09-27T12:00:00Z"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Bob topilmadi"
  }
}
```
