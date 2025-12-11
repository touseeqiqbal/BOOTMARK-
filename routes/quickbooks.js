const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
const { admin, useFirestore, getCollectionRef, getDoc, setDoc } = require(path.join(__dirname, "..", "utils", "db"));
// Import OAuthClient - handle different export structures
// intuit-oauth v1.5.0 exports OAuthClient directly or as a property
let OAuthClient;
try {
  const intuitOAuth = require("intuit-oauth");
  // Try different export patterns
  if (typeof intuitOAuth === 'function') {
    OAuthClient = intuitOAuth;
  } else if (intuitOAuth && typeof intuitOAuth.OAuthClient === 'function') {
    OAuthClient = intuitOAuth.OAuthClient;
  } else if (intuitOAuth && typeof intuitOAuth.default === 'function') {
    OAuthClient = intuitOAuth.default;
  } else {
    OAuthClient = intuitOAuth;
  }
} catch (error) {
  console.error("Failed to import intuit-oauth:", error);
  throw error;
}
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
    // Check if credentials are configured
    if (!qbConfig.clientId || !qbConfig.clientSecret) {
      console.error("QuickBooks credentials missing:", {
        hasClientId: !!qbConfig.clientId,
        hasClientSecret: !!qbConfig.clientSecret,
        environment: qbConfig.environment,
        redirectUri: qbConfig.redirectUri
      });
      return res.status(400).json({
        error: "QuickBooks credentials not configured",
        message: "Please set QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET environment variables"
      });
    }

    // Validate redirect URI
    if (!qbConfig.redirectUri) {
      console.error("QuickBooks redirect URI missing");
      return res.status(400).json({
        error: "QuickBooks redirect URI not configured",
        message: "Please set QUICKBOOKS_REDIRECT_URI or APP_URL environment variable"
      });
    }

    // Get user ID from token
    const userId = await getUserIdFromToken(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Get businessId from user
    const users = await getUsers();
    const user = users.find((u) => u.uid === userId);
    if (!user || !user.businessId) {
      return res.status(400).json({ error: "Business ID required" });
    }
    const businessId = user.businessId;

    console.log("Creating OAuth client with config:", {
      clientId: qbConfig.clientId ? `${qbConfig.clientId.substring(0, 10)}...` : 'missing',
      hasClientSecret: !!qbConfig.clientSecret,
      environment: qbConfig.environment,
      redirectUri: qbConfig.redirectUri
    });

    // Validate OAuthClient is a constructor
    if (typeof OAuthClient !== 'function') {
      console.error("OAuthClient is not a constructor. Type:", typeof OAuthClient);
      console.error("OAuthClient value:", OAuthClient);
      return res.status(500).json({
        error: "QuickBooks OAuth client initialization failed",
        message: "OAuthClient is not available. Please check intuit-oauth package installation."
      });
    }

    const oauthClient = new OAuthClient({
      clientId: qbConfig.clientId,
      clientSecret: qbConfig.clientSecret,
      environment: qbConfig.environment,
      redirectUri: qbConfig.redirectUri
    });

    // Include businessId in state for callback
    // Use string literals for scopes (more reliable across package versions)
    const authUri = oauthClient.authorizeUri({
      scope: [
        'com.intuit.quickbooks.accounting',
        'openid'
      ],
      state: `${userId}:${businessId}` // Pass both userId and businessId in state
    });

    console.log("QuickBooks auth URL generated successfully");
    res.json({ authUrl: authUri });
  } catch (error) {
    console.error("QuickBooks auth URL error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      error: "Failed to generate auth URL",
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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

    // Get user ID and businessId from state (we passed it in auth-url)
    const [userId, businessId] = state ? state.split(':') : [null, null];

    if (userId && businessId) {
      // Store tokens in business's QuickBooks connection
      const users = await getUsers();
      const userIndex = users.findIndex((u) => u.uid === userId);

      if (userIndex !== -1) {
        // Store QuickBooks connection per business
        if (!users[userIndex].businesses) {
          users[userIndex].businesses = {};
        }
        if (!users[userIndex].businesses[businessId]) {
          users[userIndex].businesses[businessId] = {};
        }
        users[userIndex].businesses[businessId].quickbooks = {
          realmId: realmId,
          accessToken: accessToken,
          refreshToken: refreshToken,
          companyName: tokenData.realmId || null,
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

    if (!user || !user.businessId) {
      return res.status(404).json({ error: "User or business not found" });
    }

    const businessId = user.businessId;
    const qbConnection = user.businesses?.[businessId]?.quickbooks || {};

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

    const user = users[userIndex];
    if (!user.businessId) {
      return res.status(400).json({ error: "Business ID required" });
    }

    const businessId = user.businessId;
    if (users[userIndex].businesses && users[userIndex].businesses[businessId]) {
      users[userIndex].businesses[businessId].quickbooks = null;
    }
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

    if (!user || !user.businessId) {
      return res.status(400).json({ error: "Business not found" });
    }

    const businessId = user.businessId;
    const qbConnection = user.businesses?.[businessId]?.quickbooks;

    if (!qbConnection || !qbConnection.realmId) {
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
      qbConnection.accessToken,
      false, // no token secret for OAuth 2.0
      qbConnection.realmId,
      qbConfig.environment === "production",
      true // enable debug
    );

    const results = [];
    const { extractCustomerInfo } = require("./customers");

    for (const submission of submissions) {
      try {
        // Extract customer info from submission
        const { customerName, customerEmail, customerPhone } = extractCustomerInfo(form, submission.data);

        if (!customerName && !customerEmail) {
          results.push({
            submissionId: submission.id,
            success: false,
            error: "No customer name or email found in submission"
          });
          continue;
        }

        // Search for existing customer in QuickBooks
        let qbCustomer = null;
        try {
          const searchQuery = customerEmail
            ? `SELECT * FROM Customer WHERE PrimaryEmailAddr = '${customerEmail}'`
            : `SELECT * FROM Customer WHERE DisplayName = '${customerName}'`;

          await new Promise((resolve) => {
            qb.findCustomers(searchQuery, (err, customers) => {
              if (!err && customers && customers.QueryResponse && customers.QueryResponse.Customer) {
                qbCustomer = customers.QueryResponse.Customer[0];
              }
              resolve();
            });
          });
        } catch (searchErr) {
          console.log("Customer search error (may not exist):", searchErr.message);
        }

        // Create customer if doesn't exist
        if (!qbCustomer) {
          const customerObj = {
            DisplayName: customerName || "Customer",
            PrimaryEmailAddr: customerEmail ? { Address: customerEmail } : undefined,
            PrimaryPhone: customerPhone ? { FreeFormNumber: customerPhone } : undefined
          };

          await new Promise((resolve, reject) => {
            qb.createCustomer(customerObj, (err, customer) => {
              if (err) {
                reject(err);
              } else {
                qbCustomer = customer.Customer;
                resolve(customer);
              }
            });
          });
        }

        // Create invoice for this submission
        const invoiceObj = {
          CustomerRef: {
            value: qbCustomer.Id
          },
          Line: [{
            Amount: 100.00, // Default amount, can be extracted from form
            DetailType: "SalesItemLineDetail",
            SalesItemLineDetail: {
              ItemRef: {
                name: "Services",
                value: "1" // Default service item
              }
            },
            Description: `Form submission from ${form.title}`
          }]
        };

        const qbInvoice = await new Promise((resolve, reject) => {
          qb.createInvoice(invoiceObj, (err, invoice) => {
            if (err) {
              reject(err);
            } else {
              resolve(invoice);
            }
          });
        });

        results.push({
          submissionId: submission.id,
          success: true,
          message: "Synced to QuickBooks",
          customerId: qbCustomer.Id,
          invoiceId: qbInvoice.Invoice.Id
        });
      } catch (error) {
        console.error("QuickBooks sync error for submission:", submission.id, error);
        results.push({
          submissionId: submission.id,
          success: false,
          error: error.message || "Failed to sync to QuickBooks"
        });
      }
    }

    // Update last sync time
    if (!user.businesses) user.businesses = {};
    if (!user.businesses[businessId]) user.businesses[businessId] = {};
    if (!user.businesses[businessId].quickbooks) {
      user.businesses[businessId].quickbooks = qbConnection;
    }
    user.businesses[businessId].quickbooks.lastSync = new Date().toISOString();
    const userIndex = users.findIndex((u) => u.uid === userId);
    users[userIndex] = user;
    await saveUsers(users);

    res.json({ success: true, results });
  } catch (error) {
    console.error("QuickBooks sync error:", error);
    res.status(500).json({ error: "Failed to sync to QuickBooks", message: error.message });
  }
});

// Send invoice to QuickBooks
router.post("/invoice/:invoiceId/send", async (req, res) => {
  try {
    const userId = await getUserIdFromToken(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const users = await getUsers();
    const user = users.find((u) => u.uid === userId);

    if (!user || !user.businessId) {
      return res.status(400).json({ error: "Business not found" });
    }

    const businessId = user.businessId;
    const qbConnection = user.businesses?.[businessId]?.quickbooks;

    if (!qbConnection || !qbConnection.realmId) {
      return res.status(400).json({ error: "QuickBooks not connected" });
    }

    // Get invoice
    const { getCollectionRef, getDoc } = require(path.join(__dirname, "..", "utils", "db"));
    let invoice;
    if (useFirestore) {
      invoice = await getDoc('invoices', req.params.invoiceId);
    } else {
      const invoicesPath = getDataFilePath("invoices.json");
      const invoicesData = JSON.parse(await fs.readFile(invoicesPath, "utf8"));
      invoice = invoicesData.find((inv) => inv.id === req.params.invoiceId);
    }

    if (!invoice || invoice.userId !== userId) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // Get customer
    const { getCustomers } = require("./customers");
    const customers = await getCustomers();
    const customer = customers.find((c) => c.id === invoice.customerId && c.userId === userId);

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    // Initialize QuickBooks client
    const qb = new QuickBooks(
      qbConfig.clientId,
      qbConfig.clientSecret,
      qbConnection.accessToken,
      false,
      qbConnection.realmId,
      qbConfig.environment === "production",
      true
    );

    // Find or create customer in QuickBooks
    let qbCustomer = null;
    try {
      const searchQuery = customer.email
        ? `SELECT * FROM Customer WHERE PrimaryEmailAddr = '${customer.email}'`
        : `SELECT * FROM Customer WHERE DisplayName = '${customer.name}'`;

      await new Promise((resolve) => {
        qb.findCustomers(searchQuery, (err, customers) => {
          if (!err && customers && customers.QueryResponse && customers.QueryResponse.Customer) {
            qbCustomer = customers.QueryResponse.Customer[0];
          }
          resolve();
        });
      });
    } catch (searchErr) {
      console.log("Customer search error:", searchErr.message);
    }

    if (!qbCustomer) {
      // Create customer in QuickBooks
      const customerObj = {
        DisplayName: customer.name,
        PrimaryEmailAddr: customer.email ? { Address: customer.email } : undefined,
        PrimaryPhone: customer.phone ? { FreeFormNumber: customer.phone } : undefined
      };

      await new Promise((resolve, reject) => {
        qb.createCustomer(customerObj, (err, customer) => {
          if (err) {
            reject(err);
          } else {
            qbCustomer = customer.Customer;
            resolve(customer);
          }
        });
      });
    }

    // Create invoice in QuickBooks
    const invoiceObj = {
      CustomerRef: {
        value: qbCustomer.Id
      },
      Line: invoice.items.map((item) => ({
        Amount: item.quantity * item.price,
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: {
          ItemRef: {
            name: item.name || "Service",
            value: "1"
          },
          Qty: item.quantity,
          UnitPrice: item.price
        },
        Description: item.description || item.name || "Service"
      })),
      DocNumber: invoice.invoiceNumber,
      DueDate: invoice.dueDate || new Date().toISOString().split('T')[0],
      PrivateNote: invoice.notes || ""
    };

    const qbInvoice = await new Promise((resolve, reject) => {
      qb.createInvoice(invoiceObj, (err, invoice) => {
        if (err) {
          reject(err);
        } else {
          resolve(invoice);
        }
      });
    });

    // Update invoice with QuickBooks ID
    invoice.quickbooksId = qbInvoice.Invoice.Id;
    invoice.quickbooksSyncAt = new Date().toISOString();
    invoice.status = 'sent';

    if (useFirestore) {
      await setDoc('invoices', invoice.id, invoice);
    } else {
      const invoicesPath = getDataFilePath("invoices.json");
      const invoicesData = JSON.parse(await fs.readFile(invoicesPath, "utf8"));
      const index = invoicesData.findIndex((inv) => inv.id === invoice.id);
      if (index !== -1) {
        invoicesData[index] = invoice;
        await fs.writeFile(invoicesPath, JSON.stringify(invoicesData, null, 2), 'utf8');
      }
    }

    res.json({
      success: true,
      invoice: invoice,
      quickbooksInvoiceId: qbInvoice.Invoice.Id
    });
  } catch (error) {
    console.error("Send invoice to QuickBooks error:", error);
    res.status(500).json({ error: "Failed to send invoice to QuickBooks", message: error.message });
  }
});

module.exports = router;
