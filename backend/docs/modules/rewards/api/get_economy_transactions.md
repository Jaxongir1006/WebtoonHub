# 📄 API: Iqtisodiyot / Chaqmoq Tranzaksiyalari (Staff / Admin)

## Umumiy Ma'lumot
* **Metod:** `GET`
* **Yo'l:** `/api/v1/staff/economy/transactions` (va `/api/v1/staff/coins/transactions`)
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `coins:view` yoki `users:manage`
* **Tavsif:** Platformadagi barcha Chaqmoq aylanishlari va harakatlari audit jurnalini olish.

---

## So'rov Parametrlari (Request)

### Query Parametrlari:
| Parametr | Tipi | Majburiyligi | Tavsif |
| :--- | :--- | :--- | :--- |
| `type` | string | Ixtiyoriy | Tranzaksiya turi filtri (`all`, `register_bonus`, `daily_checkin`, `chapter_read`, `shop_purchase`, `admin_adjustment`, `admin_gift`) |
| `transaction_type` | string | Ixtiyoriy | Alternativ filtr parametri |
| `user_id` | integer | Ixtiyoriy | Foydalanuvchi ID si |
| `page` | integer | Ixtiyoriy (default: 1) | Sahifa raqami |
| `limit` | integer | Ixtiyoriy (default: 20) | Tranzaksiyalar soni |

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 105,
        "user_id": 4,
        "username": "shoxrux_99",
        "type": "chapter_read",
        "transaction_type": "chapter_read",
        "title": "1-bob: Boshlanish mutolaasi uchun",
        "description": "1-bob: Boshlanish mutolaasi uchun",
        "amount": 5,
        "created_by_staff_id": null,
        "created_at": "2026-09-27T14:30:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```
