const express = require("express");
const admin = require("firebase-admin");
const fs = require("fs").promises;
const path = require("path");
const { getDataFilePath } = require("../utils/dataPath");

const router = express.Router();

// Lazy file path resolution - resolve at runtime, not module load time
function getUsersFilePath() {
  return getDataFilePath("users.json");
}

// Initialize Firebase Admin if credentials are provided
let firebaseInitialized = false;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    firebaseInitialized = true;
  } else if (process.env.FIREBASE_PROJECT_ID) {
    // Initialize with default credentials (for App Engine, Cloud Functions, etc.)
    admin.initializeApp();
    firebaseInitialized = true;
  }
} catch (error) {
  console.warn("Firebase Admin not initialized. Using fallback authentication.");
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
  const USERS_FILE = getUsersFilePath();
  try {
    await initUsersFile();
    const data = await fs.readFile(USERS_FILE, "utf8");
    const users = JSON.parse(data);
    return Array.isArray(users) ? users : [];
  } catch (error) {
    console.error("Error reading users file:", error);
    // Return empty array if file doesn't exist
    if (error.code === 'ENOENT') {
      return [];
    }
    return [];
  }
}

// Save users
async function saveUsers(users) {
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
                photoURL: payload.picture,
                createdAt: new Date().toISOString(),
                provider: payload.firebase?.sign_in_provider || "unknown"
              };
              users.push(user);
              await saveUsers(users);
            } else {
              // Update existing user info
              user.email = email || user.email;
              user.name = payload.name || user.name;
              user.photoURL = payload.picture || user.photoURL;
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
    const decodedToken = await admin.auth().verifyIdToken(token);
    
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
        photoURL: decodedToken.picture,
        createdAt: new Date().toISOString(),
        provider: decodedToken.firebase.sign_in_provider
      };
      users.push(user);
      await saveUsers(users);
    } else {
      // Update existing user info
      user.email = decodedToken.email;
      user.name = decodedToken.name || user.name;
      user.photoURL = decodedToken.picture || user.photoURL;
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

    if (firebaseInitialized) {
      const decodedToken = await admin.auth().verifyIdToken(token);
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
    } else {
      res.status(401).json({ error: "Firebase not configured" });
    }
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

    users[userIndex].businessInfo = req.body;
    users[userIndex].updatedAt = new Date().toISOString();
    await saveUsers(users);

    res.json({ success: true });
  } catch (error) {
    console.error("Update business info error:", error);
    res.status(500).json({ error: "Failed to update business information" });
  }
});

module.exports = router;
