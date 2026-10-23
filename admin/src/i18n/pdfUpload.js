const rows = {
  title: ['PDF Upload', 'Загрузить PDF', 'PDF yuklash'],
  subtitle: ['One PDF creates one chapter. Pages keep their PDF order.', 'Один PDF — одна глава. Страницы сохраняют порядок из PDF.', 'Bitta PDF — bitta bob. Sahifalar PDF tartibida saqlanadi.'],
  file: ['Chapter PDF', 'PDF главы', 'Bob PDF fayli'],
  limits: ['PDF only · up to 20 MB and 100 pages. Password-protected PDFs are not supported.', 'Только PDF · до 20 МБ и 100 страниц. PDF с паролем не поддерживаются.', 'Faqat PDF · 20 MB va 100 sahifagacha. Parolli PDF fayllar qo‘llanmaydi.'],
  noSeries: ['Create a manga or manhwa series first. Novels use the text editor.', 'Сначала создайте мангу или манхву. Для новелл используйте текстовый редактор.', 'Avval manga yoki manhva yarating. Romanlar uchun matn muharriridan foydalaning.'],
  invalidFile: ['Choose one nonempty PDF file of at most 20 MB.', 'Выберите один непустой PDF размером до 20 МБ.', '20 MB dan oshmaydigan bitta bo‘sh bo‘lmagan PDF fayl tanlang.'],
  upload: ['Upload chapter', 'Загрузить главу', 'Bobni yuklash'],
  processing: ['Converting PDF pages and saving your chapter. Keep this window open.', 'Преобразуем страницы PDF и сохраняем главу. Оставьте это окно открытым.', 'PDF sahifalari aylantirilib, bob saqlanmoqda. Ushbu oynani ochiq qoldiring.'],
  passwordError: ['Upload an unlocked PDF. Password-protected files are not supported.', 'Загрузите PDF без пароля. Защищённые файлы не поддерживаются.', 'Parolsiz PDF yuklang. Parol bilan himoyalangan fayllar qo‘llanmaydi.'],
  unreadableError: ['This file is not a readable PDF. Export it again and retry.', 'Не удалось прочитать PDF. Экспортируйте его заново и повторите попытку.', 'PDF faylni o‘qib bo‘lmadi. Uni qayta eksport qilib, yana urinib ko‘ring.'],
  pageLimitError: ['One PDF must contain between 1 and 100 pages.', 'Один PDF должен содержать от 1 до 100 страниц.', 'Bitta PDF 1 dan 100 tagacha sahifadan iborat bo‘lishi kerak.'],
  conversionError: ['This PDF could not be converted. Try a smaller or simpler PDF.', 'Не удалось преобразовать PDF. Попробуйте файл меньшего размера или сложности.', 'PDF faylni aylantirib bo‘lmadi. Kichikroq yoki soddaroq PDF bilan urinib ko‘ring.'],
}
export default Object.fromEntries(['en', 'ru', 'uz'].map((locale, index) => [locale, { pdfUpload: Object.fromEntries(Object.entries(rows).map(([key, values]) => [key, values[index]])) }]))
