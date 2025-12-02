# SMTP Setup Guide - Complete Implementation

This document explains how SMTP is now configured across all apps in the backend and how to use custom email functionality.

## Overview

The backend now supports **per-user SMTP configuration** throughout all applications. Each user can configure their own SMTP settings, and all emails sent from their account will use their personal SMTP configuration.

## Features

1. **Per-User SMTP Configuration**: Each user can set up their own SMTP settings in Account Settings
2. **Automatic SMTP Usage**: All emails (form submissions, notifications) automatically use the form owner's SMTP config
3. **Custom Email Endpoint**: New API endpoint for sending custom emails from within the app
4. **Fallback Support**: Falls back to global environment variables if user SMTP config is not available

## Backend Implementation

### 1. Email Service (`utils/emailService.js`)

The email service has been enhanced to support per-user SMTP configuration:

- **`sendEmail()`**: Now accepts an optional `userSmtpConfig` parameter
- **`sendSubmissionNotification()`**: Now accepts and uses `userSmtpConfig` for form submission emails
- **`createTransporterFromConfig()`**: New helper function to create transporters from user configs

### 2. Form Submission Emails (`routes/public.js`)

When a form is submitted:
- The system automatically fetches the form owner's SMTP configuration
- All notification emails (to owner and submitter) use the form owner's SMTP settings
- Falls back to global SMTP config if user config is not available

### 3. Custom Email Endpoint (`routes/auth.js`)

New endpoint for sending custom emails from within the app:

**Endpoint**: `POST /api/auth/account/send-email`

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "to": "recipient@example.com",  // or ["email1@example.com", "email2@example.com"] for multiple
  "subject": "Your Email Subject",
  "html": "<p>Your HTML email content</p>",  // Optional if text is provided
  "text": "Your plain text email content"  // Optional if html is provided
}
```

**Response**:
```json
{
  "success": true,
  "message": "Email sent successfully!",
  "messageId": "message-id-from-smtp-server"
}
```

**Error Response**:
```json
{
  "error": "SMTP configuration not found or incomplete",
  "message": "Please configure your SMTP settings in Account Settings before sending emails."
}
```

### 4. SMTP Test Endpoint (`routes/auth.js`)

The existing test endpoint has been updated to use the new per-user SMTP system:

**Endpoint**: `POST /api/auth/account/smtp/test`

This endpoint now uses the user's SMTP config directly without modifying environment variables.

## How It Works

### For Form Submissions

1. User submits a form
2. System checks if form owner has SMTP configuration
3. If available, uses form owner's SMTP config
4. If not available, falls back to global environment variables
5. Sends notification emails using the appropriate SMTP settings

### For Custom Emails

1. User calls `/api/auth/account/send-email` endpoint
2. System verifies user has SMTP configuration
3. Validates email format and required fields
4. Sends email using user's SMTP configuration
5. Returns success/error response

## Configuration

### Setting Up User SMTP Configuration

Users can configure their SMTP settings through the Account Settings page in the frontend, or via API:

**Get SMTP Config**: `GET /api/auth/account/smtp`
**Update SMTP Config**: `PUT /api/auth/account/smtp`

**Request Body for Update**:
```json
{
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "user": "your-email@gmail.com",
  "password": "your-app-password",
  "from": "your-email@gmail.com"
}
```

### Global SMTP Configuration (Fallback)

If a user hasn't configured their SMTP settings, the system falls back to environment variables:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
```

## Usage Examples

### Frontend: Sending Custom Email

```javascript
// Using the API utility
const response = await api.post('/auth/account/send-email', {
  to: 'customer@example.com',
  subject: 'Welcome to Our Service',
  html: '<h1>Welcome!</h1><p>Thank you for joining us.</p>',
  text: 'Welcome! Thank you for joining us.'
});

if (response.data.success) {
  console.log('Email sent:', response.data.messageId);
}
```

### Backend: Using Email Service Directly

```javascript
const { sendEmail } = require('./utils/emailService');

// With user SMTP config
const result = await sendEmail({
  to: 'recipient@example.com',
  subject: 'Test Email',
  html: '<p>This is a test</p>',
  userSmtpConfig: user.smtpConfig // User's SMTP configuration
});

// Without user config (uses global/env config)
const result2 = await sendEmail({
  to: 'recipient@example.com',
  subject: 'Test Email',
  html: '<p>This is a test</p>'
});
```

## Benefits

1. **Multi-User Support**: Each user can use their own email provider
2. **No Global Dependency**: System works even if global SMTP is not configured
3. **Flexibility**: Users can switch email providers without affecting others
4. **Security**: Each user's SMTP credentials are stored separately
5. **Customization**: Users can send custom emails from within the app

## Testing

1. **Test SMTP Configuration**: Use `POST /api/auth/account/smtp/test` to verify your SMTP settings
2. **Test Custom Email**: Use `POST /api/auth/account/send-email` to send a test email
3. **Test Form Submissions**: Submit a form with email notifications enabled

## Troubleshooting

### Email Not Sending

1. Verify SMTP configuration is complete (host, port, user, password)
2. Check SMTP credentials are correct
3. Ensure SMTP server allows connections from your server
4. Check server logs for detailed error messages

### Using Gmail

1. Enable 2-Factor Authentication
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the app password (not your regular password) in SMTP configuration

### Common SMTP Providers

| Provider | Host | Port | Secure |
|----------|------|------|--------|
| Gmail | smtp.gmail.com | 587 | false (TLS) |
| Outlook | smtp-mail.outlook.com | 587 | false (TLS) |
| Yahoo | smtp.mail.yahoo.com | 587 | false (TLS) |
| SendGrid | smtp.sendgrid.net | 587 | false (TLS) |
| Mailgun | smtp.mailgun.org | 587 | false (TLS) |

## API Endpoints Summary

- `GET /api/auth/account/smtp` - Get user's SMTP configuration
- `PUT /api/auth/account/smtp` - Update user's SMTP configuration
- `POST /api/auth/account/smtp/test` - Test SMTP configuration
- `POST /api/auth/account/send-email` - Send custom email (NEW)

## Notes

- All SMTP passwords are stored securely in the user's account
- Passwords are never returned in API responses (only `passwordSet` boolean)
- The system automatically uses the form owner's SMTP config for submission notifications
- Custom emails require the user to have SMTP configuration set up

