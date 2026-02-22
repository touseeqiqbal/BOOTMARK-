
const I18n = {
    // Configuration
    config: {
        defaultLanguage: 'en',
        supportedLanguages: ['en', 'es', 'fr', 'de', 'ar', 'pt', 'ur', 'hi', 'it'],
        rtlLanguages: ['ar', 'ur'],
        resourcePath: 'locales'
    },

    // State
    currentLanguage: 'en',
    translations: {},

    // Initialize
    async init() {
        this.currentLanguage = this.detectLanguage();
        await this.loadTranslations(this.currentLanguage);
        this.updatePage();
        this.setupLanguageSwitcher();
    },

    // Detect language from URL, localStorage, or browser
    detectLanguage() {
        // 1. URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const langParam = urlParams.get('lang');
        if (langParam && this.config.supportedLanguages.includes(langParam)) {
            return langParam;
        }

        // 2. Local Storage
        const savedLang = localStorage.getItem('bootmark_language');
        if (savedLang && this.config.supportedLanguages.includes(savedLang)) {
            return savedLang;
        }

        // 3. Browser Language
        const browserLang = navigator.language.split('-')[0];
        if (this.config.supportedLanguages.includes(browserLang)) {
            return browserLang;
        }

        // 4. Default
        return this.config.defaultLanguage;
    },

    // Load translation file
    async loadTranslations(lang) {
        try {
            const response = await fetch(`${this.config.resourcePath}/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Could not load translations for ${lang}`);
            }
            this.translations = await response.json();
            console.log(`Loaded translations for ${lang}`);
        } catch (error) {
            console.error('Error loading translations:', error);
            // Fallback to default if loading failed
            if (lang !== this.config.defaultLanguage) {
                console.log('Falling back to default language');
                this.currentLanguage = this.config.defaultLanguage;
                await this.loadTranslations(this.config.defaultLanguage);
            }
        }
    },

    // Update page content
    updatePage() {
        // Set HTML lang attribute
        document.documentElement.lang = this.currentLanguage;

        // Set text direction
        const isRtl = this.config.rtlLanguages.includes(this.currentLanguage);
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
        document.body.classList.toggle('rtl', isRtl);

        // Update elements with data-i18n attribute
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.getNestedTranslation(this.translations, key);

            if (translation) {
                // If it's an input with placeholder
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    if (el.hasAttribute('placeholder')) {
                        el.setAttribute('placeholder', translation);
                    }
                } else if (el.tagName === 'IMG') {
                    if (el.hasAttribute('alt')) {
                        el.setAttribute('alt', translation);
                    }
                } else {
                    el.textContent = translation;
                }
            } else {
                console.warn(`Missing translation for key: ${key}`);
            }
        });

        // Update language switcher active state
        const switcher = document.getElementById('language-select');
        if (switcher) {
            switcher.value = this.currentLanguage;
        }

        // Dispatch event
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: this.currentLanguage, isRtl }
        }));
    },

    // Helper to get nested object property
    getNestedTranslation(obj, key) {
        return key.split('.').reduce((prev, curr) => {
            return prev ? prev[curr] : null;
        }, obj);
    },

    // Change language
    async setLanguage(lang) {
        if (!this.config.supportedLanguages.includes(lang)) return;

        this.currentLanguage = lang;
        localStorage.setItem('bootmark_language', lang);

        await this.loadTranslations(lang);
        this.updatePage();
    },

    // Bind language switcher
    setupLanguageSwitcher() {
        const switcher = document.getElementById('language-select');
        if (switcher) {
            switcher.addEventListener('change', (e) => {
                this.setLanguage(e.target.value);
            });
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    I18n.init();
    // Expose to window for debugging or inline usage
    window.I18n = I18n;
});
