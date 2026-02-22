const express = require("express");
const invoiceService = require("../utils/InvoiceService");
const { getDoc, deleteDoc, setDoc, getCollectionRef } = require("../utils/db");
const { validateRequest, invoiceSchema } = require("../utils/validation");

const router = express.Router();

// ============================================
// INVOICE SETTINGS
// ============================================

// Get invoice settings
router.get('/settings', async (req, res) => {
  try {
    const businessId = req.user?.businessId || req.user?.uid || req.user?.id;
    if (!businessId) {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    let settings = await getDoc('invoiceSettings', businessId);

    // Return default settings if none exist
    if (!settings) {
      settings = {
        businessId,
        prefix: 'INV-',
        nextNumber: 1001,
        defaultTaxRate: 0,
        defaultTerms: '',
        defaultNotes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching invoice settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update invoice settings
router.put('/settings', async (req, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    const { prefix, nextNumber, defaultTaxRate, defaultTerms, defaultNotes } = req.body;

    const settings = {
      prefix: prefix || 'INV-',
      nextNumber: nextNumber || 1001,
      defaultTaxRate: defaultTaxRate || 0,
      defaultTerms: defaultTerms || '',
      defaultNotes: defaultNotes || '',
      businessId,
      updatedAt: new Date().toISOString()
    };

    // Preserve creation date
    const existing = await getDoc('invoiceSettings', businessId);
    if (existing && existing.createdAt) {
      settings.createdAt = existing.createdAt;
    } else {
      settings.createdAt = new Date().toISOString();
    }

    await setDoc('invoiceSettings', businessId, settings);
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating invoice settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// GET all invoices (PAGINATED)
router.get("/", async (req, res) => {
  try {
    const businessId = req.user?.businessId;

    if (!businessId) {
      return res.status(403).json({ error: 'Business ID required' });
    }

    // Build base query
    const baseQuery = getCollectionRef('invoices')
      .where('businessId', '==', businessId);

    // Fetch all invoices for business and filter/sort in memory to avoid missing index
    const snapshot = await baseQuery.get();
    let invoices = [];
    snapshot.forEach(doc => {
      invoices.push({ id: doc.id, ...doc.data() });
    });

    // Apply filters
    if (req.query.status) {
      invoices = invoices.filter(inv => inv.status === req.query.status);
    }
    if (req.query.customerId) {
      invoices = invoices.filter(inv => inv.customerId === req.query.customerId);
    }
    if (req.query.workOrderId) {
      invoices = invoices.filter(inv => inv.workOrderId === req.query.workOrderId);
    }

    // Apply sorting
    const sortField = req.query.sort || 'createdAt';
    const sortOrder = req.query.order === 'asc' ? 1 : -1;

    invoices.sort((a, b) => {
      const valA = (a[sortField] || '').toString().toLowerCase();
      const valB = (b[sortField] || '').toString().toLowerCase();
      if (valA < valB) return -1 * sortOrder;
      if (valA > valB) return 1 * sortOrder;
      return 0;
    });

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const result = {
      data: invoices.slice(startIndex, endIndex),
      total: invoices.length,
      page,
      limit,
      pages: Math.ceil(invoices.length / limit)
    };

    res.json(result);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(403).json({ error: "Access denied" });

    const invoice = await invoiceService.getInvoiceById(req.params.id);
    if (!invoice || invoice.businessId !== businessId) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: "Failed" });
  }
});

router.post("/", validateRequest(invoiceSchema), async (req, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(403).json({ error: "Access denied" });

    const invoice = await invoiceService.createInvoice(businessId, req.body);
    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", validateRequest(invoiceSchema), async (req, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(403).json({ error: "Access denied" });

    const updated = await invoiceService.updateInvoice(req.params.id, businessId, req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const businessId = req.user?.businessId;

    if (!businessId) {
      return res.status(403).json({ error: 'Business ID required' });
    }

    // CRITICAL: Verify ownership before deletion to prevent cross-tenant data access
    const invoice = await getDoc('invoices', req.params.id);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.businessId !== businessId) {
      console.warn(`[Security] Unauthorized deletion attempt: User ${req.user?.id} tried to delete invoice ${req.params.id} belonging to business ${invoice.businessId}`);
      return res.status(403).json({ error: 'Access denied' });
    }

    await deleteDoc('invoices', req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: "Failed to delete invoice" });
  }
});

router.post("/:id/send", async (req, res) => {
  try {
    const businessId = req.user?.businessId || req.user?.uid;
    const result = await invoiceService.sendInvoiceEmail(req.params.id, businessId, req.body);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
