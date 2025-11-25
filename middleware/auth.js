// Use Firebase Admin from utils/db.js if available
// This prevents double initialization which causes authentication errors
let firebaseInitialized = false;
let admin = null;

try {
  // Try to get the already-initialized Firebase Admin from utils/db.js
  const { admin: dbAdmin, useFirestore } = require("../utils/db");
  
  if (dbAdmin && dbAdmin.apps && dbAdmin.apps.length > 0) {
    // Firebase Admin is already initialized in utils/db.js
    admin = dbAdmin;
    firebaseInitialized = true;
    console.log("✅ Using Firebase Admin from utils/db.js in middleware");
  } else if (useFirestore && dbAdmin) {
    // Firestore is available but might not have apps yet - still use it
    admin = dbAdmin;
    firebaseInitialized = true;
    console.log("✅ Using Firebase Admin from utils/db.js in middleware (Firestore enabled)");
  }
} catch (error) {
  // If utils/db.js doesn't have Firebase initialized, try to initialize here
  // This is a fallback for cases where db.js hasn't loaded yet
  try {
    admin = require("firebase-admin");
    
    // Check if already initialized
    if (admin.apps && admin.apps.length > 0) {
      firebaseInitialized = true;
      console.log("✅ Using existing Firebase Admin instance in middleware");
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Initialize only if not already initialized
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      
      // Ensure private_key has proper newlines
      if (serviceAccount.private_key && serviceAccount.private_key.includes('\\n')) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
      firebaseInitialized = true;
      console.log("✅ Firebase Admin initialized in middleware");
    } else if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID
      });
      firebaseInitialized = true;
      console.log("✅ Firebase Admin initialized in middleware (default credentials)");
    }
  } catch (initError) {
    console.warn("⚠️  Firebase Admin not initialized in middleware. Using fallback.");
    console.warn("   Error:", initError.message);
  }
}

// Fallback: ensure admin is loaded even if initialization failed
if (!admin) {
  admin = require("firebase-admin");
}

exports.authRequired = async (req, res, next) => {
  try {
    const token = req.cookies?.token || req.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      console.log("No token found in request");
      return res.status(401).json({ error: "Authentication required" });
    }

    console.log("Token received, length:", token.length);

    // Try Firebase token verification first
    if (firebaseInitialized) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = {
          id: decodedToken.uid,
          uid: decodedToken.uid,
          email: decodedToken.email
        };
        return next();
      } catch (firebaseError) {
        console.warn("Firebase token verification failed:", firebaseError.message);
        // If Firebase Admin is not configured, accept the token without verification
        // This is for development - in production, you should configure Firebase Admin
        if (!firebaseInitialized || firebaseError.code === 'app/no-app') {
          console.warn("Firebase Admin not configured. Accepting token without verification (development mode).");
          // Extract user info from token (basic validation)
          // In production, you MUST configure Firebase Admin SDK
          try {
            // Try to decode the token payload (basic check)
            const parts = token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
              req.user = {
                id: payload.user_id || payload.sub || payload.uid,
                uid: payload.user_id || payload.sub || payload.uid,
                email: payload.email
              };
              return next();
            }
          } catch (decodeError) {
            console.error("Token decode error:", decodeError);
          }
        }
        // If Firebase verification fails and we can't decode, try JWT fallback
        console.warn("Trying JWT fallback");
      }
    } else {
      // Firebase Admin not initialized - try to decode token payload
      console.log("Firebase Admin not initialized, decoding token payload...");
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          console.log("Decoded token payload:", JSON.stringify(payload, null, 2));
          const userId = payload.user_id || payload.sub || payload.uid;
          if (userId) {
            req.user = {
              id: userId,
              uid: userId,
              email: payload.email
            };
            console.log("User authenticated:", req.user);
            return next();
          } else {
            console.error("No user_id found in token payload");
          }
        } else {
          console.error("Invalid token format - expected 3 parts, got:", parts.length);
        }
      } catch (decodeError) {
        console.error("Token decode failed:", decodeError.message);
        console.error("Token decode stack:", decodeError.stack);
      }
    }

    // Fallback to JWT (for backward compatibility)
    try {
      const jwt = require("jsonwebtoken");
      const config = require("../config");
      const decoded = jwt.verify(token, config.jwtSecret);
      req.user = decoded;
      next();
    } catch (jwtError) {
      console.error("JWT verification failed:", jwtError.message);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
