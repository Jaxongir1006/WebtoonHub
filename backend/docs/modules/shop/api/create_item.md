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
| `item_type` | `string` | `frame`, `background` yoki `card` | Buyum turi |
| `price_coins` | `integer` | Frame/background: kamida 1; card: yuborilmaydi yoki 0 | Chaqmoq narxi |
| `asset_file` | `file` | Majburiy (PNG / WebP) | Bezak rasmi |

Character cards additionally require `rarity` and `character_name`; omit the
purchase price and assign the created card to a staff gacha pool. A nonzero card
price is rejected with HTTP 422. A validated `asset_url` can be used instead of
uploading `asset_file`. See [character cards](../character_cards.md).

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
