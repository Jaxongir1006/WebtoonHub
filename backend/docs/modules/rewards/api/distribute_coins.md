# 📄 API: Ommaviy Tangalar Tarqatish (Distribute Coins)

## Umumiy Ma'lumot
* **Metod:** `POST`
* **Yo'l:** `/api/v1/staff/coins/distribute`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `users:manage`
* **Tavsif:** Barcha faol foydalanuvchilarga yoki tanlangan ro'yxatdagi o'quvchilarga bir vaqtda bayram / rag'bat bonusi tarqatish.

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
  "amount": 30,
  "reason": "Yangi yil bayrami munosabati bilan sovg'a",
  "all_active_users": true,
  "target_user_ids": []
}
```

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "rewarded_users_count": 1420,
    "amount_per_user": 30,
    "total_coins_distributed": 42600,
    "reason": "Yangi yil bayrami munosabati bilan sovg'a"
  },
  "message": "Tangalar muvaffaqiyatli tarqatildi"
}
```
