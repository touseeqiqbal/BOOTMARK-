const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
const { useFirestore, getCollectionRef, getDoc, setDoc, deleteDoc } = require(path.join(__dirname, "..", "utils", "db"));

const router = express.Router();
const { getProperties, saveProperties } = require("./properties");


// Get customers file path
function getCustomersFilePath() {
  return getDataFilePath("customers.json");
}

// Get all customers
async function getCustomers() {
  if (useFirestore) {
    try {
      const snap = await getCollectionRef('customers').get()
      const items = []
      snap.forEach(d => items.push({ id: d.id, ...d.data() }))
      return items
    } catch (e) {
      console.error('Error fetching customers from Firestore:', e)
      return []
    }
  }
  const CUSTOMERS_FILE = getCustomersFilePath();
  try {
    const data = await fs.readFile(CUSTOMERS_FILE, "utf8");
    const customers = JSON.parse(data);
    return Array.isArray(customers) ? customers : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    return [];
  }
}

// Save customers
async function saveCustomers(customers) {
  if (useFirestore) {
    try {
      for (const c of customers) {
        const id = c.id
        if (!id) continue
        await setDoc('customers', id, c)
      }
      return
    } catch (e) {
      console.error('Error saving customers to Firestore:', e)
      throw e
    }
  }
  const CUSTOMERS_FILE = getCustomersFilePath();
  const dir = path.dirname(CUSTOMERS_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(CUSTOMERS_FILE, JSON.stringify(customers, null, 2), 'utf8');
}

// Extract customer info from form submission
function extractCustomerInfo(form, submissionData) {
  // Name fields must contain "name" specifically (not just "customer" or "client")
  const nameKeywords = ['name', 'full name'];
  const emailFields = ['email', 'e-mail', 'email address'];
  // Exclude these from being considered as name fields
  const excludeFromName = ['number', 'amount', 'price', 'total', 'invoice', 'order', 'quantity', 'hours', 'time', 'phone', 'mobile', 'contact'];

  let customerName = null;
  let customerEmail = null;
  let customerPhone = null;
  let customerAddress = null;
  let customerCity = null;
  let customerState = null;
  let customerZip = null;

  // Helper function to check if value looks like a phone number
  const looksLikePhone = (value) => {
    if (!value) return false;
    const strValue = String(value).trim();
    if (!strValue) return false;

    // Remove common phone number characters
    const cleaned = strValue.replace(/[\s\-\(\)\+\.]/g, '');

    // Check if it's all digits and has a reasonable phone length (7-15 digits)
    const isAllDigits = /^\d+$/.test(cleaned);
    const hasPhoneLength = cleaned.length >= 7 && cleaned.length <= 15;

    // Also check if it starts with common phone prefixes (0, +, etc.) or country codes
    const startsWithPhonePrefix = /^[\d\+0]/.test(strValue);

    const isPhone = isAllDigits && hasPhoneLength && (startsWithPhonePrefix || cleaned.length >= 10);

    if (isPhone) {
      console.log('[extractCustomerInfo] Value looks like phone:', strValue, 'cleaned:', cleaned, 'length:', cleaned.length);
    }

    return isPhone;
  };


  // Find address fields
  for (const field of form.fields || []) {
    const fieldLabel = (field.label || '').toLowerCase();
    const fieldId = field.id;
    const fieldValue = submissionData[fieldId];

    if (!fieldValue || typeof fieldValue !== 'string' || !fieldValue.trim()) continue;

    if (fieldLabel.includes('address') || fieldLabel.includes('location') || fieldLabel.includes('property')) {
      if (!customerAddress) customerAddress = fieldValue.trim();
    } else if (fieldLabel === 'city' || fieldLabel.includes('city')) {
      if (!customerCity) customerCity = fieldValue.trim();
    } else if (fieldLabel === 'state' || fieldLabel.includes('state') || fieldLabel === 'province') {
      if (!customerState) customerState = fieldValue.trim();
    } else if (fieldLabel.includes('zip') || fieldLabel.includes('postal') || fieldLabel.includes('postcode')) {
      if (!customerZip) customerZip = fieldValue.trim();
    }
  }

  if (customerAddress) {
    console.log('[extractCustomerInfo] Extracted address components:', { customerAddress, customerCity, customerState, customerZip });
  }

  // First, identify and extract phone field to exclude it from name matching

  let phoneFieldIds = new Set();
  for (const field of form.fields || []) {
    const fieldLabel = (field.label || '').toLowerCase();
    const fieldType = (field.type || '').toLowerCase();
    const fieldValue = submissionData[field.id];

    // Identify phone fields
    if (fieldType === 'phone' ||
      fieldLabel.includes('phone') ||
      fieldLabel.includes('mobile') ||
      fieldLabel.includes('contact number') ||
      (fieldValue && looksLikePhone(fieldValue))) {
      phoneFieldIds.add(field.id);
      if (fieldValue) {
        customerPhone = typeof fieldValue === 'string' ? fieldValue.trim() : String(fieldValue || '').trim() || null;
      }
    }
  }

  // First pass: prioritize full-name fields
  for (const field of form.fields || []) {
    // Skip if this is a phone field
    if (phoneFieldIds.has(field.id)) continue;

    const fieldType = (field.type || '').toLowerCase();
    const fieldValue = submissionData[field.id];

    if (fieldType === 'full-name' && fieldValue && typeof fieldValue === 'object') {
      const firstName = fieldValue.firstName || '';
      const lastName = fieldValue.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      // Only use if it doesn't look like a phone number
      if (fullName && !looksLikePhone(fullName)) {
        customerName = fullName || null;
        console.log('[extractCustomerInfo] Found name from full-name field:', field.label, '->', customerName);
        break; // Full-name takes priority, stop searching
      }
    }
  }

  // Second pass: find text-based name fields (only if full-name wasn't found)
  if (!customerName) {
    for (const field of form.fields || []) {
      // Skip if this is a phone field
      if (phoneFieldIds.has(field.id)) {
        console.log('[extractCustomerInfo] Skipping phone field for name:', field.label, field.type);
        continue;
      }

      const fieldLabel = (field.label || '').toLowerCase();
      const fieldType = (field.type || '').toLowerCase();
      const fieldId = field.id;
      const fieldValue = submissionData[fieldId];

      // Skip number fields and fields that shouldn't be names
      if (fieldType === 'number' || excludeFromName.some(ex => fieldLabel.includes(ex) || fieldId.toLowerCase().includes(ex))) {
        continue;
      }

      // Only consider text-based fields for names
      const isTextField = ['text', 'short-text', 'long-text', 'textarea'].includes(fieldType);

      // Check if this is a name field - must contain "name" in the label
      // AND the label should contain "customer", "client", or be just "name"
      const hasNameKeyword = nameKeywords.some(nk => fieldLabel.includes(nk));
      const hasCustomerContext = fieldLabel.includes('customer') || fieldLabel.includes('client') || fieldLabel === 'name';

      if (isTextField && hasNameKeyword && hasCustomerContext) {
        if (fieldValue && typeof fieldValue === 'string') {
          const trimmedValue = fieldValue.trim();
          // Don't use if it looks like a phone number
          if (looksLikePhone(trimmedValue)) {
            console.log('[extractCustomerInfo] Rejected value that looks like phone number:', trimmedValue, 'from field:', field.label);
            continue;
          }
          if (trimmedValue) {
            customerName = trimmedValue || null;
            console.log('[extractCustomerInfo] Found name from text field:', field.label, '->', customerName);
            break; // Found a name, stop searching
          }
        }
      }
    }
  }

  // Find email field
  for (const field of form.fields || []) {
    const fieldLabel = (field.label || '').toLowerCase();
    const fieldType = (field.type || '').toLowerCase();
    const fieldId = field.id;
    const fieldValue = submissionData[fieldId];

    if (fieldType === 'email' || (emailFields.some(ef => fieldLabel.includes(ef) || fieldId.toLowerCase().includes(ef)) && fieldType !== 'number')) {
      if (fieldValue && typeof fieldValue === 'string') {
        customerEmail = fieldValue.trim() || null;
        break;
      }
    }
  }

  // Final validation: if customerName looks like a phone number, set it to null
  if (customerName && looksLikePhone(customerName)) {
    console.log('[extractCustomerInfo] WARNING: customerName looks like phone number, rejecting:', customerName);
    customerName = null;
  }

  console.log('[extractCustomerInfo] Final extracted customer info:', { customerName, customerEmail, customerPhone, customerAddress, customerCity, customerState, customerZip });

  return { customerName, customerEmail, customerPhone, customerAddress, customerCity, customerState, customerZip };
}

// Get all customers for the authenticated user
router.get("/", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Try cache first
    const { getCache, setCache } = require(path.join(__dirname, "..", "utils", "cache"));
    const cacheKey = `customers:${userId}`;
    let userCustomers = getCache(cacheKey);

    if (!userCustomers) {
      // Cache miss - fetch from database
      const customers = await getCustomers();
      userCustomers = customers.filter((c) => c.userId === userId);

      // Cache for 5 minutes
      setCache(cacheKey, userCustomers, 300);
    }

    res.json(userCustomers);
  } catch (error) {
    console.error("Get customers error:", error);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// Create customer
router.post("/", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Generate invitation token
    const crypto = require('crypto');
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const newCustomer = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: userId,
      businessId: req.user?.businessId || userId, // Business tenant ID for multi-tenancy
      submissionCount: 0,
      // Invitation fields
      invitationToken: invitationToken,
      invitationExpiry: invitationExpiry.toISOString(),
      invitationSent: false, // Will be set to true after email is sent
      invitationSentAt: null,
      accountCreated: false,
      accountCreatedAt: null
    };

    if (useFirestore) {
      await setDoc('customers', newCustomer.id, newCustomer);
    } else {
      const customers = await getCustomers();
      customers.push(newCustomer);
      await saveCustomers(customers);
    }

    // Automatically create a property record if an address is provided
    if (newCustomer.address && newCustomer.address.trim()) {
      try {
        const businessId = req.user?.businessId;
        const newProperty = {
          id: `prop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          customerId: newCustomer.id,
          address: newCustomer.address,
          city: newCustomer.city || '',
          state: newCustomer.state || '',
          zip: newCustomer.zip || '',
          businessId: businessId || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: userId,
          isDefault: true
        };

        if (useFirestore) {
          await setDoc('properties', newProperty.id, newProperty);
        } else {
          const properties = await getProperties(businessId);
          properties.push(newProperty);
          await saveProperties(properties);
        }
        console.log(`[Customers] Automatically created property for new customer ${newCustomer.id}`);
      } catch (propError) {
        console.error("[Customers] Failed to auto-create property:", propError);
        // We don't fail the customer creation if property creation fails, 
        // but we log it.
      }
    }

    // Send invitation email if customer has email
    if (newCustomer.email) {
      try {
        await sendClientInvitation(newCustomer, req);

        // Update customer to mark invitation as sent
        newCustomer.invitationSent = true;
        newCustomer.invitationSentAt = new Date().toISOString();

        if (useFirestore) {
          await setDoc('customers', newCustomer.id, newCustomer);
        } else {
          const customers = await getCustomers();
          const index = customers.findIndex(c => c.id === newCustomer.id);
          if (index !== -1) {
            customers[index] = newCustomer;
            await saveCustomers(customers);
          }
        }

        console.log(`[Customers] Invitation email sent to ${newCustomer.email}`);
      } catch (emailError) {
        console.error("[Customers] Failed to send invitation email:", emailError);
        // Don't fail customer creation if email fails
      }
    }

    // Invalidate cache
    const { invalidateCache } = require(path.join(__dirname, "..", "utils", "cache"));
    invalidateCache(`customers:${userId}`);

    res.status(201).json(newCustomer);
  } catch (error) {
    console.error("Create customer error:", error);
    res.status(500).json({ error: "Failed to create customer" });
  }
});

// Get customer by ID
router.get("/:id", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    let customer;
    if (useFirestore) {
      customer = await getDoc('customers', req.params.id);
    } else {
      const customers = await getCustomers();
      customer = customers.find((c) => c.id === req.params.id);
    }

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    if (customer.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(customer);
  } catch (error) {
    console.error("Get customer error:", error);
    res.status(500).json({ error: "Failed to fetch customer" });
  }
});

// Get customer submissions
router.get("/:id/submissions", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    let customer;
    if (useFirestore) {
      customer = await getDoc('customers', req.params.id);
    } else {
      const customers = await getCustomers();
      customer = customers.find((c) => c.id === req.params.id);
    }

    if (!customer || customer.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get submissions for this customer
    const { getCollectionRef } = require(path.join(__dirname, "..", "utils", "db"));
    const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));

    let submissions = [];
    if (useFirestore) {
      const snap = await getCollectionRef('submissions').where('customerId', '==', req.params.id).get()
      snap.forEach(d => submissions.push({ id: d.id, ...d.data() }))
    } else {
      const submissionsPath = getDataFilePath("submissions.json");
      try {
        const submissionsData = JSON.parse(await fs.readFile(submissionsPath, "utf8"));
        submissions = submissionsData.filter((s) => s.customerId === req.params.id);
      } catch (e) {
        console.error('Error reading submissions:', e);
      }
    }

    res.json(submissions);
  } catch (error) {
    console.error("Get customer submissions error:", error);
    res.status(500).json({ error: "Failed to fetch customer submissions" });
  }
});

// Update customer
router.put("/:id", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, email, phone, address, city, state, zip, notes } = req.body;

    let customer;
    if (useFirestore) {
      customer = await getDoc('customers', req.params.id);
    } else {
      const customers = await getCustomers();
      customer = customers.find((c) => c.id === req.params.id);
    }

    if (!customer || customer.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const oldAddress = customer.address;
    const oldCity = customer.city;

    customer.name = name || customer.name;
    customer.email = email || customer.email;
    customer.phone = phone || customer.phone;
    customer.address = address || customer.address;
    customer.city = city || customer.city;
    customer.state = state || customer.state;
    customer.zip = zip || customer.zip;
    customer.notes = notes || customer.notes;
    customer.updatedAt = new Date().toISOString();

    if (useFirestore) {
      await setDoc('customers', req.params.id, customer);
    } else {
      const customers = await getCustomers();
      const index = customers.findIndex((c) => c.id === req.params.id);
      if (index !== -1) {
        customers[index] = customer;
        await saveCustomers(customers);
      }
    }

    // Sync with properties if address changed
    if ((address && address !== oldAddress) || (city && city !== oldCity)) {
      try {
        const businessId = req.user?.businessId;
        const properties = await getProperties(businessId);

        // Find if there's already a property for this customer and address
        let existingProp = properties.find(p => p.customerId === req.params.id && p.address === address);

        if (!existingProp) {
          // If not found, look for ANY default property for this customer and update it
          existingProp = properties.find(p => p.customerId === req.params.id && p.isDefault);
        }

        if (existingProp) {
          existingProp.address = address;
          existingProp.city = city || existingProp.city;
          existingProp.state = state || existingProp.state;
          existingProp.zip = zip || existingProp.zip;
          existingProp.updatedAt = new Date().toISOString();

          if (useFirestore) {
            await setDoc('properties', existingProp.id, existingProp);
          } else {
            await saveProperties(properties);
          }
          console.log(`[Customers] Updated existing property ${existingProp.id} for customer ${req.params.id}`);
        } else if (address) {
          // Create new property if none exists and address is provided
          const newProperty = {
            id: `prop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            customerId: req.params.id,
            address: address,
            city: city || '',
            state: state || '',
            zip: zip || '',
            businessId: businessId || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: userId,
            isDefault: true
          };

          if (useFirestore) {
            await setDoc('properties', newProperty.id, newProperty);
          } else {
            properties.push(newProperty);
            await saveProperties(properties);
          }
          console.log(`[Customers] Created new default property for updated customer ${req.params.id}`);
        }
      } catch (propError) {
        console.error("[Customers] Failed to sync property on update:", propError);
      }
    }

    res.json(customer);
  } catch (error) {
    console.error("Update customer error:", error);
    res.status(500).json({ error: "Failed to update customer" });
  }
});

// Delete customer
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    const businessId = req.user?.businessId;

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    let customer;
    if (useFirestore) {
      customer = await getDoc('customers', req.params.id);
    } else {
      const customers = await getCustomers();
      customer = customers.find((c) => c.id === req.params.id);
    }

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    // Allow deletion if user owns the customer OR if they're in the same business
    const hasAccess = customer.userId === userId ||
      (businessId && customer.businessId === businessId);

    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (useFirestore) {
      await deleteDoc('customers', req.params.id);
    } else {
      const customers = await getCustomers();
      const updatedCustomers = customers.filter((c) => c.id !== req.params.id);
      await saveCustomers(updatedCustomers);
    }

    // Invalidate cache
    const { invalidateCache } = require(path.join(__dirname, "..", "utils", "cache"));
    invalidateCache(`customers:${userId}`);

    res.json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error("Delete customer error:", error);
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

// Merge customers - merge source customer into target customer
router.post("/merge", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { sourceCustomerId, targetCustomerId } = req.body;

    if (!sourceCustomerId || !targetCustomerId || sourceCustomerId === targetCustomerId) {
      return res.status(400).json({ error: "Invalid customer IDs for merge" });
    }

    const customers = await getCustomers();
    const sourceCustomer = customers.find((c) => c.id === sourceCustomerId && c.userId === userId);
    const targetCustomer = customers.find((c) => c.id === targetCustomerId && c.userId === userId);

    if (!sourceCustomer || !targetCustomer) {
      return res.status(404).json({ error: "One or both customers not found" });
    }

    // Merge customer data - prefer target's data, but use source's if target is missing
    targetCustomer.name = targetCustomer.name || sourceCustomer.name;
    targetCustomer.email = targetCustomer.email || sourceCustomer.email;
    targetCustomer.phone = targetCustomer.phone || sourceCustomer.phone;
    targetCustomer.address = targetCustomer.address || sourceCustomer.address;
    // Merge notes
    if (sourceCustomer.notes && targetCustomer.notes) {
      targetCustomer.notes = `${targetCustomer.notes}\n\n--- Merged from ${sourceCustomer.name} ---\n${sourceCustomer.notes}`;
    } else {
      targetCustomer.notes = targetCustomer.notes || sourceCustomer.notes;
    }

    // Combine submission counts
    targetCustomer.submissionCount = (targetCustomer.submissionCount || 0) + (sourceCustomer.submissionCount || 0);

    // Use earliest created date
    if (sourceCustomer.createdAt && targetCustomer.createdAt) {
      if (new Date(sourceCustomer.createdAt) < new Date(targetCustomer.createdAt)) {
        targetCustomer.createdAt = sourceCustomer.createdAt;
      }
    }

    // Use most recent submission date
    if (sourceCustomer.lastSubmissionAt && targetCustomer.lastSubmissionAt) {
      if (new Date(sourceCustomer.lastSubmissionAt) > new Date(targetCustomer.lastSubmissionAt)) {
        targetCustomer.lastSubmissionAt = sourceCustomer.lastSubmissionAt;
      }
    } else {
      targetCustomer.lastSubmissionAt = targetCustomer.lastSubmissionAt || sourceCustomer.lastSubmissionAt;
    }

    targetCustomer.updatedAt = new Date().toISOString();

    // Update all submissions to point to target customer
    const { getCollectionRef } = require(path.join(__dirname, "..", "utils", "db"));
    const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));

    let submissions = [];
    if (useFirestore) {
      const snap = await getCollectionRef('submissions').where('customerId', '==', sourceCustomerId).get();
      snap.forEach(d => submissions.push({ id: d.id, ...d.data() }));
    } else {
      const submissionsPath = getDataFilePath("submissions.json");
      try {
        const submissionsData = JSON.parse(await fs.readFile(submissionsPath, "utf8"));
        submissions = submissionsData.filter((s) => s.customerId === sourceCustomerId);
      } catch (e) {
        console.error('Error reading submissions:', e);
      }
    }

    // Update submissions
    for (const submission of submissions) {
      submission.customerId = targetCustomerId;
      if (useFirestore) {
        await setDoc('submissions', submission.id, submission);
      } else {
        const submissionsPath = getDataFilePath("submissions.json");
        let allSubmissions = [];
        try {
          allSubmissions = JSON.parse(await fs.readFile(submissionsPath, "utf8"));
        } catch (e) {
          console.error('Error reading submissions:', e);
          allSubmissions = [];
        }
        const index = allSubmissions.findIndex((s) => s.id === submission.id);
        if (index !== -1) {
          allSubmissions[index] = submission;
        } else {
          allSubmissions.push(submission);
        }
        await fs.writeFile(submissionsPath, JSON.stringify(allSubmissions, null, 2), 'utf8');
      }
    }

    // Update all invoices to point to target customer
    let invoices = [];
    if (useFirestore) {
      const invoicesSnap = await getCollectionRef('invoices').where('customerId', '==', sourceCustomerId).get();
      invoicesSnap.forEach(d => invoices.push({ id: d.id, ...d.data() }));
    } else {
      const invoicesPath = getDataFilePath("invoices.json");
      try {
        const allInvoices = JSON.parse(await fs.readFile(invoicesPath, "utf8"));
        invoices = allInvoices.filter((inv) => inv.customerId === sourceCustomerId);
      } catch (e) {
        console.error('Error reading invoices:', e);
        invoices = [];
      }
    }

    // Update invoices
    for (const invoice of invoices) {
      invoice.customerId = targetCustomerId;
      invoice.customerName = targetCustomer.name || invoice.customerName;
      invoice.customerEmail = targetCustomer.email || invoice.customerEmail;
      invoice.customerPhone = targetCustomer.phone || invoice.customerPhone;
      invoice.updatedAt = new Date().toISOString();

      if (useFirestore) {
        await setDoc('invoices', invoice.id, invoice);
      } else {
        const invoicesPath = getDataFilePath("invoices.json");
        let allInvoices = [];
        try {
          allInvoices = JSON.parse(await fs.readFile(invoicesPath, "utf8"));
        } catch (e) {
          console.error('Error reading invoices:', e);
          allInvoices = [];
        }
        const index = allInvoices.findIndex((inv) => inv.id === invoice.id);
        if (index !== -1) {
          allInvoices[index] = invoice;
        } else {
          allInvoices.push(invoice);
        }
        await fs.writeFile(invoicesPath, JSON.stringify(allInvoices, null, 2), 'utf8');
      }
    }

    // Delete source customer
    if (useFirestore) {
      await deleteDoc('customers', sourceCustomerId);
    } else {
      const updatedCustomers = customers.filter((c) => c.id !== sourceCustomerId);
      const targetIndex = updatedCustomers.findIndex((c) => c.id === targetCustomerId);
      if (targetIndex !== -1) {
        updatedCustomers[targetIndex] = targetCustomer;
      }
      await saveCustomers(updatedCustomers);
    }

    console.log(`[Customers] Merged customer ${sourceCustomerId} into ${targetCustomerId}`);
    console.log(`[Customers] Updated ${submissions.length} submissions and ${invoices.length} invoices`);

    res.json({
      success: true,
      message: `Successfully merged customers. Updated ${submissions.length} submissions and ${invoices.length} invoices.`,
      targetCustomer,
      updatedSubmissions: submissions.length,
      updatedInvoices: invoices.length
    });
  } catch (error) {
    console.error("Merge customers error:", error);
    res.status(500).json({ error: "Failed to merge customers", details: error.message });
  }
});

// Send client invitation email
async function sendClientInvitation(customer, token) {
  try {
    const { sendEmail } = require(path.join(__dirname, '..', 'utils', 'emailService'));


    const invitationLink = `${process.env.BASE_URL || 'http://localhost:3000'}/client/set-password?token=${token}`;

    const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to Our Client Portal!</h1>
                    </div>
                    <div class="content">
                        <p>Hello ${customer.name},</p>
                        <p>You've been invited to access your client portal where you can:</p>
                        <ul>
                            <li>View and pay invoices</li>
                            <li>Track service requests</li>
                            <li>Communicate with us directly</li>
                            <li>Manage your account</li>
                        </ul>
                        <p>Click the button below to set your password and get started:</p>
                        <p style="text-align: center;">
                            <a href="${invitationLink}" class="button">Set Your Password</a>
                        </p>
                        <p style="font-size: 12px; color: #666;">
                            Or copy this link: ${invitationLink}
                        </p>
                        <p style="font-size: 12px; color: #666;">
                            This link will expire in 7 days.
                        </p>
                    </div>
                    <div class="footer">
                        <p>If you didn't expect this email, please ignore it.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

    // Debug: Log customer data to see what we're working with
    console.log('[Email] Customer data:', {
      email: customer.email,
      businessId: customer.businessId,
      userId: customer.userId,
      id: customer.id
    });

    // Use emailService which is already working
    const result = await sendEmail({
      to: customer.email,
      subject: 'Welcome to Your Client Portal',
      html: emailHtml
    });

    if (result.success) {
      console.log(`[Email] ✅ Invitation sent successfully to ${customer.email}`);
    } else {
      throw new Error(result.error || 'Failed to send email');
    }
  } catch (error) {
    console.error('[Email] ❌ Failed to send invitation:', error);
    throw error;
  }
}

module.exports = { router, extractCustomerInfo, getCustomers, saveCustomers, sendClientInvitation };
