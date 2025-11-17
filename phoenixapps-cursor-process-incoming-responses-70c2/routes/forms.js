const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const { getDataFilePath } = require("../utils/dataPath");

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
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading forms file:", error);
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

// Get user's forms
router.get("/", async (req, res) => {
  try {
    const forms = await getForms();
    const userId = req.user.uid || req.user.id; // Support both Firebase UID and legacy ID
    const userForms = forms.filter((f) => f.userId === userId);
    res.json(userForms);
  } catch (error) {
    console.error("Get forms error:", error);
    res.status(500).json({ error: "Failed to fetch forms" });
  }
});

// Get single form
router.get("/:id", async (req, res) => {
  try {
    const forms = await getForms();
    const form = forms.find((f) => f.id === req.params.id);

    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    const userId = req.user.uid || req.user.id;
    if (form.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(form);
  } catch (error) {
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

    const userId = req.user.uid || req.user.id;
    
    if (!userId) {
      console.error("Invalid user ID extracted");
      return res.status(401).json({ error: "Invalid user ID", details: "Could not extract user ID" });
    }

    console.log("Creating form for user:", userId);

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

    forms.push(newForm);
    console.log("Attempting to save forms, new count:", forms.length);
    
    await saveForms(forms);

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
    const MEMBERS_FILE = getMembersFilePath();
    await initMembersFile();
    const data = await fs.readFile(MEMBERS_FILE, "utf8");
    const allMembers = JSON.parse(data);
    const formMembers = allMembers[req.params.id] || [];
    
    // Add owner as first member
    const forms = await getForms();
    const form = forms.find(f => f.id === req.params.id);
    if (form) {
      const userId = req.user.uid || req.user.id;
      const isOwner = form.userId === userId;
      
      // Get user info - try to get from users file
      let owner = null;
      try {
        const { getDataFilePath } = require("../utils/dataPath");
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
    const forms = await getForms();
    const form = forms.find(f => f.id === req.params.id);
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    const userId = req.user.uid || req.user.id;
    if (form.userId !== userId) {
      return res.status(403).json({ error: "Only form owner can invite members" });
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
    const forms = await getForms();
    const form = forms.find(f => f.id === req.params.id);
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    const userId = req.user.uid || req.user.id;
    if (form.userId !== userId) {
      return res.status(403).json({ error: "Only form owner can update roles" });
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
    const forms = await getForms();
    const form = forms.find(f => f.id === req.params.id);
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    const userId = req.user.uid || req.user.id;
    if (form.userId !== userId) {
      return res.status(403).json({ error: "Only form owner can remove members" });
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

module.exports = router;
