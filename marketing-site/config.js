// Marketing Site Configuration
// Since the marketing site and app are on the same server,
// we can use relative URLs (no need for full domain)

const config = {
    // For production on Render (same server)
    production: {
        appUrl: '' // Empty string = same server, relative URLs
    },
    // For development (separate servers)
    development: {
        appUrl: 'http://localhost:3000'
    }
};

// Detect environment
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const APP_URL = isProduction ? config.production.appUrl : config.development.appUrl;

// Export for use in other scripts
window.BOOTMARK_CONFIG = {
    appUrl: APP_URL
};

console.log('BOOTMARK Marketing Site - Environment:', isProduction ? 'Production' : 'Development');
console.log('BOOTMARK Marketing Site - App URL:', APP_URL || 'Same server (relative URLs)');
