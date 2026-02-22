/**
 * Locale-specific formatting utilities
 */

// Locale mappings for date-fns and Intl
const localeMap = {
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    pt: 'pt-PT',
    ur: 'ur-PK',
    hi: 'hi-IN',
    it: 'it-IT',
    ar: 'ar-SA'
};

/**
 * Get full locale code from short code
 */
export const getFullLocale = (locale) => {
    return localeMap[locale] || localeMap.en;
};

/**
 * Check if a language is RTL
 */
export const isRTL = (locale) => {
    const rtlLanguages = ['ar', 'ur', 'he', 'fa'];
    return rtlLanguages.includes(locale);
};

/**
 * Get text direction for a locale
 */
export const getLocaleDirection = (locale) => {
    return isRTL(locale) ? 'rtl' : 'ltr';
};

/**
 * Format date according to locale
 * @param {Date|string|number} date - Date to format
 * @param {string} locale - Locale code (e.g., 'en', 'es')
 * @param {object} options - Intl.DateTimeFormat options
 */
export const formatDate = (date, locale = 'en', options = {}) => {
    if (!date) return '';

    const dateObj = date instanceof Date ? date : new Date(date);
    const fullLocale = getFullLocale(locale);

    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options
    };

    try {
        return new Intl.DateTimeFormat(fullLocale, defaultOptions).format(dateObj);
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateObj.toLocaleDateString();
    }
};

/**
 * Format date and time according to locale
 */
export const formatDateTime = (date, locale = 'en', options = {}) => {
    if (!date) return '';

    const dateObj = date instanceof Date ? date : new Date(date);
    const fullLocale = getFullLocale(locale);

    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...options
    };

    try {
        return new Intl.DateTimeFormat(fullLocale, defaultOptions).format(dateObj);
    } catch (error) {
        console.error('Error formatting datetime:', error);
        return dateObj.toLocaleString();
    }
};

/**
 * Format number according to locale
 * @param {number} number - Number to format
 * @param {string} locale - Locale code
 * @param {object} options - Intl.NumberFormat options
 */
export const formatNumber = (number, locale = 'en', options = {}) => {
    if (number === null || number === undefined) return '';

    const fullLocale = getFullLocale(locale);

    try {
        return new Intl.NumberFormat(fullLocale, options).format(number);
    } catch (error) {
        console.error('Error formatting number:', error);
        return number.toString();
    }
};

/**
 * Format currency according to locale
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (e.g., 'USD', 'EUR')
 * @param {string} locale - Locale code
 * @param {object} options - Additional Intl.NumberFormat options
 */
export const formatCurrency = (amount, currency = 'USD', locale = 'en', options = {}) => {
    if (amount === null || amount === undefined) return '';

    const fullLocale = getFullLocale(locale);

    const defaultOptions = {
        style: 'currency',
        currency: currency,
        ...options
    };

    try {
        return new Intl.NumberFormat(fullLocale, defaultOptions).format(amount);
    } catch (error) {
        console.error('Error formatting currency:', error);
        return `${currency} ${amount}`;
    }
};

/**
 * Format percentage according to locale
 */
export const formatPercent = (value, locale = 'en', options = {}) => {
    if (value === null || value === undefined) return '';

    const fullLocale = getFullLocale(locale);

    const defaultOptions = {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
        ...options
    };

    try {
        return new Intl.NumberFormat(fullLocale, defaultOptions).format(value);
    } catch (error) {
        console.error('Error formatting percent:', error);
        return `${(value * 100).toFixed(2)}%`;
    }
};

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export const formatRelativeTime = (date, locale = 'en') => {
    if (!date) return '';

    const dateObj = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffInSeconds = Math.floor((dateObj - now) / 1000);
    const fullLocale = getFullLocale(locale);

    const rtf = new Intl.RelativeTimeFormat(fullLocale, { numeric: 'auto' });

    const units = [
        { unit: 'year', seconds: 31536000 },
        { unit: 'month', seconds: 2592000 },
        { unit: 'week', seconds: 604800 },
        { unit: 'day', seconds: 86400 },
        { unit: 'hour', seconds: 3600 },
        { unit: 'minute', seconds: 60 },
        { unit: 'second', seconds: 1 }
    ];

    for (const { unit, seconds } of units) {
        const value = Math.floor(diffInSeconds / seconds);
        if (Math.abs(value) >= 1) {
            return rtf.format(value, unit);
        }
    }

    return rtf.format(0, 'second');
};

/**
 * Get currency symbol for a currency code
 */
export const getCurrencySymbol = (currency = 'USD', locale = 'en') => {
    const fullLocale = getFullLocale(locale);

    try {
        const formatted = new Intl.NumberFormat(fullLocale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(0);

        // Extract symbol by removing digits and spaces
        return formatted.replace(/[\d\s]/g, '');
    } catch (error) {
        console.error('Error getting currency symbol:', error);
        return currency;
    }
};

/**
 * Parse localized number string to number
 */
export const parseLocalizedNumber = (str, locale = 'en') => {
    if (!str) return null;

    const fullLocale = getFullLocale(locale);

    // Get locale-specific decimal and thousand separators
    const parts = new Intl.NumberFormat(fullLocale).formatToParts(12345.6);
    const decimalSeparator = parts.find(part => part.type === 'decimal')?.value || '.';
    const groupSeparator = parts.find(part => part.type === 'group')?.value || ',';

    // Remove group separators and replace decimal separator with '.'
    const normalized = str
        .replace(new RegExp(`\\${groupSeparator}`, 'g'), '')
        .replace(decimalSeparator, '.');

    return parseFloat(normalized);
};
