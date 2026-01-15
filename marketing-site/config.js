// Marketing Site Configuration
// This file sets the app URL based on the environment

const config = {
    // Change this to your production app URL when deploying
    production: {
        appUrl: 'https://your-app-name.onrender.com' // Replace with your actual Render URL
    },
    development: {
        appUrl: 'http://localhost:3000'
    }
};

// Detect environment (production if served from a domain, development if localhost)
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const APP_URL = isProduction ? config.production.appUrl : config.development.appUrl;

// Export for use in other scripts
window.BOOTMARK_CONFIG = {
    appUrl: APP_URL
};

console.log('BOOTMARK Marketing Site - App URL:', APP_URL);
