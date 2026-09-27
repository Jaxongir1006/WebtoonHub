# 📄 API: Joriy Foydalanuvchi Profili (Me)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/auth/me`
* **Avtorizatsiya:** Majburiy (`Bearer <access_token>`)
* **Tavsif:** Tizimga kirgan foydalanuvchining shaxsiy ma'lumotlari, chaqmoq balansi va profiliga taqilgan faol avatar ramkasi hamda fonini qaytaradi.

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
  "data": {
    "id": 1,
    "email": "user@example.com",
    "username": "reader01",
    "lightning_coins": 85,
    "active_frame": {
      "id": 4,
      "name": "Olovli Ajdar Ramkasi",
      "asset_url": "http://localhost:9000/shop-assets/frames/dragon_fire.png"
    },
    "active_background": {
      "id": 8,
      "name": "Qorong'u Kecha Foni",
      "asset_url": "http://localhost:9000/shop-assets/backgrounds/dark_night.webp"
    },
    "created_at": "2026-09-27T17:40:00Z"
  }
}
```

### 401 Unauthorized (Token berilmagan yoki noto'g'ri)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Autentifikatsiyadan o'tilmagan",
    "details": null
  }
}
```
