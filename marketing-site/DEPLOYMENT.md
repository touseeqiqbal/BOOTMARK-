# Marketing Site Deployment Guide

## 🚀 Deploying to Render

### Step 1: Update Production URL

Before deploying, update the production URL in `config.js`:

```javascript
production: {
  appUrl: 'https://your-bootmark-app.onrender.com' // Replace with your actual app URL
}
```

### Step 2: Deploy Marketing Site

**Option A: Deploy as Static Site on Render**

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Static Site"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `bootmark-marketing`
   - **Root Directory**: `marketing-site`
   - **Build Command**: `npm install`
   - **Publish Directory**: `.` (current directory)
5. Click "Create Static Site"

**Option B: Deploy with Main App**

If your main BOOTMARK app is already on Render, you can serve the marketing site from the same server:

1. Update your main `server.js` to serve static files from `marketing-site`:

```javascript
// Serve marketing site
app.use('/marketing', express.static(path.join(__dirname, 'marketing-site')));

// Or serve it at root if you want
app.use(express.static(path.join(__dirname, 'marketing-site')));
```

### Step 3: Environment Variables (if needed)

If you want to use environment variables instead of hardcoding the URL:

1. In Render dashboard, go to your static site
2. Add environment variable:
   - **Key**: `APP_URL`
   - **Value**: `https://your-bootmark-app.onrender.com`

3. Update `config.js`:

```javascript
const config = {
  production: {
    appUrl: process.env.APP_URL || 'https://your-bootmark-app.onrender.com'
  },
  // ...
};
```

### Step 4: Custom Domain (Optional)

1. In Render dashboard, go to your static site
2. Click "Settings" → "Custom Domain"
3. Add your domain (e.g., `www.bootmark.com`)
4. Update DNS records as instructed by Render

---

## 🔧 How It Works

The marketing site automatically detects the environment:

- **Development** (localhost): Links point to `http://localhost:3000`
- **Production** (any other domain): Links point to your production app URL

This is handled by:
1. `config.js` - Detects environment and sets the correct app URL
2. `script.js` - Updates all links dynamically on page load

---

## ✅ Testing Before Deployment

1. **Test locally**:
   ```bash
   cd marketing-site
   npm run dev
   ```
   Links should point to `http://localhost:3000`

2. **Test production build**:
   - Update `config.js` with your production URL
   - Open `index.html` in browser
   - Check that links point to production URL

---

## 📝 Deployment Checklist

- [ ] Update production URL in `config.js`
- [ ] Test all links work correctly
- [ ] Verify images load properly
- [ ] Check mobile responsiveness
- [ ] Test on different browsers
- [ ] Set up custom domain (optional)
- [ ] Configure SSL certificate (Render does this automatically)
- [ ] Update README with live URLs

---

## 🌐 URLs After Deployment

**Development:**
- Marketing Site: `http://localhost:3001`
- App: `http://localhost:3000`

**Production:**
- Marketing Site: `https://bootmark-marketing.onrender.com` (or your custom domain)
- App: `https://your-bootmark-app.onrender.com`

---

## 🔄 Updating After Deployment

When you push changes to GitHub, Render will automatically rebuild and deploy your site!

Just make sure to:
1. Commit your changes
2. Push to GitHub
3. Render will auto-deploy (usually takes 1-2 minutes)

---

## 🆘 Troubleshooting

**Links still point to localhost:**
- Check that `config.js` is loaded before `script.js`
- Verify production URL in `config.js` is correct
- Clear browser cache and hard refresh (Ctrl+Shift+R)

**Images not loading:**
- Ensure images are in `assets/` folder
- Check image paths are relative (e.g., `assets/logo.jpg` not `/assets/logo.jpg`)
- Verify images are committed to Git

**Site not updating:**
- Check Render deployment logs
- Verify build succeeded
- Clear CDN cache if using one
