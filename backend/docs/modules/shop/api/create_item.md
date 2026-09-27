# 📄 API: Do'konga Yangi Buyum Qo'shish (Create Shop Item)

## Umumiy Ma'lumot
* **Metod:** `POST`
* **Yo'l:** `/api/v1/staff/shop/items`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `shop:manage`
* **Tavsif:** Admin tomonidan do‘konga yangi avatar ramkasi yoki profil foni kiritiladi. Rasm fayli to‘g‘ridan-to‘g‘ri MinIO `shop-assets` savatiga yuklanadi.

---

## So'rov Parametrlari (Request)

### Sarlavhalar (Headers):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: multipart/form-data
```

### Form Ma'lumotlari:
| Maydon | Tipi | Qoidalar | Tavsif |
| :--- | :--- | :--- | :--- |
| `name` | `string` | Majburiy (2-100 belgi) | Buyum nomi |
| `item_type` | `string` | `frame` yoki `background` | Buyum turi |
| `price_coins` | `integer` | Majburiy (kamida 1 Chaqmoq) | Chaqmoq narxi |
| `asset_file` | `file` | Majburiy (PNG / WebP) | Bezak rasmi |

---

## Javoblar (Responses)

### 201 Created (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "id": 3,
    "name": "Neon Chaqmoq Ramkasi",
    "item_type": "frame",
    "price_coins": 75,
    "asset_url": "http://localhost:9000/shop-assets/frames/neon_lightning.png"
  },
  "message": "Do'konga yangi buyum muvaffaqiyatli joylandi"
}
```
