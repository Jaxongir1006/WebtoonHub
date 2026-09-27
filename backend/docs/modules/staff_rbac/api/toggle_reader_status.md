# 📄 API: O'quvchini Bloklash / Faollashtirish (Staff / Admin)

## Umumiy Ma'lumot
* **Metod:** `PATCH`
* **Yo'l:** `/api/v1/staff/readers/{id}/status`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `users:manage`
* **Tavsif:** Boshqaruv panelida o'quvchi hisobini bir bosishda bloklash yoki blokdan chiqarish (faollashtirish).

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: integer (O'quvchi ID si)

### So'rov Tanasi (Ixtiyoriy):
```json
{
  "is_active": false
}
```
*Eslatma: Agar tana bo'sh yuborilsa, mavjud `is_active` holati avtomatik teskarisiga (toggle) o'zgartiriladi.*

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "id": 4,
    "username": "shoxrux_99",
    "email": "shox@gmail.com",
    "lightning_coins": 120,
    "is_active": false
  },
  "message": "Foydalanuvchi bloklandi"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Foydalanuvchi topilmadi"
  }
}
```
