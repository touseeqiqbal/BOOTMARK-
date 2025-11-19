# Deployment Guide - BOOTMARK Form Builder on Render

## Quick Deploy to Render

### Prerequisites
- Render account (sign up at https://render.com)
- GitHub repository with your code

### Step 1: Connect Repository to Render

1. Go to Render Dashboard: https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the repository and branch you want to deploy

### Step 2: Configure Build Settings

Render will automatically detect the `render.yaml` file, or you can configure manually:

**Build Command:**
```bash
npm install && cd public && npm install && npm run build
```

**Start Command:**
```bash
npm start
```

**Environment:** Node

### Step 3: Set Environment Variables

**⚠️ CRITICAL**: These environment variables MUST be set in Render Dashboard before deployment, especially the Firebase variables. Without them, Firebase will not work and the app will fall back to localStorage-only mode.

In Render Dashboard → Your Service → Environment → Environment Variables, add:

#### Required Variables:

```env
# Firebase Configuration (REQUIRED - app won't work without these!)
# Get these from Firebase Console → Project Settings → Your apps → Web app config
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-firebase-messaging-sender-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-firebase-measurement-id

# JWT Secret (Required)
JWT_SECRET=your-secret-key-change-this-to-something-secure

# Node Environment
NODE_ENV=production

# Firestore Database (Optional - for database storage instead of JSON files)
# See "Firestore Database Setup" section below for details
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}  # Entire JSON as single line
```

**Note**: Variables starting with `VITE_` are embedded into the frontend build at build time. They must be set in Render's environment before the build runs.

#### Optional Variables (for email functionality):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
```

### Step 4: Deploy

1. Click "Create Web Service"
2. Render will automatically:
   - Install dependencies
   - Build the frontend
   - Start the server
3. Your app will be available at: `https://your-app-name.onrender.com`

### Step 5: Update Firebase Settings

1. Go to Firebase Console → Authentication → Settings
2. Add your Render domain to "Authorized domains"
   - Example: `your-app-name.onrender.com`
   - Or your custom domain if configured

3. Update Password Reset Email:
   - Firebase Console → Authentication → Templates
   - Edit "Password reset" template
   - Action URL: `https://your-app-name.onrender.com/reset-password`

## Using render.yaml (Recommended)

If you have a `render.yaml` file in your repository root, Render will automatically use it:

```yaml
services:
  - type: web
    name: phoenix-form-builder
    env: node
    plan: starter
    buildCommand: npm install && cd public && npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      # Add other environment variables in Render dashboard
```

## Project Structure for Render

```
/
├── server.js          # Express server (handles all routes)
├── render.yaml        # Render configuration (optional)
├── routes/            # API routes
├── middleware/        # Auth middleware
├── public/            # Frontend React app
│   ├── src/
│   ├── dist/         # Build output (generated during build)
│   └── package.json
└── data/             # JSON storage (persistent on Render)
```

## How It Works

1. **API Routes** (`/api/*`) → Handled by Express server (server.js)
2. **Share Routes** (`/share/*`) → Handled by Express server
3. **Static Files** → Served from `public/dist` (built during deployment)
4. **SPA Routes** → Served `index.html` (React Router handles routing)

## Build Process

1. Render runs the build command
2. Installs backend dependencies (`npm install`)
3. Installs frontend dependencies (`cd public && npm install`)
4. Builds frontend to `public/dist` (`npm run build`)
5. Starts the server with `npm start`

## Data Storage

Render provides persistent disk storage, so the `data/` directory will persist between deployments. This is different from Vercel which uses `/tmp` for temporary storage.

## Custom Domain

1. In Render Dashboard → Settings → Custom Domains
2. Add your domain
3. Follow DNS configuration instructions
4. Update Firebase authorized domains

## Auto-Deploy

Render automatically deploys when you push to your connected branch (usually `main` or `master`).

## Manual Deploy

1. Go to Render Dashboard
2. Click on your service
3. Click "Manual Deploy" → "Deploy latest commit"

## Environment Variables

- Set in Render Dashboard → Environment → Environment Variables
- Variables starting with `VITE_` are needed for the frontend build
- `JWT_SECRET` is required for authentication
- All variables are encrypted and secure

## Troubleshooting

### Build Fails

- Check build logs in Render Dashboard
- Ensure all dependencies are in `package.json` and `public/package.json`
- Verify Node.js version (Render uses Node 18+ by default)

### API Not Working

- Verify environment variables are set correctly
- Check server logs in Render Dashboard
- Ensure `JWT_SECRET` is set

### Frontend Not Loading

- Check if `public/dist` exists after build
- Verify static file serving in `server.js`
- Check browser console for errors
- Ensure all `VITE_*` environment variables are set

### Firebase Not Working / Using LocalStorage Only

**Symptom**: App works locally but on Render it only uses localStorage and Firebase authentication doesn't work.

**Solution**:
1. **Set all Firebase environment variables in Render Dashboard**:
   - Go to Render Dashboard → Your Service → Environment
   - Add ALL of these variables (they must start with `VITE_`):
     - `VITE_FIREBASE_API_KEY`
     - `VITE_FIREBASE_AUTH_DOMAIN`
     - `VITE_FIREBASE_PROJECT_ID`
     - `VITE_FIREBASE_STORAGE_BUCKET`
     - `VITE_FIREBASE_MESSAGING_SENDER_ID`
     - `VITE_FIREBASE_APP_ID`
     - `VITE_FIREBASE_MEASUREMENT_ID`

2. **Important**: These variables are needed at BUILD TIME (not just runtime)
   - Vite replaces `import.meta.env.VITE_*` during the build process
   - If variables are missing during build, Firebase config will be undefined
   - The app will fall back to localStorage-only mode

3. **Verify variables are set**:
   - After setting variables, trigger a new deployment
   - Check build logs to ensure build completes successfully
   - Check browser console for "Firebase initialized successfully" message
   - If you see "Firebase initialization failed", check the config values

4. **Get Firebase config values**:
   - Go to Firebase Console → Project Settings → Your apps
   - Copy the config values from your web app configuration
   - Make sure you're using the correct project's config

5. **Add Render domain to Firebase**:
   - Firebase Console → Authentication → Settings → Authorized domains
   - Add: `your-app-name.onrender.com`

### Port Issues

- Render automatically sets `PORT` environment variable
- Server.js uses `process.env.PORT || 4000`
- No manual port configuration needed

### Firestore Database Setup (Optional but Recommended)

The application supports Google Firestore as a database backend. To use Firestore on Render:

1. **Get Firebase Service Account**:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download the JSON file

2. **Enable Firestore**:
   - Firebase Console → Firestore Database
   - Click "Create database" (if not already created)
   - Choose Production mode or Test mode
   - Select a location

3. **Set Environment Variables in Render**:
   
   Add these to Render Dashboard → Environment → Environment Variables:
   
   ```env
   # Firebase Project ID
   FIREBASE_PROJECT_ID=your-project-id
   
   # Firebase Service Account (entire JSON as a single-line string)
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
   ```
   
   **Important Notes**:
   - Copy the entire contents of the service account JSON file
   - Remove all line breaks and make it a single line
   - Keep all quotes escaped properly
   - Example: `{"type":"service_account","project_id":"phoenix-app-5a433",...}`
   
   **Quick way to convert JSON to single line**:
   
   Run the helper script (easiest):
   ```bash
   node scripts/prepare-firestore-env.js
   ```
   
   This will output the exact values you need to copy-paste into Render.
   
   Or manually:
   ```bash
   # On Mac/Linux (requires jq)
   cat firebase-service-account.json | jq -c
   
   # Or manually remove all line breaks and spaces from the JSON file
   ```

4. **Verify Firestore is Working**:
   - After deployment, check Render logs
   - You should see: `✅ Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT environment variable`
   - You should see: `✅ Firestore database initialized successfully`
   - You should see: `✅ Firestore credentials verified successfully`
   - Check Firebase Console → Firestore Database to see data appearing

5. **Troubleshooting Firestore Authentication Errors**:
   
   If you see errors like:
   ```
   Error: 16 UNAUTHENTICATED: Request had invalid authentication credentials
   ```
   
   This means the `FIREBASE_SERVICE_ACCOUNT` environment variable is not set correctly. Follow these steps:
   
   1. **Run the helper script locally**:
      ```bash
      node scripts/prepare-firestore-env.js
      ```
      This will output the exact values you need to copy.
   
   2. **Check Render Environment Variables**:
      - Go to Render Dashboard → Your Service → Environment → Environment Variables
      - Verify `FIREBASE_SERVICE_ACCOUNT` is set
      - Verify `FIREBASE_PROJECT_ID` is set
      - Make sure `FIREBASE_SERVICE_ACCOUNT` is a single-line JSON string (no line breaks)
   
   3. **Common Issues**:
      - ❌ **Missing quotes**: The JSON string must be properly quoted in the environment variable
      - ❌ **Line breaks**: JSON must be on a single line (use the helper script)
      - ❌ **Incomplete JSON**: Make sure all fields from the service account file are included
      - ❌ **Wrong variable name**: Must be exactly `FIREBASE_SERVICE_ACCOUNT` (case-sensitive)
   
   4. **Verify in Render Logs**:
      After setting the variables, check startup logs:
      - ✅ You should see: `✅ Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT environment variable`
      - ✅ You should see: `✅ Firestore credentials verified successfully`
      - ❌ If you see: `❌ Firestore authentication failed!` - your credentials are invalid
   
   5. **Get a Fresh Service Account** (if needed):
      - Firebase Console → Project Settings → Service Accounts
      - Generate a new private key if the old one is expired or revoked

6. **Benefits of Firestore on Render**:
   - ✅ No file system dependencies (works better on cloud platforms)
   - ✅ Automatic backups
   - ✅ Scalable database
   - ✅ Better for production workloads

## Production Considerations

1. **Database**: The app now supports Firebase Firestore:
   - ✅ **Recommended for Render**: Use Firestore (set `FIREBASE_SERVICE_ACCOUNT` env var)
   - Alternative: Render PostgreSQL (requires additional setup)
   - Alternative: MongoDB Atlas (requires additional setup)
   - Default: JSON files in `data/` directory (persists on Render's disk)

2. **File Storage**: For uploaded images, consider:
   - Firebase Storage
   - AWS S3
   - Cloudinary

3. **Environment Variables**: Never commit `.env` files
   - Use Render's environment variable management
   - All sensitive data (JWT_SECRET, FIREBASE_SERVICE_ACCOUNT) should be in Render Dashboard

4. **Security**: 
   - Use strong JWT secrets (generate with: `openssl rand -base64 32`)
   - Keep `FIREBASE_SERVICE_ACCOUNT` secure and never commit to git
   - Set up Firestore Security Rules in Firebase Console
   - Enable Firebase App Check
   - Set up proper CORS
   - Use HTTPS (automatic on Render)

5. **Performance**:
   - Enable auto-scaling if needed
   - Consider upgrading plan for better performance
   - Monitor logs and metrics in Render Dashboard

## Support

For issues, check:
- Render deployment logs
- Browser console
- Server logs in Render dashboard
- Render status page: https://status.render.com

## Differences from Vercel

1. **Persistent Storage**: Render has persistent disk, so `data/` directory persists
2. **Always-On Service**: Render runs a continuous web service (not serverless)
3. **Build Process**: Build happens once during deployment, not per request
4. **Port**: Render sets `PORT` automatically (usually 10000)
5. **Environment**: Full Node.js environment with file system access
