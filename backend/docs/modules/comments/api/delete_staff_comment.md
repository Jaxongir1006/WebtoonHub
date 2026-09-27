# 📄 API: Sharhni Moderatorda O'chirish (Staff / Admin)

## Umumiy Ma'lumot
* **Metod:** `DELETE`
* **Yo'l:** `/api/v1/staff/comments/{id}`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `comments:moderate`
* **Tavsif:** Boshqaruv paneli orqali nomaqbul sharhni bevosita staff yo'nalishi orqali o'chirish.

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: integer (O'chirilishi kerak bo'lgan sharh ID si)

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": null,
  "message": "Sharh muvaffaqiyatli o'chirildi"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Sharh topilmadi"
  }
}
```
