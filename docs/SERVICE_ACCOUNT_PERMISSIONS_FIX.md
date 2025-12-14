# Fixing Service Account Permissions (Error Code 16)

## Your Debug Info Shows:
```
✅ Service account parsed successfully
✅ Project ID: bootmarkapp
✅ Private key has newlines: YES
✅ Private key starts correctly: YES
❌ But authentication still fails (Error Code 16)
```

**This means your credentials are formatted correctly, but the service account lacks permissions!**

## Quick Fix Steps

### Step 1: Verify Service Account Exists

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **bootmarkapp**
3. Click **IAM & Admin** (left sidebar)
4. Click **Service Accounts**
5. Look for: `firebase-adminsdk-fbsvc@bootmarkapp.iam.gserviceaccount.com`

**If you don't see it:**
- The service account might have been deleted
- Generate a new one: **Project Settings** → **Service Accounts** → **Generate new private key**

### Step 2: Check Permissions (CRITICAL)

1. In **Service Accounts** page, click on the service account email
2. This opens the service account details
3. Click the **Permissions** tab
4. Look for: **Firebase Admin SDK Administrator Service Agent**

**If it's missing:**

#### Option A: Add via Service Accounts Page
1. Click **Edit** (or the pencil icon)
2. Click **Add Role** or **Add Another Role**
3. Search for: `Firebase Admin SDK Administrator Service Agent`
4. Select it
5. Click **Save**
6. Wait 1-2 minutes for permissions to propagate

#### Option B: Add via IAM Page
1. Go to **IAM & Admin** → **IAM** (not Service Accounts)
2. Find the service account email in the list
3. Click the **Edit** icon (pencil) next to it
4. Click **Add Another Role**
5. Search for: `Firebase Admin SDK Administrator Service Agent`
6. Select it
7. Click **Save**
8. Wait 1-2 minutes

### Step 3: Verify Firestore is Enabled

1. Go to **Firestore Database** (left sidebar)
2. If you see "Get started", click it and enable Firestore
3. Choose **Production mode** (you can set security rules later)
4. Select a location (choose closest to your users)
5. Click **Enable**

### Step 4: Test the Fix

After adding permissions, wait 1-2 minutes, then:

1. **Option 1:** Restart your Render service
2. **Option 2:** Run locally:
   ```bash
   node scripts/verify-firebase-credentials.js
   ```

You should see:
```
✅ Firestore read operation successful
✅ Firestore write operation successful
✅ All Firestore operations successful!
```

## Still Not Working?

### Regenerate Service Account Key

1. Go to **Project Settings** → **Service Accounts**
2. Find your service account
3. Click **Generate new private key**
4. Download the JSON file
5. Run locally:
   ```bash
   node scripts/prepare-firestore-env.js
   ```
6. Copy the output to Render → Environment → `FIREBASE_SERVICE_ACCOUNT`
7. Redeploy

### Check Service Account Status

1. Go to **IAM & Admin** → **Service Accounts**
2. Check if the service account shows as **Enabled**
3. If disabled, enable it
4. Check the **Last key generation** date
5. If very old, generate a new key

## Common Mistakes

❌ **Wrong:** Only adding "Editor" or "Owner" role  
✅ **Correct:** Must have "Firebase Admin SDK Administrator Service Agent"

❌ **Wrong:** Adding permissions but not waiting for propagation  
✅ **Correct:** Wait 1-2 minutes after adding permissions

❌ **Wrong:** Using a different service account email  
✅ **Correct:** Use the exact email from your service account JSON

## Verification

After fixing permissions, check Render logs. You should see:
```
✅ Firestore credentials verified successfully
```

Instead of:
```
❌ Firestore authentication failed!
```

## Need More Help?

1. Check Firebase Console → **IAM & Admin** → **IAM** for all roles
2. Verify the service account email matches exactly
3. Check Firebase Status: https://status.firebase.google.com/
4. Try generating a completely new service account key
