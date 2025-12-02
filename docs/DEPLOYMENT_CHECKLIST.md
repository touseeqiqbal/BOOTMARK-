# Deployment Checklist for Render

## Pre-Deployment Checklist

### ✅ Code Optimizations Completed
- [x] Removed verbose console.log statements from production code
- [x] Made request logging conditional (development only)
- [x] Cleaned up console.log in API interceptors
- [x] Optimized error logging (removed verbose details in production)

### 🔒 Security Checks
- [x] Verified `.gitignore` includes sensitive files
- [x] Confirmed `firebase-service-account.json` is in `.gitignore`
- [x] No hardcoded secrets or passwords in code
- [x] All sensitive data uses environment variables

### 📦 Environment Variables Required

Make sure these are set in Render Dashboard:

#### Firebase Configuration
- `FIREBASE_SERVICE_ACCOUNT` - **REQUIRED** (JSON string of service account)
- `FIREBASE_PROJECT_ID` - Optional (if using default credentials)

#### Frontend Firebase (VITE_*)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (optional)

#### SMTP Configuration
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE` (true/false)
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`

#### Application URLs
- `APP_URL` - Your Render app URL (e.g., `https://your-app.onrender.com`)
- `FRONTEND_URL` - Same as APP_URL (for password reset links)

#### Other
- `NODE_ENV=production`
- `PORT=10000` (or let Render assign automatically)
- `JWT_SECRET` - Random secret string

### 🚀 Build & Deploy Steps

1. **Prepare Firestore Service Account:**
   ```bash
   node scripts/prepare-firestore-env.js
   ```
   Copy the output and set it as `FIREBASE_SERVICE_ACCOUNT` in Render.

2. **Verify Build Commands:**
   - Build command: `npm install && cd public && npm install && npm run build`
   - Start command: `npm start`

3. **Deploy to Render:**
   - Connect your GitHub repository
   - Use the `render.yaml` configuration
   - Set all environment variables in Render Dashboard
   - Deploy!

### ⚠️ Important Notes

1. **Firestore is REQUIRED for production** - Without it, data will NOT persist across deployments
2. **SMTP Configuration** - Required for email features (2FA, password resets, notifications)
3. **Frontend URL** - Make sure `FRONTEND_URL` matches your Render app URL
4. **Port** - Render will set PORT automatically, but you can override it

### 🔍 Post-Deployment Verification

1. Check health endpoint: `https://your-app.onrender.com/api/health`
2. Verify Firestore is initialized (check server logs)
3. Test user registration/login
4. Test form creation
5. Test email sending (2FA, password reset)
6. Verify data persists after restart

### 📝 Common Issues

- **Data not persisting**: Check if Firestore is initialized (look for Firestore success message in logs)
- **Email not sending**: Verify SMTP credentials are correct
- **CORS errors**: Check if `APP_URL` is set correctly
- **Build fails**: Ensure all dependencies are in `package.json`
