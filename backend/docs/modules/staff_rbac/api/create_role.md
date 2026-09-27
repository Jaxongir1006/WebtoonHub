# 📄 API: Yangi Rol Yaratish (Create Role)

## Umumiy Ma'lumot
* **Metod:** `POST`
* **Yo'l:** `/api/v1/staff/roles`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `roles:manage`
* **Tavsif:** Superadmin tomonidan yangi dinamik rol yaratish va unga kerakli huquqlar (permission_ids) bog‘lash.

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
  "name": "moderator",
  "description": "Boblar va sharhlarni tekshiruvchi mas'ul",
  "permission_ids": [2, 5, 8]
}
```

---

## Javoblar (Responses)

### 201 Created (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "id": 4,
    "name": "moderator",
    "description": "Boblar va sharhlarni tekshiruvchi mas'ul",
    "permissions_count": 3
  },
  "message": "Yangi rol muvaffaqiyatli yaratildi"
}
```

### 409 Conflict (Bunday nomli rol allaqachon mavjud)
```json
{
  "success": false,
  "error": {
    "code": "ROLE_ALREADY_EXISTS",
    "message": "'moderator' nomli rol allaqachon mavjud",
    "details": null
  }
}
```
