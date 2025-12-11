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
    const tax = 0; // No automatic tax - user can add manually if needed
    const total = subtotal; // Total equals subtotal (no tax added automatically)

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
      invoice.tax = invoice.tax || 0; // Keep existing tax or set to 0 if not set
      invoice.total = invoice.subtotal + (invoice.tax || 0); // Total includes tax only if manually set
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

// Send invoice via email
router.post("/:id/send", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { to, includePaymentLink } = req.body; // Email recipient and payment link option

    if (!to || !to.includes('@')) {
      return res.status(400).json({ error: "Valid email address is required" });
    }

    // Get invoice first (needed for payment link creation)
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

    // Get customer
    const { getCustomers } = require("./customers");
    const customers = await getCustomers();
    const customer = customers.find((c) => c.id === invoice.customerId && c.userId === userId);

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    // Get user info and SMTP config
    let user;
    if (useFirestore) {
      user = await getDoc('users', userId);
    } else {
      const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
      const usersFile = getDataFilePath("users.json");
      const usersData = await fs.readFile(usersFile, "utf8");
      const users = JSON.parse(usersData);
      user = users.find((u) => (u.uid || u.id) === userId);
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const businessInfo = user.businessInfo || {};
    const companyLogo = businessInfo.companyLogo || null;
    // Prioritize companyName from businessInfo, then user.companyName, then construct from name
    const companyName = businessInfo.companyName 
      || user.companyName 
      || (businessInfo.firstName && businessInfo.lastName
        ? `${businessInfo.firstName} ${businessInfo.lastName}`
        : user.name || 'Your Company');
    const companyEmail = businessInfo.companyEmail || businessInfo.email || user.email || '';
    const companyPhone = businessInfo.companyPhone || businessInfo.phone || '';
    const companyAddress = businessInfo.address || businessInfo.companyAddress || '';

    // Create payment link if requested
    let paymentUrl = null;
    if (includePaymentLink) {
      try {
        const crypto = require("crypto");
        const paymentToken = crypto.randomBytes(32).toString('hex');
        const baseUrl = process.env.BASE_URL || req.protocol + '://' + req.get('host');
        paymentUrl = `${baseUrl}/pay/${paymentToken}`;
        
        // Store payment link
        const paymentLink = {
          invoiceId: invoice.id,
          token: paymentToken,
          userId,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          createdAt: new Date().toISOString(),
          used: false
        };
        
        if (useFirestore) {
          await setDoc('paymentLinks', paymentToken, paymentLink);
        } else {
          const paymentLinksFile = getDataFilePath("paymentLinks.json");
          let paymentLinks = {};
          try {
            const data = await fs.readFile(paymentLinksFile, "utf8");
            paymentLinks = JSON.parse(data);
          } catch (e) {
            // File doesn't exist, create it
          }
          paymentLinks[paymentToken] = paymentLink;
          const dir = path.dirname(paymentLinksFile);
          await fs.mkdir(dir, { recursive: true });
          await fs.writeFile(paymentLinksFile, JSON.stringify(paymentLinks, null, 2), 'utf8');
        }
      } catch (error) {
        console.error("Error creating payment link for email:", error);
        // Continue without payment link
      }
    }

    // Generate invoice HTML with logo
    const itemsHtml = invoice.items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.name || item.description || 'Item'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.price.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${(item.quantity * item.price).toFixed(2)}</td>
      </tr>
    `).join('');

    const logoHtml = companyLogo 
      ? `<img src="${companyLogo}" alt="Company Logo" style="max-width: 150px; max-height: 60px; margin-bottom: 20px;" />`
      : '';

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          table { width: 100%; border-collapse: collapse; background: white; border-radius: 6px; overflow: hidden; margin: 20px 0; }
          th { background: #4f46e5; color: white; padding: 12px; text-align: left; }
          td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
          .totals { text-align: right; margin-top: 20px; }
          .total-row { font-weight: bold; font-size: 18px; padding: 10px 0; border-top: 2px solid #4f46e5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">INVOICE</h1>
            ${logoHtml}
            <p style="margin: 10px 0 0 0; font-size: 14px; font-weight: bold;">${companyName}</p>
            ${companyEmail ? `<p style="margin: 5px 0 0 0; font-size: 12px;">${companyEmail}</p>` : ''}
            ${companyPhone ? `<p style="margin: 5px 0 0 0; font-size: 12px;">${companyPhone}</p>` : ''}
            ${companyAddress ? `<p style="margin: 5px 0 0 0; font-size: 12px;">${companyAddress}</p>` : ''}
          </div>
          <div class="content">
            <div style="margin-bottom: 20px;">
              <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}</p>
              ${invoice.dueDate ? `<p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>` : ''}
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
              <div>
                <h3>Bill To:</h3>
                <p>${customer.name}</p>
                ${customer.email ? `<p>${customer.email}</p>` : ''}
                ${customer.address ? `<p>${customer.address}</p>` : ''}
                ${customer.phone ? `<p>${customer.phone}</p>` : ''}
              </div>
              <div>
                <h3>From:</h3>
                <p><strong>${companyName}</strong></p>
                ${companyEmail ? `<p>${companyEmail}</p>` : ''}
                ${companyPhone ? `<p>${companyPhone}</p>` : ''}
                ${companyAddress ? `<p>${companyAddress}</p>` : ''}
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Price</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div class="totals">
              <p><strong>Subtotal:</strong> $${invoice.subtotal.toFixed(2)}</p>
              <p><strong>Tax:</strong> $${invoice.tax.toFixed(2)}</p>
              <p class="total-row">Total: $${invoice.total.toFixed(2)}</p>
            </div>

            ${invoice.notes ? `
              <div style="margin-top: 30px; padding: 15px; background: white; border-radius: 6px;">
                <h3>Notes:</h3>
                <p>${invoice.notes}</p>
              </div>
            ` : ''}
            
            ${paymentUrl ? `
              <div style="margin-top: 30px; padding: 20px; background: #eff6ff; border-radius: 8px; text-align: center; border: 2px solid #3b82f6;">
                <h3 style="margin: 0 0 15px 0; color: #1e40af;">Pay Online</h3>
                <p style="margin: 0 0 20px 0; color: #1e3a8a;">Click the button below to pay this invoice securely online:</p>
                <a href="${paymentUrl}" style="display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Pay Now</a>
                <p style="margin-top: 15px; font-size: 12px; color: #6b7280;">Or copy this link: ${paymentUrl}</p>
              </div>
            ` : ''}
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email
    const { sendEmail } = require(path.join(__dirname, "..", "utils", "emailService"));
    
    const result = await sendEmail({
      to: to,
      subject: `Invoice ${invoice.invoiceNumber}${companyName ? ` from ${companyName}` : ''}`,
      html: invoiceHtml,
      userSmtpConfig: user.smtpConfig || null // Use user SMTP if available, otherwise falls back to default SMTP
    });

    if (result.success) {
      // Update invoice status
      invoice.status = 'sent';
      invoice.updatedAt = new Date().toISOString();

      if (useFirestore) {
        await setDoc('invoices', invoice.id, invoice);
      } else {
        const invoices = await getInvoices();
        const index = invoices.findIndex((inv) => inv.id === req.params.id);
        if (index !== -1) {
          invoices[index] = invoice;
          await saveInvoices(invoices);
        }
      }

      res.json({ 
        success: true, 
        message: "Invoice sent successfully!",
        messageId: result.messageId
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: result.error || "Failed to send invoice email" 
      });
    }
  } catch (error) {
    console.error("Send invoice email error:", error);
    res.status(500).json({ 
      error: "Failed to send invoice email", 
      message: error.message 
    });
  }
});

async function appendInvoice(invoice) {
  if (useFirestore) {
    await setDoc('invoices', invoice.id, invoice)
    return
  }
  const invoices = await getInvoices()
  invoices.push(invoice)
  await saveInvoices(invoices)
}

router.appendInvoice = appendInvoice
router.getInvoices = getInvoices
router.saveInvoices = saveInvoices

module.exports = router
module.exports.appendInvoice = appendInvoice
module.exports.getInvoices = getInvoices
module.exports.saveInvoices = saveInvoices

