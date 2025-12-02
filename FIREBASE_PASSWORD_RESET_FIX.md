# Firebase Password Reset Fix Guide

## Common Issues and Solutions

If password reset is not working, follow these steps:

## Step 1: Configure Authorized Domains in Firebase Console

**This is the #1 most common issue!**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Add your domains:
   - `localhost` (for local development)
   - Your production domain (e.g., `yourdomain.com`, `your-app.vercel.app`)
   - Any other domains where your app is hosted

**Important**: Without authorized domains, Firebase will block password reset emails!

## Step 2: Configure Email Template Action URL

1. In Firebase Console, go to **Authentication** → **Templates**
2. Click on **Password reset** template
3. In the **Action URL** field, set it to:
   - For local development: `http://localhost:5173/reset-password` (or your dev port)
   - For production: `https://yourdomain.com/reset-password`
4. Click **Save**

**Note**: The Action URL must match the route in your app (`/reset-password`)

## Step 3: Verify Email/Password Provider is Enabled

1. Go to **Authentication** → **Sign-in method**
2. Make sure **Email/Password** is enabled
3. Click on it and verify:
   - ✅ **Email/Password** is enabled
   - ✅ **Password** (not just Email link) is enabled

## Step 4: Test the Flow

1. **Test Forgot Password**:
   - Go to `/forgot-password` page
   - Enter a valid email address
   - Check browser console for any errors
   - Check that success message appears

2. **Check Email**:
   - Check your inbox (and spam folder)
   - Look for email from Firebase
   - Click the reset link

3. **Test Reset Password**:
   - The link should redirect to `/reset-password?oobCode=...`
   - Enter new password
   - Check browser console for any errors

## Step 5: Debugging Tips

### Check Browser Console

Open browser DevTools (F12) and check the Console tab for:
- Any Firebase errors
- Network errors
- CORS errors

### Common Error Messages

1. **"auth/user-not-found"**
   - The email doesn't exist in Firebase
   - Solution: Create an account first

2. **"auth/invalid-action-code"**
   - The reset link is invalid or expired
   - Solution: Request a new reset link

3. **"auth/expired-action-code"**
   - The reset link has expired (usually after 1 hour)
   - Solution: Request a new reset link

4. **"Failed to send password reset email"**
   - Check authorized domains
   - Check email template configuration
   - Check Firebase project settings

### Check Network Tab

1. Open DevTools → Network tab
2. Try sending password reset email
3. Look for requests to Firebase:
   - Should see request to `identitytoolkit.googleapis.com`
   - Check if it returns 200 OK or an error

## Step 6: Verify Code Implementation

The code has been updated to:
- ✅ Better handle URL parameters (`oobCode` and `code`)
- ✅ Provide better error messages
- ✅ Add console logging for debugging
- ✅ Handle Firebase deep links properly

## Step 7: Production Deployment

When deploying to production:

1. **Update Authorized Domains**:
   - Add your production domain to Firebase Console

2. **Update Email Template**:
   - Set Action URL to your production domain: `https://yourdomain.com/reset-password`

3. **Update Environment Variables** (if using):
   - Make sure `VITE_FIREBASE_*` variables are set correctly

4. **Test in Production**:
   - Test the full password reset flow
   - Check that emails are received
   - Verify reset link works

## Quick Checklist

- [ ] Authorized domains configured in Firebase Console
- [ ] Email template Action URL set correctly
- [ ] Email/Password provider enabled
- [ ] Password (not just Email link) is enabled
- [ ] Tested forgot password flow
- [ ] Received password reset email
- [ ] Reset link redirects correctly
- [ ] Password reset completes successfully
- [ ] Can login with new password

## Still Not Working?

1. **Check Firebase Console → Authentication → Users**:
   - Verify the user exists
   - Check if email is verified

2. **Check Firebase Console → Project Settings → General**:
   - Verify Firebase config matches your code
   - Check API keys are correct

3. **Check Email Service**:
   - Firebase uses SendGrid for emails
   - Check if there are any email delivery issues
   - Try a different email address

4. **Check Browser Console**:
   - Look for specific error codes
   - Check network requests
   - Verify Firebase SDK is loaded

5. **Test with Different Browser**:
   - Sometimes browser extensions can interfere
   - Try incognito/private mode

## Code Changes Made

The following improvements were made to the code:

1. **firebase.js**:
   - Improved `actionCodeSettings` configuration
   - Better URL handling for different environments

2. **ForgotPassword.jsx**:
   - Better error handling and messages
   - Email validation
   - Console logging for debugging

3. **ResetPassword.jsx**:
   - Better URL parameter handling
   - Support for both `oobCode` and `code` parameters
   - Improved error messages
   - Console logging for debugging

## Need More Help?

If you're still having issues:
1. Check Firebase Console for any error messages
2. Review browser console logs
3. Verify all configuration steps above
4. Test with a fresh user account

