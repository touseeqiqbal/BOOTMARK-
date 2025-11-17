const path = require("path");
const fs = require("fs");

// In Vercel serverless functions, the filesystem is read-only except for /tmp
// Use /tmp for data storage in Vercel, otherwise use the data directory
let dataDir = null;

function getDataDir() {
  if (dataDir) {
    return dataDir;
  }

  // Check if we're in Vercel/Lambda environment
  // Multiple ways to detect:
  // 1. Vercel environment variables
  // 2. AWS Lambda (Vercel uses Lambda under the hood)
  // 3. Check if __dirname points to /var/task (Lambda/Vercel deployment path)
  const hasVercelEnv = process.env.VERCEL === '1' || 
                       process.env.VERCEL === 'true' ||
                       process.env.VERCEL_ENV || 
                       process.env.VERCEL_URL;
  
  const hasLambdaEnv = process.env.AWS_LAMBDA_FUNCTION_NAME ||
                       process.env.LAMBDA_TASK_ROOT;
  
  // Check if we're in Lambda/Vercel by checking __dirname
  // In Vercel/Lambda, __dirname will be something like /var/task/utils
  let isInLambdaPath = false;
  try {
    isInLambdaPath = __dirname && __dirname.startsWith('/var/task');
  } catch (e) {
    // __dirname might not be available in some contexts
  }
  
  // Also check the resolved local data path - if it contains /var/task, we're in Lambda
  const checkLocalDataDir = path.join(__dirname, "../data");
  const isLocalPathInLambda = checkLocalDataDir.startsWith('/var/task');
  
  // If we're in /var/task, we're definitely in a serverless environment
  const isVercel = hasVercelEnv || hasLambdaEnv || isInLambdaPath || isLocalPathInLambda;

  if (isVercel) {
    // Ensure /tmp/data exists
    const tmpDataDir = '/tmp/data';
    try {
      if (!fs.existsSync(tmpDataDir)) {
        fs.mkdirSync(tmpDataDir, { recursive: true });
        console.log('Created /tmp/data directory');
      }
      dataDir = tmpDataDir;
      console.log('Using /tmp/data for data storage (Vercel/Lambda environment detected)');
      console.log('Environment detection:', {
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
        VERCEL_URL: process.env.VERCEL_URL,
        AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME,
        LAMBDA_TASK_ROOT: process.env.LAMBDA_TASK_ROOT,
        __dirname: __dirname,
        isInLambdaPath: isInLambdaPath,
        isLocalPathInLambda: isLocalPathInLambda,
        checkLocalDataDir: checkLocalDataDir
      });
      return dataDir;
    } catch (error) {
      console.error('Could not create /tmp/data directory:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        errno: error.errno
      });
      // Fallback to /tmp if /tmp/data fails
      dataDir = '/tmp';
      console.log('Falling back to /tmp directory');
      return dataDir;
    }
  }
  // Local development - use project data directory
  const localDataDir = checkLocalDataDir;
  // Ensure local data directory exists
  try {
    if (!fs.existsSync(localDataDir)) {
      fs.mkdirSync(localDataDir, { recursive: true });
      console.log('Created local data directory:', localDataDir);
    }
  } catch (error) {
    console.warn('Could not create local data directory:', error);
  }
  dataDir = localDataDir;
  console.log('Using local data directory:', dataDir);
  return dataDir;
}

// Get path for a specific data file
function getDataFilePath(filename) {
  const filePath = path.join(getDataDir(), filename);
  // Only log on first call to avoid spam
  if (!getDataFilePath._logged) {
    console.log('Data file path utility initialized, example path:', filePath);
    getDataFilePath._logged = true;
  }
  return filePath;
}

module.exports = {
  getDataDir,
  getDataFilePath
};
