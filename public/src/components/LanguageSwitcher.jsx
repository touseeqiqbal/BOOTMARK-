import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { languages } from '../i18n/config';
import { Globe, Check } from 'lucide-react';
import '../styles/LanguageSwitcher.css';

export default function LanguageSwitcher({ compact = false }) {
    const { i18n, t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const currentLanguage = languages[i18n.language] || languages.en;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const changeLanguage = async (lng) => {
        await i18n.changeLanguage(lng);
        setIsOpen(false);

        // Update user preference in backend (if user is logged in)
        try {
            const token = localStorage.getItem('token');
            if (token) {
                await fetch('/api/auth/update-language', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ language: lng })
                });
            }
        } catch (error) {
            console.error('Failed to update language preference:', error);
        }
    };

    if (compact) {
        return (
            <div className="language-switcher-compact" ref={dropdownRef}>
                <button
                    className="language-button-compact"
                    onClick={() => setIsOpen(!isOpen)}
                    title={t('language.selectLanguage')}
                >
                    <Globe size={20} />
                    <span className="current-lang-code">{i18n.language.toUpperCase()}</span>
                </button>

                {isOpen && (
                    <div className="language-dropdown">
                        {Object.entries(languages).map(([code, lang]) => (
                            <button
                                key={code}
                                className={`language-option ${i18n.language === code ? 'active' : ''}`}
                                onClick={() => changeLanguage(code)}
                            >
                                <span className="lang-flag">{lang.flag}</span>
                                <span className="lang-name">{lang.nativeName}</span>
                                {i18n.language === code && <Check size={16} className="check-icon" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="language-switcher" ref={dropdownRef}>
            <button
                className="language-button"
                onClick={() => setIsOpen(!isOpen)}
                aria-label={t('language.selectLanguage')}
            >
                <Globe size={18} />
                <span className="current-lang">
                    <span className="lang-flag">{currentLanguage.flag}</span>
                    <span className="lang-name">{currentLanguage.nativeName}</span>
                </span>
                <svg
                    className={`dropdown-arrow ${isOpen ? 'open' : ''}`}
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                >
                    <path d="M2 4l4 4 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {isOpen && (
                <div className="language-dropdown">
                    <div className="dropdown-header">
                        {t('language.selectLanguage')}
                    </div>
                    {Object.entries(languages).map(([code, lang]) => (
                        <button
                            key={code}
                            className={`language-option ${i18n.language === code ? 'active' : ''}`}
                            onClick={() => changeLanguage(code)}
                            dir={lang.dir}
                        >
                            <span className="lang-flag">{lang.flag}</span>
                            <div className="lang-info">
                                <span className="lang-native">{lang.nativeName}</span>
                                <span className="lang-english">{lang.name}</span>
                            </div>
                            {i18n.language === code && (
                                <Check size={18} className="check-icon" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
