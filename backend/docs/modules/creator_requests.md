# ✍️ Modul Hujjati: `creator_requests` (Creatorlik So‘rovlari va Moderatsiya)

Ushbu modul oddiy o‘quvchilarning komiks yuklovchi (Creator / Tarjimon) bo‘lish arizalarini yuborishi va Admin tomonidan ularni ko‘rib chiqib tasdiqlashi uchun xizmat qiladi.

---

## 1. POST `/api/v1/creator-requests` (O‘quvchi)
Creator (tarjimon) bo‘lish uchun ariza topshirish.
* **Auth**: `Bearer <access_token>`

### So‘rov Tanasi:
```json
{
  "message": "Assalomu alaykum! Men 'Solo Leveling' va 'Tower of God' manhvalarini o'zbek tiliga tarjima qilib joylamoqchiman. Ilgari Telegram kanallarda 2 yil tajribam bor."
}
```

### Javob (Response 201 Created):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "pending",
    "created_at": "2026-09-27T17:55:00Z"
  },
  "message": "Arizangiz qabul qilindi va moderatorlar tekshiruviga yuborildi!"
}
```

---

## 2. GET `/api/v1/creator-requests/my` (O‘quvchi)
O‘zining yuborgan arizasi holatini tekshirish.

### Javob (Response 200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "message": "Assalomu alaykum! Men 'Solo Leveling'...",
    "status": "pending",
    "created_at": "2026-09-27T17:55:00Z",
    "reviewed_at": null
  }
}
```

---

## 3. GET `/api/v1/staff/creator-requests` (Admin)
Barcha kelib tushgan arizalar ro‘yxatini ko‘rish (holatlar bo‘yicha filtr: `pending`, `approved`, `rejected`).
* **Auth**: `Bearer <staff_token>`
* **Permission**: `users:manage`

### Javob (Response 200 OK):
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
      "message": "Assalomu alaykum! Men 'Solo Leveling'...",
      "status": "pending",
      "created_at": "2026-09-27T17:55:00Z"
    }
  ]
}
```

---

## 4. PATCH `/api/v1/staff/creator-requests/{id}` (Admin)
Arizani tasdiqlash yoki rad etish.
* **Auth**: `Bearer <staff_token>`
* **Permission**: `users:manage`

### Mantiqiy jarayon (Approve bo‘lganda):
1. Arizaning `status` qiymati `'approved'` ga o‘zgaradi.
2. `staff_users` jadvalida ushbu foydalanuvchi uchun `creator` roli bilan yangi xodim yozuvi ochiladi (yoki avtomatik tarzda unga Studio ga kirish vakolati beriladi).

### So‘rov Tanasi:
```json
{
  "status": "approved"
}
```

### Javob (Response 200 OK):
```json
{
  "success": true,
  "data": null,
  "message": "Foydalanuvchi muvaffaqiyatli Creator etib tayinlandi!"
}
```
