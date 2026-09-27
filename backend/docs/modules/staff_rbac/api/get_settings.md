# 📄 API: Tizim Sozlamalarini Olish (Get System Settings)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/staff/settings`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `roles:manage` yoki `superadmin`
* **Tavsif:** Platformaning iqtisodiy va texnik parametrlari (ro'yxatdan o'tish bonusi, kunlik check-in tangasi, bob mukofoti, texnik tanaffus holati) ro'yxatini qaytaradi.

---

## So'rov Parametrlari (Request)

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
  "data": [
    {
      "key": "register_bonus_coins",
      "value": "50",
      "description": "Yangi ro'yxatdan o'tgan foydalanuvchiga beriladigan boshlang'ich bonus"
    },
    {
      "key": "daily_checkin_coins",
      "value": "15",
      "description": "Kunlik login uchun taqdim etiladigan bonus"
    },
    {
      "key": "chapter_read_coins",
      "value": "5",
      "description": "Bobni to'liq o'qiganda beriladigan rag'bat"
    },
    {
      "key": "maintenance_mode",
      "value": "false",
      "description": "Saytda texnik tanaffus rejimi"
    }
  ]
}
```
