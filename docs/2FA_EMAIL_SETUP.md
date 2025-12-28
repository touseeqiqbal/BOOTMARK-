# Email-Based Two-Factor Authentication (2FA)

## Overview

BOOTMARK now supports **email-based Two-Factor Authentication (2FA)** using Firebase Authentication. When enabled, users receive a 6-digit verification code via email each time they log in, providing an additional layer of security.

## How It Works

1. **User logs in** with email/password or Google
2. **System checks** if 2FA is enabled for the user
3. **If enabled:**
   - A 6-digit code is automatically generated and sent to the user's email
   - User is redirected to the 2FA verification page
   - User enters the code to complete login
4. **If disabled:** Normal login proceeds

## Features

- ✅ **6-digit codes** sent via email
- ✅ **10-minute expiration** for security
- ✅ **Auto-focus** code input fields
- ✅ **Paste support** for easy code entry
- ✅ **Resend code** functionality
- ✅ **Countdown timer** showing time remaining
- ✅ **Works with both** email/password and Google login
- ✅ **Persistent storage** in Firestore/database

## User Guide

### Enabling 2FA

1. Go to **Account Settings** → **Security** section
2. Check the box: **"Enable Two-Factor Authentication (Email-based)"**
3. 2FA is now enabled for your account

### Logging In with 2FA

1. Enter your email and password (or use Google login)
2. You'll be redirected to the 2FA verification page
3. Check your email for the 6-digit code
4. Enter the code in the verification page
5. Click "Verify Code" to complete login

### Resending Codes

- Click "Resend Code" if you didn't receive the email
- Codes expire after 10 minutes
- You can request a new code if needed

## Technical Implementation

### Backend Endpoints

- `POST /api/auth/2fa/send-code` - Generate and send 2FA code
- `POST /api/auth/2fa/verify-code` - Verify the 6-digit code
- `PUT /api/auth/2fa/toggle` - Enable/disable 2FA for user

### Frontend Components

- `Verify2FA.jsx` - 2FA verification page
- Updated `Login.jsx` - Handles 2FA flow
- Updated `AccountSettings.jsx` - Enable/disable 2FA toggle
- Updated `AuthContext.jsx` - 2FA verification logic

### Data Storage

- `twoFactorEnabled` - Boolean flag in user document
- `twoFactorCode` - Temporary 6-digit code (stored until verified or expired)
- `twoFactorCodeExpires` - Expiration timestamp
- `twoFactorVerifiedAt` - Last successful verification timestamp

## Security Features

- ✅ Codes expire after 10 minutes
- ✅ Codes are single-use (cleared after verification)
- ✅ Codes are stored securely in database
- ✅ Invalid code attempts are logged
- ✅ Session tokens are temporary until 2FA is verified

## Email Template

The 2FA email includes:
- Large, easy-to-read 6-digit code
- 10-minute expiration notice
- Security warning if code wasn't requested
- Professional styling

## Requirements

- SMTP must be configured (either user-specific or default)
- User must have a verified email address
- Firebase Authentication must be set up

## Troubleshooting

### Code Not Received

1. Check spam/junk folder
2. Verify email address is correct
3. Click "Resend Code" button
4. Check SMTP configuration in Account Settings

### Code Expired

1. Click "Resend Code" to get a new code
2. New codes are valid for 10 minutes

### Can't Enable 2FA

- Ensure your email is verified
- Check that SMTP is configured
- Verify you're logged in with the correct account

## Notes

- 2FA codes are sent using the same email system as other notifications
- Uses user's SMTP config if available, otherwise falls back to default SMTP
- Codes are stored temporarily and automatically cleaned up after expiration
- 2FA works with both Firestore and JSON file storage
