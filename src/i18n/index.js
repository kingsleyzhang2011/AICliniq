import { createI18n } from 'vue-i18n'
import zh from '../locales/zh'
import en from '../locales/en'

// Create Vue I18n instance.
export const i18n = createI18n({
  legacy: false, // Use Composition API
  locale: 'zh', // Try to get from localStorage or default to zh
  fallbackLocale: 'en',
  messages: {
    zh,
    en
  }
})

export default i18n
