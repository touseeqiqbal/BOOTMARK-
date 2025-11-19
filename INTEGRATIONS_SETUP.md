# QuickBooks & SMTP Integration Setup Guide

## SMTP Email Configuration

### Setup Instructions

1. **Go to Account Settings**
   - Navigate to `/account-settings` in your app
   - Scroll to "SMTP Email Configuration" section

2. **Configure SMTP Settings**
   - **SMTP Host**: Your email provider's SMTP server
     - Gmail: `smtp.gmail.com`
     - Outlook: `smtp-mail.outlook.com`
     - Custom: Check your email provider's documentation
   
   - **SMTP Port**: 
     - Port 587 (TLS) - Recommended
     - Port 465 (SSL) - Check "Use SSL/TLS" if using this
   
   - **SMTP Username/Email**: Your email address
   
   - **SMTP Password**: 
     - For Gmail: Use an [App Password](https://support.google.com/accounts/answer/185833)
     - For other providers: Use your regular password or app-specific password
   
   - **From Email Address**: The email address that will appear as sender

3. **Test Configuration**
   - Click "Send Test Email" to verify your settings
   - A test email will be sent to your account email address

### Gmail Setup (Recommended)

1. Enable 2-Step Verification on your Google Account
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Generate an app password for "Mail"
4. Use this app password (not your regular password) in SMTP configuration

### Common SMTP Providers

| Provider | Host | Port | SSL/TLS |
|----------|------|------|---------|
| Gmail | smtp.gmail.com | 587 | TLS |
| Outlook | smtp-mail.outlook.com | 587 | TLS |
| Yahoo | smtp.mail.yahoo.com | 587 | TLS |
| SendGrid | smtp.sendgrid.net | 587 | TLS |
| Mailgun | smtp.mailgun.org | 587 | TLS |

## QuickBooks Integration

### Prerequisites

1. **QuickBooks Developer Account**
   - Sign up at [Intuit Developer](https://developer.intuit.com/)
   - Create a new app

2. **Get OAuth Credentials**
   - Go to your app's Keys & OAuth section
   - Copy your Client ID and Client Secret
   - Set Redirect URI: `https://your-domain.com/api/quickbooks/callback`

### Environment Variables

Add these to your `.env` file or Render environment variables:

```env
# QuickBooks OAuth
QUICKBOOKS_CLIENT_ID=your_client_id_here
QUICKBOOKS_CLIENT_SECRET=your_client_secret_here
QUICKBOOKS_ENVIRONMENT=sandbox  # or "production"
QUICKBOOKS_REDIRECT_URI=https://your-domain.com/api/quickbooks/callback

# App URLs
APP_URL=https://your-domain.com
FRONTEND_URL=https://your-domain.com
```

### Setup Steps

1. **Configure Environment Variables**
   - Set `QUICKBOOKS_CLIENT_ID` and `QUICKBOOKS_CLIENT_SECRET`
   - Set `QUICKBOOKS_REDIRECT_URI` to match your app's callback URL
   - Set `QUICKBOOKS_ENVIRONMENT` to `sandbox` for testing or `production` for live

2. **Connect QuickBooks**
   - Go to Account Settings → QuickBooks Integration
   - Click "Connect QuickBooks"
   - You'll be redirected to QuickBooks to authorize
   - After authorization, you'll be redirected back to your app

3. **Sync Form Submissions**
   - Once connected, form submissions can be synced to QuickBooks
   - Submissions will create customers and invoices in QuickBooks

### QuickBooks Sandbox vs Production

- **Sandbox**: Use for testing. Free, but data is reset periodically.
- **Production**: Use for live apps. Requires app approval from Intuit.

### QuickBooks API Scopes

The integration requests these scopes:
- `com.intuit.quickbooks.accounting` - Access to accounting data
- `openid` - User authentication

### Troubleshooting

#### SMTP Issues

**"Failed to send test email"**
- Verify SMTP credentials are correct
- Check if your email provider requires app passwords
- Ensure port and SSL/TLS settings match your provider
- Check firewall/network restrictions

**"Connection timeout"**
- Verify SMTP host and port are correct
- Check if your server allows outbound SMTP connections
- Try different port (587 vs 465)

#### QuickBooks Issues

**"QuickBooks credentials not configured"**
- Ensure `QUICKBOOKS_CLIENT_ID` and `QUICKBOOKS_CLIENT_SECRET` are set
- Restart your server after setting environment variables

**"Failed to connect QuickBooks"**
- Verify redirect URI matches exactly in QuickBooks app settings
- Check that environment (sandbox/production) matches
- Ensure OAuth callback URL is accessible

**"Token expired"**
- QuickBooks tokens expire after 100 days
- Reconnect your QuickBooks account to refresh tokens

### Security Best Practices

1. **SMTP Passwords**
   - Never commit passwords to version control
   - Use environment variables or secure storage
   - Use app-specific passwords when available

2. **QuickBooks Tokens**
   - Tokens are stored in user accounts
   - In production, consider encrypting stored tokens
   - Implement token refresh mechanism

3. **Environment Variables**
   - Keep all credentials in environment variables
   - Use different credentials for development/production
   - Rotate credentials regularly

### API Endpoints

#### SMTP Configuration
- `GET /api/auth/account/smtp` - Get SMTP configuration
- `PUT /api/auth/account/smtp` - Update SMTP configuration
- `POST /api/auth/account/smtp/test` - Test SMTP configuration

#### QuickBooks Integration
- `GET /api/quickbooks/auth-url` - Get QuickBooks OAuth URL
- `GET /api/quickbooks/callback` - OAuth callback handler
- `GET /api/quickbooks/status` - Get connection status
- `POST /api/quickbooks/disconnect` - Disconnect QuickBooks
- `POST /api/quickbooks/sync` - Sync form submissions to QuickBooks

### Support

For issues:
- Check server logs for detailed error messages
- Verify all environment variables are set correctly
- Test SMTP configuration with "Send Test Email"
- Check QuickBooks Developer Dashboard for OAuth errors
