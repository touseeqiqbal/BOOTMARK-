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
    // Check if user is authenticated via session
    if (req.session && req.session.authenticated && req.session.userId) {
      req.user = {
        id: req.session.userId,
        uid: req.session.userId,
        email: req.session.userEmail
      };

      // Fetch business context from Firestore
      if (firebaseInitialized && admin.firestore) {
        try {
          const db = admin.firestore();
          const userDoc = await db.collection('users').doc(req.session.userId).get();

          if (userDoc.exists) {
            const userData = userDoc.data();
            req.user = {
              ...req.user,
              businessId: userData.businessId || null,
              businessPermissions: userData.businessPermissions || [],
              isSuperAdmin: userData.isSuperAdmin === true,
              isBusinessOwner: userData.isBusinessOwner === true,
              businessRole: userData.businessRole || null,
              accountStatus: userData.accountStatus || 'active'
            };
          }
        } catch (firestoreError) {
          console.warn('Failed to fetch user business context:', firestoreError.message);
        }
      }

      return next();
    }

    // Fallback to token-based authentication
    const token = req.cookies?.token || req.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      console.log("No token or session found in request");
      return res.status(401).json({ error: "Authentication required" });
    }

    console.log("Token received, length:", token.length);

    let userId = null;
    let userEmail = null;

    // Try Firebase token verification first
    if (firebaseInitialized) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        userId = decodedToken.uid;
        userEmail = decodedToken.email;

        req.user = {
          id: userId,
          uid: userId,
          email: userEmail,
          role: decodedToken.role || 'admin', // Extract role from custom claims
          businessId: decodedToken.businessId || null, // Extract businessId from custom claims
          customerId: decodedToken.customerId || null // Extract customerId from custom claims (for clients)
        };

        // Fetch full user data from Firestore including business context
        if (admin.firestore) {
          try {
            const db = admin.firestore();
            const userDoc = await db.collection('users').doc(userId).get();

            if (userDoc.exists) {
              const userData = userDoc.data();
              req.user = {
                ...req.user,
                businessId: req.user.businessId || userData.businessId || null, // Prefer custom claim
                businessPermissions: userData.businessPermissions || [],
                isSuperAdmin: userData.isSuperAdmin === true,
                isBusinessOwner: userData.isBusinessOwner === true,
                businessRole: userData.businessRole || null,
                accountStatus: userData.accountStatus || 'active',
                name: userData.name || null
              };

              // AUTO-FIX: If admin user has no businessId, use their userId as businessId
              // This ensures proper multi-tenant isolation for existing accounts
              if (!req.user.businessId && req.user.role === 'admin') {
                req.user.businessId = userId;
                console.log(`[Auth] Auto-assigned businessId for admin: ${userId}`);

                // Update Firestore to persist this
                try {
                  await db.collection('users').doc(userId).update({
                    businessId: userId,
                    isBusinessOwner: true
                  });
                  console.log(`[Auth] Updated user document with businessId: ${userId}`);
                } catch (updateError) {
                  console.warn('[Auth] Failed to update user businessId:', updateError.message);
                }
              }
            }
          } catch (firestoreError) {
            console.warn('Failed to fetch user data from Firestore:', firestoreError.message);
          }
        }

        console.log(`[Auth] User authenticated: ${userEmail} (role: ${req.user.role}, businessId: ${req.user.businessId})`);
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
              userId = payload.user_id || payload.sub || payload.uid;
              userEmail = payload.email;
              req.user = {
                id: userId,
                uid: userId,
                email: userEmail
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
          userId = payload.user_id || payload.sub || payload.uid;
          userEmail = payload.email;
          if (userId) {
            req.user = {
              id: userId,
              uid: userId,
              email: userEmail
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
