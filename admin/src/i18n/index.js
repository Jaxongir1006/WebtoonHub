import { createI18n } from 'vue-i18n'
import uz from './locales/uz'
import ru from './locales/ru'
import en from './locales/en'

const savedLocale = localStorage.getItem('webtoonhub_lang') || 'uz'

const i18n = createI18n({
  legacy: false, // Use Composition API mode
  locale: savedLocale,
  fallbackLocale: 'uz',
  messages: {
    uz,
    ru,
    en
  }
})

export default i18n
