import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from './api';

const CustomizationContext = createContext();

export function CustomizationProvider({ children }) {
    const { user } = useAuth();
    const [customization, setCustomization] = useState({
        // Branding
        logo: '',
        favicon: '',
        companyName: '',
        primaryColor: '#4f46e5',
        secondaryColor: '#667eea',
        accentColor: '#764ba2',

        // App Settings
        appName: 'BOOTMARK',
        appDescription: 'Landscaping Management Platform',
        theme: 'light',
        fontFamily: 'Inter',

        // Features
        features: {
            forms: true,
            analytics: true,
            invoices: true,
            customers: true,
            workflows: true,
            teamCollaboration: true,
            reports: true,
            integrations: true,
            scheduling: true,
            employees: true,
            materials: true,
            workOrders: true,
            properties: true,
            contracts: true,
            estimates: true
        },

        // Notifications
        notifications: {
            email: true,
            sms: false,
            push: false
        }
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.businessId) {
            fetchCustomization();
        } else {
            setLoading(false);
        }
    }, [user?.businessId]);

    const fetchCustomization = async () => {
        try {
            const response = await api.get('/businesses/my-business');
            if (response.data.customization) {
                setCustomization(prev => ({
                    ...prev,
                    ...response.data.customization,
                    features: {
                        ...prev.features,
                        ...response.data.customization.features
                    },
                    notifications: {
                        ...prev.notifications,
                        ...response.data.customization.notifications
                    }
                }));

                // Apply theme and colors immediately
                applyCustomization(response.data.customization);
            }
        } catch (error) {
            console.error('Failed to fetch customization:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyCustomization = (custom) => {
        const root = document.documentElement;

        // Apply colors
        if (custom.primaryColor) {
            root.style.setProperty('--primary-color', custom.primaryColor);
        }
        if (custom.secondaryColor) {
            root.style.setProperty('--secondary-color', custom.secondaryColor);
        }
        if (custom.accentColor) {
            root.style.setProperty('--accent-color', custom.accentColor);
        }

        // Apply theme
        if (custom.theme) {
            if (custom.theme === 'dark') {
                document.body.classList.add('dark-theme');
                document.body.classList.remove('light-theme');
            } else if (custom.theme === 'light') {
                document.body.classList.add('light-theme');
                document.body.classList.remove('dark-theme');
            } else if (custom.theme === 'auto') {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (prefersDark) {
                    document.body.classList.add('dark-theme');
                    document.body.classList.remove('light-theme');
                } else {
                    document.body.classList.add('light-theme');
                    document.body.classList.remove('dark-theme');
                }
            }
        }

        // Apply font
        if (custom.fontFamily) {
            root.style.setProperty('--font-family', custom.fontFamily);
        }

        // Apply favicon
        if (custom.favicon) {
            const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
            link.type = 'image/x-icon';
            link.rel = 'shortcut icon';
            link.href = custom.favicon;
            document.getElementsByTagName('head')[0].appendChild(link);
        }

        // Apply page title
        if (custom.appName) {
            document.title = custom.appName;
        }
    };

    const updateCustomization = (newCustomization) => {
        setCustomization(newCustomization);
        applyCustomization(newCustomization);
    };

    const isFeatureEnabled = (featureName) => {
        return customization.features[featureName] !== false;
    };

    const value = {
        customization,
        updateCustomization,
        isFeatureEnabled,
        loading,
        refreshCustomization: fetchCustomization
    };

    return (
        <CustomizationContext.Provider value={value}>
            {children}
        </CustomizationContext.Provider>
    );
}

export function useCustomization() {
    const context = useContext(CustomizationContext);
    if (!context) {
        throw new Error('useCustomization must be used within CustomizationProvider');
    }
    return context;
}
