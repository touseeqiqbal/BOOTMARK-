const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
const { useFirestore, queryByFieldIn, getCollectionRef, getDoc, setDoc, deleteDoc } = require(path.join(__dirname, "..", "utils", "db"));

const router = express.Router();

// Lazy file path resolution - resolve at runtime, not module load time
function getSubmissionsFilePath() {
  return getDataFilePath("submissions.json");
}

function getFormsFilePath() {
  return getDataFilePath("forms.json");
}

// Initialize submissions file
async function initSubmissionsFile() {
  const SUBMISSIONS_FILE = getSubmissionsFilePath();
  try {
    await fs.access(SUBMISSIONS_FILE);
  } catch {
    try {
      const dir = path.dirname(SUBMISSIONS_FILE);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(SUBMISSIONS_FILE, JSON.stringify([], null, 2), 'utf8');
      console.log("Submissions file initialized at:", SUBMISSIONS_FILE);
    } catch (writeError) {
      console.error("Error initializing submissions file:", writeError);
      throw writeError;
    }
  }
}

// Get submissions
async function getSubmissions() {
  if (useFirestore) {
    try {
      const snap = await getCollectionRef('submissions').get()
      const items = []
      snap.forEach(d => items.push({ id: d.id, ...d.data() }))
      return items
    } catch (e) {
      console.error('Error fetching submissions from Firestore:', e)
      return []
    }
  }
  const SUBMISSIONS_FILE = getSubmissionsFilePath();
  try {
    await initSubmissionsFile();
    const data = await fs.readFile(SUBMISSIONS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading submissions file:", error);
    if (error.code === 'ENOENT') {
      return [];
    }
    return [];
  }
}

// Get forms
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
    const data = await fs.readFile(FORMS_FILE, "utf8");
    const forms = JSON.parse(data);
    return Array.isArray(forms) ? forms : [];
  } catch (error) {
    console.error("Error reading forms file:", error);
    return [];
  }
}

// Get all submissions for user's forms
router.get("/", async (req, res) => {
  try {
    const forms = await getForms();
    const userId = req.user.uid || req.user.id;
    const userForms = forms.filter((f) => f.userId === userId);
    const formIds = userForms.map((f) => f.id);

    const submissions = await getSubmissions();
    const userSubmissions = submissions.filter((s) => formIds.includes(s.formId));

    // Attach form title to each submission
    const submissionsWithForm = userSubmissions.map((submission) => {
      const form = userForms.find((f) => f.id === submission.formId);
      return {
        ...submission,
        formTitle: form?.title || "Unknown Form",
      };
    });

    res.json(submissionsWithForm);
  } catch (error) {
    console.error("Get submissions error:", error);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

// Get submissions for a specific form
router.get("/form/:formId", async (req, res) => {
  try {
    console.log("Getting submissions for form:", req.params.formId);
    console.log("Request user:", req.user);
    
    const forms = await getForms();
    const form = forms.find((f) => f.id === req.params.formId);

    if (!form) {
      console.error("Form not found:", req.params.formId);
      return res.status(404).json({ error: "Form not found" });
    }

    const userId = req.user?.uid || req.user?.id;
    console.log("User ID:", userId, "Form User ID:", form.userId);
    
    if (!userId) {
      console.error("No user ID found in request");
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    if (form.userId !== userId) {
      console.error("Access denied - user ID mismatch");
      return res.status(403).json({ error: "Access denied" });
    }

    const submissions = await getSubmissions();
    console.log("All submissions:", submissions.length);
    const formSubmissions = submissions.filter((s) => s.formId === req.params.formId);
    console.log("Form submissions:", formSubmissions.length);

    res.json(formSubmissions);
  } catch (error) {
    console.error("Get form submissions error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Failed to fetch submissions", details: error.message });
  }
});

// Delete submission
router.delete("/:id", async (req, res) => {
  try {
    const forms = await getForms();
    const userId = req.user.uid || req.user.id;
    const userForms = forms.filter((f) => f.userId === userId);
    const formIds = userForms.map((f) => f.id);

    const submissions = await getSubmissions();
    const submission = submissions.find((s) => s.id === req.params.id);

    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    if (!formIds.includes(submission.formId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (useFirestore) {
      try {
        await deleteDoc('submissions', req.params.id)
        return res.json({ message: 'Submission deleted successfully' })
      } catch (e) {
        console.error('Failed to delete submission in Firestore:', e)
        return res.status(500).json({ error: 'Failed to delete submission' })
      }
    }

    const SUBMISSIONS_FILE = getSubmissionsFilePath();
    const updatedSubmissions = submissions.filter((s) => s.id !== req.params.id);
    const dir = path.dirname(SUBMISSIONS_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(SUBMISSIONS_FILE, JSON.stringify(updatedSubmissions, null, 2), 'utf8');

    res.json({ message: "Submission deleted successfully" });
  } catch (error) {
    console.error("Delete submission error:", error);
    res.status(500).json({ error: "Failed to delete submission" });
  }
});

module.exports = router;
