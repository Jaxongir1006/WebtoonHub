# 📄 API: Rolni O'chirish (Delete Role)

## Umumiy Ma'lumot
* **Metod:** `DELETE`
* **Yo'l:** `/api/v1/staff/roles/{id}`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `roles:manage`
* **Tavsif:** Maxsus yaratilgan rolni o'chirish. Tizimning asosiy rollari (`superadmin`, `creator`) o'chirilmaydi.

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: integer (Rol ID si)

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
  "data": null,
  "message": "Rol muvaffaqiyatli o'chirildi"
}
```

### 400 Bad Request (Tizimning asosiy roliga teginish)
```json
{
  "success": false,
  "error": {
    "code": "CANNOT_DELETE_CORE_ROLE",
    "message": "Ushbu tizim rolini o'chirib bo'lmaydi",
    "details": null
  }
}
```
