# Firestore Security Rules Setup Guide

## Problem

If you see "Error loading documents" in the Firebase Console when viewing Firestore collections, it's because the security rules are blocking access. The Firebase Console UI uses your logged-in user's authentication, not the service account.

## Solution

You need to deploy Firestore security rules that allow:
1. **Backend service account** - Full access (handled automatically)
2. **Authenticated users** - Read/write their own data
3. **Firebase Console UI** - Read access for viewing (if you're logged in as an admin)

## Quick Setup (Recommended for Development)

### Option 1: Temporary Open Rules (Development Only)

For development/testing, you can temporarily use open rules to view data in the console:

1. Go to **Firebase Console** → **Firestore Database** → **Rules** tab
2. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click **Publish**
4. ⚠️ **Warning**: These rules allow any authenticated user to read/write all data. Only use for development!

### Option 2: Proper Security Rules (Production)

Use the `firestore.rules` file included in this project:

1. Go to **Firebase Console** → **Firestore Database** → **Rules** tab
2. Copy the contents of `firestore.rules` from this project
3. Paste into the Firebase Console rules editor
4. Click **Publish**

## Deploy Rules via Firebase CLI (Recommended)

If you have Firebase CLI installed:

```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (if not already done)
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

## Understanding the Rules

The `firestore.rules` file includes:

- **Users**: Users can read their own user document
- **Forms**: Users can read/write forms they own
- **Submissions**: Users can read submissions for their forms; anyone can create (public forms)
- **Invoices**: Users can read/write their own invoices
- **Businesses**: Users can read/write businesses they own
- **Customers**: Users can read/write their own customers
- **Members**: Authenticated users can read
- **Invites**: Authenticated users can read/write
- **Form Templates**: Users can read/write their own templates

## Important Notes

1. **Backend Service Account**: The backend uses a service account which bypasses security rules. These rules only apply to client-side access and Firebase Console UI.

2. **Firebase Console Access**: To view documents in the Firebase Console, you need to be logged in as a user who has permission according to these rules. For admin access, you may need to temporarily use open rules or add admin-specific rules.

3. **Production Security**: For production, use the proper security rules from `firestore.rules`. Never use open rules in production!

## Troubleshooting

### Still seeing "Error loading documents"?

1. **Check if you're logged in**: Make sure you're logged into Firebase Console with the correct account
2. **Check rules**: Verify the rules are published (look for "Last published" timestamp)
3. **Check permissions**: Your Firebase account needs to have "Firebase Admin" or "Editor" role
4. **Try temporary open rules**: Use Option 1 above to test if rules are the issue

### Rules not working?

1. **Clear browser cache**: Sometimes cached rules cause issues
2. **Wait a few minutes**: Rules can take 1-2 minutes to propagate
3. **Check syntax**: Use the Firebase Console rules simulator to test
4. **Check logs**: Look at Firebase Console → Firestore → Usage tab for rule violations

## Admin Access Rules (Optional)

If you want admins to have full read access in the console, you can add this helper function:

```javascript
function isAdmin() {
  return isAuthenticated() && 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
}

// Then use it in rules:
allow read: if isAdmin() || isOwner(userId);
```

However, this requires the user document to exist and have `isAdmin: true` set.

## Next Steps

1. Deploy the security rules using one of the methods above
2. Refresh the Firebase Console
3. Try viewing the invoices collection again
4. If still having issues, check the browser console for specific error messages

