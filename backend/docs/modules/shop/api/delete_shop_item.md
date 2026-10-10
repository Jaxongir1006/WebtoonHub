# 📄 API: Do'kon Buyumini O'chirish (Delete Shop Item)

## Umumiy Ma'lumot
* **Metod:** `DELETE`
* **Yo'l:** `/api/v1/staff/shop/items/{id}`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `shop:manage`
* **Tavsif:** Do'kondagi buyumni butunlay o'chirish.

Items owned by users or clans, and cards referenced by a gacha pool or historical draw, cannot be
deleted (HTTP 409). Set `is_available=false` instead. Unreferenced artwork cleanup
also retains assets recorded in durable draw snapshots.

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: integer (Buyum ID si)

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
  "message": "Buyum do'kondan muvaffaqiyatli o'chirildi"
}
```
