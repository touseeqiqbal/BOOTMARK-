const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
const { useFirestore, getCollectionRef, getDoc, setDoc, deleteDoc } = require(path.join(__dirname, "..", "utils", "db"));

const router = express.Router();

// Get invoices file path
function getInvoicesFilePath() {
  return getDataFilePath("invoices.json");
}

// Get all invoices
async function getInvoices() {
  if (useFirestore) {
    try {
      const snap = await getCollectionRef('invoices').get()
      const items = []
      snap.forEach(d => items.push({ id: d.id, ...d.data() }))
      return items
    } catch (e) {
      console.error('Error fetching invoices from Firestore:', e)
      return []
    }
  }
  const INVOICES_FILE = getInvoicesFilePath();
  try {
    const data = await fs.readFile(INVOICES_FILE, "utf8");
    const invoices = JSON.parse(data);
    return Array.isArray(invoices) ? invoices : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    return [];
  }
}

// Save invoices
async function saveInvoices(invoices) {
  if (useFirestore) {
    try {
      for (const inv of invoices) {
        const id = inv.id
        if (!id) continue
        await setDoc('invoices', id, inv)
      }
      return
    } catch (e) {
      console.error('Error saving invoices to Firestore:', e)
      throw e
    }
  }
  const INVOICES_FILE = getInvoicesFilePath();
  const dir = path.dirname(INVOICES_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(INVOICES_FILE, JSON.stringify(invoices, null, 2), 'utf8');
}

// Get all invoices for a user
router.get("/", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const invoices = await getInvoices();
    const userInvoices = invoices.filter((inv) => inv.userId === userId);

    res.json(userInvoices);
  } catch (error) {
    console.error("Get invoices error:", error);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

// Get invoice by ID
router.get("/:id", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    let invoice;
    if (useFirestore) {
      invoice = await getDoc('invoices', req.params.id);
    } else {
      const invoices = await getInvoices();
      invoice = invoices.find((inv) => inv.id === req.params.id);
    }

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    if (invoice.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(invoice);
  } catch (error) {
    console.error("Get invoice error:", error);
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
});

// Create invoice
router.post("/", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { customerId, items, notes, dueDate, invoiceNumber } = req.body;

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Customer ID and items are required" });
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const tax = subtotal * 0.1; // 10% tax (configurable)
    const total = subtotal + tax;

    const invoice = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      userId: userId,
      customerId: customerId,
      invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
      items: items,
      subtotal: subtotal,
      tax: tax,
      total: total,
      notes: notes || null,
      dueDate: dueDate || null,
      status: 'draft', // draft, sent, paid, overdue
      quickbooksId: null,
      quickbooksSyncAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (useFirestore) {
      await setDoc('invoices', invoice.id, invoice);
    } else {
      const invoices = await getInvoices();
      invoices.push(invoice);
      await saveInvoices(invoices);
    }

    res.status(201).json(invoice);
  } catch (error) {
    console.error("Create invoice error:", error);
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

// Update invoice
router.put("/:id", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { items, notes, dueDate, status, invoiceNumber } = req.body;

    let invoice;
    if (useFirestore) {
      invoice = await getDoc('invoices', req.params.id);
    } else {
      const invoices = await getInvoices();
      invoice = invoices.find((inv) => inv.id === req.params.id);
    }

    if (!invoice || invoice.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (items) {
      invoice.items = items;
      invoice.subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      invoice.tax = invoice.subtotal * 0.1;
      invoice.total = invoice.subtotal + invoice.tax;
    }

    if (notes !== undefined) invoice.notes = notes;
    if (dueDate !== undefined) invoice.dueDate = dueDate;
    if (status !== undefined) invoice.status = status;
    if (invoiceNumber !== undefined) invoice.invoiceNumber = invoiceNumber;
    invoice.updatedAt = new Date().toISOString();

    if (useFirestore) {
      await setDoc('invoices', req.params.id, invoice);
    } else {
      const invoices = await getInvoices();
      const index = invoices.findIndex((inv) => inv.id === req.params.id);
      if (index !== -1) {
        invoices[index] = invoice;
        await saveInvoices(invoices);
      }
    }

    res.json(invoice);
  } catch (error) {
    console.error("Update invoice error:", error);
    res.status(500).json({ error: "Failed to update invoice" });
  }
});

// Delete invoice
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    let invoice;
    if (useFirestore) {
      invoice = await getDoc('invoices', req.params.id);
    } else {
      const invoices = await getInvoices();
      invoice = invoices.find((inv) => inv.id === req.params.id);
    }

    if (!invoice || invoice.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (useFirestore) {
      await deleteDoc('invoices', req.params.id);
    } else {
      const invoices = await getInvoices();
      const updatedInvoices = invoices.filter((inv) => inv.id !== req.params.id);
      await saveInvoices(updatedInvoices);
    }

    res.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("Delete invoice error:", error);
    res.status(500).json({ error: "Failed to delete invoice" });
  }
});

module.exports = router;

