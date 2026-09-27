# 🔐 Modul Hujjati: `auth` (Sayt Foydalanuvchilari Autentifikatsiyasi)

Ushbu modul oddiy sayt o‘quvchilarini ro‘yxatdan o‘tkazish, email orqali tizimga kirish, SMTP orqali xat jo‘natish va faol sessiyalarni boshqarish uchun javobgardir.

---

## 1. POST `/api/v1/auth/register`
Yangi o‘quvchini ro‘yxatdan o‘tkazish. Muvaffaqiyatli ro‘yxatdan o‘tganda avtomatik ravishda **+50 ⚡ Chaqmoq** balansi beriladi va SMTP orqali tabrik xati yuboriladi.

### So‘rov Tanasi (Request Body):
```json
{
  "email": "user@example.com",
  "username": "reader01",
  "password": "Password123"
}
```
* **Validatsiya qoidalari**:
  * `email`: Haqiqiy email formati, maksimal 255 belgi.
  * `username`: 3-50 belgi, bo‘sh joylarsiz, faqat lotin harflari va raqamlar.
  * `password`: Kamida 8 ta belgi.

### Javob (Response 201 Created):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "username": "reader01",
      "lightning_coins": 50,
      "created_at": "2026-09-27T17:40:00Z"
    }
  },
  "message": "Ro'yxatdan muvaffaqiyatli o'tdingiz. Hisobingizga 50 Chaqmoq qo'shildi!"
}
```

---

## 2. POST `/api/v1/auth/login`
Email va parol orqali tizimga kirish. Tizim avtomatik ravishda kirilgan IP manzil va User-Agent bo‘yicha `user_sessions` jadvalida yangi seans ochadi.

### So‘rov Tanasi:
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

### Javob (Response 200 OK):
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "d8e3b1...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "username": "reader01",
      "lightning_coins": 50
    }
  },
  "message": "Tizimga xush kelibsiz"
}
```

---

## 3. GET `/api/v1/auth/me`
Joriy kirgan foydalanuvchining shaxsiy ma'lumotlari, chaqmoq balansi va faol bezaklari (ramka/fon).
* **Auth**: `Bearer <access_token>`

### Javob (Response 200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "username": "reader01",
    "lightning_coins": 65,
    "active_frame": {
      "id": 2,
      "name": "Chaqmoq Hoshiyasi",
      "asset_url": "http://localhost:9000/shop-assets/frames/lightning.png"
    },
    "active_background": null,
    "created_at": "2026-09-27T17:40:00Z"
  }
}
```

---

## 4. GET `/api/v1/auth/sessions`
Foydalanuvchining barcha faol qurilmalari / seanslari ro‘yxati.
* **Auth**: `Bearer <access_token>`

### Javob (Response 200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "e81d4a04-9842-4919-b68e-9c5950d83637",
      "ip_address": "178.218.201.5",
      "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
      "device_type": "Desktop",
      "is_current": true,
      "last_active_at": "2026-09-27T17:50:00Z",
      "created_at": "2026-09-27T12:00:00Z"
    },
    {
      "id": "c19e5b12-1144-4820-a67f-8d4840d71234",
      "ip_address": "178.218.201.5",
      "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)...",
      "device_type": "Mobile",
      "is_current": false,
      "last_active_at": "2026-09-26T19:30:00Z",
      "created_at": "2026-09-26T19:30:00Z"
    }
  ]
}
```

---

## 5. DELETE `/api/v1/auth/sessions/{id}`
Boshqa biror qurilmadagi seansni masofadan to‘xtatish.
* **Auth**: `Bearer <access_token>`

### Javob (Response 200 OK):
```json
{
  "success": true,
  "data": null,
  "message": "Seans muvaffaqiyatli yakunlandi"
}
```

---

## 6. DELETE `/api/v1/auth/sessions/other`
Joriy qurilmadan tashqari barcha boshqa qurilmalardan bir vaqtda chiqish.
* **Auth**: `Bearer <access_token>`

### Javob (Response 200 OK):
```json
{
  "success": true,
  "data": null,
  "message": "Boshqa barcha qurilmalardagi seanslar bekor qilindi"
}
```
