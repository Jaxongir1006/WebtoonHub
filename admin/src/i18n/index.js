import { createI18n } from 'vue-i18n'
import uz from './locales/uz'
import ru from './locales/ru'
import en from './locales/en'
import auditFixes from './auditFixes'
import workflow from './workflow'
import chapterImport from './chapterImport'
import collectibleCards from './collectibleCards'
import studioFixes from './studioFixes'
import gacha from './gacha'
function withFixes(base, language) {
  const extra = workflow[language]
  return { ...base, ...auditFixes[language], ...extra, ...chapterImport[language], ...collectibleCards[language], ...studioFixes[language], ...gacha[language], common: { ...base.common, ...extra.common }, nav: { ...base.nav, ...extra.nav, wheels: gacha[language].gacha.nav } }
}

const savedLocale = localStorage.getItem('webtoonhub_lang') || 'uz'

const i18n = createI18n({
  legacy: false, // Use Composition API mode
  locale: savedLocale,
  fallbackLocale: 'uz',
  messages: {
    uz: withFixes(uz, 'uz'),
    ru: withFixes(ru, 'ru'),
    en: withFixes(en, 'en')
  }
})

export default i18n
