const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
const { db, useFirestore, getCollectionRef, setDoc, deleteDoc, getDoc } = require("../utils/db");
const defaultTemplates = require(path.join(__dirname, "..", "data", "defaultFormTemplates"));

const router = express.Router();

// Lazy file path resolution - resolve at runtime, not module load time
// This ensures Vercel environment variables are available
function getFormsFilePath() {
  return getDataFilePath("forms.json");
}

function getFormTemplatesFilePath() {
  return getDataFilePath("formTemplates.json");
}

async function initFormTemplatesFile() {
  const TEMPLATES_FILE = getFormTemplatesFilePath();
  try {
    await fs.access(TEMPLATES_FILE);
  } catch {
    const dir = path.dirname(TEMPLATES_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(TEMPLATES_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

// Helper function to get user by ID (works with both Firestore and JSON files)
async function getUserById(userId) {
  if (!userId) return null;
  
  if (useFirestore) {
    try {
      const user = await getDoc('users', userId);
      return user;
    } catch (error) {
      console.warn("Could not load user from Firestore:", error.message);
      return null;
    }
  }
  
  // Fallback to JSON file
  try {
    const usersFile = getDataFilePath("users.json");
    const usersData = await fs.readFile(usersFile, "utf8");
    const users = JSON.parse(usersData);
    return users.find(u => (u.uid || u.id) === userId) || null;
  } catch (error) {
    // File doesn't exist or can't be read - that's okay when using Firestore
    if (error.code !== 'ENOENT') {
      console.warn("Could not load user info:", error.message);
    }
    return null;
  }
}

async function getCustomTemplates() {
  if (useFirestore) {
    try {
      const snap = await getCollectionRef('formTemplates').get();
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      return items;
    } catch (e) {
      console.error('Error fetching templates from Firestore:', e);
      return [];
    }
  }
  const FILE = getFormTemplatesFilePath();
  try {
    await initFormTemplatesFile();
    const data = await fs.readFile(FILE, "utf8");
    const templates = JSON.parse(data);
    return Array.isArray(templates) ? templates : [];
  } catch (error) {
    console.error("Error reading form templates file:", error);
    return [];
  }
}

async function saveCustomTemplates(templates) {
  if (useFirestore) {
    try {
      for (const template of templates) {
        const id = template.id || (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(12).toString("hex"));
        await setDoc('formTemplates', id, { ...template, id });
      }
      return;
    } catch (e) {
      console.error('Error saving templates to Firestore:', e);
      throw e;
    }
  }
  const FILE = getFormTemplatesFilePath();
  const dir = path.dirname(FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(templates, null, 2), 'utf8');
}

// Initialize forms file
async function initFormsFile() {
  const FORMS_FILE = getFormsFilePath();
  try {
    await fs.access(FORMS_FILE);
    // File exists, nothing to do
  } catch (error) {
    // File doesn't exist, create it
    try {
      // Ensure directory exists
      const dir = path.dirname(FORMS_FILE);
      await fs.mkdir(dir, { recursive: true });
      
      // Create empty forms array file
      await fs.writeFile(FORMS_FILE, JSON.stringify([], null, 2), 'utf8');
    } catch (writeError) {
      console.error("Error initializing forms file:", writeError);
      console.error("File path:", FORMS_FILE);
      console.error("Directory:", path.dirname(FORMS_FILE));
      console.error("Error details:", {
        code: writeError.code,
        message: writeError.message,
        errno: writeError.errno,
        syscall: writeError.syscall,
        stack: writeError.stack
      });
      throw writeError;
    }
  }
}

// Get all forms
async function getForms() {
  if (useFirestore) {
    try {
      const snap = await getCollectionRef('forms').get()
      const items = []
      snap.forEach(d => items.push({ id: d.id, ...d.data() }))
      return items
    } catch (e) {
      console.error('Error fetching forms from Firestore:', e)
      return []
    }
  }
  const FORMS_FILE = getFormsFilePath();
  try {
    await initFormsFile();
    const data = await fs.readFile(FORMS_FILE, "utf8");
    
    // Try to parse JSON
    let forms;
    try {
      forms = JSON.parse(data);
    } catch (parseError) {
      console.error("JSON parse error in forms file:", parseError.message);
      console.error("Error position:", parseError.message.match(/position (\d+)/)?.[1] || 'unknown');
      
      // Try to recover by fixing common issues
      let cleanedData = data.trim();
      
      // Remove trailing extra brackets
      cleanedData = cleanedData.replace(/\]+\s*$/, ']');
      
      // Remove trailing commas before closing brackets
      cleanedData = cleanedData.replace(/,(\s*[}\]])/g, '$1');
      
      // Try parsing again
      try {
        forms = JSON.parse(cleanedData);
        // Successfully recovered forms file after cleaning
        // Save the cleaned version back
        await saveForms(forms);
      } catch (recoverError) {
        console.error("Could not recover forms file:", recoverError.message);
        // Create backup of corrupted file
        try {
          const backupPath = FORMS_FILE + '.backup.' + Date.now();
          await fs.writeFile(backupPath, data, 'utf8');
          console.log("Created backup of corrupted file:", backupPath);
        } catch (backupError) {
          console.error("Failed to create backup:", backupError.message);
        }
        
        // Return empty array and let the system recreate the file
        // Returning empty array - file will be recreated on next save
        return [];
      }
    }
    
    return Array.isArray(forms) ? forms : [];
  } catch (error) {
    console.error("Error reading forms file:", error);
    console.error("Forms file path:", FORMS_FILE);
    // If file doesn't exist or can't be read, return empty array
    // This handles the case where /tmp was cleared (serverless functions)
    if (error.code === 'ENOENT') {
      console.log("Forms file doesn't exist, returning empty array");
      return [];
    }
    throw error;
  }
}

// Save forms
async function saveForms(forms) {
  if (useFirestore) {
    try {
      for (const form of forms) {
        const id = form.id
        if (!id) continue
        await setDoc('forms', id, form)
      }
      return
    } catch (e) {
      console.error('Error saving forms to Firestore:', e)
      throw e
    }
  }
  const FORMS_FILE = getFormsFilePath();
  try {
    // Ensure directory exists before writing
    const dir = path.dirname(FORMS_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(FORMS_FILE, JSON.stringify(forms, null, 2), 'utf8');
  } catch (error) {
    console.error("Error saving forms:", error);
    console.error("File path:", FORMS_FILE);
    console.error("Directory:", path.dirname(FORMS_FILE));
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      errno: error.errno,
      syscall: error.syscall,
      stack: error.stack
    });
    throw error;
  }
}

const DEFAULT_BUSINESS_PERMISSIONS = ['forms', 'submissions', 'customers', 'invoices', 'analytics', 'settings'];

function getBusinessesFilePath() {
  return getDataFilePath("businesses.json");
}

async function getBusinessesData() {
  if (useFirestore) {
    try {
      const snap = await getCollectionRef('businesses').get();
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      return items;
    } catch (e) {
      console.error('Error fetching businesses from Firestore:', e);
      return [];
    }
  }
  const BUSINESSES_FILE = getBusinessesFilePath();
  try {
    await fs.access(BUSINESSES_FILE);
    const data = await fs.readFile(BUSINESSES_FILE, "utf8");
    const businesses = JSON.parse(data);
    return Array.isArray(businesses) ? businesses : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    console.error("Error reading businesses file:", error);
    return [];
  }
}

function hasFormsAccess(member) {
  if (!member) return false;
  if (member.role === 'owner' || member.role === 'admin' || member.role === 'manager') return true;
  return Array.isArray(member.permissions) && member.permissions.includes('forms');
}

async function findBusinessContextForUser(userId) {
  if (!userId) return { business: null, membership: null };
  const businesses = await getBusinessesData();
  for (const business of businesses) {
    if (business.ownerId === userId) {
      return {
        business,
        membership: {
          userId,
          role: 'owner',
          permissions: DEFAULT_BUSINESS_PERMISSIONS
        }
      };
    }
    const member = (business.members || []).find(m => m.userId === userId);
    if (member) {
      return { business, membership: member };
    }
  }
  return { business: null, membership: null };
}

async function getFormAccessContext(userId) {
  const { business, membership } = await findBusinessContextForUser(userId);
  const allowedUserIds = new Set();
  let formsOwnerId = userId;
  let hasFormsPermission = true;
  let isBusinessOwner = false;

  if (business) {
    if (business.ownerId === userId) {
      isBusinessOwner = true;
      formsOwnerId = userId;
      allowedUserIds.add(userId);
      (business.members || []).forEach(member => {
        if (hasFormsAccess(member) && member.userId) {
          allowedUserIds.add(member.userId);
        }
      });
    } else {
      const permitted = hasFormsAccess(membership);
      if (!permitted) {
        hasFormsPermission = false;
      } else {
        formsOwnerId = business.ownerId;
        allowedUserIds.add(business.ownerId);
        allowedUserIds.add(userId);
      }
    }
  } else {
    allowedUserIds.add(userId);
  }

  return {
    userId,
    business,
    membership,
    isBusinessOwner,
    allowedUserIds,
    formsOwnerId,
    hasFormsPermission
  };
}

async function getFormsPermissionContext(req) {
  const userId = req.user?.uid || req.user?.id;
  if (!userId) {
    throw new Error('Not authenticated');
  }
  if (!req.formPermissionContext || req.formPermissionContext.userId !== userId) {
    const context = await getFormAccessContext(userId);
    req.formPermissionContext = context;
  }
  return req.formPermissionContext;
}

// Helper to load a single form by id from the active storage (Firestore or local file)
async function getFormById(id) {
  if (useFirestore) {
    const doc = await db.collection('forms').doc(id).get();
    if (!doc || !doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }
  const forms = await getForms();
  return forms.find((f) => f.id === id) || null;
}

// Templates
router.get("/templates", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    const customTemplates = await getCustomTemplates();
    const userTemplates = userId
      ? customTemplates.filter((template) => template.userId === userId)
      : [];
    res.json([...defaultTemplates, ...userTemplates]);
  } catch (error) {
    console.error("Get templates error:", error);
    res.status(500).json({ error: "Failed to load templates" });
  }
});

router.post("/templates", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { title, description, fields, settings, accent } = req.body || {};
    if (!title || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ error: "Template title and at least one field are required" });
    }

    const customTemplates = await getCustomTemplates();
    const newTemplate = {
      id: `${userId}-${Date.now()}`,
      title: title.trim(),
      description: (description || '').trim(),
      fields,
      settings: settings || {},
      accent: accent || '#2563eb',
      userId,
      createdAt: new Date().toISOString(),
    };

    customTemplates.push(newTemplate);
    await saveCustomTemplates(customTemplates);

    res.json(newTemplate);
  } catch (error) {
    console.error("Save template error:", error);
    res.status(500).json({ error: "Failed to save template" });
  }
});

// Delete template
router.delete("/templates/:templateId", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { templateId } = req.params;
    const customTemplates = await getCustomTemplates();
    
    // Find template - user can only delete their own templates
    const templateIndex = customTemplates.findIndex(t => t.id === templateId && t.userId === userId);
    
    if (templateIndex === -1) {
      return res.status(404).json({ error: "Template not found or you don't have permission to delete it" });
    }

    customTemplates.splice(templateIndex, 1);
    await saveCustomTemplates(customTemplates);

    res.json({ success: true, message: "Template deleted successfully" });
  } catch (error) {
    console.error("Delete template error:", error);
    res.status(500).json({ error: "Failed to delete template" });
  }
});

// Get user's forms
router.get("/", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const permissionContext = await getFormsPermissionContext(req);

    if (permissionContext.business && !permissionContext.hasFormsPermission) {
      return res.status(403).json({ error: "You don't have permission to manage forms for this business" });
    }

    const allowedIds = Array.from(permissionContext.allowedUserIds || []);
    if (allowedIds.length === 0) {
      return res.json([]);
    }

    console.log(`Fetching forms for allowed users: ${allowedIds.join(', ')}`);

    if (useFirestore) {
      const items = [];
      const seen = new Set();
      for (const allowedId of allowedIds) {
        const snap = await db.collection('forms').where('userId', '==', allowedId).get();
        snap.forEach(doc => {
          if (!seen.has(doc.id)) {
            items.push({ id: doc.id, ...doc.data() });
            seen.add(doc.id);
          }
        });
      }
      // Found forms accessible to user
      return res.json(items);
    }

    const forms = await getForms();
    // Total forms in storage
    const userForms = forms.filter((f) => permissionContext.allowedUserIds.has(f.userId));
    // Found forms accessible to user
    res.json(userForms);
  } catch (error) {
    console.error("Get forms error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Failed to fetch forms" });
  }
});

// Get forms user is invited to
router.get("/invited", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    // Get user's email
    let userEmail = null;
    try {
      const user = await getUserById(userId);
      if (user) {
        userEmail = user.email?.toLowerCase().trim();
      }
    } catch (userError) {
      console.warn("Could not load user info:", userError.message);
    }

    if (!userEmail) {
      return res.json([]);
    }

    const invitedForms = [];

    if (useFirestore) {
      // Get all invites for this email
      const inviteSnap = await getCollectionRef('invites')
        .where('email', '==', userEmail)
        .get();
      
      const inviteIds = [];
      const invites = [];
      inviteSnap.forEach(doc => {
        const invite = { id: doc.id, ...doc.data() };
        inviteIds.push(invite.formId);
        invites.push(invite);
      });
      
      // Get form details for each invite
      for (const invite of invites) {
        try {
          const formDoc = await getDoc('forms', invite.formId);
          if (formDoc) {
            invitedForms.push({
              ...formDoc,
              id: invite.formId,
              inviteId: invite.id,
              inviteRole: invite.role,
              invitedAt: invite.createdAt
            });
          }
        } catch (formError) {
          console.warn(`Could not load form ${invite.formId}:`, formError.message);
        }
      }
    } else {
      const INVITES_FILE = getInvitesFilePath();
      await initInvitesFile();
      const invitesData = await fs.readFile(INVITES_FILE, "utf8");
      const allInvites = JSON.parse(invitesData);

      // Find all invites for this user's email
      for (const formId in allInvites) {
        const invites = allInvites[formId] || [];
        const userInvite = invites.find(inv => 
          inv.email?.toLowerCase().trim() === userEmail
        );
        
        if (userInvite) {
          // Get form details
          const form = await getFormById(formId);
          if (form) {
            invitedForms.push({
              ...form,
              inviteId: userInvite.id,
              inviteRole: userInvite.role,
              invitedAt: userInvite.createdAt
            });
          }
        }
      }
    }

    res.json(invitedForms);
  } catch (error) {
    console.error("Get invited forms error:", error);
    res.status(500).json({ error: "Failed to fetch invited forms" });
  }
});

// Get single form
router.get("/:id", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id
    if (useFirestore) {
      const doc = await db.collection('forms').doc(req.params.id).get()
      if (!doc || !doc.exists) return res.status(404).json({ error: 'Form not found' })
      const form = { id: doc.id, ...doc.data() }
      const permissionContext = await getFormsPermissionContext(req);
      if (!permissionContext.allowedUserIds.has(form.userId)) {
        return res.status(403).json({ error: 'Access denied' })
      }
      
      // Clean up number fields: remove max: 100 if it's the default value (for display only, doesn't save)
      const cleanedFields = (form.fields || []).map(field => {
        if (field.type === 'number' && field.max === 100) {
          const { max, ...rest } = field;
          return rest;
        }
        return field;
      });
      
      const cleanedForm = {
        ...form,
        fields: cleanedFields
      };
      
      return res.json(cleanedForm)
    }
    const forms = await getForms();
    const form = forms.find((f) => f.id === req.params.id);
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }
    const permissionContext = await getFormsPermissionContext(req);
    if (!permissionContext.allowedUserIds.has(form.userId)) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    // Clean up number fields: remove max: 100 if it's the default value (for display only, doesn't save)
    const cleanedFields = (form.fields || []).map(field => {
      if (field.type === 'number' && field.max === 100) {
        const { max, ...rest } = field;
        return rest;
      }
      return field;
    });
    
    const cleanedForm = {
      ...form,
      fields: cleanedFields
    };
    
    res.json(cleanedForm);
  } 
  catch (error) {
    console.error("Get form error:", error);
    res.status(500).json({ error: "Failed to fetch form" });
  }
});

// Create form
router.post("/", async (req, res) => {
  try {
    const FORMS_FILE = getFormsFilePath();
    // Create form request

    const { title, fields, settings } = req.body;

    // Check if user is authenticated
    if (!req.user) {
      console.error("No user object in request");
      return res.status(401).json({ error: "User not authenticated", details: "req.user is undefined" });
    }

    if (!req.user.uid && !req.user.id) {
      console.error("User object missing uid/id:", JSON.stringify(req.user));
      return res.status(401).json({ error: "User not authenticated", details: "User ID not found" });
    }

    // Get existing forms
    let forms;
    try {
      forms = await getForms();
      console.log("Retrieved forms, count:", forms.length);
      // Ensure forms is an array
      if (!Array.isArray(forms)) {
        console.warn("Forms data is not an array, resetting to empty array");
        forms = [];
      }
    } catch (getError) {
      console.error("Error getting forms:", getError);
      // If file doesn't exist or can't be read, start with empty array
      forms = [];
      console.log("Starting with empty forms array due to error");
    }

    const userId = req.user.uid || req.user.id;
    
    if (!userId) {
      console.error("Invalid user ID extracted");
      return res.status(401).json({ error: "Invalid user ID", details: "Could not extract user ID" });
    }

    const permissionContext = await getFormsPermissionContext(req);
    if (permissionContext.business && !permissionContext.hasFormsPermission) {
      return res.status(403).json({ error: "You don't have permission to manage forms for this business" });
    }

    const ownerId = permissionContext.formsOwnerId || userId;

    // Creating form for user
    const newForm = {
      id: crypto.randomBytes(16).toString("hex"),
      userId: ownerId,
      ownerId,
      createdBy: userId,
      businessId: permissionContext.business?.id || null,
      title: title || "Untitled Form",
      fields: fields || [],
      settings: settings || {
        theme: "default",
        allowMultipleSubmissions: true,
        showProgressBar: true,
        confirmationMessage: "Thank you for your submission!",
      },
      shareKey: crypto.randomBytes(8).toString("hex"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // If Firestore configured, store form there and return early
    if (useFirestore) {
      try {
        await db.collection('forms').doc(newForm.id).set(newForm)
        console.log("Form created in Firestore:", newForm.id)
        return res.status(201).json(newForm)
      } catch (firestoreError) {
        // Handle Firestore authentication errors
        if (firestoreError.code === 16 || firestoreError.code === 7) {
          console.error('❌ Firestore authentication error when creating form:')
          console.error('   Error code:', firestoreError.code)
          console.error('   Error message:', firestoreError.message)
          console.error('   This means FIREBASE_SERVICE_ACCOUNT is not configured correctly in Render.')
          console.error('   Check Render logs at startup for credential initialization errors.')
          return res.status(500).json({ 
            error: 'Firestore authentication failed. Please check server configuration.',
            details: 'The server cannot authenticate with Firestore. This is a server-side configuration issue.',
            code: firestoreError.code
          })
        }
        // Re-throw other errors to be handled by outer catch
        throw firestoreError
      }
    }

    forms.push(newForm);
    console.log("Attempting to save forms, new count:", forms.length);
    
    await saveForms(forms);

    // Verify the form was saved by reading it back
    try {
      const verifyForms = await getForms();
      const savedForm = verifyForms.find(f => f.id === newForm.id);
      if (savedForm) {
        console.log("Form verified in storage:", newForm.id);
      } else {
        console.warn("WARNING: Form was saved but not found when reading back:", newForm.id);
      }
    } catch (verifyError) {
      console.error("Error verifying saved form:", verifyError);
    }

    console.log("Form created successfully:", newForm.id);
    res.status(201).json(newForm);
  } catch (error) {
    console.error("Create form error:", error);
    console.error("Error name:", error.name);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    // Provide a user-friendly error message
    let errorMessage = "Failed to create form";
    if (error.code === 'ENOENT') {
      errorMessage = "Storage directory not accessible. Please check server configuration.";
    } else if (error.code === 'EACCES' || error.code === 'EPERM') {
      errorMessage = "Permission denied. Cannot write to storage directory.";
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: error.message,
      code: error.code
    });
  }
});

// Update form
router.put("/:id", async (req, res) => {
  try {
    if (useFirestore) {
      const docRef = db.collection('forms').doc(req.params.id);
      const doc = await docRef.get();
      if (!doc || !doc.exists) return res.status(404).json({ error: "Form not found" });
      const existing = { id: doc.id, ...doc.data() };
      const permissionContext = await getFormsPermissionContext(req);
      if (!permissionContext.allowedUserIds.has(existing.userId)) return res.status(403).json({ error: "Access denied" });

      // Merge settings properly to preserve all settings properties
      const mergedSettings = {
        ...(existing.settings || {}),
        ...(req.body.settings || {})
      };
      
      // Clean up number fields: remove max: 100 if it's the default value
      const cleanedFields = (req.body.fields || existing.fields || []).map(field => {
        if (field.type === 'number' && field.max === 100) {
          const { max, ...rest } = field;
          return rest;
        }
        return field;
      });
      
      const updatedForm = {
        ...existing,
        ...req.body,
        fields: cleanedFields.length > 0 ? cleanedFields : (req.body.fields || existing.fields),
        // Ensure settings are properly merged
        settings: Object.keys(mergedSettings).length > 0 ? mergedSettings : existing.settings,
        id: existing.id,
        userId: existing.userId,
        shareKey: existing.shareKey,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };

      await docRef.set(updatedForm);
      return res.json(updatedForm);
    }

    const forms = await getForms();
    const formIndex = forms.findIndex((f) => f.id === req.params.id);

    if (formIndex === -1) {
      return res.status(404).json({ error: "Form not found" });
    }

    const permissionContext = await getFormsPermissionContext(req);
    if (!permissionContext.allowedUserIds.has(forms[formIndex].userId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Merge settings properly to preserve all settings properties
    const mergedSettings = {
      ...(forms[formIndex].settings || {}),
      ...(req.body.settings || {})
    };
    
    // Clean up number fields: remove max: 100 if it's the default value
    const cleanedFields = (req.body.fields || forms[formIndex].fields || []).map(field => {
      if (field.type === 'number' && field.max === 100) {
        const { max, ...rest } = field;
        return rest;
      }
      return field;
    });
    
    const updatedForm = {
      ...forms[formIndex],
      ...req.body,
      fields: cleanedFields.length > 0 ? cleanedFields : (req.body.fields || forms[formIndex].fields),
      // Ensure settings are properly merged
      settings: Object.keys(mergedSettings).length > 0 ? mergedSettings : forms[formIndex].settings,
      id: forms[formIndex].id,
      userId: forms[formIndex].userId,
      shareKey: forms[formIndex].shareKey,
      createdAt: forms[formIndex].createdAt,
      updatedAt: new Date().toISOString(),
    };

    forms[formIndex] = updatedForm;
    await saveForms(forms);

    res.json(updatedForm);
  } catch (error) {
    console.error("Update form error:", error);
    res.status(500).json({ error: "Failed to update form" });
  }
});

// Delete form
router.delete("/:id", async (req, res) => {
  try {
    if (useFirestore) {
      const docRef = db.collection('forms').doc(req.params.id);
      const doc = await docRef.get();
      if (!doc || !doc.exists) return res.status(404).json({ error: "Form not found" });
      const existing = { id: doc.id, ...doc.data() };
      const permissionContext = await getFormsPermissionContext(req);
      if (!permissionContext.allowedUserIds.has(existing.userId)) return res.status(403).json({ error: "Access denied" });

      await docRef.delete();
      return res.json({ message: "Form deleted successfully" });
    }

    const forms = await getForms();
    const formIndex = forms.findIndex((f) => f.id === req.params.id);

    if (formIndex === -1) {
      return res.status(404).json({ error: "Form not found" });
    }

    const permissionContext = await getFormsPermissionContext(req);
    if (!permissionContext.allowedUserIds.has(forms[formIndex].userId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    forms.splice(formIndex, 1);
    await saveForms(forms);

    res.json({ message: "Form deleted successfully" });
  } catch (error) {
    console.error("Delete form error:", error);
    res.status(500).json({ error: "Failed to delete form" });
  }
});

// Team Collaboration Routes
// Lazy file path resolution for team collaboration files
function getMembersFilePath() {
  return getDataFilePath("members.json");
}

function getInvitesFilePath() {
  return getDataFilePath("invites.json");
}

async function initMembersFile() {
  const MEMBERS_FILE = getMembersFilePath();
  try {
    await fs.access(MEMBERS_FILE);
  } catch {
    const dir = path.dirname(MEMBERS_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(MEMBERS_FILE, JSON.stringify({}, null, 2), 'utf8');
  }
}

async function initInvitesFile() {
  const INVITES_FILE = getInvitesFilePath();
  try {
    await fs.access(INVITES_FILE);
  } catch {
    const dir = path.dirname(INVITES_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(INVITES_FILE, JSON.stringify({}, null, 2), 'utf8');
  }
}

// Get form members
router.get("/:id/members", async (req, res) => {
  try {
    // If Firestore available, store members as documents in 'members' collection with field formId
    if (useFirestore) {
      const snap = await getCollectionRef('members').where('formId', '==', req.params.id).get()
      const formMembers = []
      snap.forEach(d => formMembers.push({ id: d.id, ...d.data() }))

      // Add owner as first member
      const form = await getFormById(req.params.id);
      if (form) {
        const userId = req.user?.uid || req.user?.id;
        let owner = null
        try {
          const ownerDoc = await getDoc('users', form.userId).catch(() => null)
          owner = ownerDoc
        } catch (err) {
          console.warn('Could not load user data from Firestore:', err.message)
        }
        const ownerMember = {
          id: form.userId,
          email: owner?.email || 'unknown',
          name: owner?.name || 'Owner',
          role: 'owner',
          isOwner: true
        }
        return res.json([ownerMember, ...formMembers.filter(m => m.id !== form.userId)])
      }
      return res.json(formMembers)
    }

    const MEMBERS_FILE = getMembersFilePath();
    await initMembersFile();
    const data = await fs.readFile(MEMBERS_FILE, "utf8");
    const allMembers = JSON.parse(data);
    const formMembers = allMembers[req.params.id] || [];
    
    // Add owner as first member
    const form = await getFormById(req.params.id);
    if (form) {
      const userId = req.user.uid || req.user.id;
      const isOwner = form.userId === userId;
      
      // Get user info
      let owner = null;
      try {
        owner = await getUserById(form.userId);
      } catch (err) {
        console.warn("Could not load user data:", err.message);
      }
      
      const ownerMember = {
        id: form.userId,
        email: owner?.email || 'unknown',
        name: owner?.name || 'Owner',
        role: 'owner',
        isOwner: true
      };
      
      res.json([ownerMember, ...formMembers.filter(m => m.id !== form.userId)]);
    } else {
      res.json(formMembers);
    }
  } catch (error) {
    console.error("Get members error:", error);
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

// Get form invites
router.get("/:id/invites", async (req, res) => {
  try {
    if (useFirestore) {
      const snap = await getCollectionRef('invites').where('formId', '==', req.params.id).get()
      const items = []
      snap.forEach(d => items.push({ id: d.id, ...d.data() }))
      return res.json(items)
    }
    const INVITES_FILE = getInvitesFilePath();
    await initInvitesFile();
    const data = await fs.readFile(INVITES_FILE, "utf8");
    const allInvites = JSON.parse(data);
    res.json(allInvites[req.params.id] || []);
  } catch (error) {
    console.error("Get invites error:", error);
    res.status(500).json({ error: "Failed to fetch invites" });
  }
});

// Send invite
router.post("/:id/invites", async (req, res) => {
  try {
    const form = await getFormById(req.params.id);
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    const permissionContext = await getFormsPermissionContext(req);
    if (!permissionContext.allowedUserIds.has(form.userId)) {
      return res.status(403).json({ error: "Only form owner or authorized team members can invite users" });
    }

    // Get form owner's user info and SMTP config
    let ownerEmail = null;
    let ownerName = null;
    let userSmtpConfig = null;
    
    try {
      const owner = await getUserById(form.userId);
      if (owner) {
        ownerEmail = owner.email;
        ownerName = owner.name || ownerEmail?.split('@')[0] || 'Form Owner';
        userSmtpConfig = owner.smtpConfig;
      }
    } catch (userError) {
      console.warn("Could not load owner info for email:", userError.message);
    }

    // Check if user is already a member
    const MEMBERS_FILE = getMembersFilePath();
    await initMembersFile();
    const membersData = await fs.readFile(MEMBERS_FILE, "utf8");
    const allMembers = JSON.parse(membersData);
    const formMembers = allMembers[req.params.id] || [];
    
    if (useFirestore) {
      const memberSnap = await getCollectionRef('members').where('formId', '==', req.params.id).get();
      const existingMembers = [];
      memberSnap.forEach(d => existingMembers.push({ id: d.id, ...d.data() }));
      
      const isAlreadyMember = existingMembers.some(m => 
        m.email?.toLowerCase() === req.body.email.toLowerCase() || 
        m.id === req.body.email.toLowerCase()
      );
      
      if (isAlreadyMember) {
        return res.status(400).json({ error: "User is already a member of this form" });
      }
    } else {
      const isAlreadyMember = formMembers.some(m => 
        m.email?.toLowerCase() === req.body.email.toLowerCase()
      );
      
      if (isAlreadyMember) {
        return res.status(400).json({ error: "User is already a member of this form" });
      }
    }

    // Generate invite token for acceptance
    const inviteToken = crypto.randomBytes(32).toString("hex");

    if (useFirestore) {
      const invite = {
        id: crypto.randomBytes(8).toString("hex"),
        email: req.body.email.toLowerCase().trim(),
        role: req.body.role || 'editor',
        formId: req.params.id,
        token: inviteToken,
        createdAt: new Date().toISOString()
      };
      await setDoc('invites', invite.id, invite);
      
      // Send invitation email
      await sendInvitationEmail(form, invite, ownerName, ownerEmail, userSmtpConfig);
      
      return res.json(invite);
    }

    const INVITES_FILE = getInvitesFilePath();
    await initInvitesFile();
    const data = await fs.readFile(INVITES_FILE, "utf8");
    const allInvites = JSON.parse(data);
    
    if (!allInvites[req.params.id]) {
      allInvites[req.params.id] = [];
    }

    const invite = {
      id: crypto.randomBytes(8).toString("hex"),
      email: req.body.email.toLowerCase().trim(),
      role: req.body.role || 'editor',
      formId: req.params.id,
      token: inviteToken,
      createdAt: new Date().toISOString()
    };

    allInvites[req.params.id].push(invite);
    const dir = path.dirname(INVITES_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(INVITES_FILE, JSON.stringify(allInvites, null, 2), 'utf8');

    // Send invitation email
    await sendInvitationEmail(form, invite, ownerName, ownerEmail, userSmtpConfig);

    res.json(invite);
  } catch (error) {
    console.error("Send invite error:", error);
    res.status(500).json({ error: "Failed to send invite" });
  }
});

// Helper function to send invitation email
async function sendInvitationEmail(form, invite, ownerName, ownerEmail, userSmtpConfig) {
  try {
    const { sendEmail } = require(path.join(__dirname, "..", "utils", "emailService"));
    
    // Get app URL from environment or use default
    const appUrl = process.env.APP_URL || process.env.VERCEL_URL || 'http://localhost:4000';
    const acceptUrl = `${appUrl}/accept-invite/${invite.token}`;
    
    const roleDisplay = invite.role === 'editor' ? 'Editor' : 'Viewer';
    const roleDescription = invite.role === 'editor' 
      ? 'edit the form, view submissions, and collaborate with the team'
      : 'view the form and submissions (read-only)';
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>You've been invited to collaborate!</h2>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p><strong>${ownerName || 'A team member'}</strong> has invited you to collaborate on the form <strong>"${form.title}"</strong>.</p>
            <p>You've been assigned the role of <strong>${roleDisplay}</strong>, which means you can ${roleDescription}.</p>
            <div style="text-align: center;">
              <a href="${acceptUrl}" class="button">Accept Invitation</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #4f46e5;">${acceptUrl}</p>
            <div class="footer">
              <p>This invitation will expire if not accepted. If you didn't expect this invitation, you can safely ignore this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await sendEmail({
      to: invite.email,
      subject: `Invitation to collaborate on "${form.title}"`,
      html: emailHtml,
      userSmtpConfig
    });

    if (result.success) {
      console.log(`Invitation email sent to ${invite.email} for form ${form.id}`);
    } else {
      console.warn(`Failed to send invitation email to ${invite.email}:`, result.error);
    }
  } catch (emailError) {
    console.error("Error sending invitation email:", emailError);
    // Don't fail the invite creation if email fails
  }
}

// Accept invitation (by inviteId - for authenticated users)
router.post("/invites/:inviteId/accept", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Get user's email
    let userEmail = null;
    try {
      const user = await getUserById(userId);
      if (user) {
        userEmail = user.email?.toLowerCase().trim();
      }
    } catch (userError) {
      console.warn("Could not load user info:", userError.message);
    }

    if (!userEmail) {
      return res.status(400).json({ error: "User email not found" });
    }

    // Find invite by inviteId
    let invite = null;

    if (useFirestore) {
      const inviteDoc = await getDoc('invites', req.params.inviteId);
      if (inviteDoc) {
        invite = { id: req.params.inviteId, ...inviteDoc };
      }
    } else {
      const INVITES_FILE = getInvitesFilePath();
      await initInvitesFile();
      const data = await fs.readFile(INVITES_FILE, "utf8");
      const allInvites = JSON.parse(data);

      for (const formId in allInvites) {
        const invites = allInvites[formId] || [];
        const foundInvite = invites.find(inv => inv.id === req.params.inviteId);
        if (foundInvite) {
          invite = foundInvite;
          break;
        }
      }
    }

    if (!invite) {
      return res.status(404).json({ error: "Invitation not found or expired" });
    }

    // Verify email matches
    if (invite.email?.toLowerCase().trim() !== userEmail) {
      return res.status(403).json({ 
        error: "This invitation was sent to a different email address",
        message: `This invitation was sent to ${invite.email}, but you are logged in as ${userEmail}`
      });
    }

    // Get form
    const form = await getFormById(invite.formId);
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    // Check if already a member and add member
    const MEMBERS_FILE = getMembersFilePath();
    await initMembersFile();
    
    if (useFirestore) {
      const memberSnap = await getCollectionRef('members')
        .where('formId', '==', invite.formId)
        .where('email', '==', userEmail)
        .limit(1)
        .get();
      
      if (!memberSnap.empty) {
        // Already a member, just remove the invite
        await deleteDoc('invites', req.params.inviteId);
        return res.json({ 
          success: true, 
          message: "You are already a member of this form",
          formId: invite.formId
        });
      }

      // Add as member
      const memberId = crypto.randomBytes(8).toString("hex");
      const member = {
        id: memberId,
        email: userEmail,
        role: invite.role,
        formId: invite.formId,
        userId: userId,
        joinedAt: new Date().toISOString()
      };
      await setDoc('members', memberId, member);

      // Remove invite
      await deleteDoc('invites', req.params.inviteId);

      return res.json({ 
        success: true, 
        message: "Invitation accepted successfully",
        formId: invite.formId,
        form: form
      });
    } else {
      const membersData = await fs.readFile(MEMBERS_FILE, "utf8");
      const allMembers = JSON.parse(membersData);
      
      if (!allMembers[invite.formId]) {
        allMembers[invite.formId] = [];
      }

      const isAlreadyMember = allMembers[invite.formId].some(m => 
        m.email?.toLowerCase() === userEmail || m.userId === userId
      );

      if (isAlreadyMember) {
        // Already a member, just remove the invite
        const INVITES_FILE = getInvitesFilePath();
        const invitesData = await fs.readFile(INVITES_FILE, "utf8");
        const allInvites = JSON.parse(invitesData);
        
        if (allInvites[invite.formId]) {
          allInvites[invite.formId] = allInvites[invite.formId].filter(
            i => i.id !== req.params.inviteId
          );
          const dir = path.dirname(INVITES_FILE);
          await fs.mkdir(dir, { recursive: true });
          await fs.writeFile(INVITES_FILE, JSON.stringify(allInvites, null, 2), 'utf8');
        }

        return res.json({ 
          success: true, 
          message: "You are already a member of this form",
          formId: invite.formId
        });
      }

      // Add as member
      const member = {
        id: crypto.randomBytes(8).toString("hex"),
        email: userEmail,
        role: invite.role,
        formId: invite.formId,
        userId: userId,
        joinedAt: new Date().toISOString()
      };

      allMembers[invite.formId].push(member);
      const dir = path.dirname(MEMBERS_FILE);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(MEMBERS_FILE, JSON.stringify(allMembers, null, 2), 'utf8');

      // Remove invite
      const INVITES_FILE = getInvitesFilePath();
      const invitesData = await fs.readFile(INVITES_FILE, "utf8");
      const allInvites = JSON.parse(invitesData);
      
      if (allInvites[invite.formId]) {
        allInvites[invite.formId] = allInvites[invite.formId].filter(
          i => i.id !== req.params.inviteId
        );
        const dir2 = path.dirname(INVITES_FILE);
        await fs.mkdir(dir2, { recursive: true });
        await fs.writeFile(INVITES_FILE, JSON.stringify(allInvites, null, 2), 'utf8');
      }

      return res.json({ 
        success: true, 
        message: "Invitation accepted successfully",
        formId: invite.formId,
        form: form
      });
    }
  } catch (error) {
    console.error("Accept invite error:", error);
    res.status(500).json({ error: "Failed to accept invitation" });
  }
});

// Accept invitation (by token - for email links)
router.post("/invites/accept/:token", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Get user's email
    let userEmail = null;
    try {
      const user = await getUserById(userId);
      if (user) {
        userEmail = user.email?.toLowerCase().trim();
      }
    } catch (userError) {
      console.warn("Could not load user info:", userError.message);
    }

    if (!userEmail) {
      return res.status(400).json({ error: "User email not found" });
    }

    // Find invite by token
    let invite = null;
    let inviteId = null;

    if (useFirestore) {
      const inviteSnap = await getCollectionRef('invites')
        .where('token', '==', req.params.token)
        .limit(1)
        .get();
      
      inviteSnap.forEach(doc => {
        invite = { id: doc.id, ...doc.data() };
        inviteId = doc.id;
      });
    } else {
      const INVITES_FILE = getInvitesFilePath();
      await initInvitesFile();
      const data = await fs.readFile(INVITES_FILE, "utf8");
      const allInvites = JSON.parse(data);

      for (const formId in allInvites) {
        const invites = allInvites[formId] || [];
        const foundInvite = invites.find(inv => inv.token === req.params.token);
        if (foundInvite) {
          invite = foundInvite;
          inviteId = foundInvite.id;
          break;
        }
      }
    }

    if (!invite) {
      return res.status(404).json({ error: "Invitation not found or expired" });
    }

    // Verify email matches
    if (invite.email?.toLowerCase().trim() !== userEmail) {
      return res.status(403).json({ 
        error: "This invitation was sent to a different email address",
        message: `This invitation was sent to ${invite.email}, but you are logged in as ${userEmail}`
      });
    }

    // Get form
    const form = await getFormById(invite.formId);
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    // Check if already a member
    const MEMBERS_FILE = getMembersFilePath();
    await initMembersFile();
    
    if (useFirestore) {
      const memberSnap = await getCollectionRef('members')
        .where('formId', '==', invite.formId)
        .where('email', '==', userEmail)
        .limit(1)
        .get();
      
      if (!memberSnap.empty) {
        // Already a member, just remove the invite
        await deleteDoc('invites', inviteId);
        return res.json({ 
          success: true, 
          message: "You are already a member of this form",
          formId: invite.formId
        });
      }

      // Add as member
      const memberId = crypto.randomBytes(8).toString("hex");
      const member = {
        id: memberId,
        email: userEmail,
        role: invite.role,
        formId: invite.formId,
        userId: userId,
        joinedAt: new Date().toISOString()
      };
      await setDoc('members', memberId, member);

      // Remove invite
      await deleteDoc('invites', inviteId);

      return res.json({ 
        success: true, 
        message: "Invitation accepted successfully",
        formId: invite.formId,
        form: form
      });
    } else {
      const membersData = await fs.readFile(MEMBERS_FILE, "utf8");
      const allMembers = JSON.parse(membersData);
      
      if (!allMembers[invite.formId]) {
        allMembers[invite.formId] = [];
      }

      const isAlreadyMember = allMembers[invite.formId].some(m => 
        m.email?.toLowerCase() === userEmail || m.userId === userId
      );

      if (isAlreadyMember) {
        // Already a member, just remove the invite
        const INVITES_FILE = getInvitesFilePath();
        const invitesData = await fs.readFile(INVITES_FILE, "utf8");
        const allInvites = JSON.parse(invitesData);
        
        if (allInvites[invite.formId]) {
          allInvites[invite.formId] = allInvites[invite.formId].filter(
            i => i.id !== inviteId
          );
          const dir = path.dirname(INVITES_FILE);
          await fs.mkdir(dir, { recursive: true });
          await fs.writeFile(INVITES_FILE, JSON.stringify(allInvites, null, 2), 'utf8');
        }

        return res.json({ 
          success: true, 
          message: "You are already a member of this form",
          formId: invite.formId
        });
      }

      // Add as member
      const member = {
        id: crypto.randomBytes(8).toString("hex"),
        email: userEmail,
        role: invite.role,
        formId: invite.formId,
        userId: userId,
        joinedAt: new Date().toISOString()
      };

      allMembers[invite.formId].push(member);
      const dir = path.dirname(MEMBERS_FILE);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(MEMBERS_FILE, JSON.stringify(allMembers, null, 2), 'utf8');

      // Remove invite
      const INVITES_FILE = getInvitesFilePath();
      const invitesData = await fs.readFile(INVITES_FILE, "utf8");
      const allInvites = JSON.parse(invitesData);
      
      if (allInvites[invite.formId]) {
        allInvites[invite.formId] = allInvites[invite.formId].filter(
          i => i.id !== inviteId
        );
        const dir2 = path.dirname(INVITES_FILE);
        await fs.mkdir(dir2, { recursive: true });
        await fs.writeFile(INVITES_FILE, JSON.stringify(allInvites, null, 2), 'utf8');
      }

      return res.json({ 
        success: true, 
        message: "Invitation accepted successfully",
        formId: invite.formId,
        form: form
      });
    }
  } catch (error) {
    console.error("Accept invite error:", error);
    res.status(500).json({ error: "Failed to accept invitation" });
  }
});

// Cancel invite
router.delete("/:id/invites/:inviteId", async (req, res) => {
  try {
    if (useFirestore) {
      try {
        await deleteDoc('invites', req.params.inviteId)
        return res.json({ success: true })
      } catch (e) {
        console.error('Failed to delete invite in Firestore:', e)
        return res.status(500).json({ error: 'Failed to cancel invite' })
      }
    }

    const INVITES_FILE = getInvitesFilePath();
    await initInvitesFile();
    const data = await fs.readFile(INVITES_FILE, "utf8");
    const allInvites = JSON.parse(data);
    
    if (allInvites[req.params.id]) {
      allInvites[req.params.id] = allInvites[req.params.id].filter(
        i => i.id !== req.params.inviteId
      );
      const dir = path.dirname(INVITES_FILE);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(INVITES_FILE, JSON.stringify(allInvites, null, 2), 'utf8');
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Cancel invite error:", error);
    res.status(500).json({ error: "Failed to cancel invite" });
  }
});

// Update member role
router.put("/:id/members/:memberId", async (req, res) => {
  try {
    const form = await getFormById(req.params.id);
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    const permissionContext = await getFormsPermissionContext(req);
    if (!permissionContext.allowedUserIds.has(form.userId)) {
      return res.status(403).json({ error: "Only form owner or authorized team members can update roles" });
    }

    if (useFirestore) {
      try {
        const member = await getDoc('members', req.params.memberId)
        if (!member) return res.status(404).json({ error: 'Member not found' })
        const updated = { ...member, role: req.body.role }
        await setDoc('members', req.params.memberId, updated)
        return res.json({ success: true })
      } catch (e) {
        console.error('Update member role failed in Firestore:', e)
        return res.status(500).json({ error: 'Failed to update member' })
      }
    }

    const MEMBERS_FILE = getMembersFilePath();
    await initMembersFile();
    const data = await fs.readFile(MEMBERS_FILE, "utf8");
    const allMembers = JSON.parse(data);
    
    if (!allMembers[req.params.id]) {
      allMembers[req.params.id] = [];
    }

    const memberIndex = allMembers[req.params.id].findIndex(m => m.id === req.params.memberId);
    if (memberIndex !== -1) {
      allMembers[req.params.id][memberIndex].role = req.body.role;
      const dir = path.dirname(MEMBERS_FILE);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(MEMBERS_FILE, JSON.stringify(allMembers, null, 2), 'utf8');
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Update member error:", error);
    res.status(500).json({ error: "Failed to update member" });
  }
});

// Remove member
router.delete("/:id/members/:memberId", async (req, res) => {
  try {
    const form = await getFormById(req.params.id);
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    const permissionContext = await getFormsPermissionContext(req);
    if (!permissionContext.allowedUserIds.has(form.userId)) {
      return res.status(403).json({ error: "Only form owner or authorized team members can remove members" });
    }

    if (useFirestore) {
      try {
        await deleteDoc('members', req.params.memberId)
        return res.json({ success: true })
      } catch (e) {
        console.error('Failed to remove member in Firestore:', e)
        return res.status(500).json({ error: 'Failed to remove member' })
      }
    }

    const MEMBERS_FILE = getMembersFilePath();
    await initMembersFile();
    const data = await fs.readFile(MEMBERS_FILE, "utf8");
    const allMembers = JSON.parse(data);
    
    if (allMembers[req.params.id]) {
      allMembers[req.params.id] = allMembers[req.params.id].filter(
        m => m.id !== req.params.memberId
      );
      const dir = path.dirname(MEMBERS_FILE);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(MEMBERS_FILE, JSON.stringify(allMembers, null, 2), 'utf8');
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Remove member error:", error);
    res.status(500).json({ error: "Failed to remove member" });
  }
});

// Export form (download JSON)
router.get("/:id/export", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id
    if (!userId) return res.status(401).json({ error: 'Not authenticated' })
    
    let form
    if (useFirestore) {
      const doc = await db.collection('forms').doc(req.params.id).get()
      if (!doc || !doc.exists) return res.status(404).json({ error: 'Form not found' })
      form = { id: doc.id, ...doc.data() }
    } else {
      const forms = await getForms()
      form = forms.find((f) => f.id === req.params.id)
    }
    
    if (!form) {
      return res.status(404).json({ error: "Form not found" })
    }
    
    const permissionContext = await getFormsPermissionContext(req);
    if (!permissionContext.allowedUserIds.has(form.userId)) {
      return res.status(403).json({ error: "Access denied" })
    }
    
    const exportData = {
      ...form,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    }
    
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${form.title || 'form'}_${Date.now()}.json"`)
    res.json(exportData)
  } catch (error) {
    console.error("Export form error:", error)
    res.status(500).json({ error: "Failed to export form" })
  }
})

// Import form (upload JSON)
router.post("/:id/import", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id
    if (!userId) return res.status(401).json({ error: 'Not authenticated' })
    
    // Verify user owns the form
    let existingForm
    if (useFirestore) {
      const doc = await db.collection('forms').doc(req.params.id).get()
      if (!doc || !doc.exists) return res.status(404).json({ error: 'Form not found' })
      existingForm = { id: doc.id, ...doc.data() }
    } else {
      const forms = await getForms()
      existingForm = forms.find((f) => f.id === req.params.id)
    }
    
    if (!existingForm) {
      return res.status(404).json({ error: "Form not found" })
    }
    
    const permissionContext = await getFormsPermissionContext(req);
    if (!permissionContext.allowedUserIds.has(existingForm.userId)) {
      return res.status(403).json({ error: "Access denied" })
    }
    
    const { formData } = req.body
    
    if (!formData || !formData.fields || !Array.isArray(formData.fields)) {
      return res.status(400).json({ error: "Invalid form data. Missing fields array." })
    }
    
    // Update form with imported data
    const updatedForm = {
      ...existingForm,
      fields: formData.fields,
      pages: formData.pages || existingForm.pages,
      settings: formData.settings || existingForm.settings,
      title: formData.title || existingForm.title,
      updatedAt: new Date().toISOString()
    }
    
    if (useFirestore) {
      await db.collection('forms').doc(req.params.id).set(updatedForm)
    } else {
      const forms = await getForms()
      const formIndex = forms.findIndex((f) => f.id === req.params.id)
      if (formIndex !== -1) {
        forms[formIndex] = updatedForm
        await saveForms(forms)
      }
    }
    
    res.json(updatedForm)
  } catch (error) {
    console.error("Import form error:", error)
    res.status(500).json({ error: "Failed to import form" })
  }
})

// Backup form to Google Drive (requires Google Drive API setup)
router.post("/:id/backup-drive", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id
    if (!userId) return res.status(401).json({ error: 'Not authenticated' })
    
    // Get form
    let form
    if (useFirestore) {
      const doc = await db.collection('forms').doc(req.params.id).get()
      if (!doc || !doc.exists) return res.status(404).json({ error: 'Form not found' })
      form = { id: doc.id, ...doc.data() }
    } else {
      const forms = await getForms()
      form = forms.find((f) => f.id === req.params.id)
    }
    
    if (!form) {
      return res.status(404).json({ error: "Form not found" })
    }
    
    const permissionContext = await getFormsPermissionContext(req);
    if (!permissionContext.allowedUserIds.has(form.userId)) {
      return res.status(403).json({ error: "Access denied" })
    }
    
    // Note: This endpoint requires Google Drive API setup
    // For now, return the form data so frontend can handle the upload
    // In production, you would implement server-side Google Drive API integration here
    
    const backupData = {
      ...form,
      exportedAt: new Date().toISOString(),
      version: '1.0',
      backupType: 'google_drive'
    }
    
    res.json({
      success: true,
      message: 'Form data ready for backup',
      data: backupData,
      note: 'Google Drive backup requires client-side implementation or server-side OAuth setup'
    })
  } catch (error) {
    console.error("Backup form error:", error)
    res.status(500).json({ error: "Failed to backup form" })
  }
})

module.exports = router;
module.exports.getFormsPermissionContext = getFormsPermissionContext;
module.exports.getFormById = getFormById;
