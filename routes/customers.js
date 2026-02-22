const express = require("express");
const customerService = require("../utils/CustomerService");
const router = express.Router();
const { getDoc, setDoc } = require("../utils/db");
const { validateRequest, customerSchema } = require("../utils/validation");
const { sendEmail } = require("../utils/emailService");

async function sendClientInvitation(customer, token) {
  const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invite?token=${token}`;
  const subject = `Invitation to Client Portal`;
  const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Welcome, ${customer.name}!</h2>
            <p>You have been invited to access the client portal.</p>
            <p>Please click the button below to accept the invitation and set up your account:</p>
            <a href="${link}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">
                Accept Invitation
            </a>
            <p style="margin-top: 20px; color: #666; font-size: 12px;">If the button doesn't work, copy and paste this link: ${link}</p>
        </div>
    `;

  // In dev mode, log the link for easier testing
  if (process.env.NODE_ENV !== 'production') {
    console.log('--- CLIENT INVITATION LINK ---');
    console.log(link);
    console.log('------------------------------');
  }

  try {
    await sendEmail({
      to: customer.email,
      subject,
      html
    });
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    // Don't throw, just log. The token is set in DB anyway.
  }
}

// ============================================
// CUSTOMER SETTINGS (CLIENT SETTINGS)
// ============================================

// Get customer settings
router.get('/settings', async (req, res) => {
  try {
    const businessId = req.user?.businessId || req.user?.uid || req.user?.id;
    if (!businessId) {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    let settings = await getDoc('customerSettings', businessId);

    // Return default settings if none exist
    if (!settings) {
      settings = {
        businessId,
        nextNumber: 1001, // If auto-numbering clients matters
        defaultCity: '',
        defaultState: '',
        defaultZip: '',
        defaultCountry: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching customer settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update customer settings
router.put('/settings', async (req, res) => {
  try {
    const businessId = req.user?.businessId || req.user?.uid || req.user?.id;
    if (!businessId) {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    const settings = {
      ...req.body,
      businessId,
      updatedAt: new Date().toISOString()
    };

    // Ensure createdAt exists
    if (!settings.createdAt) {
      settings.createdAt = new Date().toISOString();
    }

    await setDoc('customerSettings', businessId, settings);
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating customer settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});


// GET all customers (PAGINATED)
router.get("/", async (req, res) => {
  try {
    const businessId = req.user?.businessId || req.user?.uid;

    if (!businessId) {
      return res.status(403).json({ error: 'Business ID required' });
    }

    // Reverted to fetch all customers to fix frontend crash and restore client-side search
    // Pagination broke the frontend which expects an array and filters client-side
    const customers = await customerService.getCustomersByBusinessId(businessId);

    // Sort by name for consistency
    customers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

router.post("/", validateRequest(customerSchema), async (req, res) => {
  try {
    const businessId = req.user?.businessId || req.user?.uid;
    const customer = await customerService.createCustomer(businessId, req.body);
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const businessId = req.user?.businessId || req.user?.uid;
    const customer = await customerService.getCustomerById(req.params.id);
    if (!customer || customer.businessId !== businessId) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: "Failed" });
  }
});

router.put("/:id", validateRequest(customerSchema), async (req, res) => {
  try {
    const businessId = req.user?.businessId || req.user?.uid;
    const updated = await customerService.updateCustomer(req.params.id, businessId, req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const businessId = req.user?.businessId || req.user?.uid;
    await customerService.deleteCustomer(req.params.id, businessId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed" });
  }
});

module.exports = {
  router,
  extractCustomerInfo: (f, s) => customerService.extractCustomerInfo(f, s),
  getCustomers: (uid) => customerService.getCustomersByUserId(uid),
  saveCustomers: async (customers) => {
    const { setDoc } = require('../utils/db');
    for (const c of customers) await setDoc('customers', c.id, c);
  },
  sendClientInvitation
};
