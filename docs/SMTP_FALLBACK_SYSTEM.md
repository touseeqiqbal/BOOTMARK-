# SMTP Fallback System

## Overview

The email system now uses a **smart fallback mechanism** that automatically uses the best available SMTP configuration:

1. **User SMTP Config** (if configured in Account Settings)
2. **Default/Company SMTP** (from environment variables) - fallback

## How It Works

### Priority Order

1. **User's Personal SMTP** (from Account Settings)
   - If user has configured SMTP in Account Settings → uses that
   - Most personalized (uses user's email address as sender)

2. **Default/Company SMTP** (from environment variables)
   - If user hasn't configured SMTP → automatically falls back to default
   - Configured via environment variables on the server
   - Used for all users who haven't set up personal SMTP

### Environment Variables for Default SMTP

Set these in your server environment (e.g., Render, Heroku, .env file):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-company-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourcompany.com
```

## What This Means

### For Users
- **No configuration needed**: If default SMTP is set up, emails work immediately
- **Optional personalization**: Users can configure their own SMTP in Account Settings for personalized emails
- **Seamless experience**: System automatically uses the best available option

### For Administrators
- **Set up once**: Configure default SMTP in environment variables
- **Works for everyone**: All users can send emails even without personal SMTP
- **User override**: Users can still configure personal SMTP if they want

## Email Features That Use This System

All email sending features automatically use the fallback system:

1. ✅ **Send Form for Entries** - Form link sharing via email
2. ✅ **Password Reset** - User management password resets
3. ✅ **Form Submissions** - Submission notifications
4. ✅ **Invoice Emails** - Invoice sharing
5. ✅ **Business Approvals** - Approval/rejection emails
6. ✅ **Form Invitations** - Collaboration invites
7. ✅ **Custom Emails** - Any email sent through the app

## Configuration

### Setting Up Default SMTP (Server/Admin)

**For Render:**
1. Go to Render Dashboard → Your Service → Environment
2. Add environment variables:
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_SECURE`
   - `SMTP_USER`
   - `SMTP_PASSWORD`
   - `SMTP_FROM`

**For Local Development (.env file):**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
```

### User Personal SMTP (Optional)

Users can configure personal SMTP in:
- **Account Settings** → **SMTP Email Configuration**

If configured, their emails will use their personal SMTP instead of the default.

## Error Handling

If neither user SMTP nor default SMTP is configured:
- Error message: "Email service is not configured. Please configure SMTP settings in Account Settings, or contact your administrator to set up default SMTP configuration."
- Users are guided to either:
  1. Configure their own SMTP in Account Settings, OR
  2. Contact admin to set up default SMTP

## Benefits

1. **Zero Configuration for Users**: Works out of the box if default SMTP is set
2. **Flexibility**: Users can still use personal SMTP if desired
3. **Reliability**: Always tries to use the best available option
4. **Admin Control**: Company can set up default SMTP for all users
5. **User Control**: Users can override with personal SMTP

## Testing

To test the fallback system:

1. **Test with user SMTP:**
   - Configure SMTP in Account Settings
   - Send a form email
   - Should use your personal SMTP

2. **Test with default SMTP:**
   - Remove/clear your SMTP config in Account Settings
   - Send a form email
   - Should automatically use default SMTP (if configured)

3. **Test with no SMTP:**
   - Remove both user and default SMTP
   - Should show helpful error message

## Notes

- Default SMTP is read from environment variables at server startup
- User SMTP is stored in the user's account data
- The system automatically chooses the best available option
- No code changes needed - works automatically for all email features

