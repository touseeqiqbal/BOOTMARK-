# Setting Up Global SMTP in Render

This guide will walk you through setting up global SMTP configuration in Render so your application can send emails using environment variables as a fallback when users haven't configured their own SMTP settings.

## Why Global SMTP?

- **Fallback**: If a user hasn't configured their own SMTP settings, the system will use the global SMTP configuration
- **System Emails**: Useful for system-wide notifications and emails
- **Default Provider**: Ensures email functionality works even without per-user configuration

## Step-by-Step Instructions

### Step 1: Access Render Dashboard

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Log in to your account
3. Select your web service (e.g., "bootmark-landscaping-management")

### Step 2: Navigate to Environment Variables

1. In your service dashboard, click on **"Environment"** in the left sidebar
2. Click on **"Environment Variables"** tab
3. You'll see a list of existing environment variables

### Step 3: Add SMTP Environment Variables

Click **"Add Environment Variable"** and add each of the following variables:

#### Required SMTP Variables:

1. **SMTP_HOST**
   - **Key**: `SMTP_HOST`
   - **Value**: Your SMTP server hostname
   - **Examples**:
     - Gmail: `smtp.gmail.com`
     - Outlook: `smtp-mail.outlook.com`
     - SendGrid: `smtp.sendgrid.net`
     - Mailgun: `smtp.mailgun.org`

2. **SMTP_PORT**
   - **Key**: `SMTP_PORT`
   - **Value**: SMTP port number (usually `587` for TLS)
   - **Common values**: `587` (TLS), `465` (SSL), `25` (unencrypted)

3. **SMTP_SECURE**
   - **Key**: `SMTP_SECURE`
   - **Value**: `false` for TLS (port 587) or `true` for SSL (port 465)
   - **Note**: For port 587, use `false`. For port 465, use `true`.

4. **SMTP_USER**
   - **Key**: `SMTP_USER`
   - **Value**: Your SMTP username/email address
   - **Example**: `your-email@gmail.com`

5. **SMTP_PASSWORD**
   - **Key**: `SMTP_PASSWORD`
   - **Value**: Your SMTP password or app password
   - **Important**: For Gmail, use an App Password (not your regular password)

6. **SMTP_FROM**
   - **Key**: `SMTP_FROM`
   - **Value**: The email address that will appear as the sender
   - **Example**: `your-email@gmail.com` or `noreply@yourdomain.com`

### Step 4: Save and Redeploy

1. After adding all variables, click **"Save Changes"**
2. Render will automatically trigger a new deployment
3. Wait for the deployment to complete (check the "Events" tab)

### Step 5: Verify Setup

1. Check the deployment logs in Render Dashboard
2. Look for: `Email service initialized (environment config)`
3. If you see this message, your SMTP is configured correctly!

## Provider-Specific Setup

### Gmail Setup

**Step 1: Enable 2-Factor Authentication**
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification if not already enabled

**Step 2: Generate App Password**
1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" and "Other (Custom name)"
3. Enter "BootMark Render" as the name
4. Click "Generate"
5. Copy the 16-character password (you'll only see it once!)

**Step 3: Add to Render**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
SMTP_FROM=your-email@gmail.com
```

### Outlook/Office 365 Setup

```
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-outlook-password
SMTP_FROM=your-email@outlook.com
```

**Note**: For Office 365 business accounts, you might need to use:
- Host: `smtp.office365.com`
- Port: `587`

### SendGrid Setup

**Step 1: Create SendGrid Account**
1. Sign up at [SendGrid](https://sendgrid.com)
2. Verify your email address
3. Create an API Key in Settings → API Keys

**Step 2: Add to Render**
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=your-verified-email@example.com
```

**Important**: 
- `SMTP_USER` must be exactly `apikey` (lowercase)
- `SMTP_PASSWORD` is your SendGrid API key
- `SMTP_FROM` must be a verified email in SendGrid

### Mailgun Setup

**Step 1: Create Mailgun Account**
1. Sign up at [Mailgun](https://mailgun.com)
2. Verify your domain
3. Get SMTP credentials from Dashboard → Sending → SMTP credentials

**Step 2: Add to Render**
```
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailgun-username
SMTP_PASSWORD=your-mailgun-password
SMTP_FROM=your-verified-email@yourdomain.com
```

### Yahoo Mail Setup

```
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@yahoo.com
```

**Note**: Yahoo also requires an App Password (similar to Gmail)

## Common SMTP Providers Reference

| Provider | Host | Port | Secure | Notes |
|----------|------|------|--------|-------|
| Gmail | smtp.gmail.com | 587 | false | Requires App Password |
| Outlook | smtp-mail.outlook.com | 587 | false | Use regular password |
| Office 365 | smtp.office365.com | 587 | false | Business accounts |
| Yahoo | smtp.mail.yahoo.com | 587 | false | Requires App Password |
| SendGrid | smtp.sendgrid.net | 587 | false | User: `apikey` |
| Mailgun | smtp.mailgun.org | 587 | false | Requires domain verification |
| Zoho | smtp.zoho.com | 587 | false | Requires App Password |

## Testing Your SMTP Configuration

### Option 1: Test via API (After Deployment)

Once your service is deployed, you can test the SMTP configuration:

1. **Configure a user's SMTP** (optional - to test per-user config)
2. **Use the test endpoint**: `POST /api/auth/account/smtp/test`
3. Or **send a custom email**: `POST /api/auth/account/send-email`

### Option 2: Check Logs

After deployment, check Render logs for:
- ✅ `Email service initialized (environment config)` - Success!
- ❌ `Email service not configured - SMTP credentials missing` - Check your variables

## Troubleshooting

### Issue: "Email service not configured"

**Solution**:
1. Verify all 6 SMTP variables are set in Render
2. Check that values don't have extra spaces or quotes
3. Ensure `SMTP_PASSWORD` is correct (for Gmail, use App Password)
4. Redeploy your service after adding variables

### Issue: "Authentication failed"

**Solution**:
1. **Gmail**: Make sure you're using an App Password, not your regular password
2. **SendGrid**: Verify `SMTP_USER` is exactly `apikey` (lowercase)
3. **Mailgun**: Check that your domain is verified
4. Verify credentials are correct (no typos)

### Issue: "Connection timeout"

**Solution**:
1. Check that `SMTP_HOST` is correct
2. Verify `SMTP_PORT` matches your provider's requirements
3. Some providers block connections from certain IPs - check your provider's documentation
4. Try using port 465 with `SMTP_SECURE=true` if 587 doesn't work

### Issue: "Email sent but not received"

**Solution**:
1. Check spam/junk folder
2. Verify `SMTP_FROM` email is valid
3. Check sender reputation (for new accounts)
4. Verify recipient email is correct

## Security Best Practices

1. **Never commit SMTP credentials to Git**
   - All SMTP variables should only be in Render Dashboard
   - Never add them to `render.yaml` or commit to repository

2. **Use App Passwords**
   - For Gmail, Yahoo, and similar providers, always use App Passwords
   - Never use your main account password

3. **Rotate Passwords Regularly**
   - Change SMTP passwords periodically
   - If compromised, regenerate immediately

4. **Use Dedicated Email Accounts**
   - Consider using a dedicated email account for sending system emails
   - Don't use personal email accounts for production

5. **Monitor Email Activity**
   - Check your email provider's activity logs
   - Set up alerts for unusual activity

## Using render.yaml (Optional)

If you prefer to define SMTP variables in `render.yaml`, you can add them like this:

```yaml
services:
  - type: web
    name: bootmark-landscaping-management
    env: node
    envVars:
      - key: SMTP_HOST
        sync: false  # Set to false so you can set the value in Render Dashboard
      - key: SMTP_PORT
        sync: false
      - key: SMTP_SECURE
        sync: false
      - key: SMTP_USER
        sync: false
      - key: SMTP_PASSWORD
        sync: false
      - key: SMTP_FROM
        sync: false
```

**Note**: With `sync: false`, you still need to set the actual values in Render Dashboard. The `render.yaml` just declares that these variables exist.

## Verification Checklist

After setup, verify:

- [ ] All 6 SMTP variables are set in Render Dashboard
- [ ] Values are correct (no typos, correct ports)
- [ ] Service has been redeployed after adding variables
- [ ] Logs show "Email service initialized (environment config)"
- [ ] Test email can be sent successfully
- [ ] Form submission emails work (if email notifications enabled)

## Next Steps

After setting up global SMTP:

1. **Test the configuration** using the test endpoint
2. **Configure per-user SMTP** (optional) - users can override global settings
3. **Enable email notifications** in your forms
4. **Monitor email delivery** in your email provider's dashboard

## Support

If you encounter issues:

1. Check Render deployment logs
2. Verify all environment variables are set correctly
3. Test SMTP credentials with a simple email client first
4. Check your email provider's documentation for specific requirements
5. Review the main [RENDER_DEPLOY.md](./RENDER_DEPLOY.md) for general deployment help

## Quick Reference

**Minimum Required Variables:**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
```

**Render Dashboard Path:**
```
Dashboard → Your Service → Environment → Environment Variables
```

