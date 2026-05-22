import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './en.json';
import ru from './ru.json';
import zh from './zh.json';

const STORE_KEY = 'lecoo-settings';
const LEGACY_LANG_KEY = 'lecoo-lang';

// Custom detector that reads from the same zustand-persist blob the UI uses,
// so the language picked in Settings is what i18next will boot with next
// time the app starts — no second source of truth.
const storeDetector = {
  name: 'lecoo-store',
  lookup() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return undefined;
      const parsed = JSON.parse(raw);
      return parsed?.state?.language as string | undefined;
    } catch {
      return undefined;
    }
  },
  cacheUserLanguage(_lng: string) {
    // The Settings page writes the language straight into the store on
    // change, so we don't need to mirror anything here.
  },
};

const detector = new LanguageDetector();
detector.addDetector(storeDetector);

i18n
  .use(detector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ru: { translation: ru },
      zh: { translation: zh },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ru', 'zh'],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ['lecoo-store', 'localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: LEGACY_LANG_KEY,
    },
  });

export default i18n;
