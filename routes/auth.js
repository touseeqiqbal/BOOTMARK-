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

            // Set session data
            req.session.userId = user.uid;
            req.session.userEmail = user.email;
            req.session.authenticated = true;
            
            // Set token cookie for backward compatibility
            res.cookie('token', token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
              maxAge: 60 * 24 * 60 * 60 * 1000 // 60 days
            });

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

          // Set session data
          req.session.userId = user.uid;
          req.session.userEmail = user.email;
          req.session.authenticated = true;
          
          // Set token cookie for backward compatibility
          res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            maxAge: 60 * 24 * 60 * 60 * 1000 // 60 days
          });

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

    // Set session data
    req.session.userId = user.uid;
    req.session.userEmail = user.email;
    req.session.authenticated = true;
    
    // Set token cookie for backward compatibility
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 60 * 24 * 60 * 60 * 1000 // 60 days
    });

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
  // Clear session
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
    }
  });
  
  // Clear token cookie
  res.clearCookie('token');
  res.clearCookie('sessionId');
  
  res.json({ message: "Logged out successfully" });
});

// ============================================
// Two-Factor Authentication (Email-based 2FA)
// ============================================

// Generate and send 2FA code via email
router.post("/2fa/send-code", async (req, res) => {
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
    const user = users.find((u) => {
      const uId = u.uid || u.id;
      return uId === userId || String(uId) === String(userId);
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.email) {
      return res.status(400).json({ error: "User email not found" });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store code in user document (temporary)
    if (useFirestore) {
      await setDoc('users', userId, {
        ...user,
        twoFactorCode: code,
        twoFactorCodeExpires: expiresAt.toISOString()
      });
    } else {
      const userIndex = users.findIndex((u) => {
        const uId = u.uid || u.id;
        return uId === userId || String(uId) === String(userId);
      });
      if (userIndex !== -1) {
        users[userIndex].twoFactorCode = code;
        users[userIndex].twoFactorCodeExpires = expiresAt.toISOString();
        await saveUsers(users);
      }
    }

    // Send email with code
    const { sendEmail } = require('../utils/emailService');
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .code-box { background: #f3f4f6; border: 2px dashed #4f46e5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
          .code { font-size: 32px; font-weight: bold; color: #4f46e5; letter-spacing: 8px; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Two-Factor Authentication Code</h2>
          <p>Hello ${user.name || 'User'},</p>
          <p>You requested a two-factor authentication code. Use the code below to complete your login:</p>
          <div class="code-box">
            <div class="code">${code}</div>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <div class="warning">
            <strong>Security Notice:</strong> If you didn't request this code, please ignore this email or contact support immediately.
          </div>
          <p>Best regards,<br>BOOTMARK Team</p>
        </div>
      </body>
      </html>
    `;

    const emailResult = await sendEmail({
      to: user.email,
      subject: 'Your Two-Factor Authentication Code',
      html: emailHtml,
      userSmtpConfig: user.businessInfo?.smtp || null
    });

    if (!emailResult.success) {
      return res.status(500).json({ 
        error: "Failed to send 2FA code", 
        details: emailResult.error 
      });
    }

    res.json({ 
      success: true, 
      message: "2FA code sent to your email",
      expiresIn: 600 // 10 minutes in seconds
    });
  } catch (error) {
    console.error("Send 2FA code error:", error);
    res.status(500).json({ error: "Failed to send 2FA code" });
  }
});

// Verify 2FA code
router.post("/2fa/verify-code", async (req, res) => {
  try {
    const token = req.headers?.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = await extractUserIdFromToken(token);
    if (!userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { code } = req.body;
    if (!code || code.length !== 6) {
      return res.status(400).json({ error: "Invalid code format" });
    }

    const users = await getUsers();
    const user = users.find((u) => {
      const uId = u.uid || u.id;
      return uId === userId || String(uId) === String(userId);
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if code exists and is valid
    if (!user.twoFactorCode) {
      return res.status(400).json({ error: "No 2FA code found. Please request a new code." });
    }

    // Check if code is expired
    if (user.twoFactorCodeExpires) {
      const expiresAt = new Date(user.twoFactorCodeExpires);
      if (expiresAt < new Date()) {
        // Clear expired code
        if (useFirestore) {
          await setDoc('users', userId, {
            ...user,
            twoFactorCode: null,
            twoFactorCodeExpires: null
          });
        } else {
          const userIndex = users.findIndex((u) => {
            const uId = u.uid || u.id;
            return uId === userId || String(uId) === String(userId);
          });
          if (userIndex !== -1) {
            users[userIndex].twoFactorCode = null;
            users[userIndex].twoFactorCodeExpires = null;
            await saveUsers(users);
          }
        }
        return res.status(400).json({ error: "2FA code has expired. Please request a new code." });
      }
    }

    // Verify code
    if (user.twoFactorCode !== code) {
      return res.status(400).json({ error: "Invalid 2FA code" });
    }

    // Code is valid - clear it and mark 2FA as verified for this session
    if (useFirestore) {
      await setDoc('users', userId, {
        ...user,
        twoFactorCode: null,
        twoFactorCodeExpires: null,
        twoFactorVerifiedAt: new Date().toISOString()
      });
    } else {
      const userIndex = users.findIndex((u) => {
        const uId = u.uid || u.id;
        return uId === userId || String(uId) === String(userId);
      });
      if (userIndex !== -1) {
        users[userIndex].twoFactorCode = null;
        users[userIndex].twoFactorCodeExpires = null;
        users[userIndex].twoFactorVerifiedAt = new Date().toISOString();
        await saveUsers(users);
      }
    }

    res.json({ 
      success: true, 
      message: "2FA code verified successfully" 
    });
  } catch (error) {
    console.error("Verify 2FA code error:", error);
    res.status(500).json({ error: "Failed to verify 2FA code" });
  }
});

// Enable/Disable 2FA
router.put("/2fa/toggle", async (req, res) => {
  try {
    const token = req.headers?.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = await extractUserIdFromToken(token);
    if (!userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: "Invalid request. 'enabled' must be a boolean." });
    }

    const users = await getUsers();
    let userIndex = users.findIndex((u) => {
      const uId = u.uid || u.id;
      return uId === userId || String(uId) === String(userId);
    });

    let userToUpdate;
    let isNewUser = false;
    
    // If user not found, try to get user info from Firebase token and create user record
    if (userIndex === -1) {
      if (firebaseInitialized) {
        try {
          const decodedToken = await admin.auth().verifyIdToken(token);
          // Create user record with 2FA already set
          userToUpdate = {
            id: decodedToken.uid,
            uid: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name || decodedToken.email?.split("@")[0] || "User",
            photoURL: decodedToken.picture || "",
            createdAt: new Date().toISOString(),
            twoFactorEnabled: enabled,
            updatedAt: new Date().toISOString()
          };
          
          // Add to users array for consistency (needed for JSON file storage)
          users.push(userToUpdate);
          userIndex = users.length - 1;
          isNewUser = true;
        } catch (createError) {
          console.error("Failed to create user record for 2FA:", createError.message);
          return res.status(404).json({ 
            error: "User not found in database. Please try logging out and logging back in." 
          });
        }
      } else {
        return res.status(404).json({ 
          error: "User not found in database. Please try logging out and logging back in." 
        });
      }
    } else {
      // Update 2FA status for existing user
      userToUpdate = { ...users[userIndex] }; // Create a copy to avoid mutation issues
      userToUpdate.twoFactorEnabled = enabled;
      userToUpdate.updatedAt = new Date().toISOString();
    }

    // Save the updated user
    if (useFirestore) {
      try {
        // Clean user object - remove undefined values for Firestore
        const cleanUser = {};
        for (const key in userToUpdate) {
          if (userToUpdate[key] !== undefined) {
            cleanUser[key] = userToUpdate[key];
          }
        }
        // Use the user's uid or id as document ID
        const docId = userToUpdate.uid || userToUpdate.id || userId;
        await setDoc('users', docId, cleanUser);
      } catch (firestoreError) {
        console.error("Firestore update error:", firestoreError.message);
        throw new Error(`Failed to update user in Firestore: ${firestoreError.message}`);
      }
    } else {
      try {
        users[userIndex] = userToUpdate;
        await saveUsers(users);
      } catch (fileError) {
        console.error("File save error:", fileError.message);
        throw new Error(`Failed to save user to file: ${fileError.message}`);
      }
    }

    res.json({ 
      success: true, 
      message: enabled ? "Two-factor authentication enabled" : "Two-factor authentication disabled",
      twoFactorEnabled: enabled
    });
  } catch (error) {
    console.error("Toggle 2FA error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    const errorMessage = error.message || "Failed to update 2FA settings";
    if (!res.headersSent) {
      res.status(500).json({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      console.error("Response already sent, cannot send error response");
    }
  }
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
    const user = users.find((u) => {
      const uId = u.uid || u.id;
      return uId === userId || String(uId) === String(userId);
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      name: user.name,
      email: user.email,
      companyName: user.companyName || '',
      accountType: user.accountType || 'personal',
      accountStatus: user.accountStatus || 'active',
      isAdmin: user.isAdmin === true,
      isSuperAdmin: user.isSuperAdmin === true,
      role: user.role || 'user',
      notifications: user.notifications || {},
      businessInfo: user.businessInfo || {},
      businessPermissions: user.businessPermissions || [], // Include business permissions
      twoFactorEnabled: user.twoFactorEnabled === true // Include 2FA status
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

    const { sendEmail } = require(path.join(__dirname, "..", "utils", "emailService"));
    
    // Send test email - will use user's SMTP config if available, otherwise falls back to default SMTP
    const result = await sendEmail({
      to: user.email,
      subject: "SMTP Configuration Test",
      html: "<p>This is a test email to verify your SMTP configuration is working correctly.</p>",
      userSmtpConfig: user.smtpConfig || null // Use user's SMTP config if available, otherwise falls back to default SMTP
    });

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

// Send custom email
router.post("/account/send-email", async (req, res) => {
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

    const { to, subject, html, text } = req.body;

    // Validate required fields
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ 
        error: "Missing required fields",
        message: "Please provide 'to', 'subject', and either 'html' or 'text' fields."
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const recipients = Array.isArray(to) ? to : [to];
    for (const email of recipients) {
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          error: "Invalid email address",
          message: `Invalid email format: ${email}`
        });
      }
    }

    // Send email - will use user's SMTP config if available, otherwise fall back to default/company SMTP
    const { sendEmail } = require(path.join(__dirname, "..", "utils", "emailService"));
    
    const result = await sendEmail({
      to: recipients,
      subject,
      html: html || `<pre>${text || ''}</pre>`,
      text: text || html?.replace(/<[^>]*>/g, '') || '',
      userSmtpConfig: user.smtpConfig || null // Pass user config if exists, null otherwise to trigger fallback
    });

    if (result.success) {
      res.json({ 
        success: true, 
        message: "Email sent successfully!",
        messageId: result.messageId
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: result.error || "Failed to send email" 
      });
    }
  } catch (error) {
    console.error("Send custom email error:", error);
    res.status(500).json({ 
      error: "Failed to send email", 
      message: error.message 
    });
  }
});

module.exports = router;
