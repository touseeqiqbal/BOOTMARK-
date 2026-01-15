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
const session = require("express-session");
const path = require("path");
const fs = require("fs");

const formsRouter = require("./routes/forms");
const workspacesRouter = require("./routes/workspaces");
const publicRouter = require("./routes/public");
const authRouter = require("./routes/auth");
const packagesRouter = require("./routes/packages");
const submissionsRouter = require("./routes/submissions");
const quickbooksRouter = require("./routes/quickbooks");
const { router: customersRouter } = require("./routes/customers");
const invoicesRouter = require("./routes/invoices");
const businessesRouter = require("./routes/businesses");
const paymentsRouter = require("./routes/payments");
const { router: propertiesRouter } = require("./routes/properties");
const workOrdersRouter = require("./routes/workOrders");
const workOrderTemplatesRouter = require("./routes/workOrderTemplates");
const servicesRouter = require("./routes/services");
const productsRouter = require("./routes/products");
const contractsRouter = require("./routes/contracts");
const estimatesRouter = require("./routes/estimates");
const schedulingRouter = require("./routes/scheduling");
const employeesRouter = require("./routes/employees");
const materialsRouter = require("./routes/materials");
const reportsRouter = require("./routes/reports");
const settingsRouter = require("./routes/settings");
const clientsRouter = require("./routes/clients"); // NEW: Client portal routes
const clientInvitationsRouter = require("./routes/clientInvitations"); // NEW: Client invitations
const serviceRequestsRouter = require("./routes/serviceRequests"); // NEW: Service requests
const messagesRouter = require("./routes/messages"); // NEW: Messages
const gpsRouter = require("./routes/gps"); // NEW: GPS tracking
const remindersRouter = require("./routes/reminders"); // NEW: Automated reminders
const usersRouter = require("./routes/users"); // NEW: Unified users endpoint
const { authRequired } = require("./middleware/auth");
const { apiLimiter, authLimiter, publicLimiter } = require("./middleware/rateLimiter"); // Rate limiting
const helmet = require("helmet"); // Security headers

const app = express();
const PORT = process.env.PORT || 4000;

// Configure CORS to allow credentials (cookies)
app.use(cors({
  origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? false : true), // Allow all origins in dev, specific in prod
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Configure session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || "development-session-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: 60 * 24 * 60 * 60 * 1000, // 60 days
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax' // CSRF protection
  },
  name: 'sessionId' // Custom session cookie name
}));

// Add request logging for debugging (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Security: Helmet middleware for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false // Allow embedding if needed
}));

console.log('✅ Security headers enabled (Helmet)');

// RATE LIMITING DISABLED FOR DEVELOPMENT
// Uncomment these lines in production:
// app.use('/api/', apiLimiter);
// console.log('✅ API rate limiting enabled (500 req/15min)');
// app.use('/api/auth/login', authLimiter);
// app.use('/api/auth/register', authLimiter);
// console.log('✅ Auth rate limiting enabled (5 attempts/15min)');
// app.use('/api/public/', publicLimiter);
// console.log('✅ Public rate limiting enabled (200 req/15min)');

console.log('⚠️  Rate limiting DISABLED for development');

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
app.use("/api/businesses", authRequired, businessesRouter);
app.use("/api/forms", authRequired, formsRouter);
app.use("/api/workspaces", authRequired, workspacesRouter);
app.use("/api/submissions", authRequired, submissionsRouter);
app.use("/api/customers", authRequired, customersRouter);
app.use("/api/properties", authRequired, propertiesRouter);
app.use("/api/work-orders", authRequired, workOrdersRouter);
app.use("/api/work-order-templates", authRequired, workOrderTemplatesRouter);
app.use("/api/services", authRequired, servicesRouter);
app.use("/api/products", authRequired, productsRouter);
app.use("/api/contracts", authRequired, contractsRouter);
app.use("/api/estimates", authRequired, estimatesRouter);
app.use("/api/scheduling", authRequired, schedulingRouter);
app.use("/api/employees", authRequired, employeesRouter);
app.use("/api/materials", authRequired, materialsRouter);
app.use("/api/reports", authRequired, reportsRouter);
app.use("/api/settings", authRequired, settingsRouter);
app.use("/api/invoices", authRequired, invoicesRouter);
app.use("/api/clients", authRequired, clientsRouter); // NEW: Client portal API
app.use("/api/client-invitations", clientInvitationsRouter); // NEW: Client invitations (no auth required for verify/accept)
app.use("/api/service-requests", authRequired, serviceRequestsRouter); // NEW: Service requests
app.use("/api/messages", authRequired, messagesRouter); // NEW: Messages
app.use("/api/gps", authRequired, gpsRouter); // NEW: GPS tracking
app.use("/api/reminders", authRequired, remindersRouter); // NEW: Automated reminders
app.use("/api/users", authRequired, usersRouter); // NEW: Unified users endpoint
app.use("/api/payments", paymentsRouter);
app.use("/api/quickbooks", quickbooksRouter);
app.use("/api/public", publicRouter);

// ========================================
// SERVE MARKETING SITE
// ========================================
// Explicitly handle root path to serve marketing site
const marketingDir = path.join(__dirname, "marketing-site");
const marketingIndexPath = path.join(marketingDir, "index.html");

// Serve marketing site index.html at root
app.get('/', (req, res, next) => {
  if (fs.existsSync(marketingIndexPath)) {
    return res.sendFile(path.resolve(marketingIndexPath));
  }
  next();
});

// Serve marketing site static files (HTML, CSS, JS, images)
if (fs.existsSync(marketingDir)) {
  // Serve marketing site files with proper MIME types
  app.use(express.static(marketingDir, {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: true,
    lastModified: true,
    index: false // Don't auto-serve index.html (we handle it explicitly above)
  }));
  console.log('✅ Marketing site enabled at root URL');
} else {
  console.warn('⚠️  Marketing site directory not found');
}

// ========================================
// SERVE MAIN APP (React SPA)
// ========================================

// Serve static files from public/dist in production, or public in development
const publicDir = path.join(__dirname, "public");
const distDir = path.join(publicDir, "dist");

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

  // Define app routes (these should serve the React app)
  const appRoutes = [
    '/login',
    '/register',
    '/dashboard',
    '/forms',
    '/workspaces',
    '/submissions',
    '/customers',
    '/properties',
    '/work-orders',
    '/scheduling',
    '/invoices',
    '/estimates',
    '/contracts',
    '/employees',
    '/materials',
    '/reports',
    '/settings',
    '/client-portal',
    '/profile'
  ];

  // Check if this is an app route
  const isAppRoute = appRoutes.some(route => req.path.startsWith(route));

  if (isAppRoute) {
    // Serve React app index.html for app routes
    const indexPath = fs.existsSync(distDir)
      ? path.join(distDir, "index.html")
      : path.join(publicDir, "index.html");

    if (fs.existsSync(indexPath)) {
      return res.sendFile(path.resolve(indexPath));
    }
  } else {
    // Serve marketing site index.html for root and other routes
    const marketingIndexPath = path.join(marketingDir, "index.html");
    if (fs.existsSync(marketingIndexPath)) {
      return res.sendFile(path.resolve(marketingIndexPath));
    }
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
  const http = require('http');
  const server = http.createServer(app);

  // Initialize Socket.IO for real-time features
  const { initializeSocket } = require('./utils/socketServer');
  initializeSocket(server);

  server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
    console.log('✅ Real-time notifications enabled (Socket.IO)');

    // Initialize automated reminder scheduler
    const { initializeReminderScheduler } = require('./utils/reminderScheduler');
    initializeReminderScheduler();
  });
} else {
  // Vercel serverless - no Socket.IO
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;
