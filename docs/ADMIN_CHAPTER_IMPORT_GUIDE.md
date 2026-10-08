# Admin chapter import guide

Languages: O‘zbekcha · English · Русский

[Download the folder template](../admin/public/templates/chapter-import-template.zip) · [Open the illustrated guide](../admin/public/guides/chapter-import-guide.html)

## O‘zbekcha

Manga va manhwa boblarini yuklash qo‘llanmasi

Bitta asarning bir nechta bobini papka yoki ZIP orqali yuklang. Avval bob raqami va sahifalar tartibini tekshiring, so‘ng yuklashni boshlang.

```text
My-Series/
├── Chapter 01/
│   ├── 001.jpg
│   ├── 002.jpg
│   └── 003.jpg
├── Chapter 02/
│   ├── 001.png
│   └── 002.png
└── Chapter 03.5/
    ├── 001.webp
    └── 002.webp
```

Shablon ichida haqiqiy rasmlar yo‘q. Yuqoridagi daraxt tayyor papka qanday ko‘rinishini ko‘rsatadi; matnli eslatmalar importda o‘tkazib yuboriladi.

### Boshlash uchun

Admin hisobingiz bilan kiring. Import uchun bob yaratish huquqi kerak; tarjimonlar faqat o‘z asarlariga bob qo‘shishi mumkin. Import manga va manhwa rasmlari uchun mo‘ljallangan. Novel matnlarini odatdagi “Bob Yuklash” oynasidan qo‘shing. Brauzeringiz papka tanlashni qo‘llamasa, ZIP yoki rasmlarni tanlang.

### 1. Asarni tanlang

Boshqaruv panelida kerakli manga yoki manhwa sahifasini oching va “Boblarni import qilish” tugmasini bosing. Umumiy asarlar sahifasidan import qilayotgan bo‘lsangiz, “Asar” ro‘yxatidan to‘g‘ri asarni tanlang. Yangi asar uchun avval uning nomi, muqovasi va turini odatdagi asar yaratish oynasida kiriting.

### 2. Fayllarni tayyorlang

Har bir bob uchun alohida papka yarating: Chapter 01, Chapter 02, Chapter 03.5. Sahifalarni o‘qish tartibida 001.jpg, 002.jpg kabi nomlang. Shablonni ochib, uning matnli eslatmalari yoniga haqiqiy rasmlaringizni qo‘ying. Bir importda faqat bitta asarning boblarini tanlang. “Papka tanlash” orqali My-Series asosiy papkasini, “ZIP tanlash” orqali shu tuzilma saqlangan arxivni tanlang. Bir bob uchun “Rasmlarni tanlash” ham ishlaydi.

### 3. Boblarni tekshiring

Boblar ro‘yxatidan har bir bobni oching. Bob raqami, ixtiyoriy sarlavha, sahifalar soni va tartibini tekshiring. Fayl nomlari raqamga qarab tartiblanadi: 1, 2, 10. Tartibni sudrash yoki yuqoriga/pastga tugmalari bilan o‘zgartiring; keraksiz sahifani olib tashlang. Manga uchun “Bitta sahifa”, manhwa uchun “Vertikal o‘qish” ko‘rinishidan foydalaning. Mavjud bob raqami bo‘lgan papkalar yuklash uchun tanlanmaydi. Asl bobning o‘rnini bu import bilan almashtirib bo‘lmaydi.

### 4. Yuklashni boshlang

Kerakli tayyor boblarni tanlab, “Tanlangan boblarni yuklash” tugmasini bosing. Boblar navbat bilan, har bir rasm alohida yuklanadi. Navbatda sahifalar soni va holatini ko‘rasiz. Import oynasini yopishingiz yoki panelning boshqa sahifasiga o‘tishingiz mumkin. Yuklashni boshlagach, bob ma’lumotlari va sahifalar tartibi davom ettirish uchun qulflanadi.

### 5. Nashr qilish

Odatda tugallangan bob moderatsiyaga yuboriladi va o‘quvchilarga hali ko‘rinmaydi. Bobni tasdiqlash huquqi bo‘lgan admin “Qo‘shimcha sozlamalar” ichidagi “Yuklangach nashr qilish” belgisini oldindan yoqishi mumkin. “Tugallangan” holati barcha sahifalar saqlanib, bob yaratilganini bildiradi; bu o‘z-o‘zidan nashr qilinganini bildirmaydi.

### Fayl cheklovlari

- JPEG, PNG, WebP yoki GIF; GIF statik sahifaga aylantiriladi.
- Har bir bob: 1–100 ta rasm, jami 50 MiB gacha.
- Har bir rasm: 20 MiB gacha va 40 million pikseldan oshmasligi kerak. Juda uzun manhwa rasmlarini qismlarga bo‘ling.
- Qurilmadagi saqlangan navbat: jami 300 MiB gacha; bitta tanlashda ZIP ichida 1 000 tagacha yozuv. Tugallanganlarni tozalash navbatdagi joyni bo‘shatadi.
- Bob raqami musbat bo‘lishi kerak; 3.5 kabi qo‘shimcha bob raqami ham mumkin.
- ZIP parolsiz bo‘lishi kerak. RAR, 7z va ZIP64 qo‘llab-quvvatlanmaydi.

### Yuklashni to‘xtatish va davom ettirish

- “To‘xtatish” joriy sahifa yuborilishi tugagach navbatni to‘xtatadi. “Davom ettirish” yoki “Qayta urinish” saqlangan sahifalarni tekshiradi va yetishmayotganlarini yuboradi.
- Brauzer oynasi yopilsa, kompyuter o‘chsa yoki sahifa yangilansa, yuklash to‘xtaydi. Xuddi shu qurilma, brauzer va admin hisobida qayta ochib, saqlangan navbatni davom ettiring. Import oynasini yopish qoralamani o‘chirmaydi; hisobdan chiqish navbatni to‘xtatadi.
- Qoralamalar va asl fayllar brauzer xotirasida saqlanadi. Xotira xatosi ko‘rinsa, sahifani ochiq qoldiring; saqlanmagan qoralama yangilashda yo‘qolishi mumkin. Brauzer ma’lumotlarini tozalash yoki boshqa qurilmaga o‘tish fayllarni olib o‘tmaydi.
- Serverdagi tugallanmagan yuklash oxirgi muvaffaqiyatli sahifadan 7 kun saqlanadi. Muddat o‘tsa, asl fayllar qurilmada bo‘lsa navbat yangi yuklashni boshlaydi. Asl rasmlaringizni bob muvaffaqiyatli tugaguncha saqlang.

### Yuklashdan oldin

- To‘g‘ri asar tanlangan.
- Bob raqami takrorlanmaydi.
- Barcha sahifalar bor va to‘g‘ri tartibda.
- O‘qish ko‘rinishida matn o‘qiladi.
- Moderatsiya yoki nashr sozlamasi tekshirilgan.

### Muammo bo‘lsa

**Bob raqami mavjud.** Shu bobni navbatdan olib tashlang yoki tanlamang. Haqiqatan boshqa bob bo‘lsa, yuklash boshlanishidan oldin uning to‘g‘ri raqamini kiriting.

**Rasm yoki bob juda katta.** Rasmlarni kichraytiring yoki siqing, so‘ng qayta tanlang. Uzun manhwa rasmini o‘qish tartibida bir nechta qismga bo‘lish mumkin.

**Internet uzildi.** Ulanishni tiklab, “Qayta urinish” tugmasini bosing. Yuklangan sahifalar qayta yuborilmaydi.

**Rasmlar topilmadi.** Asl papka yoki ZIP ni qayta tanlang. Faqat matnli eslatmalari bo‘lgan bo‘sh shablon bob yaratmaydi.

**Tugallangan bob ko‘rinmayapti.** Boblar ro‘yxatida uning holatini tekshiring. Moderatsiyadagi bobni tasdiqlash huquqi bo‘lgan admin nashr qilishi kerak.

**Qoralama kerak emas.** “Olib tashlash” qoralama va tugallanmagan yuklashni bekor qiladi. “Tugallanganlarni tozalash” faqat navbat yozuvini olib tashlaydi; yaratilgan bobni o‘chirmaydi.

## English

Admin guide to importing manga and manhwa chapters

Upload several chapters of one series from a folder or ZIP. Review chapter numbers and page order before starting the upload.

```text
My-Series/
├── Chapter 01/
│   ├── 001.jpg
│   ├── 002.jpg
│   └── 003.jpg
├── Chapter 02/
│   ├── 001.png
│   └── 002.png
└── Chapter 03.5/
    ├── 001.webp
    └── 002.webp
```

The template contains no actual images. The tree illustrates how your completed folder should look; text instruction files are skipped during import.

### Before you begin

Sign into your staff account. Importing requires chapter creation permission; creators can add chapters only to their own series. This importer handles manga and manhwa images. Use the usual “Upload chapter” form for novel text. If your browser cannot choose folders, select a ZIP or individual images instead.

### 1. Choose the series

Open a manga or manhwa in the staff dashboard and click “Import chapters”. If you open the importer from the series catalogue, choose the correct “Series” first. For a new series, create its title, cover and format using the usual series creation form before importing chapters.

### 2. Prepare the files

Use one folder per chapter: Chapter 01, Chapter 02, Chapter 03.5. Name pages in reading order, such as 001.jpg and 002.jpg. Extract the template and place your real images alongside its text instructions. Include only one series in each import. Use “Choose folder” for the parent My-Series folder or “Choose ZIP” for an archive with the same structure. “Choose images” also works for a single chapter.

### 3. Review the chapters

Open each chapter in the review list. Check its number, optional title, page count and order. Filenames sort numerically: 1, 2, 10. Drag pages or use the up/down buttons to reorder them; remove unwanted pages. Check “Single page” for manga and “Vertical scroll” for manhwa. Folders with existing chapter numbers are not selected for upload. This importer cannot replace an existing chapter.

### 4. Start uploading

Select the ready chapters you want and click “Upload selected chapters”. Chapters run in sequence, one image at a time. The queue shows page counts and progress. You can close the import window and navigate elsewhere in the dashboard while uploading continues. Once an upload starts, its metadata and file order are locked so it can resume safely.

### 5. Publish the chapters

Completed chapters normally enter moderation and are not yet visible to readers. Staff with chapter approval permission can enable “Publish when upload finishes” in “Advanced options” before starting. “Complete” means all pages were saved and the chapter was created; it does not by itself mean the chapter was published.

### File limits

- JPEG, PNG, WebP or GIF; GIF is converted to a static page.
- Each chapter: 1–100 images, up to 50 MiB in total.
- Each image: up to 20 MiB and 40 million pixels. Split extremely long manhwa images into smaller strips.
- Saved queue on your device: up to 300 MiB in total; at most 1,000 ZIP entries per file selection. Clear completed imports to free queue space.
- Chapter numbers must be positive; an extra chapter such as 3.5 is supported.
- ZIP must have no password. RAR, 7z and ZIP64 are not supported.

### Pause and resume

- “Pause” stops the queue after the current page request finishes. “Resume” or “Retry” checks which pages already reached the server and sends the missing ones.
- Closing the browser tab, shutting down the computer or refreshing stops active uploads. Reopen the dashboard on the same device, browser and staff account, then resume the saved queue. Closing only the import window keeps your drafts. Signing out pauses the queue.
- Drafts and source files are saved in browser storage. If a storage error appears, keep the tab open; an unsaved draft may be lost on refresh. Clearing browser data or using another device does not transfer your saved files.
- Unfinished server uploads remain resumable for 7 days after the most recent successful page. After expiry, the queue starts a fresh upload if the source files are still saved on your device. Keep your original files until the chapter completes successfully.

### Before you upload

- The correct series is selected.
- Chapter numbers are unique.
- All pages are present and in reading order.
- Text is readable in the reading preview.
- The moderation or publishing setting is correct.

### If something goes wrong

**Chapter number already exists.** Leave it unselected or remove its draft. If this is genuinely a different chapter, enter the correct number before uploading starts.

**Image or chapter is too large.** Resize or compress the images and select them again. Long manhwa strips can be split into several images in reading order.

**Connection failed.** Restore the connection and click “Retry”. Pages already saved on the server are not sent again.

**No images found.** Choose the original folder or ZIP again. An empty template containing only text instructions does not create chapters.

**Completed chapter is not visible.** Check its status in the chapter list. A chapter in moderation must be published by staff with approval permission.

**Draft is no longer needed.** “Remove” discards the draft and cancels an unfinished upload. “Clear completed” removes queue records only; it does not delete created chapters.

## Русский

Руководство администратора по импорту глав манги и манхвы

Загрузите несколько глав одного произведения из папки или ZIP. Перед загрузкой проверьте номера глав и порядок страниц.

```text
My-Series/
├── Chapter 01/
│   ├── 001.jpg
│   ├── 002.jpg
│   └── 003.jpg
├── Chapter 02/
│   ├── 001.png
│   └── 002.png
└── Chapter 03.5/
    ├── 001.webp
    └── 002.webp
```

В шаблоне нет настоящих изображений. Дерево показывает пример готовой папки; текстовые инструкции при импорте пропускаются.

### Перед началом

Войдите в учётную запись сотрудника. Для импорта нужно право создания глав; авторы могут добавлять главы только в свои произведения. Импорт предназначен для изображений манги и манхвы. Для текста новелл используйте обычную форму «Загрузить главу». Если браузер не поддерживает выбор папок, выберите ZIP или отдельные изображения.

### 1. Выберите произведение

Откройте мангу или манхву в панели сотрудников и нажмите «Импорт глав». При запуске импорта из общего каталога сначала выберите правильное «Произведение». Для нового произведения предварительно заполните его название, обложку и тип в обычной форме создания.

### 2. Подготовьте файлы

Каждая глава должна быть в отдельной папке: Chapter 01, Chapter 02, Chapter 03.5. Назовите изображения по порядку чтения: 001.jpg, 002.jpg. Распакуйте шаблон и добавьте настоящие изображения рядом с текстовыми инструкциями. В одном импорте должны быть главы только одного произведения. Нажмите «Выбрать папку» для родительской папки My-Series или «Выбрать ZIP» для архива с такой же структурой. Для одной главы можно использовать «Выбрать изображения».

### 3. Проверьте главы

Откройте каждую главу в списке проверки. Проверьте номер, необязательное название, количество и порядок страниц. Имена сортируются по числам: 1, 2, 10. Меняйте порядок перетаскиванием или кнопками вверх/вниз; удаляйте лишние страницы. Для манги используйте «Одна страница», для манхвы — «Вертикальная прокрутка». Папки с уже существующими номерами не выбираются для загрузки. Импорт не заменяет существующую главу.

### 4. Начните загрузку

Выберите готовые главы и нажмите «Загрузить выбранные главы». Главы загружаются последовательно, по одному изображению. Очередь показывает количество страниц и прогресс. Можно закрыть окно импорта и перейти в другой раздел панели. После начала загрузки сведения о главе и порядок страниц блокируются для безопасного продолжения.

### 5. Опубликуйте главы

По умолчанию завершённые главы отправляются на модерацию и ещё не видны читателям. Сотрудник с правом утверждения глав может заранее включить «Опубликовать после загрузки» в «Дополнительные настройки». Статус «Завершено» означает, что страницы сохранены и глава создана; это не обязательно означает публикацию.

### Ограничения файлов

- JPEG, PNG, WebP или GIF; GIF преобразуется в статическую страницу.
- На главу: 1–100 изображений, суммарно до 50 МиБ.
- На изображение: до 20 МиБ и 40 миллионов пикселей. Очень длинные изображения манхвы разделите на несколько частей.
- Сохранённая очередь на устройстве: суммарно до 300 МиБ; до 1 000 записей ZIP за один выбор файлов. Очистите завершённые записи, чтобы освободить место в очереди.
- Номер главы должен быть положительным; поддерживается дополнительная глава, например 3.5.
- ZIP должен быть без пароля. RAR, 7z и ZIP64 не поддерживаются.

### Пауза и продолжение

- «Пауза» останавливает очередь после завершения текущего запроса страницы. «Продолжить» или «Повторить» проверяет уже сохранённые страницы и отправляет недостающие.
- Закрытие вкладки, выключение компьютера или обновление страницы останавливает загрузку. Откройте панель на том же устройстве, в том же браузере и под той же учётной записью, затем продолжите сохранённую очередь. Закрытие только окна импорта сохраняет черновики. Выход из аккаунта приостанавливает очередь.
- Черновики и исходные файлы сохраняются в хранилище браузера. Если появилась ошибка сохранения, оставьте вкладку открытой: несохранённый черновик может пропасть при обновлении. Очистка данных браузера или переход на другое устройство не переносит сохранённые файлы.
- Незавершённая загрузка на сервере сохраняется 7 дней после последней успешно загруженной страницы. После истечения срока очередь начинает новую загрузку, если исходные файлы ещё сохранены на устройстве. Не удаляйте оригиналы до успешного завершения главы.

### Перед загрузкой

- Выбрано правильное произведение.
- Номера глав не повторяются.
- Все страницы на месте и в порядке чтения.
- Текст читается в предпросмотре.
- Проверена настройка модерации или публикации.

### Если возникла проблема

**Номер главы уже существует.** Не выбирайте этот черновик или удалите его. Если это действительно другая глава, укажите правильный номер до начала загрузки.

**Изображение или глава слишком большая.** Уменьшите или сожмите изображения и выберите их заново. Длинную манхву можно разделить на несколько изображений по порядку чтения.

**Соединение прервано.** Восстановите соединение и нажмите «Повторить». Сохранённые страницы не отправляются заново.

**Изображения не найдены.** Повторно выберите исходную папку или ZIP. Пустой шаблон с текстовыми инструкциями не создаёт глав.

**Завершённая глава не видна.** Проверьте статус в списке глав. Главу на модерации должен опубликовать сотрудник с соответствующим правом.

**Черновик больше не нужен.** «Удалить» убирает черновик и отменяет незавершённую загрузку. «Очистить завершённые» убирает только записи очереди и не удаляет созданные главы.
