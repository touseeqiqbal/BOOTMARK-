// Vercel serverless function entry point
// This wraps the Express app for Vercel deployment
const app = require('../server');

// Export the Express app directly - Vercel will handle it as a serverless function
module.exports = app;
