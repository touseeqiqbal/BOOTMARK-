# New Service Account Key - Ready for Render

## ✅ New Key Generated

I've formatted your new service account key for Render. Here's what to do:

## Step-by-Step Instructions

### 1. Copy the Environment Variable Value

Open `render-firebase-env.txt` and copy the **entire line** (it's all one continuous line).

### 2. Update Render Environment Variable

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select your service: **bootmark-landscaping-management**
3. Go to **Environment** tab
4. Find `FIREBASE_SERVICE_ACCOUNT` in the list
5. Click **Edit** (or delete and recreate)
6. **Paste the entire line** from `render-firebase-env.txt`
7. Click **Save Changes**

### 3. Verify FIREBASE_PROJECT_ID

Make sure `FIREBASE_PROJECT_ID` is set to: `bootmarkapp`

### 4. Redeploy

Render will automatically redeploy after you save the environment variable.

## What to Expect

After deployment, check your Render logs. You should see:

```
✅ Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT environment variable
   Project ID: bootmarkapp
✅ Firestore credentials verified successfully
```

Instead of the authentication error.

## If You Still See Errors

1. **Wait 1-2 minutes** after updating - permissions need time to propagate
2. **Check the debug info** in logs - it will show if the key is parsed correctly
3. **Verify permissions** in Firebase Console:
   - IAM & Admin → Service Accounts
   - Find: `firebase-adminsdk-fbsvc@bootmarkapp.iam.gserviceaccount.com`
   - Ensure it has: **Firebase Admin SDK Administrator Service Agent** role

## Test Locally (Optional)

Before deploying to Render, you can test locally:

1. Replace `firebase-service-account.json` with your new key
2. Run:
   ```bash
   node scripts/verify-firebase-credentials.js
   ```

This will verify the credentials work before deploying to Render.
