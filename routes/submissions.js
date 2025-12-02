const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
const { useFirestore, queryByFieldIn, getCollectionRef, getDoc, setDoc, deleteDoc } = require(path.join(__dirname, "..", "utils", "db"));
const { sendSubmissionNotification } = require(path.join(__dirname, "..", "utils", "emailService"));
const { extractCustomerInfo, getCustomers, saveCustomers } = require("./customers");
const formsRouter = require("./forms");
const invoicesRouter = require("./invoices");
const { buildInvoiceFromSubmission } = require(path.join(__dirname, "..", "utils", "invoiceGenerator"));
const { getFormsPermissionContext, getFormById } = formsRouter;

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

async function saveSubmissions(submissions) {
  if (useFirestore) {
    try {
      for (const submission of submissions) {
        const id = submission.id || Date.now().toString();
        await setDoc('submissions', id, submission);
      }
      return;
    } catch (e) {
      console.error('Error saving submissions to Firestore:', e);
      throw e;
    }
  }
  const SUBMISSIONS_FILE = getSubmissionsFilePath();
  const dir = path.dirname(SUBMISSIONS_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2), 'utf8');
}

async function autoCreateInvoiceForSubmission(form, submission, customer) {
  if (!form || !submission || !buildInvoiceFromSubmission || !invoicesRouter.appendInvoice) {
    return
  }
  try {
    const invoice = buildInvoiceFromSubmission(form, submission, customer)
    if (invoice) {
      await invoicesRouter.appendInvoice(invoice)
      submission.invoiceId = invoice.id
    }
  } catch (error) {
    console.error("Auto invoice creation error:", error)
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
  const USERS_FILE = getDataFilePath("users.json");
  try {
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

// Admin/staff quick entry endpoint
router.post("/:formId/entries", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const permissionContext = await getFormsPermissionContext(req);
    if (!permissionContext?.hasFormsPermission) {
      return res.status(403).json({ error: "You don't have permission to log entries." });
    }

    const form = await getFormById(req.params.formId);
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    if (!permissionContext.allowedUserIds?.has(form.userId)) {
      return res.status(403).json({ error: "You don't have access to this form." });
    }

    const { data: submissionData } = req.body || {};
    if (!submissionData || typeof submissionData !== 'object') {
      return res.status(400).json({ error: "Submission data is required" });
    }

    const submissionId = Date.now().toString();
    const newSubmission = {
      id: submissionId,
      formId: form.id,
      data: submissionData,
      submittedAt: new Date().toISOString(),
      submittedBy: userId,
      submittedVia: 'internal-entry',
      ipAddress: req.ip,
    };

    let linkedCustomer = null;
    try {
      const { customerName, customerEmail, customerPhone } = extractCustomerInfo(form, submissionData);
      console.log('[Submissions] Extracted customer info:', { customerName, customerEmail, customerPhone });
      
      // Don't create customer if name is a phone number - require a valid name or email
      const hasValidName = customerName && customerName.trim() && !/^\d{7,15}$/.test(customerName.replace(/[\s\-\(\)\+\.]/g, ''));
      
      // Create/update customer if we have at least a valid name or email (phone alone is not enough)
      if (hasValidName || customerEmail) {
        const customers = await getCustomers();
        const userFormsOwnerId = form.userId;

        // Find existing customer by email, name, or phone
        let customer = customers.find((c) =>
          c.userId === userFormsOwnerId && (
            (customerEmail && c.email && c.email.toLowerCase() === customerEmail.toLowerCase()) ||
            (customerName && c.name && c.name.toLowerCase() === customerName.toLowerCase()) ||
            (customerPhone && c.phone && c.phone.replace(/\D/g, '') === customerPhone.replace(/\D/g, ''))
          )
        );

        if (customer) {
          // Update existing customer - merge new info with existing
          customer.name = customerName || customer.name;
          customer.email = customerEmail || customer.email;
          customer.phone = customerPhone || customer.phone;
          customer.updatedAt = new Date().toISOString();
          customer.lastSubmissionAt = new Date().toISOString();
          console.log('[Submissions] Updated existing customer:', customer.id, customer.name);
        } else {
          // Create new customer - only use name if it's valid (not a phone number)
          customer = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            userId: userFormsOwnerId,
            name: hasValidName ? customerName : (customerEmail ? customerEmail.split('@')[0] : 'Unknown Customer'),
            email: customerEmail || null,
            phone: customerPhone || null,
            address: null,
            notes: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastSubmissionAt: new Date().toISOString(),
            submissionCount: 0
          };
          customers.push(customer);
          console.log('[Submissions] Created new customer:', customer.id, customer.name);
        }

        customer.submissionCount = (customer.submissionCount || 0) + 1;
        newSubmission.customerId = customer.id;
        linkedCustomer = customer;
        await saveCustomers(customers);
        console.log('[Submissions] Customer saved and linked to submission:', customer.id);
      } else {
        console.log('[Submissions] No customer name, email, or phone found, skipping customer creation');
      }
    } catch (customerError) {
      console.error("Error linking customer during entry:", customerError);
      console.error("Customer error details:", customerError.message, customerError.stack);
    }

    await autoCreateInvoiceForSubmission(form, newSubmission, linkedCustomer);

    if (useFirestore) {
      try {
        await setDoc('submissions', newSubmission.id, newSubmission);
      } catch (e) {
        console.error('Failed saving admin submission to Firestore:', e)
        return res.status(500).json({ error: 'Failed to log entry' })
      }
    } else {
      const submissions = await getSubmissions();
      submissions.push(newSubmission);
      await saveSubmissions(submissions);
    }

    if (form.settings?.emailNotifications?.enabled) {
      try {
        const ownerEmail = form.settings.emailNotifications.notifyOwner
          ? form.settings.emailNotifications.ownerEmail
          : null;

        const submitterEmail = form.settings.emailNotifications.notifySubmitter
          ? submissionData[form.settings.emailNotifications.submitterEmailField]
          : null;

        if (ownerEmail || submitterEmail) {
          let userSmtpConfig = null;
          if (form.userId) {
            try {
              const users = await getUsers();
              const formOwner = users.find(u => (u.uid || u.id) === form.userId);
              if (formOwner && formOwner.smtpConfig) {
                userSmtpConfig = formOwner.smtpConfig;
              }
            } catch (userError) {
              console.warn('Failed to fetch SMTP config for owner:', userError.message);
            }
          }

          await sendSubmissionNotification({
            form,
            submission: newSubmission,
            ownerEmail,
            submitterEmail,
            userSmtpConfig,
          });
        }
      } catch (emailError) {
        console.error("Email notification error (admin entry):", emailError);
      }
    }

    res.json({ success: true, submission: newSubmission });
  } catch (error) {
    console.error("Admin entry submission error:", error);
    res.status(500).json({ error: "Failed to log entry" });
  }
});

module.exports = router;
