# 📄 API: Bob Ma'lumotlarini Tahrirlash (Update Chapter)

## Atomic edits and review (October 2026)

`PATCH /staff/chapters/{id}` requires `chapters:edit` and supports metadata/text
and ordered `image_ids`. `POST /staff/chapters/{id}/images` is the atomic multipart
alternative: optional `images`, ordered JSON `retained_image_ids`, and JSON
`chapter_update` containing ChapterUpdateRequest fields except `image_ids`.
Metadata and pages commit together. Supply `Idempotency-Key` when retrying the
multipart operation. Its data is `{chapter, added_images, status_changed_to_pending}`.

Creator ownership follows immutable role scope, including after display-name
changes. A published chapter revised by an editor without `chapters:approve`
returns to pending review. Publishing/rejecting always requires approval permission.
Published/pending novels require nonblank text; comics require at least one page.
Drafts may be incomplete. Failures leave the previous metadata/pages unchanged.

## Umumiy Ma'lumot
* **Metod:** `PATCH`
* **Yo'l:** `/api/v1/staff/chapters/{id}`
* **Avtorizatsiya:** Majburiy (`Bearer <staff_token>`)
* **Talab etiladigan ruxsat:** `chapters:create` yoki `chapters:approve`
* **Tavsif:** Bob raqami, sarlavhasi yoki mutolaa mukofoti miqdorini tahrirlash.

---

## So'rov Parametrlari (Request)

### URL Parametri:
* `id`: integer (Bob ID si)

### Sarlavhalar (Headers):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### So'rov Tanasi (Request Body):
```json
{
  "chapter_number": 2.5,
  "title": "2.5-bob: Maxsus epizod",
  "reward_coins": 10
}
```

---

## Javoblar (Responses)

### 200 OK (Muvaffaqiyatli)
```json
{
  "success": true,
  "data": {
    "id": 105,
    "chapter_number": 2.5,
    "title": "2.5-bob: Maxsus epizod",
    "reward_coins": 10
  },
  "message": "Bob ma'lumotlari muvaffaqiyatli yangilandi"
}
```
