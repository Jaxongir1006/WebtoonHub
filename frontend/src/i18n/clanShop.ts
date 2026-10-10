import { SupportedLocale } from './types';

const rows: Record<string, [string, string, string]> = {
  tab: ['Clan Shop', 'Магазин клана', 'Klan do‘koni'],
  background: ['Background', 'Фон', 'Fon'],
  hint: ['Frames and backgrounds are bought for this clan. Leaders and co-leaders pay with their own lightning; decorations stay with the clan when a member leaves.', 'Рамки и фоны покупаются для этого клана. Лидер и солидеры платят своими молниями; украшения остаются у клана после выхода участника.', 'Ramkalar va fonlar ushbu klan uchun sotib olinadi. Yetakchi va o‘rinbosarlar o‘z Chaqmoqlaridan to‘laydi; a’zo chiqsa ham bezaklar klanda qoladi.'],
  memberHint: ['Only the leader and co-leaders can buy or change clan decorations.', 'Только лидер и солидеры могут покупать и менять украшения клана.', 'Faqat yetakchi va o‘rinbosarlar klan bezaklarini sotib olishi va almashtirishi mumkin.'],
  catalog: ['Available decorations', 'Доступные украшения', 'Mavjud bezaklar'],
  inventory: ['Clan inventory', 'Инвентарь клана', 'Klan inventari'],
  emptyInventory: ['Your clan has no decorations yet. Buy a frame or background from the shop below.', 'У клана пока нет украшений. Купите рамку или фон в магазине ниже.', 'Klanda hali bezak yo‘q. Quyidagi do‘kondan ramka yoki fon sotib oling.'],
  owns: ['Owned by clan', 'Принадлежит клану', 'Klanga tegishli'],
  confirmTitle: ['Buy for your clan', 'Купить для клана', 'Klan uchun xarid'],
  confirmBody: ['Buy “{name}” for {cost} ⚡ from your personal balance? This item belongs to {clan}, not your personal inventory.', 'Купить «{name}» за {cost} ⚡ с вашего личного баланса? Предмет будет принадлежать клану {clan}, а не вашему личному инвентарю.', '“{name}” ni shaxsiy balansingizdan {cost} ⚡ ga sotib olasizmi? Bezak shaxsiy inventaringizga emas, {clan} klaniga tegishli bo‘ladi.'],
  confirmBuy: ['Buy for {cost} ⚡', 'Купить за {cost} ⚡', '{cost} ⚡ ga xarid qilish'],
  bought: ['“{name}” was added to the clan inventory. Equip it below to apply it.', '«{name}» добавлен в инвентарь клана. Нажмите «Надеть», чтобы применить.', '“{name}” klan inventariga qo‘shildi. Qo‘llash uchun quyida “Faollashtirish” tugmasini bosing.'],
  equipped: ['Clan decoration equipped.', 'Украшение клана надето.', 'Klan bezagi faollashtirildi.'],
  unequipped: ['Clan decoration removed.', 'Украшение клана снято.', 'Klan bezagi o‘chirildi.'],
  settingsHint: ['Get clan frames and full-page backgrounds in the Clan Shop.', 'Рамки и фоны для всей страницы доступны в магазине клана.', 'Klan ramkalari va butun sahifa fonlarini Klan do‘konidan oling.'],
  open: ['Open Clan Shop', 'Открыть магазин клана', 'Klan do‘konini ochish'],
  settingsDraft: ['Save to apply changes to the description and recruiting. Logo uploads apply immediately.', 'Сохраните изменения описания и набора участников. Загруженный логотип применяется сразу.', 'Tavsif va a’zo qabul qilish sozlamalari saqlangandan so‘ng qo‘llanadi. Yuklangan logo darhol o‘zgaradi.'],
  logoUpdated: ['Clan logo updated.', 'Логотип клана обновлён.', 'Klan logosi yangilandi.'],
};

export const clanShopTranslations: Record<SupportedLocale, Record<string, string>> = {
  en: Object.fromEntries(Object.entries(rows).map(([key, values]) => [`clanShop.${key}`, values[0]])),
  ru: Object.fromEntries(Object.entries(rows).map(([key, values]) => [`clanShop.${key}`, values[1]])),
  uz: Object.fromEntries(Object.entries(rows).map(([key, values]) => [`clanShop.${key}`, values[2]])),
};
