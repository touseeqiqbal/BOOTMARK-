# How to Customize Firebase Email Templates

## Problem
Firebase password reset emails are showing "project-1031623750316" instead of a friendly name like "BootMark" or "Your Company Name".

## Solution: Customize Email Templates in Firebase Console

### Step 1: Access Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **bootmark-53e36**

### Step 2: Navigate to Email Templates
1. In the left sidebar, click **Authentication**
2. Click on the **Templates** tab (at the top)
3. You'll see several email templates:
   - Email address verification
   - Password reset
   - Email address change
   - etc.

### Step 3: Customize Password Reset Email
1. Click on **Password reset** template
2. Click **Edit** or the pencil icon
3. You can customize:
   - **Sender name**: Change from "project-1031623750316" to "BootMark" or your company name
   - **Subject line**: Customize the email subject
   - **Email body**: Customize the message content
   - **Action URL**: The link format (usually keep default)

### Step 4: Update Sender Name
In the **Sender name** field, change:
```
project-1031623750316
```
To:
```
BootMark
```
or
```
Your Company Name
```

### Step 5: Customize Email Content (Optional)
You can also customize the email body to match your branding:

**Example:**
```
Hello,

Follow this link to reset your {{email}} password for your BootMark account.

{{link}}

If you didn't ask to reset your password, you can ignore this email.

Thanks,
The BOOTMARK Team
```

### Step 6: Save Changes
1. Click **Save** or **Publish** to apply changes
2. Test by requesting a password reset to see the new email format

## Additional Customization Options

### Custom Domain (Advanced)
If you want to use a custom email domain (e.g., `noreply@yourcompany.com`):
1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Add your custom domain
3. Configure email sending through Firebase (requires domain verification)

### Email Action URLs
You can also customize where the reset link redirects:
- Default: `https://bootmark-53e36.firebaseapp.com/__/auth/action?...`
- Custom: `https://yourdomain.com/reset-password?...`

To set a custom action URL:
1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Add your domain
3. In the email template, use: `{{link}}` (Firebase will use your authorized domain)

## Quick Reference
- **Firebase Console**: https://console.firebase.google.com/
- **Your Project**: bootmark-53e36
- **Current Sender**: project-1031623750316
- **Recommended Sender**: BootMark

## Notes
- Changes take effect immediately after saving
- All future password reset emails will use the new sender name
- You can customize other email templates (verification, email change, etc.) the same way

