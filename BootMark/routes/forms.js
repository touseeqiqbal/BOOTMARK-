const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
const { db, useFirestore, getCollectionRef, setDoc, deleteDoc, getDoc } = require("../utils/db");

const router = express.Router();

// Lazy file path resolution - resolve at runtime, not module load time
// This ensures Vercel environment variables are available
function getFormsFilePath() {
  return getDataFilePath("forms.json");
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
      console.log("Creating directory for forms file:", dir);
      await fs.mkdir(dir, { recursive: true });
      
      // Create empty forms array file
      console.log("Creating forms file at:", FORMS_FILE);
      await fs.writeFile(FORMS_FILE, JSON.stringify([], null, 2), 'utf8');
      console.log("Forms file initialized at:", FORMS_FILE);
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
  const FORMS_FILE = getFormsFilePath();
  try {
    await initFormsFile();
    const data = await fs.readFile(FORMS_FILE, "utf8");
    const forms = JSON.parse(data);
    console.log(`Read ${forms.length} forms from ${FORMS_FILE}`);
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
  const FORMS_FILE = getFormsFilePath();
  try {
    // Ensure directory exists before writing
    const dir = path.dirname(FORMS_FILE);
    console.log("Creating directory if needed:", dir);
    await fs.mkdir(dir, { recursive: true });
    
    // Note: We'll let writeFile fail if directory is not writable
    // This provides a clearer error message
    
    // Write file
    console.log("Writing forms file to:", FORMS_FILE);
    await fs.writeFile(FORMS_FILE, JSON.stringify(forms, null, 2), 'utf8');
    console.log("Forms saved successfully, count:", forms.length);
    console.log("Saved to:", FORMS_FILE);
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

// Get user's forms
router.get("/", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id
    if (!userId) return res.status(401).json({ error: 'Not authenticated' })
    console.log(`Fetching forms for user: ${userId}`)
    if (useFirestore) {
      const snap = await db.collection('forms').where('userId', '==', userId).get()
      const items = []
      snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }))
      console.log(`Found ${items.length} forms in Firestore for user ${userId}`)
      return res.json(items)
    }
    const forms = await getForms()
    console.log(`Total forms in storage: ${forms.length}`)
    const userForms = forms.filter((f) => f.userId === userId)
    console.log(`Found ${userForms.length} forms for user ${userId}`)
    res.json(userForms)
  } catch (error) {
    console.error("Get forms error:", error)
    console.error("Error stack:", error.stack)
    res.status(500).json({ error: "Failed to fetch forms" })
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
      if (form.userId !== userId) return res.status(403).json({ error: 'Access denied' })
      return res.json(form)
    }
    const forms = await getForms();
    const form = forms.find((f) => f.id === req.params.id);
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }
    if (form.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(form);
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
    console.log("Create form request received");
    console.log("Request user:", req.user);
    console.log("Request body:", req.body);
    console.log("Forms file path:", FORMS_FILE);

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

    console.log("Creating form for user:", userId);
    const newForm = {
      id: crypto.randomBytes(16).toString("hex"),
      userId: userId,
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
      await db.collection('forms').doc(newForm.id).set(newForm)
      console.log("Form created in Firestore:", newForm.id)
      return res.status(201).json(newForm)
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
      const userId = req.user.uid || req.user.id;
      if (existing.userId !== userId) return res.status(403).json({ error: "Access denied" });

      const updatedForm = {
        ...existing,
        ...req.body,
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

    const userId = req.user.uid || req.user.id;
    if (forms[formIndex].userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updatedForm = {
      ...forms[formIndex],
      ...req.body,
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
      const userId = req.user.uid || req.user.id;
      if (existing.userId !== userId) return res.status(403).json({ error: "Access denied" });

      await docRef.delete();
      return res.json({ message: "Form deleted successfully" });
    }

    const forms = await getForms();
    const formIndex = forms.findIndex((f) => f.id === req.params.id);

    if (formIndex === -1) {
      return res.status(404).json({ error: "Form not found" });
    }

    const userId = req.user.uid || req.user.id;
    if (forms[formIndex].userId !== userId) {
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
      
      // Get user info - try to get from users file
      let owner = null;
      try {
        const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
        const usersFile = getDataFilePath("users.json");
        const usersData = await fs.readFile(usersFile, "utf8");
        const users = JSON.parse(usersData);
        owner = users.find(u => u.uid === form.userId);
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

    const userId = req.user.uid || req.user.id;
    if (form.userId !== userId) {
      return res.status(403).json({ error: "Only form owner can invite members" });
    }

    if (useFirestore) {
      const invite = {
        id: crypto.randomBytes(8).toString("hex"),
        email: req.body.email,
        role: req.body.role || 'editor',
        formId: req.params.id,
        createdAt: new Date().toISOString()
      };
      await setDoc('invites', invite.id, invite)
      return res.json(invite)
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
      email: req.body.email,
      role: req.body.role || 'editor',
      formId: req.params.id,
      createdAt: new Date().toISOString()
    };

    allInvites[req.params.id].push(invite);
    const dir = path.dirname(INVITES_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(INVITES_FILE, JSON.stringify(allInvites, null, 2), 'utf8');

    res.json(invite);
  } catch (error) {
    console.error("Send invite error:", error);
    res.status(500).json({ error: "Failed to send invite" });
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

    const userId = req.user.uid || req.user.id;
    if (form.userId !== userId) {
      return res.status(403).json({ error: "Only form owner can update roles" });
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

    const userId = req.user.uid || req.user.id;
    if (form.userId !== userId) {
      return res.status(403).json({ error: "Only form owner can remove members" });
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
    
    if (form.userId !== userId) {
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
    
    if (existingForm.userId !== userId) {
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
    
    if (form.userId !== userId) {
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
