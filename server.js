// Load local `.env` in development (use platform env vars in production)
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config()
  } catch (e) {
    // dotenv may not be installed in some environments; continue gracefully
    console.warn('dotenv not loaded:', e && e.message ? e.message : e)
  }
}

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const formsRouter = require("./routes/forms");
const workspacesRouter = require("./routes/workspaces");
const publicRouter = require("./routes/public");
const authRouter = require("./routes/auth");
const packagesRouter = require("./routes/packages");
const submissionsRouter = require("./routes/submissions");
const quickbooksRouter = require("./routes/quickbooks");
const { authRequired } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Add request logging for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get("/api/health", async (_req, res) => {
  const { getDataDir, getDataFilePath } = require(path.join(__dirname, "utils", "dataPath"));
  const fs = require("fs");
  const dataDir = getDataDir();
  const formsPath = getDataFilePath("forms.json");
  
  // Check if forms file exists and get its size
  let formsFileExists = false;
  let formsFileSize = 0;
  let formsCount = 0;
  try {
    if (fs.existsSync(formsPath)) {
      formsFileExists = true;
      const stats = fs.statSync(formsPath);
      formsFileSize = stats.size;
      try {
        const data = fs.readFileSync(formsPath, "utf8");
        const forms = JSON.parse(data);
        formsCount = Array.isArray(forms) ? forms.length : 0;
      } catch (e) {
        console.error("Error reading forms file in health check:", e);
      }
    }
  } catch (e) {
    console.error("Error checking forms file:", e);
  }
  
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    environment: {
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      RENDER: process.env.RENDER,
      RENDER_SERVICE_NAME: process.env.RENDER_SERVICE_NAME,
      AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME,
      __dirname: __dirname
    },
    dataDirectory: dataDir,
    formsFilePath: formsPath,
    formsFile: {
      exists: formsFileExists,
      size: formsFileSize,
      formsCount: formsCount
    }
  });
});

app.use("/api/auth", authRouter);
app.use("/api/packages", packagesRouter);
app.use("/api/forms", authRequired, formsRouter);
app.use("/api/workspaces", authRequired, workspacesRouter);
app.use("/api/submissions", authRequired, submissionsRouter);
app.use("/api/quickbooks", quickbooksRouter);
app.use("/api/public", publicRouter);

// Serve static files from public/dist in production, or public in development
const publicDir = path.join(__dirname, "public");
const distDir = path.join(publicDir, "dist");
const fs = require("fs");

// Check if dist directory exists (production build)
const staticDir = fs.existsSync(distDir) ? distDir : publicDir;

// Serve static assets with caching
app.use(express.static(staticDir, {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
  etag: true,
  lastModified: true
}));

// Serve index.html for all non-API routes (SPA routing)
// Express 5 doesn't support "*" wildcard - use app.use() without path pattern
// This middleware will catch all remaining routes after static files
app.use((req, res, next) => {
  // Skip API routes (should already be handled, but double-check)
  if (req.path.startsWith("/api")) {
    return next();
  }
  
  // Skip static file requests (they should be handled by static middleware)
  if (req.path.match(/\.(js|css|ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|json|map)$/)) {
    return next();
  }
  
  // Only handle GET requests for SPA routing
  if (req.method !== "GET") {
    return next();
  }
  
  // Serve index.html for SPA routes
  const indexPath = fs.existsSync(distDir) 
    ? path.join(distDir, "index.html")
    : path.join(publicDir, "index.html");
  
  if (fs.existsSync(indexPath)) {
    return res.sendFile(path.resolve(indexPath));
  }
  
  // Fallback for development
  return res.status(404).send("File not found");
});

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  console.error("Express error:", err);
  console.error("Error stack:", err.stack);
  res.status(500).json({ 
    error: "Internal server error", 
    message: err.message 
  });
});

// Only start server if not in Vercel environment
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;
