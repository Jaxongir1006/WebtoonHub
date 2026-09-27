# ⚡ Modul Hujjati: `rewards` (Chaqmoq Gamifikatsiyasi va Mukofotlar)

## 1. Modul Tavsifi
Ushbu modul platformadagi bepul ichki ballar — **Chaqmoq (⚡)** iqtisodiyoti, foydalanuvchilarning kunlik saytga kirishi (Daily Check-in) va har bir bobni to‘liq mutolaa qilganliklari uchun beriladigan rag‘batlantirish mexanizmini boshqaradi.

---

## 2. Biznes Qoidalari
1. **Toshkent vaqti bo‘yicha yangilanish:** Kunlik login bonusi (`+15 ⚡`) har kuni O‘zbekiston vaqti (`Asia/Tashkent`, UTC+5) bilan 00:00 da yangilanadi. Foydalanuvchi bir kalendar kunida faqat 1 marta bonus ola oladi.
2. **Bob mutolaasi mukofoti:** Foydalanuvchi bobni o‘qib bo‘lgach, "Bobni yakunlash" tugmasini bosganda unga `+5 ⚡` beriladi.
3. **Takroriy nakrutkadan qat'iy himoya:** `read_rewards` jadvalidagi `UNIQUE(user_id, chapter_id)` cheklovi orqali bitta o‘quvchi ayni bitta bob uchun faqat bir marta mukofot olishi kafolatlanadi.

---

## 3. Ushbu Modulning API Endpointlari
* [POST /api/v1/rewards/daily-checkin](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/rewards/api/daily_checkin.md) — Kunlik bonus olish (+15 ⚡)
* [POST /api/v1/chapters/{id}/reward](file:///home/jahongir/KIUT/PBL/WebtoonHub/backend/docs/modules/rewards/api/chapter_reward.md) — Bobni yakunlab mutolaa mukofotini olish (+5 ⚡)
