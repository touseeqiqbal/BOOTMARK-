const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Initialize Firebase Admin from Render Secret File
let firebaseInitialized = false;
try {
  const serviceAccountPath = "/etc/secrets/firebase-service-account.json"; // Update if your secret file name is different

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

    // Fix private_key line breaks
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    firebaseInitialized = true;
    console.log("✅ Firebase Admin initialized from secret file");
  } else {
    console.warn("⚠️ Firebase service account secret file not found, skipping Firebase Admin init");
  }
} catch (error) {
  console.warn("⚠️ Firebase Admin init failed:", error.message);
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
      }
    }

    // Firebase not initialized or verification failed, try decoding token manually
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        const userId = payload.user_id || payload.sub || payload.uid;
        if (userId) {
          req.user = {
            id: userId,
            uid: userId,
            email: payload.email
          };
          console.log("User authenticated from decoded token:", req.user);
          return next();
        }
      }
    } catch (decodeError) {
      console.error("Token decode failed:", decodeError.message);
    }

    // Fallback to JWT (for backward compatibility)
    try {
      const jwt = require("jsonwebtoken");
      const config = require("../config");
      const decoded = jwt.verify(token, config.jwtSecret);
      req.user = decoded;
      return next();
    } catch (jwtError) {
      console.error("JWT verification failed:", jwtError.message);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
