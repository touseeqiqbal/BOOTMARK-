/**
 * SMTP Configuration Test Script
 * 
 * This script helps verify that the multi-tenant SMTP email system is working correctly.
 * It tests both user-specific SMTP and default backend SMTP configurations.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { sendEmail, getDefaultSmtpConfig } = require('./utils/emailService');

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(60));
    log(title, 'bold');
    console.log('='.repeat(60) + '\n');
}

async function testDefaultSmtpConfig() {
    logSection('TEST 1: Default SMTP Configuration');

    const defaultConfig = getDefaultSmtpConfig();

    if (!defaultConfig) {
        log('❌ No default SMTP configuration found in environment variables', 'red');
        log('   Please set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in .env file', 'yellow');
        return false;
    }

    log('✅ Default SMTP configuration found:', 'green');
    console.log('   Host:', defaultConfig.host);
    console.log('   Port:', defaultConfig.port);
    console.log('   User:', defaultConfig.user);
    console.log('   From:', defaultConfig.from);
    console.log('   Secure:', defaultConfig.secure);

    return true;
}

async function testUserSmtpConfig(userSmtpConfig) {
    logSection('TEST 2: User-Specific SMTP Configuration');

    if (!userSmtpConfig || !userSmtpConfig.host || !userSmtpConfig.user || !userSmtpConfig.password) {
        log('⚠️  No valid user SMTP configuration provided', 'yellow');
        log('   This test will be skipped', 'yellow');
        return false;
    }

    log('✅ User SMTP configuration provided:', 'green');
    console.log('   Host:', userSmtpConfig.host);
    console.log('   Port:', userSmtpConfig.port);
    console.log('   User:', userSmtpConfig.user);
    console.log('   From:', userSmtpConfig.from || userSmtpConfig.user);
    console.log('   Secure:', userSmtpConfig.secure);

    return true;
}

async function testEmailSending(testEmail, userSmtpConfig = null) {
    const testType = userSmtpConfig ? 'User SMTP' : 'Default SMTP';
    logSection(`TEST 3: Sending Email via ${testType}`);

    if (!testEmail) {
        log('❌ No test email address provided', 'red');
        return false;
    }

    log(`Sending test email to: ${testEmail}`, 'blue');
    log('Please wait...', 'blue');

    try {
        const result = await sendEmail({
            to: testEmail,
            subject: `SMTP Test - ${testType} - ${new Date().toLocaleString()}`,
            html: `
        <h2>SMTP Configuration Test</h2>
        <p>This is a test email to verify your SMTP configuration.</p>
        <ul>
          <li><strong>Test Type:</strong> ${testType}</li>
          <li><strong>Timestamp:</strong> ${new Date().toLocaleString()}</li>
          <li><strong>Config Source:</strong> ${userSmtpConfig ? 'User-specific SMTP' : 'Default backend SMTP'}</li>
        </ul>
        <p>If you received this email, your SMTP configuration is working correctly! ✅</p>
      `,
            userSmtpConfig
        });

        if (result.success) {
            log(`✅ Email sent successfully via ${result.configSource} SMTP!`, 'green');
            log(`   Message ID: ${result.messageId}`, 'green');
            log(`   Check your inbox at: ${testEmail}`, 'blue');
            return true;
        } else {
            log(`❌ Failed to send email: ${result.error}`, 'red');
            return false;
        }
    } catch (error) {
        log(`❌ Error sending email: ${error.message}`, 'red');
        return false;
    }
}

async function runTests() {
    log('\n🔍 SMTP Multi-Tenant Configuration Verification', 'bold');
    log('This script will verify your SMTP email configuration\n', 'blue');

    // Get test email from command line argument
    const testEmail = process.argv[2];

    if (!testEmail) {
        log('Usage: node test-smtp.js <test-email-address> [user-smtp-json]', 'yellow');
        log('Example: node test-smtp.js test@example.com', 'yellow');
        log('Example with user SMTP: node test-smtp.js test@example.com \'{"host":"smtp.gmail.com","port":587,"user":"user@gmail.com","password":"pass"}\'', 'yellow');
        process.exit(1);
    }

    // Parse user SMTP config if provided
    let userSmtpConfig = null;
    if (process.argv[3]) {
        try {
            userSmtpConfig = JSON.parse(process.argv[3]);
        } catch (error) {
            log('❌ Invalid JSON for user SMTP config', 'red');
            process.exit(1);
        }
    }

    // Run tests
    const results = {
        defaultConfig: await testDefaultSmtpConfig(),
        userConfig: await testUserSmtpConfig(userSmtpConfig),
        emailSent: false
    };

    // Test email sending
    if (userSmtpConfig && results.userConfig) {
        results.emailSent = await testEmailSending(testEmail, userSmtpConfig);
    } else if (results.defaultConfig) {
        results.emailSent = await testEmailSending(testEmail, null);
    } else {
        log('\n❌ Cannot send test email - no SMTP configuration available', 'red');
    }

    // Summary
    logSection('Test Summary');
    log(`Default SMTP Config: ${results.defaultConfig ? '✅ Found' : '❌ Not Found'}`, results.defaultConfig ? 'green' : 'red');
    log(`User SMTP Config: ${results.userConfig ? '✅ Provided' : '⚠️  Not Provided'}`, results.userConfig ? 'green' : 'yellow');
    log(`Email Sent: ${results.emailSent ? '✅ Success' : '❌ Failed'}`, results.emailSent ? 'green' : 'red');

    console.log('\n' + '='.repeat(60));

    if (results.emailSent) {
        log('\n🎉 All tests passed! Your SMTP configuration is working correctly.', 'green');
        log('Check your email inbox for the test message.\n', 'blue');
    } else {
        log('\n⚠️  Some tests failed. Please check the errors above.', 'yellow');
        log('Make sure your SMTP credentials are correct and the server is accessible.\n', 'yellow');
    }

    process.exit(results.emailSent ? 0 : 1);
}

// Run tests
runTests().catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});
