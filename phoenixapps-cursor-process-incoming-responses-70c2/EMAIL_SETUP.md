# Email Configuration Guide - Phoenix Form Builder

This guide will help you set up email notifications for form submissions.

## Quick Setup

### Step 1: Create Environment Variables

Create a `.env` file in the root directory of your project (same level as `server.js`):

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
```

### Step 2: Get Email Credentials

#### For Gmail:

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "Phoenix Form Builder"
   - Copy the 16-character password
3. **Use in `.env`**:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-16-char-app-password
   SMTP_FROM=your-email@gmail.com
   ```

#### For Outlook/Office 365:

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
SMTP_FROM=your-email@outlook.com
```

#### For SendGrid:

1. Sign up at https://sendgrid.com
2. Create API Key
3. Use in `.env`:
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=apikey
   SMTP_PASSWORD=your-sendgrid-api-key
   SMTP_FROM=your-verified-email@example.com
   ```

#### For Mailgun:

1. Sign up at https://mailgun.com
2. Get SMTP credentials from dashboard
3. Use in `.env`:
   ```env
   SMTP_HOST=smtp.mailgun.org
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-mailgun-username
   SMTP_PASSWORD=your-mailgun-password
   SMTP_FROM=your-verified-email@yourdomain.com
   ```

### Step 3: Restart Server

After setting up `.env` file:

```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

You should see: `Email service initialized` in the console.

### Step 4: Configure Form Email Settings

1. Open your form in Form Builder
2. Click **Settings** button
3. Scroll to **Email Notifications** section
4. Enable email notifications
5. Configure:
   - **Notify Owner**: Check to receive emails when form is submitted
   - **Owner Email**: Your email address
   - **Notify Submitter**: Check to send confirmation to submitter
   - **Email Field**: Select which email field from your form to use for submitter notifications
6. Click **Save Settings**

## Testing Email

1. Create a test form with an email field
2. Enable email notifications in form settings
3. Share the form and submit it
4. Check your email inbox (and spam folder)

## Troubleshooting

### "Email service not configured" warning

- Check that `.env` file exists in project root
- Verify all SMTP variables are set correctly
- Restart the server after adding/changing `.env` file

### Emails not sending

1. **Check server logs** for error messages
2. **Verify SMTP credentials** are correct
3. **Check spam folder** - emails might be filtered
4. **Test SMTP connection**:
   ```bash
   # You can test with a simple Node script
   node -e "const nodemailer = require('nodemailer'); const transporter = nodemailer.createTransport({host: process.env.SMTP_HOST, port: process.env.SMTP_PORT, secure: false, auth: {user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD}}); transporter.verify().then(() => console.log('SMTP OK')).catch(console.error);"
   ```

### Gmail "Less secure app" error

- Use **App Password** instead of regular password
- Make sure 2FA is enabled on your Google account

### For Vercel Deployment

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all SMTP variables:
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_SECURE`
   - `SMTP_USER`
   - `SMTP_PASSWORD`
   - `SMTP_FROM`
3. Redeploy your application

## Email Templates

The system sends two types of emails:

1. **Owner Notification**: Sent to form owner when someone submits the form
   - Includes all submission data
   - Formatted HTML email

2. **Submitter Confirmation**: Sent to the person who submitted the form
   - Confirmation message
   - Summary of their submission

## Security Notes

- **Never commit `.env` file** to version control
- Use **App Passwords** for Gmail (not your main password)
- Keep SMTP credentials secure
- Consider using environment-specific credentials for production

## Example `.env` File

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=myformbuilder@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop
SMTP_FROM=myformbuilder@gmail.com

# Firebase (if not already set)
VITE_FIREBASE_API_KEY=your-key
VITE_FIREBASE_AUTH_DOMAIN=your-domain
# ... other Firebase vars
```

## Support

If you continue to have issues:
1. Check server console for error messages
2. Verify SMTP settings match your email provider's requirements
3. Test with a simple email client first
4. Check firewall/network restrictions
