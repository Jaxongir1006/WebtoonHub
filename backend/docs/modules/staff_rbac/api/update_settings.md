# 📄 API: Tizim Sozlamalarini Yangilash (Update System Settings)

## Umumiy Ma'lumot
* **Metod:** `PATCH`
* **Yo'l:** `/api/v1/staff/settings`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `roles:manage` yoki `superadmin`
* **Tavsif:** Platforma parametrlarini (masalan, bayram munosabati bilan kunlik bonusni 30 ga ko'tarish) yangilash.

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
  "settings": {
    "daily_checkin_coins": "30",
    "register_bonus_coins": "100"
  }
}
```

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "daily_checkin_coins": "30",
    "register_bonus_coins": "100"
  },
  "message": "Tizim sozlamalari muvaffaqiyatli yangilandi"
}
```
