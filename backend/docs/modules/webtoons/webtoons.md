# 📚 Modul Hujjati: `webtoons` (Manhvalar, Boblar va Reader)

## 1. Modul Tavsifi
Ushbu modul manhvalar katalogi, janrlar bo‘yicha filtrlash, jonli qidiruv, uzluksiz vertikal Webtoon Reader va MinIO object storage orqali ko‘p miqdordagi bob rasmlarini saqlash hamda boblar moderatsiyasi jarayonini boshqaradi.

---

## 2. Biznes Qoidalari
1. **Tezkor kesh (Redis):** Katalog va ommabop manhvalar ro‘yxati Redis da keshlanadi, bu esa javob qaytarish vaqtini 50 ms dan kam bo‘lishini ta'minlaydi.
2. **Moderatsiya zanjiri:** Creator (tarjimon) yangi bob yuklaganda, bob avtomatik tarzda `pending` holatda bo‘ladi.
3. **Admin tasdiqlashi:** Faqat Admin / Moderator tomonidan tekshirilib tasdiqlangan (`published`) boblargina ommaga ko‘rinadi va mutolaa qilib Chaqmoq olish imkonini beradi.
4. **Rasmlar tartibi:** Vertikal Readerda rasm uzluksiz oqishi uchun rasmlar `order_index` (1, 2, 3...) bo‘yicha qat'iy tartiblanadi.

---

## 3. Ushbu Modulning API Endpointlari
* [GET /api/v1/webtoons](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/webtoons/api/catalog.md) — Manhvalar katalogi va qidiruv (filtrlar bilan)
* [GET /api/v1/webtoons/{id_or_slug}](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/webtoons/api/get_webtoon.md) — Manhvaning to‘liq kartochkasi va boblar ro‘yxati
* [GET /api/v1/chapters/{id}](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/webtoons/api/read_chapter.md) — Vertikal Webtoon Reader (bob rasmlari)
* [POST /api/v1/staff/webtoons](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/webtoons/api/create_webtoon.md) — Yangi manhva yaratish (muqova yuklash)
* [PATCH /api/v1/staff/webtoons/{id}](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/webtoons/api/update_webtoon.md) — Manhvani tahrirlash
* [DELETE /api/v1/staff/webtoons/{id}](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/webtoons/api/delete_webtoon.md) — Manhvani o'chirish
* [POST /api/v1/staff/chapters](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/webtoons/api/upload_chapter.md) — Bob yaratish va rasmlarni MinIO ga yuklash (`pending`)
* [GET /api/v1/staff/chapters/pending](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/webtoons/api/list_pending_chapters.md) — Moderatorlar uchun kutilayotgan boblar ro'yxati
* [PATCH /api/v1/staff/chapters/{id}/status](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/webtoons/api/moderate_chapter.md) — Bobni moderatsiyadan o‘tkazish (`published` / `rejected`)
