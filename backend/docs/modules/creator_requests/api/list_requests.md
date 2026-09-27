# 📄 API: Barcha Creatorlik Arizalari Ro'yxati (List Creator Requests)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/staff/creator-requests`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `users:manage`
* **Tavsif:** Barcha kelib tushgan Creatorlik arizalarini holati (`status`) bo‘yicha filtrlash imkoni bilan Admin uchun chiqaradi.

---

## So'rov Parametrlari (Request)

### Query Parametrlari:
* `status`: string (ixtiyoriy: `pending` | `approved` | `rejected`)

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
      "id": 1,
      "user": {
        "id": 5,
        "username": "tarjimon_ali",
        "email": "ali@gmail.com"
      },
      "message": "Assalomu alaykum! Men 'Solo Leveling' va 'Tower of God' manhvalarini o'zbek tiliga tarjima qilib joylamoqchiman...",
      "status": "pending",
      "created_at": "2026-09-27T17:55:00Z"
    }
  ]
}
```
