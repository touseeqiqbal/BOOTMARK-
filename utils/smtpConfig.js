const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

/**
 * Get SMTP configuration with fallback logic
 * 1. Try business-specific SMTP settings first
 * 2. Fall back to global app SMTP if business settings not configured
 * 
 * @param {string} userId - The business owner's user ID
 * @returns {Promise<Object>} SMTP configuration object
 */
async function getSMTPConfig(userId) {
    let smtpConfig = null;
    let fromEmail = null;
    let source = 'global';

    // Try to get business-specific SMTP settings
    if (userId) {
        try {
            const db = admin.firestore();
            const userDoc = await db.collection('users').doc(userId).get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                const smtpSettings = userData.smtpSettings;

                // Check if business has configured their own SMTP
                if (smtpSettings && smtpSettings.host && smtpSettings.user && smtpSettings.pass) {
                    console.log(`[SMTP] ✅ Using business-specific SMTP for user: ${userId}`);
                    smtpConfig = {
                        host: smtpSettings.host,
                        port: parseInt(smtpSettings.port) || 587,
                        secure: smtpSettings.secure === true || parseInt(smtpSettings.port) === 465,
                        auth: {
                            user: smtpSettings.user,
                            pass: smtpSettings.pass
                        }
                    };
                    fromEmail = smtpSettings.from || smtpSettings.user;
                    source = 'business';
                }
            }
        } catch (error) {
            console.log(`[SMTP] ⚠️  Business SMTP not configured or error occurred, falling back to global SMTP`);
            console.error('[SMTP] Error:', error.message);
        }
    }

    // Fallback to global SMTP if business SMTP not available
    if (!smtpConfig) {
        console.log(`[SMTP] 📧 Using global SMTP configuration`);

        // Debug: Log what environment variables we can see
        console.log('[SMTP] Environment check:', {
            SMTP_HOST: process.env.SMTP_HOST ? '✓ Set' : '✗ Not set',
            SMTP_USER: process.env.SMTP_USER ? '✓ Set' : '✗ Not set',
            SMTP_PASS: process.env.SMTP_PASS ? '✓ Set' : '✗ Not set',
            SMTP_PORT: process.env.SMTP_PORT || '(using default 587)',
            SMTP_FROM: process.env.SMTP_FROM || '(using SMTP_USER)'
        });

        // Debug: Show actual values (first 4 chars only for security)
        console.log('[SMTP] Actual values:', {
            SMTP_HOST: process.env.SMTP_HOST,
            SMTP_USER: process.env.SMTP_USER,
            SMTP_PASS: process.env.SMTP_PASS ? `${process.env.SMTP_PASS.substring(0, 4)}... (length: ${process.env.SMTP_PASS.length})` : 'undefined',
            SMTP_PORT: process.env.SMTP_PORT,
            SMTP_FROM: process.env.SMTP_FROM
        });

        // Validate global SMTP configuration
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.error('[SMTP] ❌ Global SMTP not configured!');
            console.error('[SMTP] Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in your .env file');
            throw new Error('SMTP configuration is incomplete. Please configure global SMTP settings in .env file or business SMTP settings.');
        }

        smtpConfig = {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT) === 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        };
        fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
        source = 'global';
    }

    // Create transporter
    console.log('[SMTP] Creating transporter with nodemailer:', typeof nodemailer, typeof nodemailer.createTransporter);

    if (typeof nodemailer.createTransporter !== 'function') {
        console.error('[SMTP] nodemailer.createTransporter is not a function!');
        console.error('[SMTP] nodemailer object:', Object.keys(nodemailer));
        throw new Error('nodemailer.createTransporter is not available');
    }

    const transporter = nodemailer.createTransporter(smtpConfig);

    return {
        transporter,
        fromEmail,
        source,
        config: smtpConfig
    };
}

/**
 * Send an email using multi-tenant SMTP configuration
 * Automatically uses business SMTP if configured, otherwise uses global SMTP
 * 
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 * @param {string} options.text - Email plain text content (optional)
 * @param {string} options.userId - Business owner's user ID (for business-specific SMTP)
 * @returns {Promise} Send mail promise
 */
async function sendEmail({ to, subject, html, text, userId }) {
    try {
        const { transporter, fromEmail, source } = await getSMTPConfig(userId);

        const mailOptions = {
            from: fromEmail,
            to,
            subject,
            html
        };

        if (text) {
            mailOptions.text = text;
        }

        const result = await transporter.sendMail(mailOptions);

        console.log(`[Email] ✅ Sent to ${to} from ${fromEmail} using ${source} SMTP`);
        return result;
    } catch (error) {
        console.error('[Email] ❌ Failed to send email:', error);
        throw error;
    }
}

module.exports = {
    getSMTPConfig,
    sendEmail
};
