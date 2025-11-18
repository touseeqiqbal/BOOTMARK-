const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
const { admin, useFirestore, getCollectionRef, getDoc, setDoc } = require(path.join(__dirname, "..", "utils", "db"));

const router = express.Router();

// Lazy file path resolution - resolve at runtime, not module load time
function getUsersFilePath() {
  return getDataFilePath("users.json");
}

// Use Firestore/admin initialization from utils/db.js
const firebaseInitialized = !!useFirestore

// Helper to extract user ID from token (with Firebase fallback to JWT decode)
async function extractUserIdFromToken(token) {
  if (!token) return null;
  
  if (firebaseInitialized) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      return decodedToken.uid;
    } catch (firebaseError) {
      console.warn("Firebase verification failed, trying JWT decode:", firebaseError.message);
      // Fall through to JWT decode below
    }
  }
  
  // Fallback: decode JWT manually
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.user_id || payload.sub || payload.uid || payload.id;
    }
  } catch (decodeError) {
    console.error("JWT decode failed:", decodeError.message);
  }
  
  return null;
}

// Helper to verify token and get decoded user data (with Firebase fallback to JWT decode)
async function verifyAndDecodeToken(token) {
  if (!token) return null;
  
  if (firebaseInitialized) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      return decodedToken;
    } catch (firebaseError) {
      console.warn("Firebase verification failed, trying JWT decode:", firebaseError.message);
      // Fall through to JWT decode below
    }
  }
  
  // Fallback: decode JWT manually
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return {
        uid: payload.user_id || payload.sub || payload.uid || payload.id,
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      };
    }
  } catch (decodeError) {
    console.error("JWT decode failed:", decodeError.message);
  }
  
  return null;
}

// Initialize users file
async function initUsersFile() {
  const USERS_FILE = getUsersFilePath();
  try {
    await fs.access(USERS_FILE);
  } catch {
    try {
      const dir = path.dirname(USERS_FILE);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(USERS_FILE, JSON.stringify([], null, 2), 'utf8');
      console.log("Users file initialized at:", USERS_FILE);
    } catch (writeError) {
      console.error("Error initializing users file:", writeError);
      throw writeError;
    }
  }
}

// Get all users
async function getUsers() {
  if (useFirestore) {
    try {
      const snap = await getCollectionRef('users').get()
      const items = []
      snap.forEach(d => items.push({ id: d.id, ...d.data() }))
      return items
    } catch (e) {
      console.error('Error fetching users from Firestore:', e)
      return []
    }
  }
  const USERS_FILE = getUsersFilePath();
  try {
    await initUsersFile();
    const data = await fs.readFile(USERS_FILE, "utf8");
    const users = JSON.parse(data);
    return Array.isArray(users) ? users : [];
  } catch (error) {
    console.error("Error reading users file:", error);
    if (error.code === 'ENOENT') {
      return [];
    }
    return [];
  }
}

// Save users
async function saveUsers(users) {
  if (useFirestore) {
    try {
      for (const u of users) {
        const uid = u.uid || u.id
        if (!uid) continue
        // Filter out undefined values for Firestore
        const cleanUser = {};
        for (const key in u) {
          if (u[key] !== undefined) {
            cleanUser[key] = u[key];
          }
        }
        await setDoc('users', uid, cleanUser)
      }
      return
    } catch (e) {
      console.error('Error saving users to Firestore:', e)
      throw e
    }
  }
  const USERS_FILE = getUsersFilePath();
  const dir = path.dirname(USERS_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

// Verify Firebase token
router.post("/verify-firebase-token", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    if (!firebaseInitialized) {
      // Fallback: accept token without verification (for development)
      console.warn("Firebase Admin not initialized. Accepting token without verification.");
      
      // Try to decode token to get user info
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          const userId = payload.user_id || payload.sub || payload.uid;
          const email = payload.email;
          
          if (userId) {
            // Get or create user in our database
            const users = await getUsers();
            let user = users.find((u) => u.uid === userId);

            if (!user) {
              // Create new user
              user = {
                id: userId,
                uid: userId,
                email: email,
                name: payload.name || email?.split("@")[0] || "User",
                photoURL: payload.picture || "",
                createdAt: new Date().toISOString(),
                provider: payload.firebase?.sign_in_provider || "unknown"
              };
              users.push(user);
              await saveUsers(users);
            } else {
              // Update existing user info
              user.email = email || user.email;
              user.name = payload.name || user.name;
              user.photoURL = payload.picture || user.photoURL || "";
              await saveUsers(users);
            }

            return res.json({
              success: true,
              user: {
                id: user.id,
                uid: user.uid,
                email: user.email,
                name: user.name,
                photoURL: user.photoURL
              }
            });
          }
        }
      } catch (decodeError) {
        console.error("Token decode error:", decodeError);
      }
      
      return res.json({ 
        success: true, 
        message: "Token accepted (Firebase not configured)" 
      });
    }

    // Verify the Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (firebaseVerifyError) {
      // Firebase verification failed - try to decode the token payload for development
      console.warn("Firebase token verification failed:", firebaseVerifyError.message);
      console.log("Falling back to JWT decode...");
      
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          const userId = payload.user_id || payload.sub || payload.uid || payload.id;
          const email = payload.email;
          
          if (!userId) {
            return res.status(401).json({ error: "Invalid token - no user ID" });
          }
          
          // Get or create user in our database
          const users = await getUsers();
          let user = users.find((u) => u.uid === userId);

          if (!user) {
            // Create new user
            user = {
              id: userId,
              uid: userId,
              email: email,
              name: payload.name || email?.split("@")[0] || "User",
              photoURL: payload.picture || "",
              createdAt: new Date().toISOString(),
              provider: payload.firebase?.sign_in_provider || "manual"
            };
            users.push(user);
            await saveUsers(users);
          } else {
            // Update existing user info
            user.email = email || user.email;
            user.name = payload.name || user.name;
            user.photoURL = payload.picture || user.photoURL || "";
            await saveUsers(users);
          }

          return res.json({
            success: true,
            user: {
              id: user.id,
              uid: user.uid,
              email: user.email,
              name: user.name,
              photoURL: user.photoURL
            }
          });
        }
      } catch (decodeError) {
        console.error("Token decode failed:", decodeError.message);
      }
      
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    
    // Firebase verification succeeded
    // Get or create user in our database
    const users = await getUsers();
    let user = users.find((u) => u.uid === decodedToken.uid);

    if (!user) {
      // Create new user
      user = {
        id: decodedToken.uid,
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email?.split("@")[0],
        photoURL: decodedToken.picture || "",
        createdAt: new Date().toISOString(),
        provider: decodedToken.firebase.sign_in_provider
      };
      users.push(user);
      await saveUsers(users);
    } else {
      // Update existing user info
      user.email = decodedToken.email;
      user.name = decodedToken.name || user.name;
      user.photoURL = decodedToken.picture || user.photoURL || "";
      await saveUsers(users);
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        name: user.name,
        photoURL: user.photoURL
      }
    });
  } catch (error) {
    console.error("Token verification error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      error: "Token verification failed", 
      message: error.message 
    });
  }
});

// Logout
router.post("/logout", (req, res) => {
  res.json({ message: "Logged out successfully" });
});

// Get current user (for compatibility)
router.get("/me", async (req, res) => {
  try {
    const token = req.headers?.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const decodedToken = await verifyAndDecodeToken(token);
    if (!decodedToken || !decodedToken.uid) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const users = await getUsers();
    const user = users.find((u) => u.uid === decodedToken.uid);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ 
      user: { 
        id: user.id, 
        uid: user.uid,
        email: user.email, 
        name: user.name,
        photoURL: user.photoURL
      } 
    });
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// Get account data
router.get("/account", async (req, res) => {
  try {
    const token = req.headers?.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = await extractUserIdFromToken(token);
    if (!userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const users = await getUsers();
    const user = users.find((u) => u.uid === userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      name: user.name,
      email: user.email,
      companyName: user.companyName || '',
      accountType: user.accountType || 'personal',
      accountStatus: user.accountStatus || 'active',
      notifications: user.notifications || {},
      businessInfo: user.businessInfo || {}
    });
  } catch (error) {
    console.error("Get account error:", error);
    res.status(500).json({ error: "Failed to fetch account data" });
  }
});

// Update account
router.put("/account", async (req, res) => {
  try {
    const token = req.headers?.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = await extractUserIdFromToken(token);
    if (!userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const users = await getUsers();
    const userIndex = users.findIndex((u) => u.uid === userId);

    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    const { name, email, companyName, accountType } = req.body;
    users[userIndex] = {
      ...users[userIndex],
      name: name || users[userIndex].name,
      email: email || users[userIndex].email,
      companyName: companyName || users[userIndex].companyName,
      accountType: accountType || users[userIndex].accountType,
      updatedAt: new Date().toISOString()
    };

    await saveUsers(users);

    res.json({
      success: true,
      user: {
        id: users[userIndex].id,
        uid: users[userIndex].uid,
        email: users[userIndex].email,
        name: users[userIndex].name,
        photoURL: users[userIndex].photoURL,
        companyName: users[userIndex].companyName,
        accountType: users[userIndex].accountType
      }
    });
  } catch (error) {
    console.error("Update account error:", error);
    res.status(500).json({ error: "Failed to update account" });
  }
});

// Update notifications
router.put("/account/notifications", async (req, res) => {
  try {
    const token = req.headers?.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = await extractUserIdFromToken(token);
    if (!userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const users = await getUsers();
    const userIndex = users.findIndex((u) => u.uid === userId);

    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    users[userIndex].notifications = req.body;
    users[userIndex].updatedAt = new Date().toISOString();
    await saveUsers(users);

    res.json({ success: true });
  } catch (error) {
    console.error("Update notifications error:", error);
    res.status(500).json({ error: "Failed to update notifications" });
  }
});

// Update business info
router.put("/account/business", async (req, res) => {
  try {
    const token = req.headers?.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = await extractUserIdFromToken(token);
    if (!userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const users = await getUsers();
    const userIndex = users.findIndex((u) => u.uid === userId);

    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    users[userIndex].businessInfo = req.body;
    users[userIndex].updatedAt = new Date().toISOString();
    await saveUsers(users);

    res.json({ success: true });
  } catch (error) {
    console.error("Update business info error:", error);
    res.status(500).json({ error: "Failed to update business information" });
  }
});

// Get SMTP configuration
router.get("/account/smtp", async (req, res) => {
  try {
    const token = req.headers?.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = await extractUserIdFromToken(token);
    if (!userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const users = await getUsers();
    const user = users.find((u) => u.uid === userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return SMTP config (mask password for security)
    const smtpConfig = user.smtpConfig || {};
    res.json({
      host: smtpConfig.host || '',
      port: smtpConfig.port || 587,
      secure: smtpConfig.secure || false,
      user: smtpConfig.user || '',
      from: smtpConfig.from || '',
      passwordSet: !!smtpConfig.password // Only indicate if password is set, don't return it
    });
  } catch (error) {
    console.error("Get SMTP config error:", error);
    res.status(500).json({ error: "Failed to fetch SMTP configuration" });
  }
});

// Update SMTP configuration
router.put("/account/smtp", async (req, res) => {
  try {
    const token = req.headers?.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    let userId;
    if (firebaseInitialized) {
      const decodedToken = await admin.auth().verifyIdToken(token);
      userId = decodedToken.uid;
    } else {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        userId = payload.user_id || payload.sub || payload.uid;
      }
    }

    if (!userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const users = await getUsers();
    const userIndex = users.findIndex((u) => u.uid === userId);

    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    const { host, port, secure, user, password, from } = req.body;

    // Update SMTP config (only update password if provided)
    if (!users[userIndex].smtpConfig) {
      users[userIndex].smtpConfig = {};
    }

    users[userIndex].smtpConfig = {
      ...users[userIndex].smtpConfig,
      host: host || users[userIndex].smtpConfig.host,
      port: port || users[userIndex].smtpConfig.port || 587,
      secure: secure !== undefined ? secure : users[userIndex].smtpConfig.secure,
      user: user || users[userIndex].smtpConfig.user,
      from: from || users[userIndex].smtpConfig.from,
      ...(password && { password }) // Only update password if provided
    };

    users[userIndex].updatedAt = new Date().toISOString();
    await saveUsers(users);

    // Reinitialize email service with new config
    const { initializeEmailService } = require(path.join(__dirname, "..", "utils", "emailService"));
    initializeEmailService();

    res.json({ success: true });
  } catch (error) {
    console.error("Update SMTP config error:", error);
    res.status(500).json({ error: "Failed to update SMTP configuration" });
  }
});

// Test SMTP configuration
router.post("/account/smtp/test", async (req, res) => {
  try {
    const token = req.headers?.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = await extractUserIdFromToken(token);
    if (!userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const users = await getUsers();
    const user = users.find((u) => u.uid === userId);

    if (!user || !user.smtpConfig) {
      return res.status(400).json({ error: "SMTP configuration not found" });
    }

    const { sendEmail } = require(path.join(__dirname, "..", "utils", "emailService"));
    
    // Temporarily set environment variables for test
    const originalEnv = {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_SECURE: process.env.SMTP_SECURE,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASSWORD: process.env.SMTP_PASSWORD,
      SMTP_FROM: process.env.SMTP_FROM
    };

    process.env.SMTP_HOST = user.smtpConfig.host;
    process.env.SMTP_PORT = String(user.smtpConfig.port || 587);
    process.env.SMTP_SECURE = String(user.smtpConfig.secure || false);
    process.env.SMTP_USER = user.smtpConfig.user;
    process.env.SMTP_PASSWORD = user.smtpConfig.password;
    process.env.SMTP_FROM = user.smtpConfig.from || user.smtpConfig.user;

    // Reinitialize email service
    const { initializeEmailService } = require(path.join(__dirname, "..", "utils", "emailService"));
    initializeEmailService();

    // Send test email
    const result = await sendEmail({
      to: user.email,
      subject: "SMTP Configuration Test",
      html: "<p>This is a test email to verify your SMTP configuration is working correctly.</p>"
    });

    // Restore original environment variables
    Object.assign(process.env, originalEnv);
    initializeEmailService();

    if (result.success) {
      res.json({ success: true, message: "Test email sent successfully!" });
    } else {
      res.status(400).json({ success: false, error: result.error || "Failed to send test email" });
    }
  } catch (error) {
    console.error("Test SMTP error:", error);
    res.status(500).json({ error: "Failed to test SMTP configuration", message: error.message });
  }
});

module.exports = router;
