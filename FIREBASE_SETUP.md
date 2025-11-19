# Firebase Authentication Setup Guide

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name and follow the setup wizard
4. Enable Google Analytics (optional)

## Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication** → **Get started**
2. Click **Sign-in method** tab
3. Enable **Email/Password** provider
   - Enable "Email link (passwordless sign-in)" if desired (optional)
   - Make sure "Password" is enabled
4. Enable **Google** provider
   - Add your project's support email
   - Save the configuration
5. Configure **Email Templates** (for password reset):
   - Go to **Authentication** → **Templates**
   - Customize the "Password reset" email template if desired
   - The default template will work fine

## Step 3: Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to **Your apps** section
3. Click the **Web** icon (`</>`) to add a web app
4. Register your app with a nickname
5. Copy the Firebase configuration object

## Step 4: Configure Frontend

1. Create a `.env` file in the `/workspace/public` directory:

```env
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id
```

2. Or update `/workspace/public/src/utils/firebase.js` directly with your config:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
}
```

## Step 5: Configure Backend (Optional but Recommended)

For production, you should verify Firebase tokens on the backend:

1. In Firebase Console, go to **Project Settings** → **Service Accounts**
2. Click **Generate new private key**
3. Save the JSON file securely
4. Set environment variable:

```bash
export FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
```

Or add to your `.env` file:
```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

## Step 6: Install Dependencies

```bash
cd /workspace/public
npm install
```

## Step 7: Test Authentication

1. Start the application
2. Try signing up with email/password
3. Try signing in with Google
4. Verify users are created in Firebase Console → Authentication

## Troubleshooting

### "Firebase not initialized" warning
- This is normal if you haven't configured Firebase Admin SDK
- Frontend authentication will still work
- Backend token verification will be skipped

### Google Sign-In not working
- Make sure Google provider is enabled in Firebase Console
- Check that your domain is authorized in Firebase Console
- Verify Firebase config values are correct

### CORS errors
- Add your domain to Firebase Console → Authentication → Settings → Authorized domains

### Password Reset Not Working
- Make sure Email/Password provider is enabled
- Check that your domain is authorized in Firebase Console
- Verify the reset link redirects to `/reset-password` with `oobCode` parameter
- Customize the email template in Firebase Console → Authentication → Templates → Password reset
  - Update the action URL to: `https://yourdomain.com/reset-password`

## Password Reset Flow

1. User clicks "Forgot password?" on login page
2. User enters email address
3. Firebase sends password reset email
4. User clicks link in email
5. Link redirects to `/reset-password?oobCode=...`
6. User enters new password
7. Password is reset and user is redirected to login

## Security Notes

- Never commit `.env` files or Firebase config with real credentials
- Use environment variables in production
- Enable Firebase App Check for additional security
- Set up proper Firebase Security Rules
