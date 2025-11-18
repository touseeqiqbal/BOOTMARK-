# Vercel Deployment Guide for BOOTMARK Form Builder

## Deployment Options

You have two deployment options:

### Option 1: Monorepo Deployment (Recommended)
Deploy both frontend and backend together in one Vercel project.

### Option 2: Separate Deployments
Deploy frontend and backend separately.

---

## Option 1: Monorepo Deployment (Single Project)

### Step 1: Prepare Your Project

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

### Step 2: Configure Environment Variables

Create a `.env` file in the root directory with:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id

# JWT Secret (for fallback auth)
JWT_SECRET=your-secret-key-here

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com

# Firebase Admin (Optional - for production)
FIREBASE_PROJECT_ID=your-project-id
# OR
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

### Step 3: Deploy to Vercel

1. **From the project root**:
   ```bash
   vercel
   ```

2. **Follow the prompts**:
   - Set up and deploy? **Yes**
   - Which scope? **Your account**
   - Link to existing project? **No**
   - Project name? **phoenix-form-builder** (or your choice)
   - Directory? **./** (current directory)
   - Override settings? **No**

3. **Set Environment Variables in Vercel Dashboard**:
   - Go to your project on Vercel
   - Settings → Environment Variables
   - Add all variables from your `.env` file
   - Make sure to add them for **Production**, **Preview**, and **Development**

### Step 4: Update vercel.json (if needed)

The `vercel.json` file is already configured, but you may need to adjust routes based on your domain.

---

## Option 2: Separate Frontend & Backend

### Deploy Frontend

1. **Navigate to public directory**:
   ```bash
   cd public
   ```

2. **Deploy frontend**:
   ```bash
   vercel
   ```

3. **Set environment variables** (Firebase config):
   - In Vercel dashboard → Settings → Environment Variables
   - Add all `VITE_*` variables

4. **Update API URL**:
   - Set `VITE_API_URL` to your backend URL (after deploying backend)

### Deploy Backend

1. **From project root**:
   ```bash
   vercel --prod
   ```

2. **Or create separate backend project**:
   - Create `api/` directory structure
   - Move server.js logic to serverless functions
   - See alternative structure below

---

## Alternative: Serverless Functions Structure

If you want to use Vercel's serverless functions instead of Express:

### Create API Functions

1. **Create `api/` directory structure**:
   ```
   api/
   ├── auth/
   │   ├── login.js
   │   ├── register.js
   │   └── verify-firebase-token.js
   ├── forms/
   │   ├── [id].js
   │   └── index.js
   └── submissions/
       └── [id].js
   ```

2. **Example serverless function** (`api/forms/index.js`):
   ```javascript
   const handler = async (req, res) => {
     // Your form logic here
   };
   
   module.exports = handler;
   ```

---

## Current Setup (Express + Vercel)

The current setup uses Express with Vercel's Node.js runtime, which works well for this project.

### Build Configuration

1. **Root `vercel.json`** handles:
   - API routes → Express server
   - Static files → Frontend build
   - SPA routing → index.html

2. **Build Process**:
   - Frontend builds to `public/dist`
   - Backend runs as serverless function
   - Express app handles all `/api/*` routes

---

## Post-Deployment Steps

### 1. Update Firebase Authorized Domains

1. Go to Firebase Console → Authentication → Settings
2. Add your Vercel domain to "Authorized domains"
3. Example: `your-app.vercel.app`

### 2. Update Password Reset Email Template

1. Firebase Console → Authentication → Templates
2. Edit "Password reset" template
3. Update action URL to: `https://your-domain.vercel.app/reset-password`

### 3. Test Deployment

1. Visit your Vercel URL
2. Test registration/login
3. Test form creation
4. Test form submission
5. Test email notifications (if configured)

---

## Environment Variables Reference

### Required
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### Optional
- `JWT_SECRET` - For fallback authentication
- `SMTP_*` - For email notifications
- `FIREBASE_SERVICE_ACCOUNT` - For backend token verification

---

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Ensure `public/package.json` has build script
- Check Vercel build logs

### API Routes Not Working
- Verify `vercel.json` routes configuration
- Check that server.js exports the app
- Ensure environment variables are set

### Frontend Can't Connect to Backend
- Set `VITE_API_URL` to your Vercel API URL
- Or use relative paths (should work if same domain)

### CORS Errors
- Add your Vercel domain to Firebase authorized domains
- Check CORS configuration in server.js

---

## Quick Deploy Command

```bash
# From project root
vercel --prod
```

This will:
1. Build the frontend
2. Deploy the backend
3. Set up all routes
4. Make your app live!

---

## Custom Domain

After deployment:
1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Update Firebase authorized domains
4. Update password reset email template

---

## File Storage Note

The app currently uses JSON files for storage. For production, consider:
- Moving to a database (MongoDB, PostgreSQL, etc.)
- Using Vercel KV or Vercel Postgres
- Using Firebase Firestore

For now, JSON files will work but may have limitations on Vercel's serverless functions.
