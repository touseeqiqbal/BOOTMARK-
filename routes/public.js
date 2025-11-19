const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const { sendSubmissionNotification } = require(path.join(__dirname, "..", "utils", "emailService"));
const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
const { useFirestore, getCollectionRef, getDoc, setDoc } = require(path.join(__dirname, "..", "utils", "db"));

const router = express.Router();

// Lazy file path resolution - resolve at runtime, not module load time
function getFormsFilePath() {
  return getDataFilePath("forms.json");
}

function getSubmissionsFilePath() {
  return getDataFilePath("submissions.json");
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
    const data = await fs.readFile(SUBMISSIONS_FILE, "utf8");
    const submissions = JSON.parse(data);
    return Array.isArray(submissions) ? submissions : [];
  } catch (error) {
    console.error("Error reading submissions file:", error);
    if (error.code === 'ENOENT') {
      return [];
    }
    return [];
  }
}

// Save submissions
async function saveSubmissions(submissions) {
  if (useFirestore) {
    try {
      for (const s of submissions) {
        const id = s.id || String(Date.now())
        await setDoc('submissions', id, s)
      }
      return
    } catch (e) {
      console.error('Error saving submissions to Firestore:', e)
      throw e
    }
  }
  const SUBMISSIONS_FILE = getSubmissionsFilePath();
  const dir = path.dirname(SUBMISSIONS_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2), 'utf8');
}

// Save forms
async function saveForms(forms) {
  if (useFirestore) {
    try {
      for (const f of forms) {
        const id = f.id
        if (!id) continue
        await setDoc('forms', id, f)
      }
      return
    } catch (e) {
      console.error('Error saving forms to Firestore:', e)
      throw e
    }
  }
  const FORMS_FILE = getFormsFilePath();
  const dir = path.dirname(FORMS_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(FORMS_FILE, JSON.stringify(forms, null, 2), 'utf8');
}

// Get public form by share key
router.get("/form/:shareKey", async (req, res) => {
  try {
    let form
    if (useFirestore) {
      const snap = await getCollectionRef('forms').where('shareKey', '==', req.params.shareKey).limit(1).get()
      snap.forEach(d => { form = { id: d.id, ...d.data() } })
    } else {
      const forms = await getForms();
      form = forms.find((f) => f.shareKey === req.params.shareKey);
    }

    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    // Increment view count
    if (useFirestore) {
      try {
        const current = await getDoc('forms', form.id)
        const updated = { ...(current || {}), views: (current?.views || 0) + 1, lastViewedAt: new Date().toISOString() }
        await setDoc('forms', form.id, updated)
      } catch (e) {
        console.error('Failed updating form view count in Firestore:', e)
      }
    } else {
      const forms = await getForms();
      const formIndex = forms.findIndex((f) => f.shareKey === req.params.shareKey);
      if (formIndex !== -1) {
        forms[formIndex].views = (forms[formIndex].views || 0) + 1;
        forms[formIndex].lastViewedAt = new Date().toISOString();
        await saveForms(forms);
      }
    }

    // Return form without sensitive data
    const publicForm = {
      id: form.id,
      title: form.title,
      fields: form.fields,
      settings: form.settings,
      pages: form.pages || [{ id: '1', name: 'Page 1', order: 0 }],
    };

    res.json(publicForm);
  } catch (error) {
    console.error("Get public form error:", error);
    res.status(500).json({ error: "Failed to fetch form" });
  }
});

// Submit form
router.post("/form/:shareKey/submit", async (req, res) => {
  try {
    // Resolve the form by shareKey (mirror GET /form/:shareKey behavior)
    let form
    if (useFirestore) {
      const snap = await getCollectionRef('forms').where('shareKey', '==', req.params.shareKey).limit(1).get()
      snap.forEach(d => { form = { id: d.id, ...d.data() } })
    } else {
      const forms = await getForms();
      form = forms.find((f) => f.shareKey === req.params.shareKey);
    }

    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    const { data: submissionData } = req.body;

    const newSubmission = {
      id: Date.now().toString(),
      formId: form.id,
      data: submissionData,
      submittedAt: new Date().toISOString(),
      ipAddress: req.ip,
    };
    if (useFirestore) {
      try {
        await setDoc('submissions', newSubmission.id, newSubmission)
      } catch (e) {
        console.error('Failed saving submission to Firestore:', e)
        return res.status(500).json({ error: 'Failed to submit form' })
      }
    } else {
      const submissions = await getSubmissions();
      submissions.push(newSubmission);
      await saveSubmissions(submissions);
    }

    // Send email notifications if enabled
    if (form.settings?.emailNotifications?.enabled) {
      try {
        const ownerEmail = form.settings.emailNotifications.notifyOwner 
          ? form.settings.emailNotifications.ownerEmail 
          : null;
        
        const submitterEmail = form.settings.emailNotifications.notifySubmitter 
          ? submissionData[form.settings.emailNotifications.submitterEmailField]
          : null;

        if (ownerEmail || submitterEmail) {
          await sendSubmissionNotification({
            form,
            submission: newSubmission,
            ownerEmail,
            submitterEmail
          });
        }
      } catch (emailError) {
        console.error("Email notification error:", emailError);
        // Don't fail the submission if email fails
      }
    }

    res.json({
      success: true,
      message: form.settings?.confirmationMessage || "Thank you for your submission!",
    });
  } catch (error) {
    console.error("Submit form error:", error);
    res.status(500).json({ error: "Failed to submit form" });
  }
});

module.exports = router;
