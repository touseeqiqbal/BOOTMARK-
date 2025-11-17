# Quick Setup Guide

## Prerequisites
- Node.js (v16 or higher)
- npm (comes with Node.js)

## Installation Steps

1. **Install Backend Dependencies**
   ```bash
   npm install
   ```

2. **Install Frontend Dependencies**
   ```bash
   cd public
   npm install
   cd ..
   ```

## Running in Development

### Option 1: Run Both Servers Separately (Recommended for Development)

**Terminal 1 - Backend:**
```bash
npm run dev
```
Backend runs on: http://localhost:4000

**Terminal 2 - Frontend:**
```bash
cd public
npm run dev
```
Frontend runs on: http://localhost:3000

The frontend will proxy API requests to the backend automatically.

### Option 2: Production Build

1. **Build the Frontend:**
   ```bash
   cd public
   npm run build
   cd ..
   ```

2. **Start the Server:**
   ```bash
   npm start
   ```
   
   The application will be available at: http://localhost:4000

## First Time Setup

1. Open the application in your browser
2. Click "Sign up" to create a new account
3. Start creating forms!

## Troubleshooting

### Port Already in Use
If port 4000 or 3000 is already in use:
- Backend: Set `PORT` environment variable: `PORT=4001 npm run dev`
- Frontend: Edit `vite.config.js` and change the port

### Module Not Found Errors
Make sure you've installed dependencies in both root and public directories:
```bash
npm install
cd public && npm install
```

### Build Errors
Clear node_modules and reinstall:
```bash
rm -rf node_modules public/node_modules
npm install
cd public && npm install
```

## Data Storage

The application uses JSON files for data storage (located in `/data`):
- `users.json` - User accounts
- `forms.json` - Form definitions
- `submissions.json` - Form submissions

These files are created automatically on first use.
