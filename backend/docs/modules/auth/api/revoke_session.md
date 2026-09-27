# 📄 API: Muayyan Seansni Bekor Qilish (Revoke Session)

## Umumiy Ma'lumot
* **Metod:** `DELETE`
* **Yo'l:** `/api/v1/auth/sessions/{id}`
* **Avtorizatsiya:** Majburiy (`Bearer <access_token>`)
* **Tavsif:** Foydalanuvchi boshqa biror qurilmadagi (yoki o‘zining) muayyan seansini ID bo‘yicha masofadan to‘xtatadi (`is_active = False`).

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: UUID (Seans ID si, masalan: `c19e5b12-1144-4820-a67f-8d4840d71234`)

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
  "message": "Seans muvaffaqiyatli yakunlandi"
}
```

### 404 Not Found (Seans topilmadi)
```json
{
  "success": false,
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "Bunday seans topilmadi yoki u sizga tegishli emas",
    "details": null
  }
}
```
