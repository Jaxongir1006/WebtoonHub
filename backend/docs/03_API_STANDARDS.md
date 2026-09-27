# 🌐 WebtoonHub — API Standartlari va Konvensiyalari

## 1. Asosiy URL Manzillari
Barcha API so‘rovlari prefiks bilan boshlanadi:
* **Sayt Foydalanuvchilari (Client API):** `/api/v1/...`
* **Admin va Studio Paneli (Staff API):** `/api/v1/staff/...`

---

## 2. Autentifikatsiya Sarlavhalari (Auth Headers)
Tizimga kirgandan so‘ng olingan JWT token har bir himoyalangan so‘rovning HTTP sarlavhasida (header) yuboriladi:
```http
Authorization: Bearer <access_token>
```
* Foydalanuvchi seanslarini to‘g‘ri aniqlash uchun ixtiyoriy `X-Device-Type` (`desktop` | `mobile` | `tablet`) yuborilishi tavsiya etiladi.

---

## 3. Standart Javob Formatlari (Response Formats)

### 3.1 Muvaffaqiyatli Javob (Success Response)
```json
{
  "success": true,
  "data": { ... },
  "message": "Amaliyot muvaffaqiyatli bajarildi"
}
```

### 3.2 Sahifalangan Javob (Paginated Response)
```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "total": 120,
    "page": 1,
    "limit": 20,
    "pages": 6
  },
  "message": null
}
```

### 3.3 Xatolik Javobi (Error Response)
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Xarid uchun chaqmoqlar balansingiz yetarli emas",
    "details": null
  }
}
```

---

## 4. Standart HTTP Status Kodlari
* `200 OK` — So‘rov muvaffaqiyatli bajarildi.
* `201 Created` — Yangi resurs yaratildi.
* `400 Bad Request` — So‘rov parametrlari noto‘g‘ri yoki biznes qoida buzildi (masalan, yetarli chaqmoq yo‘q).
* `401 Unauthorized` — Token berilmagan, muddati o‘tgan yoki sessiya bekor qilingan.
* `403 Forbidden` — Ruxsat yetarli emas (masalan, Viewer o‘chira olmaydi).
* `404 Not Found` — Resurs topilmadi.
* `409 Conflict` — Ma'lumot ziddiyati (masalan, email yoki username allaqachon band).
* `422 Unprocessable Entity` — Pydantic validatsiya xatosi (maydon talablari buzilgan).
* `500 Internal Server Error` — Server ichki xatoligi.
