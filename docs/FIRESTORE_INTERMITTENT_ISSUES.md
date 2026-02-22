# Fixing Intermittent Firestore Connection Issues

## Problem: "It worked for a while and then stopped"

If Firestore authentication worked initially but then stopped working, this guide will help you diagnose and fix the issue.

## Common Causes

### 1. Service Account Token Expiration

**Problem:** Firebase service account tokens can expire or be rotated, causing authentication to fail after some time.

**Solution:**
- Service account keys don't expire, but the service account itself might have been disabled
- Check Firebase Console → IAM & Admin → Service Accounts
- Verify the service account is still enabled
- If needed, generate a new key and update `FIREBASE_SERVICE_ACCOUNT` in Render

### 2. Service Account Permissions Changed

**Problem:** Someone may have modified the service account permissions in Firebase Console.

**Solution:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **bootmarkapp**
3. Go to **IAM & Admin** → **Service Accounts**
4. Find: `firebase-adminsdk-fbsvc@bootmarkapp.iam.gserviceaccount.com`
5. Verify it has: **Firebase Admin SDK Administrator Service Agent** role
6. If missing, add the role

### 3. Firestore Quota/Usage Limits

**Problem:** You may have hit Firebase usage limits or quotas.

**Solution:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Check **Usage and billing** → **Usage**
3. Verify you haven't exceeded:
   - Document reads/writes
   - Storage limits
   - API calls
4. If limits are reached, upgrade your Firebase plan or optimize usage

### 4. Network/Connectivity Issues

**Problem:** Temporary network issues between Render and Firebase.

**Solution:**
- The code now includes automatic retry logic for network errors
- Check Render logs for retry attempts
- If persistent, check Render's network status

### 5. Environment Variable Corruption

**Problem:** The `FIREBASE_SERVICE_ACCOUNT` environment variable in Render might have been accidentally modified.

**Solution:**
1. Go to Render Dashboard → Your Service → Environment
2. Check `FIREBASE_SERVICE_ACCOUNT` value
3. Verify it's still a valid JSON string (one line)
4. If corrupted, regenerate using:
   ```bash
   node scripts/prepare-firestore-env.js
   ```
5. Copy and paste the new value to Render

### 6. Firestore Service Disabled

**Problem:** Firestore might have been disabled or paused in Firebase Console.

**Solution:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **bootmarkapp**
3. Go to **Firestore Database**
4. Verify it shows "Active" status
5. If paused or disabled, re-enable it

## Diagnostic Steps

### Step 1: Check Render Logs

Look for these error patterns:

```
❌ Firestore authentication failed!
Error Code: 16
```

This indicates authentication issues.

```
⚠️  Firestore operation failed (attempt X/3), retrying...
```

This indicates network/temporary issues (now has automatic retry).

```
❌ Periodic Firestore health check failed!
```

This indicates the connection stopped working after initial success.

### Step 2: Check Firebase Console

1. **Service Account Status:**
   - Firebase Console → IAM & Admin → Service Accounts
   - Verify service account exists and is enabled
   - Check last key generation date

2. **Firestore Status:**
   - Firebase Console → Firestore Database
   - Verify it's active (not paused)
   - Check for any error messages

3. **Usage Limits:**
   - Firebase Console → Usage and billing
   - Check if any quotas are exceeded

### Step 3: Test Connection

The app now includes automatic health checks every 5 minutes. Check Render logs for:
- `✅ Firestore credentials verified successfully` (on startup)
- `❌ Periodic Firestore health check failed!` (if connection breaks)

## Quick Fixes

### Fix 1: Regenerate Service Account Key

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click **Generate new private key**
3. Download the JSON file
4. Run locally:
   ```bash
   node scripts/prepare-firestore-env.js
   ```
5. Copy the output to Render → Environment → `FIREBASE_SERVICE_ACCOUNT`
6. Redeploy

### Fix 2: Verify Permissions

1. Firebase Console → IAM & Admin → Service Accounts
2. Find your service account
3. Click **Edit**
4. Ensure it has: **Firebase Admin SDK Administrator Service Agent**
5. Save

### Fix 3: Check Firestore Status

1. Firebase Console → Firestore Database
2. If paused, click **Resume**
3. If disabled, re-enable it

## Prevention

The code now includes:

1. **Automatic Retry Logic:** Network errors will be retried up to 3 times
2. **Health Checks:** Periodic checks every 5 minutes to detect issues early
3. **Better Error Messages:** More detailed diagnostics when failures occur

## Still Not Working?

1. **Check Render Logs:** Look for the detailed debug info in error messages
2. **Verify Service Account:** Generate a fresh key and update Render
3. **Check Firebase Status:** Visit [Firebase Status Page](https://status.firebase.google.com/)
4. **Contact Support:** If all else fails, check Firebase support or Render support

## Monitoring

After deploying the updated code, you'll see:
- Health check messages in logs every 5 minutes
- Automatic retries on network errors
- More detailed error diagnostics

This will help catch issues early and provide better diagnostics.
