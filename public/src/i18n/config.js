import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslation from './locales/en/translation.json';
import esTranslation from './locales/es/translation.json';
import frTranslation from './locales/fr/translation.json';
import deTranslation from './locales/de/translation.json';
import ptTranslation from './locales/pt/translation.json';
import urTranslation from './locales/ur/translation.json';
import hiTranslation from './locales/hi/translation.json';
import itTranslation from './locales/it/translation.json';
import arTranslation from './locales/ar/translation.json';

// Language configuration
export const languages = {
    en: { name: 'English', nativeName: 'English', flag: '🇺🇸', dir: 'ltr' },
    es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr' },
    fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr' },
    de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
    pt: { name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', dir: 'ltr' },
    ur: { name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', dir: 'rtl' },
    hi: { name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', dir: 'ltr' },
    it: { name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', dir: 'ltr' },
    ar: { name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl' }
};

// Resources
const resources = {
    en: { translation: enTranslation },
    es: { translation: esTranslation },
    fr: { translation: frTranslation },
    de: { translation: deTranslation },
    pt: { translation: ptTranslation },
    ur: { translation: urTranslation },
    hi: { translation: hiTranslation },
    it: { translation: itTranslation },
    ar: { translation: arTranslation }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        supportedLngs: Object.keys(languages),

        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nextLng'
        },

        interpolation: {
            escapeValue: false // React already escapes values
        },

        react: {
            useSuspense: true
        }
    });

// Update document direction when language changes
i18n.on('languageChanged', (lng) => {
    const dir = languages[lng]?.dir || 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lng);
});

// Set initial direction
const currentLang = i18n.language || 'en';
const initialDir = languages[currentLang]?.dir || 'ltr';
document.documentElement.setAttribute('dir', initialDir);
document.documentElement.setAttribute('lang', currentLang);

export default i18n;
