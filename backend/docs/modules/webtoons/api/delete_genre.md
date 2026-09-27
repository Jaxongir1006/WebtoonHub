# 📄 API: Janrni O'chirish (Delete Genre)

## Umumiy Ma'lumot
* **Metod:** `DELETE`
* **Yo'l:** `/api/v1/staff/genres/{id}`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `webtoons:delete`
* **Tavsif:** Janrni platformadan o'chirish.

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: integer (Janr ID si)

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
  "message": "Janr muvaffaqiyatli o'chirildi"
}
```
