# 📄 API: Kutubxona Holatini Saqlash (Update Bookmark)

## Umumiy Ma'lumot
* **Metod:** `POST`
* **Yo'l:** `/api/v1/users/library/{webtoon_id}`
* **Avtorizatsiya:** Majburiy (`Bearer <access_token>`)
* **Tavsif:** Manhvani foydalanuvchining shaxsiy kutubxonasiga qo‘shadi yoki uning mavjud o‘qish statusini yangilaydi (Upsert).

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `webtoon_id`: integer (Manhwa ID si)

### Sarlavhalar (Headers):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### So'rov Tanasi (Request Body):
```json
{
  "status": "reading"
}
```
* Ruxsat etilgan qiymatlar: `reading`, `plan_to_read`, `completed`, `dropped`

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "webtoon_id": 1,
    "status": "reading"
  },
  "message": "Manhwa kutubxonangizga 'O'qiyapman' holatida saqlandi"
}
```

### 422 Unprocessable Entity (Noto'g'ri status)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS",
    "message": "Status faqat reading, plan_to_read, completed yoki dropped bo'lishi mumkin",
    "details": null
  }
}
```
