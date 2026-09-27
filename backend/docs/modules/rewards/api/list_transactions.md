# 📄 API: Chaqmoq Tranzaksiyalari Tarixi (List Coins Transactions)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/staff/coins/transactions`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `users:manage`
* **Tavsif:** Platformada sodir bo'lgan barcha tangalar harakati (audit log) tarixini filtrlar bilan qaytaradi.

---

## So'rov Parametrlari (Request)

### Query Parametrlari:
* `user_id`: integer (ixtiyoriy, muayyan o'quvchi bo'yicha)
* `transaction_type`: string (ixtiyoriy: `register_bonus`, `daily_checkin`, `chapter_read`, `shop_purchase`, `admin_adjustment`, `admin_gift`)
* `page`: integer (default: 1)
* `limit`: integer (default: 20)

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
  "data": {
    "items": [
      {
        "id": 101,
        "user_id": 5,
        "username": "otaku_uz",
        "amount": 50,
        "transaction_type": "admin_gift",
        "description": "Navro'z bayrami sovg'asi",
        "created_by_staff_id": 1,
        "created_at": "2026-09-27T18:00:00Z"
      }
    ],
    "total": 350,
    "page": 1,
    "limit": 20
  }
}
```
