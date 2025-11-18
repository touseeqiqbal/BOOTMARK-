# Deployment Guide - BOOTMARK Form Builder

## Quick Deploy to Vercel

### Prerequisites
- Vercel account (sign up at https://vercel.com)
- Vercel CLI installed: `npm i -g vercel`

### Step 1: Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd public
npm install
cd ..
```

### Step 2: Configure Environment Variables

Create a `.env` file in the root (or set in Vercel dashboard):

```env
# Firebase (Required)
VITE_FIREBASE_API_KEY=AIzaSyBRCemB0XiP0bc05HtsyWF5B51-e_cCnpE
VITE_FIREBASE_AUTH_DOMAIN=phoenix-app-5a433.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=phoenix-app-5a433
VITE_FIREBASE_STORAGE_BUCKET=phoenix-app-5a433.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1027690637217
VITE_FIREBASE_APP_ID=1:1027690637217:web:c14f4475581a9098810de0
VITE_FIREBASE_MEASUREMENT_ID=G-MJ7HJNMFPF

# JWT Secret
JWT_SECRET=your-secret-key-change-this

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
```

### Step 3: Deploy

```bash
# Login to Vercel
vercel login

# Deploy (first time)
vercel

# Deploy to production
vercel --prod
```

### Step 4: Set Environment Variables in Vercel

1. Go to your project on Vercel Dashboard
2. Settings → Environment Variables
3. Add all variables from `.env` file
4. Make sure to add for **Production**, **Preview**, and **Development**

### Step 5: Update Firebase Settings

1. Go to Firebase Console → Authentication → Settings
2. Add your Vercel domain to "Authorized domains"
   - Example: `your-app.vercel.app`
   - Or your custom domain

3. Update Password Reset Email:
   - Firebase Console → Authentication → Templates
   - Edit "Password reset" template
   - Action URL: `https://your-domain.vercel.app/reset-password`

## Project Structure for Vercel

```
/
├── server.js          # Express server (handles API routes)
├── vercel.json        # Vercel configuration
├── api/               # Serverless functions (optional)
├── routes/            # API routes
├── middleware/        # Auth middleware
├── public/            # Frontend React app
│   ├── src/
│   ├── dist/         # Build output (generated)
│   └── package.json
└── data/             # JSON storage (works on Vercel)
```

## How It Works

1. **API Routes** (`/api/*`) → Handled by Express server (server.js)
2. **Share Routes** (`/share/*`) → Handled by Express server
3. **Static Files** → Served from `public/dist`
4. **SPA Routes** → Served `index.html` (React Router handles routing)

## Build Process

1. Vercel runs `npm run vercel-build`
2. This installs dependencies and builds frontend
3. Frontend builds to `public/dist`
4. Backend runs as serverless function

## Testing Locally

```bash
# Build frontend
cd public
npm run build
cd ..

# Start server
npm start

# App runs on http://localhost:4000
```

## Troubleshooting

### Build Fails
- Check `package.json` has all dependencies
- Ensure `public/package.json` has build script
- Check Vercel build logs

### API Not Working
- Verify environment variables are set
- Check `vercel.json` routes configuration
- Ensure server.js exports the app

### Frontend Not Loading
- Check `public/dist` exists after build
- Verify static file serving in server.js
- Check browser console for errors

## Production Considerations

1. **Database**: Consider moving from JSON files to:
   - Vercel Postgres
   - MongoDB Atlas
   - Firebase Firestore

2. **File Storage**: For uploaded images, consider:
   - Firebase Storage
   - AWS S3
   - Cloudinary

3. **Environment Variables**: Never commit `.env` files

4. **Security**: 
   - Use strong JWT secrets
   - Enable Firebase App Check
   - Set up proper CORS

## Support

For issues, check:
- Vercel deployment logs
- Browser console
- Server logs in Vercel dashboard
