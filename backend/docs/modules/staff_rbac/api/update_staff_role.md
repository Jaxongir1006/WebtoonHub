# 📄 API: Xodim Rolini Yangilash (Update Staff Role)

## Umumiy Ma'lumot
* **Metod:** `PATCH`
* **Yo'l:** `/api/v1/staff/users/{id}/role`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `staff:manage`
* **Tavsif:** Muayyan xodimning mavjud rolini yangi rolga o‘zgartirish (masalan, Creator dan Viewer yoki Moderatoga).

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: integer (Xodim ID si)

### Sarlavhalar (Headers):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### So'rov Tanasi (Request Body):
```json
{
  "role_id": 3
}
```

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": null,
  "message": "Xodim roli muvaffaqiyatli yangilandi"
}
```

### 404 Not Found (Xodim yoki Rol topilmadi)
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Ko'rsatilgan xodim yoki rol topilmadi",
    "details": null
  }
}
```
