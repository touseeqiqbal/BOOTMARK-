# Quick Start Guide

## ✅ Dependencies Installed!

Both backend and frontend dependencies are now installed.

## 🚀 Starting the Application

You have **two options** to run the application:

### Option 1: Run Both Servers (Recommended)

**Terminal 1 - Backend:**
```bash
cd /workspace
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd /workspace/public
npm run dev
```

### Option 2: Use the Startup Script

```bash
cd /workspace
./start-dev.sh
```

This will start both servers in the same terminal.

## 🌐 Access the Application

Once both servers are running:

- **Frontend (React App)**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Health Check**: http://localhost:4000/api/health

## 📝 First Steps

1. Open http://localhost:3000 in your browser
2. Click "Sign up" to create a new account
3. Create your first form!

## 🛠️ Troubleshooting

### Port Already in Use?

**Backend (port 4000):**
```bash
PORT=4001 npm run dev
```

**Frontend (port 3000):**
Edit `public/vite.config.js` and change the port number.

### Servers Not Starting?

Make sure you're in the correct directory:
```bash
# For backend
cd /workspace
npm run dev

# For frontend (in a NEW terminal)
cd /workspace/public
npm run dev
```

### Module Errors?

Reinstall dependencies:
```bash
cd /workspace
npm install
cd public
npm install
```

## 📦 Production Build

To build for production:

```bash
cd /workspace/public
npm run build
cd ..
npm start
```

The app will be available at http://localhost:4000
