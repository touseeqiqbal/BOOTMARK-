const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
const { useFirestore, getCollectionRef, getDoc, setDoc, deleteDoc } = require(path.join(__dirname, "..", "utils", "db"));

const router = express.Router();

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
  const nameFields = ['name', 'customer name', 'client name', 'full name', 'customer', 'client'];
  const emailFields = ['email', 'e-mail', 'email address'];
  
  let customerName = null;
  let customerEmail = null;
  let customerPhone = null;
  
  // Find name field
  for (const field of form.fields || []) {
    const fieldLabel = (field.label || '').toLowerCase();
    const fieldType = (field.type || '').toLowerCase();
    const fieldId = field.id;
    
    // Check if this is a name field
    if (nameFields.some(nf => fieldLabel.includes(nf) || fieldId.toLowerCase().includes(nf))) {
      customerName = submissionData[fieldId] || null;
    }
    
    // Check if this is an email field
    if (fieldType === 'email' || emailFields.some(ef => fieldLabel.includes(ef) || fieldId.toLowerCase().includes(ef))) {
      customerEmail = submissionData[fieldId] || null;
    }
    
    // Check for phone
    if (fieldType === 'phone' || fieldLabel.includes('phone') || fieldLabel.includes('mobile')) {
      customerPhone = submissionData[fieldId] || null;
    }
  }
  
  return { customerName, customerEmail, customerPhone };
}

// Get all customers for a user
router.get("/", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const customers = await getCustomers();
    const userCustomers = customers.filter((c) => c.userId === userId);

    res.json(userCustomers);
  } catch (error) {
    console.error("Get customers error:", error);
    res.status(500).json({ error: "Failed to fetch customers" });
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

    const { name, email, phone, address, notes } = req.body;

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

    customer.name = name || customer.name;
    customer.email = email || customer.email;
    customer.phone = phone || customer.phone;
    customer.address = address || customer.address;
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

    if (useFirestore) {
      await deleteDoc('customers', req.params.id);
    } else {
      const customers = await getCustomers();
      const updatedCustomers = customers.filter((c) => c.id !== req.params.id);
      await saveCustomers(updatedCustomers);
    }

    res.json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error("Delete customer error:", error);
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

module.exports = { router, extractCustomerInfo, getCustomers, saveCustomers };

