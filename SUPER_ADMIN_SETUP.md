# Super Admin Setup Guide

## Overview

Business approvals are now restricted to **Super Admins only**. Regular admins cannot access the approval system.

## How to Create a Super Admin Account

### ⚡ Quick Method: Use the Setup Script (Easiest)

```bash
node scripts/set-super-admin.js your-email@example.com true
```

This script works with both Firestore and JSON file storage. The user will need to log out and log back in for changes to take effect.

### Option 1: Manual Setup (JSON File)

If you're using local JSON file storage:

1. Open `data/users.json` (or your users file)
2. Find the user you want to make a super admin
3. Add or update the `isSuperAdmin` field:

```json
{
  "uid": "user-id-here",
  "email": "admin@example.com",
  "name": "Super Admin",
  "isAdmin": true,
  "isSuperAdmin": true,  // Add this line
  ...
}
```

### Option 2: Firestore Setup

If you're using Firestore:

1. Go to Firebase Console → Firestore Database
2. Find the `users` collection
3. Open the user document you want to make super admin
4. Add a field:
   - Field name: `isSuperAdmin`
   - Field type: `boolean`
   - Value: `true`

## Permissions

- **Super Admin (`isSuperAdmin: true`)**: Can approve/reject business registrations
- **Regular Admin (`isAdmin: true`)**: Can manage users, forms, etc., but NOT business approvals
- **Regular User**: Standard user permissions

## Security Notes

1. **Super Admin is separate from Admin**: A user can be an admin but not a super admin
2. **Only Super Admins can approve businesses**: The approval endpoints check `isSuperAdmin`, not `isAdmin`
3. **Frontend protection**: The Business Approvals page redirects non-super-admins to the dashboard
4. **Backend protection**: All approval endpoints require `isSuperAdmin` privilege

## Testing

1. Create a test user account
2. Set `isSuperAdmin: true` in the database
3. Log in with that account
4. You should see "Business Approvals" button in the dashboard
5. Navigate to `/admin/approvals` - should work
6. Try with a regular admin account - should NOT see the button or access the page

## Troubleshooting

**"Requires super admin privileges" error:**
- Check that `isSuperAdmin: true` is set in the user record
- Verify the user is logged in with the correct account
- Check that the account endpoint returns `isSuperAdmin: true`

**Button not showing in dashboard:**
- Ensure `user.isSuperAdmin === true` in the frontend
- Check browser console for any errors
- Verify the account data is being fetched correctly

