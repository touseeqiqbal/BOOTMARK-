# Creating Your First Super Admin Account

## Quick Start Guide

You have a fresh database and need to create the first super admin account. Here's how:

---

## Method 1: Using the Bootstrap Script (Recommended)

### Step 1: Sign Up First

1. Go to your app: `http://localhost:3000`
2. Click "Sign Up" or "Login"
3. Sign up with your email using Firebase Auth
4. **Copy your Firebase UID** (you'll need this)

**How to get your Firebase UID**:
- Open browser console (F12)
- After login, check the Firebase Auth user object
- Or go to Firebase Console → Authentication → Users → find your email → copy UID

### Step 2: Run the Script

```bash
cd c:\Users\Touseeq\Downloads\09-12-25\BOOTMARK--main
node scripts/createSuperAdmin.js
```

### Step 3: Enter Details

The script will ask for:
```
Enter super admin email: your@email.com
Enter super admin name: Your Name
Enter Firebase UID: abc123xyz...
```

### Step 4: Confirm

```
Proceed with creation? (yes/no): yes
```

✅ Done! You're now a super admin!

---

## Method 2: Manual Database Edit

### Option A: Firestore (if using Firebase)

1. Go to **Firebase Console**
2. Navigate to **Firestore Database**
3. Find the `users` collection
4. Find your user document (by email or UID)
5. Click **Edit**
6. Add these fields:
   ```
   isSuperAdmin: true
   isAdmin: true
   accountStatus: "active"
   accountType: "super-admin"
   role: "super-admin"
   ```
7. **Save**

### Option B: JSON File (if using local storage)

1. Open `data/users.json`
2. Find your user or add new entry:
   ```json
   [
     {
       "id": "your-firebase-uid",
       "uid": "your-firebase-uid",
       "email": "your@email.com",
       "name": "Your Name",
       "isSuperAdmin": true,
       "isAdmin": true,
       "accountStatus": "active",
       "accountType": "super-admin",
       "role": "super-admin",
       "createdAt": "2025-12-14T02:20:00.000Z",
       "updatedAt": "2025-12-14T02:20:00.000Z"
     }
   ]
   ```
3. **Save the file**

---

## Verification

### Test Your Super Admin Access

1. **Login** to your app with the super admin account
2. **Try accessing** super admin endpoints:
   ```bash
   GET http://localhost:4000/api/businesses/all
   GET http://localhost:4000/api/businesses/pending-approvals
   ```
3. **Navigate** to `/admin/approvals` in your app
4. You should see the admin panel!

---

## Summary

**Fastest Method**:
```bash
# 1. Sign up via app (get your UID)
# 2. Run script
node scripts/createSuperAdmin.js

# 3. Enter your details
# 4. Done!
```

**Manual Method**:
```
1. Sign up via app
2. Edit data/users.json or Firestore
3. Add: isSuperAdmin: true, isAdmin: true
4. Save and reload
```

**You're ready to approve businesses!** 🚀
