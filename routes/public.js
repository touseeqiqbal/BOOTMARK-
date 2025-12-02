const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const { sendSubmissionNotification } = require(path.join(__dirname, "..", "utils", "emailService"));
const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
const { useFirestore, getCollectionRef, getDoc, setDoc, deleteDoc } = require(path.join(__dirname, "..", "utils", "db"));
const { extractCustomerInfo, getCustomers, saveCustomers } = require("./customers");
const invoicesRouter = require("./invoices");
const { buildInvoiceFromSubmission } = require(path.join(__dirname, "..", "utils", "invoiceGenerator"));

// Helper to get users (for fetching SMTP config)
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

// Helper function to verify client token and extract user info
async function verifyClientToken(req) {
  const authHeader = req.headers?.authorization;
  const token = req.cookies?.token || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.replace("Bearer ", "") : null);
  
  console.log('[verifyClientToken] Token present:', !!token, 'Auth header:', !!authHeader);
  
  if (!token) {
    console.log('[verifyClientToken] No token found in request');
    return null;
  }

  try {
    const { admin } = require("../utils/db");
    if (admin && admin.apps && admin.apps.length > 0) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        console.log('[verifyClientToken] Token verified with Firebase Admin:', decodedToken.email);
        return {
          uid: decodedToken.uid,
          email: decodedToken.email
        };
      } catch (firebaseError) {
        console.log('[verifyClientToken] Firebase token verification failed:', firebaseError.message);
        // Fall through to JWT decode
      }
    }
    
    // Fallback: decode JWT manually (for development or when Firebase Admin not available)
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        const uid = payload.user_id || payload.sub || payload.uid || payload.id;
        if (uid) {
          console.log('[verifyClientToken] Token decoded manually, uid:', uid, 'email:', payload.email);
          return {
            uid: uid,
            email: payload.email
          };
        }
      }
    } catch (decodeError) {
      console.log('[verifyClientToken] JWT decode failed:', decodeError.message);
    }
  } catch (error) {
    console.error("[verifyClientToken] Token verification error:", error);
  }
  
  console.log('[verifyClientToken] No valid token found, returning null');
  return null;
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

    // Clean up number fields: remove max: 100 if it's the default value (for display only, doesn't save)
    const cleanedFields = (form.fields || []).map(field => {
      if (field.type === 'number' && field.max === 100) {
        const { max, ...rest } = field;
        return rest;
      }
      return field;
    });
    
    form = {
      ...form,
      fields: cleanedFields
    };

    // Check if form requires authentication (private link) FIRST - before any other processing
    // Use explicit check to handle undefined/null/empty string/false cases
    const hasPrivateLinkSetting = form.settings && form.settings.hasOwnProperty('isPrivateLink');
    const isPrivateLink = hasPrivateLinkSetting && 
                         (form.settings.isPrivateLink === true || 
                          form.settings.isPrivateLink === 'true');
    
    console.log('[Public Form Check] Form:', form.id, 'ShareKey:', form.shareKey);
    console.log('[Public Form Check] Has settings:', !!form.settings);
    console.log('[Public Form Check] Settings keys:', form.settings ? Object.keys(form.settings) : 'none');
    console.log('[Public Form Check] Has isPrivateLink property:', hasPrivateLinkSetting);
    console.log('[Public Form Check] isPrivateLink value:', form.settings?.isPrivateLink, 'type:', typeof form.settings?.isPrivateLink);
    console.log('[Public Form Check] isPrivateLink check result:', isPrivateLink);
    
    // CRITICAL: Double-check with direct property access
    if (form.settings) {
      const directCheck = form.settings.isPrivateLink;
      console.log('[Public Form Check] Direct isPrivateLink access:', directCheck, 'type:', typeof directCheck);
    }
    
    // CRITICAL: Check authentication BEFORE processing anything else for private links
    if (isPrivateLink) {
      console.log(`[Private Link Check] Form ${form.id} (${form.shareKey}) requires authentication - checking now`);
      
      // Verify authentication FIRST
      const clientUser = await verifyClientToken(req);
      
      if (!clientUser || !clientUser.uid) {
        console.log(`[Private Link Check] AUTHENTICATION FAILED - returning 401 immediately`);
        console.log(`[Private Link Check] Token present:`, !!req.headers?.authorization);
        console.log(`[Private Link Check] Cookie token present:`, !!req.cookies?.token);
        
        // Return 401 IMMEDIATELY - don't return form data
        return res.status(401).json({ 
          error: "Authentication required",
          requiresAuth: true,
          isPrivateLink: true,
          message: "This form requires you to sign in to BootMark"
        });
      }

      console.log(`[Private Link Check] User authenticated: ${clientUser.email} (${clientUser.uid})`);

      // Check if email is in allowed list (if provided)
      const allowedEmails = form.settings.allowedEmails;
      if (allowedEmails && Array.isArray(allowedEmails) && allowedEmails.length > 0) {
        const normalizedAllowed = allowedEmails
          .filter(e => e && typeof e === 'string')
          .map(e => e.toLowerCase().trim())
          .filter(e => e.length > 0 && e.includes('@'));
        
        if (normalizedAllowed.length > 0) {
          const clientEmail = clientUser.email?.toLowerCase().trim();
          if (!clientEmail || !normalizedAllowed.includes(clientEmail)) {
            console.log(`[Private Link Check] Access denied - email ${clientEmail} not in allowed list:`, normalizedAllowed);
            return res.status(403).json({ 
              error: "Access denied",
              message: "Your email is not authorized to access this form"
            });
          }
          console.log(`[Private Link Check] Email ${clientEmail} is authorized`);
        }
      }
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
    // CRITICAL: Only return form data if authentication check passed (or form is public)
    // Ensure settings object exists and includes isPrivateLink
    const publicForm = {
      id: form.id,
      title: form.title,
      fields: form.fields || [],
      settings: form.settings || {},
      pages: form.pages || [{ id: '1', name: 'Page 1', order: 0 }],
    };
    
    // Log what we're about to return
    console.log('[Public Form Response] Returning form:', {
      id: publicForm.id,
      shareKey: form.shareKey,
      isPrivateLink: publicForm.settings?.isPrivateLink,
      settingsExist: !!publicForm.settings
    });

    // Debug logging for private links (after auth check, so this logs for all requests)
    const publicFormIsPrivate = publicForm.settings && 
                                publicForm.settings.hasOwnProperty('isPrivateLink') &&
                                (publicForm.settings.isPrivateLink === true || 
                                 publicForm.settings.isPrivateLink === 'true');
    if (publicFormIsPrivate) {
      console.log(`[Private Link Response] Form ${form.id} (${form.shareKey}) is private`);
      console.log(`[Private Link Response] Allowed emails:`, publicForm.settings.allowedEmails || 'none');
      const clientUser = await verifyClientToken(req);
      console.log(`[Private Link Response] Client authenticated:`, !!clientUser);
      if (clientUser) {
        console.log(`[Private Link Response] Client email:`, clientUser.email);
      }
    }

    res.json(publicForm);
  } catch (error) {
    console.error("Get public form error:", error);
    res.status(500).json({ error: "Failed to fetch form" });
  }
});

// Save draft (for save and continue later)
router.post("/form/:shareKey/draft", async (req, res) => {
  try {
    // Resolve the form by shareKey
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

    // Check if form requires authentication (private link)
    let clientUser = null;
    if (form.settings?.isPrivateLink) {
      clientUser = await verifyClientToken(req);
      if (!clientUser || !clientUser.uid) {
        return res.status(401).json({ error: "Authentication required" });
      }
    }

    const { data: draftData } = req.body;

    const draftSubmission = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      formId: form.id,
      data: draftData,
      isDraft: true,
      savedAt: new Date().toISOString(),
      submittedBy: clientUser?.uid || null,
      ipAddress: req.ip,
    };

    if (useFirestore) {
      try {
        await setDoc('submissions', draftSubmission.id, draftSubmission)
      } catch (e) {
        console.error('Failed saving draft to Firestore:', e)
        return res.status(500).json({ error: 'Failed to save draft' })
      }
    } else {
      const submissions = await getSubmissions();
      // Remove existing draft for this form and user if exists
      const existingDraftIndex = submissions.findIndex(
        s => s.formId === form.id && 
             s.isDraft === true && 
             s.submittedBy === (clientUser?.uid || null)
      );
      if (existingDraftIndex !== -1) {
        submissions[existingDraftIndex] = draftSubmission;
      } else {
        submissions.push(draftSubmission);
      }
      await saveSubmissions(submissions);
    }

    res.json({
      success: true,
      message: "Draft saved successfully",
      draftId: draftSubmission.id
    });
  } catch (error) {
    console.error("Save draft error:", error);
    res.status(500).json({ error: "Failed to save draft" });
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

    // Check if form requires authentication (private link)
    let clientUser = null;
    if (form.settings?.isPrivateLink) {
      clientUser = await verifyClientToken(req);
      if (!clientUser || !clientUser.uid) {
        return res.status(401).json({ error: "Authentication required" });
      }
    }

    const { data: submissionData, draftId } = req.body;

    const newSubmission = {
      id: draftId || Date.now().toString(),
      formId: form.id,
      data: submissionData,
      submittedAt: new Date().toISOString(),
      submittedBy: clientUser?.uid || null,
      isDraft: false,
      ipAddress: req.ip,
    };

    // Extract customer info and create/update customer
    let linkedCustomer = null;
    try {
      const { customerName, customerEmail, customerPhone } = extractCustomerInfo(form, submissionData);
      console.log('[Public] Extracted customer info:', { customerName, customerEmail, customerPhone });
      
      // Don't create customer if name is a phone number - require a valid name or email
      const hasValidName = customerName && customerName.trim() && !/^\d{7,15}$/.test(customerName.replace(/[\s\-\(\)\+\.]/g, ''));
      
      // Create/update customer if we have at least a valid name or email (phone alone is not enough)
      if (hasValidName || customerEmail) {
        const customers = await getCustomers();
        const userId = form.userId;
        
        // Find existing customer by email, name, or phone
        let customer = customers.find((c) => 
          c.userId === userId && (
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
          console.log('[Public] Updated existing customer:', customer.id, customer.name);
        } else {
          // Create new customer - only use name if it's valid (not a phone number)
          customer = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            userId: userId,
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
          console.log('[Public] Created new customer:', customer.id, customer.name);
        }

        // Update submission count
        customer.submissionCount = (customer.submissionCount || 0) + 1;
        
        // Link submission to customer
        newSubmission.customerId = customer.id;
        linkedCustomer = customer;

        // Save customers
        await saveCustomers(customers);
        console.log('[Public] Customer saved and linked to submission:', customer.id);
      } else {
        console.log('[Public] No customer name, email, or phone found, skipping customer creation');
      }
    } catch (customerError) {
      console.error("Error creating/updating customer:", customerError);
      console.error("Customer error details:", customerError.message, customerError.stack);
      // Don't fail the submission if customer creation fails
    }

    await autoCreateInvoiceForSubmission(form, newSubmission, linkedCustomer);

    if (useFirestore) {
      try {
        // If it was a draft, update it; otherwise create new
        if (draftId) {
          const existing = await getDoc('submissions', draftId);
          if (existing && existing.isDraft) {
            await setDoc('submissions', draftId, newSubmission);
          } else {
            await setDoc('submissions', newSubmission.id, newSubmission);
          }
        } else {
          await setDoc('submissions', newSubmission.id, newSubmission);
        }
      } catch (e) {
        console.error('Failed saving submission to Firestore:', e)
        return res.status(500).json({ error: 'Failed to submit form' })
      }
    } else {
      const submissions = await getSubmissions();
      // If it was a draft, update it; otherwise add new
      if (draftId) {
        const draftIndex = submissions.findIndex(s => s.id === draftId && s.isDraft);
        if (draftIndex !== -1) {
          submissions[draftIndex] = newSubmission;
        } else {
          submissions.push(newSubmission);
        }
      } else {
        submissions.push(newSubmission);
      }
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
          // Get form owner's SMTP config
          let userSmtpConfig = null;
          if (form.userId) {
            try {
              const users = await getUsers();
              const formOwner = users.find(u => (u.uid || u.id) === form.userId);
              if (formOwner && formOwner.smtpConfig) {
                userSmtpConfig = formOwner.smtpConfig;
                console.log('Using form owner SMTP config for email notifications');
              }
            } catch (userError) {
              console.warn('Failed to fetch form owner SMTP config:', userError.message);
              // Continue with default/global SMTP config
            }
          }

          await sendSubmissionNotification({
            form,
            submission: newSubmission,
            ownerEmail,
            submitterEmail,
            userSmtpConfig // Pass form owner's SMTP config
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

// Get client's own submissions for a form (for private links)
router.get("/form/:shareKey/submissions", async (req, res) => {
  try {
    // Verify authentication
    const clientUser = await verifyClientToken(req);
    if (!clientUser || !clientUser.uid) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get form
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

    // Check if form is private link
    if (!form.settings?.isPrivateLink) {
      return res.status(403).json({ error: "This endpoint is only for private links" });
    }

    // Get client's submissions for this form
    const submissions = await getSubmissions();
    const clientSubmissions = submissions.filter(
      s => s.formId === form.id && 
           s.submittedBy === clientUser.uid &&
           s.isDraft !== true // Exclude drafts from submissions list (or include them, depending on requirement)
    );

    // Attach form title
    const submissionsWithForm = clientSubmissions.map(submission => ({
      ...submission,
      formTitle: form.title
    }));

    res.json(submissionsWithForm);
  } catch (error) {
    console.error("Get client submissions error:", error);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

// Get client's draft for a form
router.get("/form/:shareKey/draft", async (req, res) => {
  try {
    // Verify authentication
    const clientUser = await verifyClientToken(req);
    if (!clientUser || !clientUser.uid) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get form
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

    // Get client's draft for this form
    const submissions = await getSubmissions();
    const draft = submissions.find(
      s => s.formId === form.id && 
           s.submittedBy === clientUser.uid &&
           s.isDraft === true
    );

    if (!draft) {
      return res.status(404).json({ error: "No draft found" });
    }

    res.json(draft);
  } catch (error) {
    console.error("Get draft error:", error);
    res.status(500).json({ error: "Failed to fetch draft" });
  }
});

// Delete draft
router.delete("/form/:shareKey/draft", async (req, res) => {
  try {
    // Verify authentication
    const clientUser = await verifyClientToken(req);
    if (!clientUser || !clientUser.uid) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get form
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

    // Get and delete client's draft
    const submissions = await getSubmissions();
    const draftIndex = submissions.findIndex(
      s => s.formId === form.id && 
           s.submittedBy === clientUser.uid &&
           s.isDraft === true
    );

    if (draftIndex === -1) {
      return res.status(404).json({ error: "No draft found" });
    }

    if (useFirestore) {
      try {
        await deleteDoc('submissions', submissions[draftIndex].id);
      } catch (e) {
        console.error('Failed deleting draft from Firestore:', e);
        return res.status(500).json({ error: 'Failed to delete draft' });
      }
    } else {
      submissions.splice(draftIndex, 1);
      await saveSubmissions(submissions);
    }

    res.json({ success: true, message: "Draft deleted successfully" });
  } catch (error) {
    console.error("Delete draft error:", error);
    res.status(500).json({ error: "Failed to delete draft" });
  }
});

module.exports = router;
