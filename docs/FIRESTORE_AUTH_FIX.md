# Fixing Firestore Authentication Error (Code 16)

## Error Message
```
❌ Firestore authentication failed!
Error Code: 16
Error Message: 16 UNAUTHENTICATED: Request had invalid authentication credentials

Debug Info:
- Service account parsed successfully ✅
- Project ID: bootmarkapp ✅
- Private key has newlines: YES ✅
- Private key starts correctly: YES ✅
```

**If you see this debug info, the credentials are parsed correctly but Firebase is rejecting them.**
**This usually means a permissions issue, not a formatting issue.**

## Common Causes & Solutions

### 1. Private Key Newlines Not Preserved

**Problem:** When copying the service account JSON to Render, the `\n` characters in the private key might not be preserved correctly.

**Solution:**

1. **Verify the format in Render:**
   - Go to Render Dashboard → Your Service → Environment
   - Check `FIREBASE_SERVICE_ACCOUNT` value
   - It should be ONE continuous line
   - The `private_key` field should contain `\n` (backslash + n) characters, NOT actual line breaks

2. **Correct format example:**
   ```json
   {"private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDGPzNpULhY8jo7\n..."}
   ```
   Notice: `\n` (backslash-n) not actual newlines

3. **If you need to regenerate:**
   ```bash
   # On your local machine
   node scripts/prepare-firestore-env.js
   ```
   Copy the ENTIRE output (one line) to Render

### 2. Service Account Permissions (MOST COMMON FIX)

**Problem:** The service account might not have the correct permissions. This is the #1 cause when credentials parse correctly but authentication fails.

**Solution:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **bootmarkapp**
3. Go to **IAM & Admin** → **Service Accounts**
4. Find: `firebase-adminsdk-fbsvc@bootmarkapp.iam.gserviceaccount.com`
5. Click on the service account email to open details
6. Go to the **Permissions** tab
7. Verify it has the role: **Firebase Admin SDK Administrator Service Agent**
8. If missing:
   - Click **Edit** or **Add Role**
   - Search for: `Firebase Admin SDK Administrator Service Agent`
   - Add the role
   - Save
9. **Wait 1-2 minutes** for permissions to propagate
10. Test again

**Alternative:** If you can't find the role, try:
- Go to **IAM & Admin** → **IAM**
- Find the service account email
- Click **Edit** (pencil icon)
- Click **Add Another Role**
- Search for: `Firebase Admin SDK Administrator Service Agent`
- Add and save

### 3. Firestore Not Enabled

**Problem:** Firestore might not be enabled for your project.

**Solution:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **bootmarkapp**
3. Go to **Firestore Database**
4. If you see "Get started", click it and enable Firestore
5. Choose **Production mode** (you can set up security rules later)

### 4. Service Account Disabled or Revoked

**Problem:** The service account key might have been disabled or regenerated.

**Solution:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **bootmarkapp**
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate new private key**
5. Download the JSON file
6. Run: `node scripts/prepare-firestore-env.js` (or manually format it)
7. Update `FIREBASE_SERVICE_ACCOUNT` in Render with the new value

## Step-by-Step Fix

1. **Check Render Environment Variable:**
   ```
   Render Dashboard → Your Service → Environment → FIREBASE_SERVICE_ACCOUNT
   ```
   - Should be ONE line
   - Should start with `{` and end with `}`
   - Should contain `\n` in private_key (not actual newlines)

2. **Verify Service Account in Firebase:**
   - Firebase Console → IAM & Admin → Service Accounts
   - Check the service account exists and is enabled
   - Verify it has "Firebase Admin SDK Administrator Service Agent" role

3. **Check Firestore is Enabled:**
   - Firebase Console → Firestore Database
   - Should show your collections or "Get started" button

4. **Test Locally First:**
   ```bash
   # Make sure firebase-service-account.json exists locally
   node scripts/prepare-firestore-env.js
   ```
   Copy the output to Render

5. **Redeploy on Render:**
   - After updating the environment variable
   - Render will automatically redeploy
   - Check logs for: `✅ Firestore credentials verified successfully`

## Verification

After fixing, you should see in Render logs:
```
✅ Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT environment variable
   Project ID: bootmarkapp
✅ Firestore credentials verified successfully
```

If you still see errors, check the debug info in the logs which will show:
- Private key length
- Whether newlines are present
- Whether the key starts correctly

## Still Not Working?

### Most Likely Issue: Missing Permissions

If your debug info shows:
- ✅ Service account parsed successfully
- ✅ Private key has newlines: YES
- ✅ Private key starts correctly: YES
- ❌ But still getting Error Code 16

**This is 99% a permissions issue!**

See: `docs/SERVICE_ACCOUNT_PERMISSIONS_FIX.md` for detailed steps.

### Other Things to Try:

1. **Generate a fresh service account key:**
   - Firebase Console → Project Settings → Service Accounts
   - Generate new private key
   - Download and use `scripts/prepare-firestore-env.js` to format it
   - Update `FIREBASE_SERVICE_ACCOUNT` in Render

2. **Verify project ID matches:**
   - `FIREBASE_PROJECT_ID` in Render should be: `bootmarkapp`
   - Should match the `project_id` in your service account JSON

3. **Test locally:**
   ```bash
   node scripts/verify-firebase-credentials.js
   ```
   This will test if credentials work on your local machine
