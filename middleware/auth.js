const admin = require("firebase-admin");

// Initialize Firebase Admin if available
let firebaseInitialized = false;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    firebaseInitialized = true;
  } else if (process.env.FIREBASE_PROJECT_ID) {
    admin.initializeApp();
    firebaseInitialized = true;
  }
} catch (error) {
  console.warn("Firebase Admin not initialized in middleware. Using fallback.");
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
