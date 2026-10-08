# 📄 API: Rolni Tahrirlash (Update Role)

## Immutable role semantics (October 2026)

Role responses include `system_key` (`creator`, `superadmin`, or null) and `scope`
(`own_content` or `global`). These immutable fields are not accepted in role update
requests. Renaming a creator preserves ownership restrictions; renaming a superadmin
preserves its system authorization. Custom roles cannot use reserved system names.

## Umumiy Ma'lumot
* **Metod:** `PATCH`
* **Yo'l:** `/api/v1/staff/roles/{id}`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `roles:manage`
* **Tavsif:** Rolning nomi, tavsifi va unga biriktirilgan ruxsatlar (`permission_ids`) to'plamini tahrirlash.

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: integer (Rol ID si)

### Sarlavhalar (Headers):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### So'rov Tanasi (Request Body):
```json
{
  "name": "Senior Moderator",
  "description": "Boblar va sharhlarni to'liq tekshirish huquqi",
  "permission_ids": [4, 5, 10]
}
```

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "id": 3,
    "name": "Senior Moderator",
    "description": "Boblar va sharhlarni to'liq tekshirish huquqi",
    "permissions": [
      {"id": 4, "code": "chapters:create"},
      {"id": 5, "code": "chapters:approve"},
      {"id": 10, "code": "comments:moderate"}
    ]
  },
  "message": "Rol muvaffaqiyatli yangilandi"
}
```
