# 🛡 Modul Hujjati: `staff_rbac` (Admin Xodimlari va Dinamik RBAC)

Ushbu modul Admin / Studio paneliga kiruvchi xodimlarning autentifikatsiyasi, ularning seanslari hamda dinamik rollar va ruxsatlarni (`roles` va `permissions`) boshqarish uchun xizmat qiladi.

---

## 1. POST `/api/v1/staff/auth/login`
Xodimlar uchun tizimga kirish (faqat `staff_users` jadvali bo‘yicha tekshiriladi).

### So‘rov Tanasi:
```json
{
  "email": "admin@webtoonhub.uz",
  "password": "AdminSecurePassword123"
}
```

### Javob (Response 200 OK):
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "a1b2c3...",
    "token_type": "bearer",
    "staff": {
      "id": 1,
      "username": "superadmin",
      "email": "admin@webtoonhub.uz",
      "role": {
        "id": 1,
        "name": "superadmin",
        "description": "To'liq boshqaruv huquqiga ega tizim rahbari"
      },
      "permissions": [
        "webtoons:create",
        "webtoons:edit",
        "webtoons:delete",
        "chapters:approve",
        "shop:manage",
        "roles:manage",
        "users:manage",
        "staff:manage"
      ]
    }
  },
  "message": "Boshqaruv paneliga xush kelibsiz"
}
```

---

## 2. GET `/api/v1/staff/roles`
Barcha mavjud rollar va ularga biriktirilgan ruxsatlar ro‘yxatini olish.
* **Auth**: `Bearer <staff_token>`
* **Permission**: `roles:manage`

### Javob (Response 200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "superadmin",
      "description": "Barcha imtiyozlarga ega",
      "permissions": [ ... ]
    },
    {
      "id": 2,
      "name": "creator",
      "description": "Manhwa va bob yuklovchi tarjimon",
      "permissions": [
        "webtoons:create",
        "chapters:create",
        "analytics:view_own"
      ]
    },
    {
      "id": 3,
      "name": "viewer",
      "description": "Faqat ko'rish va statistikani kuzatish huquqiga ega",
      "permissions": [
        "analytics:view",
        "webtoons:view_all"
      ]
    }
  ]
}
```

---

## 3. POST `/api/v1/staff/roles`
Yangi dinamik rol yaratish va unga ruxsatlarni biriktirish.
* **Auth**: `Bearer <staff_token>`
* **Permission**: `roles:manage`

### So‘rov Tanasi:
```json
{
  "name": "moderator",
  "description": "Boblar va sharhlarni tekshiruvchi",
  "permission_ids": [2, 5, 8]
}
```

### Javob (Response 201 Created):
```json
{
  "success": true,
  "data": {
    "id": 4,
    "name": "moderator",
    "description": "Boblar va sharhlarni tekshiruvchi"
  },
  "message": "Yangi rol muvaffaqiyatli yaratildi"
}
```

---

## 4. GET `/api/v1/staff/permissions`
Tizimdagi barcha mavjud ruxsatlar katalogini olish.
* **Auth**: `Bearer <staff_token>`
* **Permission**: `roles:manage`

### Javob (Response 200 OK):
```json
{
  "success": true,
  "data": [
    { "id": 1, "code": "webtoons:create", "description": "Yangi manhwa kartochkasi yaratish" },
    { "id": 2, "code": "chapters:approve", "description": "Bob moderatsiyasidan o'tkazish" },
    { "id": 3, "code": "shop:manage", "description": "Shop buyumlarini kiritish va tahrirlash" },
    { "id": 4, "code": "users:manage", "description": "Foydalanuvchilar chaqmoq balansi va bloklash" },
    { "id": 5, "code": "roles:manage", "description": "Rollar va xodimlarni boshqarish" }
  ]
}
```

---

## 5. PATCH `/api/v1/staff/users/{id}/role`
Xodimning rolini o‘zgartirish (masalan, Creator dan Moderatoga yoki aksincha).
* **Auth**: `Bearer <staff_token>`
* **Permission**: `staff:manage`

### So‘rov Tanasi:
```json
{
  "role_id": 2
}
```

### Javob (Response 200 OK):
```json
{
  "success": true,
  "data": null,
  "message": "Xodim roli muvaffaqiyatli yangilandi"
}
```
