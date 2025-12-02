# QuickBooks Localhost Setup Guide

This guide will walk you through setting up QuickBooks integration on your local development environment.

## Prerequisites

1. **Node.js** (v16 or higher) installed
2. **Backend and Frontend** dependencies installed
3. **QuickBooks Developer Account** (free)

## Step 1: Create QuickBooks Developer App

1. Go to [Intuit Developer](https://developer.intuit.com/)
2. Sign up or log in to your account
3. Click **"Create an app"** or go to your dashboard
4. Fill in the app details:
   - **App Name**: Your app name (e.g., "BootMark Local Dev")
   - **App Type**: Select **"QuickBooks Online"**
   - **Environment**: Select **"Sandbox"** (for testing)
5. After creating the app, go to **"Keys & OAuth"** section

## Step 2: Configure OAuth Redirect URI

In your QuickBooks app settings, you need to add the redirect URI for localhost:

1. In the **"Keys & OAuth"** section, find **"Redirect URIs"**
2. Add the following redirect URI:
   ```
   http://localhost:4000/api/quickbooks/callback
   ```
3. **Important**: Make sure to click **"Save"** after adding the redirect URI

## Step 3: Get Your OAuth Credentials

1. In the **"Keys & OAuth"** section, you'll see:
   - **Client ID** (also called App ID)
   - **Client Secret** (also called App Secret)
2. Copy both values - you'll need them in the next step

## Step 4: Create .env File

1. In the root directory of your project, create a file named `.env`
2. Add the following environment variables:

```env
# QuickBooks OAuth Credentials
QUICKBOOKS_CLIENT_ID=your_client_id_here
QUICKBOOKS_CLIENT_SECRET=your_client_secret_here
QUICKBOOKS_ENVIRONMENT=sandbox
QUICKBOOKS_REDIRECT_URI=http://localhost:4000/api/quickbooks/callback

# App URLs (for localhost)
APP_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000
```

3. Replace `your_client_id_here` and `your_client_secret_here` with your actual credentials from Step 3

## Step 5: Install Dependencies (if not already installed)

Make sure you have the required packages installed:

```bash
npm install
```

The QuickBooks integration uses:
- `intuit-oauth` - For OAuth authentication
- `node-quickbooks` - For QuickBooks API calls

## Step 6: Start Your Servers

### Terminal 1 - Backend:
```bash
npm run dev
```
Backend will run on: **http://localhost:4000**

### Terminal 2 - Frontend:
```bash
cd public
npm run dev
```
Frontend will run on: **http://localhost:3000**

## Step 7: Connect QuickBooks in the App

1. Open your browser and go to: **http://localhost:3000**
2. Log in to your account
3. Navigate to **Account Settings** (usually at `/account-settings`)
4. Find the **"QuickBooks Integration"** section
5. Click **"Connect QuickBooks"**
6. You'll be redirected to QuickBooks authorization page
7. Log in with your QuickBooks Sandbox account (or create one if needed)
8. Authorize the app
9. You'll be redirected back to your app with a success message

## QuickBooks Sandbox Account

If you don't have a QuickBooks Sandbox account:

1. During the OAuth flow, you'll be prompted to create one
2. Or go to [QuickBooks Sandbox](https://appcenter.intuit.com/app/playground) to create a test company
3. Use this sandbox account for testing - it's free and data resets periodically

## Verification

To verify the setup is working:

1. Check that your backend server shows no errors
2. In Account Settings, you should see "QuickBooks Connected" status
3. The status should show your company name/realm ID

## Troubleshooting

### "QuickBooks credentials not configured"
- Make sure your `.env` file exists in the root directory
- Verify `QUICKBOOKS_CLIENT_ID` and `QUICKBOOKS_CLIENT_SECRET` are set
- Restart your backend server after creating/updating `.env`

### "Redirect URI mismatch"
- Verify the redirect URI in your QuickBooks app settings exactly matches:
  ```
  http://localhost:4000/api/quickbooks/callback
  ```
- Make sure there are no trailing slashes or extra characters
- The redirect URI in `.env` should also match exactly

### "Failed to connect QuickBooks"
- Check that your backend server is running on port 4000
- Verify the redirect URI is accessible (try visiting `http://localhost:4000/api/health`)
- Check browser console and server logs for detailed error messages

### "OAuth client initialization failed"
- Make sure `intuit-oauth` package is installed: `npm install intuit-oauth`
- Check that the package version is compatible (should be v1.0.0 or higher)

### Port Already in Use

If port 4000 is already in use:
1. Change the port in `.env`:
   ```env
   PORT=4001
   APP_URL=http://localhost:4001
   QUICKBOOKS_REDIRECT_URI=http://localhost:4001/api/quickbooks/callback
   ```
2. Update the redirect URI in QuickBooks app settings to match
3. Restart your server

## Environment Variables Reference

| Variable | Description | Example (Localhost) |
|----------|-------------|---------------------|
| `QUICKBOOKS_CLIENT_ID` | Your QuickBooks app Client ID | `Q0xxxxxxxxxxxxxxxxxxxxx` |
| `QUICKBOOKS_CLIENT_SECRET` | Your QuickBooks app Client Secret | `xxxxxxxxxxxxxxxxxxxxx` |
| `QUICKBOOKS_ENVIRONMENT` | Environment: `sandbox` or `production` | `sandbox` |
| `QUICKBOOKS_REDIRECT_URI` | OAuth callback URL | `http://localhost:4000/api/quickbooks/callback` |
| `APP_URL` | Backend URL | `http://localhost:4000` |
| `FRONTEND_URL` | Frontend URL | `http://localhost:3000` |

## Next Steps

Once connected, you can:
- Sync form submissions to QuickBooks
- Create customers automatically
- Generate invoices
- View sync status in Account Settings

## Security Note

⚠️ **Never commit your `.env` file to version control!**

Make sure `.env` is in your `.gitignore` file. Your OAuth credentials are sensitive and should remain private.

## Production Setup

When deploying to production:
1. Change `QUICKBOOKS_ENVIRONMENT` to `production`
2. Update redirect URIs to your production domain
3. Get your app approved by Intuit (required for production)
4. Use secure environment variable storage (not `.env` files)

---

For more information, see [INTEGRATIONS_SETUP.md](./INTEGRATIONS_SETUP.md)

