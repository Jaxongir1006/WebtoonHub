# 📄 API: Yangi Xodim Yaratish (Create Staff User)

## Umumiy Ma'lumot
* **Metod:** `POST`
* **Yo'l:** `/api/v1/staff/users`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `staff:manage`
* **Tavsif:** Superadmin tomonidan tizimga yangi xodim qo'shiladi va unga mos rol biriktiriladi.

---

## So'rov Parametrlari (Request)

### Sarlavhalar (Headers):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### So'rov Tanasi (Request Body):
```json
{
  "username": "moderator_ali",
  "email": "ali@webtoonhub.uz",
  "password": "SecurePassword123!",
  "role_id": 3
}
```

---

## Javoblar (Responses)

### 201 Created (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "id": 2,
    "username": "moderator_ali",
    "email": "ali@webtoonhub.uz",
    "role_id": 3,
    "is_active": true,
    "created_at": "2026-09-27T18:00:00Z"
  },
  "message": "Yangi xodim muvaffaqiyatli yaratildi"
}
```

### 409 Conflict (Email yoki username band)
```json
{
  "success": false,
  "error": {
    "code": "STAFF_ALREADY_EXISTS",
    "message": "Ushbu email yoki username orqali xodim allaqachon mavjud",
    "details": null
  }
}
```
