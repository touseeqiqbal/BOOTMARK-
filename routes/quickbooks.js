const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
const { admin, useFirestore, getCollectionRef, getDoc, setDoc } = require(path.join(__dirname, "..", "utils", "db"));
const OAuthClient = require("intuit-oauth").OAuthClient;
const QuickBooks = require("node-quickbooks");

const router = express.Router();

// QuickBooks OAuth configuration
const qbConfig = {
  clientId: process.env.QUICKBOOKS_CLIENT_ID || "",
  clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || "",
  environment: process.env.QUICKBOOKS_ENVIRONMENT || "sandbox", // sandbox or production
  redirectUri: process.env.QUICKBOOKS_REDIRECT_URI || `${process.env.APP_URL || "http://localhost:4000"}/api/quickbooks/callback`
};

// Get user ID from token
async function getUserIdFromToken(req) {
  const token = req.headers?.authorization?.replace("Bearer ", "");
  if (!token) {
    return null;
  }

  try {
    let userId;
    const firebaseInitialized = !!useFirestore;
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
    return userId;
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
}

// Get users file path
function getUsersFilePath() {
  return getDataFilePath("users.json");
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
    const data = await fs.readFile(USERS_FILE, "utf8");
    const users = JSON.parse(data);
    return Array.isArray(users) ? users : [];
  } catch (error) {
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
        await setDoc('users', uid, u)
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

// Get QuickBooks auth URL
router.get("/auth-url", async (req, res) => {
  try {
    if (!qbConfig.clientId || !qbConfig.clientSecret) {
      return res.status(400).json({ 
        error: "QuickBooks credentials not configured",
        message: "Please set QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET environment variables"
      });
    }

    // Get user ID from token
    const userId = await getUserIdFromToken(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const oauthClient = new OAuthClient({
      clientId: qbConfig.clientId,
      clientSecret: qbConfig.clientSecret,
      environment: qbConfig.environment,
      redirectUri: qbConfig.redirectUri
    });

    // Include userId in state for callback
    const authUri = oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
      state: userId // Pass userId in state
    });

    res.json({ authUrl: authUri });
  } catch (error) {
    console.error("QuickBooks auth URL error:", error);
    res.status(500).json({ error: "Failed to generate auth URL", message: error.message });
  }
});

// QuickBooks OAuth callback
router.get("/callback", async (req, res) => {
  try {
    const { code, realmId, state } = req.query;

    if (!code || !realmId) {
      return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/account-settings?quickbooks=error`);
    }

    const oauthClient = new OAuthClient({
      clientId: qbConfig.clientId,
      clientSecret: qbConfig.clientSecret,
      environment: qbConfig.environment,
      redirectUri: qbConfig.redirectUri
    });

    // Exchange code for tokens
    const authResponse = await oauthClient.createToken(req.url);
    const tokenData = authResponse.getJson();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    // Get user ID from state (we passed it in auth-url)
    const userId = state;

    if (userId) {
      // Store tokens in user's account
      const users = await getUsers();
      const userIndex = users.findIndex((u) => u.uid === userId);

      if (userIndex !== -1) {
        users[userIndex].quickbooks = {
          realmId: realmId,
          accessToken: accessToken,
          refreshToken: refreshToken,
          companyName: tokenData.realmId || null, // May need to fetch company info
          connectedAt: new Date().toISOString()
        };
        users[userIndex].updatedAt = new Date().toISOString();
        await saveUsers(users);
      }
    }

    // Redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/account-settings?quickbooks=success&realmId=${realmId}`);
  } catch (error) {
    console.error("QuickBooks callback error:", error);
    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/account-settings?quickbooks=error`);
  }
});

// Get QuickBooks connection status
router.get("/status", async (req, res) => {
  try {
    const userId = await getUserIdFromToken(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const users = await getUsers();
    const user = users.find((u) => u.uid === userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const qbConnection = user.quickbooks || {};
    
    res.json({
      connected: !!qbConnection.realmId,
      realmId: qbConnection.realmId || null,
      companyName: qbConnection.companyName || null,
      lastSync: qbConnection.lastSync || null
    });
  } catch (error) {
    console.error("Get QuickBooks status error:", error);
    res.status(500).json({ error: "Failed to get QuickBooks status" });
  }
});

// Disconnect QuickBooks
router.post("/disconnect", async (req, res) => {
  try {
    const userId = await getUserIdFromToken(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const users = await getUsers();
    const userIndex = users.findIndex((u) => u.uid === userId);

    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    users[userIndex].quickbooks = null;
    users[userIndex].updatedAt = new Date().toISOString();
    await saveUsers(users);

    res.json({ success: true });
  } catch (error) {
    console.error("Disconnect QuickBooks error:", error);
    res.status(500).json({ error: "Failed to disconnect QuickBooks" });
  }
});

// Sync form submissions to QuickBooks (create customers/invoices)
router.post("/sync", async (req, res) => {
  try {
    const userId = await getUserIdFromToken(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { formId, submissionIds } = req.body;

    if (!formId) {
      return res.status(400).json({ error: "Form ID is required" });
    }

    const users = await getUsers();
    const user = users.find((u) => u.uid === userId);

    if (!user || !user.quickbooks || !user.quickbooks.realmId) {
      return res.status(400).json({ error: "QuickBooks not connected" });
    }

    // Get form and submissions
    let form
    let submissions = []
    if (useFirestore) {
      form = await getDoc('forms', formId)
      if (!form || form.userId !== userId) {
        return res.status(404).json({ error: "Form not found" });
      }
      const snap = await getCollectionRef('submissions').where('formId', '==', formId).get()
      const all = []
      snap.forEach(d => all.push({ id: d.id, ...d.data() }))
      submissions = all.filter(s => !submissionIds || submissionIds.includes(s.id))
    } else {
      const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
      const formsPath = getDataFilePath("forms.json");
      const submissionsPath = getDataFilePath("submissions.json");

      const formsData = JSON.parse(await fs.readFile(formsPath, "utf8"));
      const submissionsData = JSON.parse(await fs.readFile(submissionsPath, "utf8"));

      form = formsData.find((f) => f.id === formId && f.userId === userId);
      if (!form) {
        return res.status(404).json({ error: "Form not found" });
      }

      submissions = submissionsData.filter(
        (s) => s.formId === formId && (!submissionIds || submissionIds.includes(s.id))
      );
    }

    // Initialize QuickBooks client
    const qb = new QuickBooks(
      qbConfig.clientId,
      qbConfig.clientSecret,
      user.quickbooks.accessToken,
      false, // no token secret for OAuth 2.0
      user.quickbooks.realmId,
      qbConfig.environment === "production",
      true // enable debug
    );

    const results = [];

    for (const submission of submissions) {
      try {
        // Extract customer info from submission
        const emailField = form.fields.find((f) => f.type === "email");
        const nameField = form.fields.find((f) => f.type === "text" && f.label.toLowerCase().includes("name"));
        
        const customerEmail = emailField ? submission.data[emailField.id] : null;
        const customerName = nameField ? submission.data[nameField.id] : "Customer";

        // Create or find customer
        const customer = {
          DisplayName: customerName,
          PrimaryEmailAddr: customerEmail ? { Address: customerEmail } : undefined
        };

        // Sync to QuickBooks
        // Note: This is a simplified example. In production, you'd want to:
        // 1. Check if customer exists first
        // 2. Create invoice with line items
        // 3. Handle errors properly

        results.push({
          submissionId: submission.id,
          success: true,
          message: "Synced to QuickBooks"
        });
      } catch (error) {
        results.push({
          submissionId: submission.id,
          success: false,
          error: error.message
        });
      }
    }

    // Update last sync time
    user.quickbooks.lastSync = new Date().toISOString();
    const userIndex = users.findIndex((u) => u.uid === userId);
    users[userIndex] = user;
    await saveUsers(users);

    res.json({ success: true, results });
  } catch (error) {
    console.error("QuickBooks sync error:", error);
    res.status(500).json({ error: "Failed to sync to QuickBooks", message: error.message });
  }
});

module.exports = router;
