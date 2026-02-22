const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { useFirestore, getCollectionRef, setDoc, getDoc } = require("../utils/db");
const { authRequired } = require("../middleware/auth");
const AuthorizeNet = require("authorizenet").APIContracts;
const Constants = require("authorizenet").Constants;

const router = express.Router();

// Helper to get payment links
async function getPaymentLinks() {
  try {
    const snap = await getCollectionRef('paymentLinks').get();
    const items = {};
    snap.forEach(d => {
      items[d.id] = { id: d.id, ...d.data() };
    });
    return items;
  } catch (e) {
    console.error('Error fetching payment links from Firestore:', e);
    return {};
  }
}

// Get Authorize.net API credentials from user settings
function getAuthorizeNetConfig(userId) {
  const apiLoginId = process.env.AUTHORIZE_NET_API_LOGIN_ID;
  const transactionKey = process.env.AUTHORIZE_NET_TRANSACTION_KEY;
  const isSandbox = process.env.AUTHORIZE_NET_SANDBOX !== 'false';

  return {
    apiLoginId,
    transactionKey,
    isSandbox
  };
}

// Create payment link for invoice (requires authentication)
router.post("/invoice/:id/link", authRequired, async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    const businessId = req.user?.businessId; // Get businessId

    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    // Get invoice
    const invoice = await getDoc('invoices', req.params.id);

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // Tenant Isolation Check
    if (invoice.businessId) {
      if (invoice.businessId !== businessId) {
        return res.status(403).json({ error: "Access denied" });
      }
    } else if (invoice.userId !== userId) {
      // Fallback to userId check for legacy/personal invoices
      return res.status(403).json({ error: "Access denied" });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: "Invoice is already paid" });
    }

    const paymentToken = crypto.randomBytes(32).toString('hex');
    const baseUrl = process.env.BASE_URL || req.protocol + '://' + req.get('host');
    const paymentUrl = `${baseUrl}/pay/${paymentToken}`;

    const paymentLink = {
      invoiceId: invoice.id,
      token: paymentToken,
      userId,
      businessId: invoice.businessId || null, // Store businessId
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      used: false
    };

    await setDoc('paymentLinks', paymentToken, paymentLink);

    res.json({ success: true, paymentUrl, token: paymentToken });
  } catch (error) {
    console.error("Create link error:", error);
    res.status(500).json({ error: "Failed to create payment link" });
  }
});

// Get payment link details
router.get("/link/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const paymentLink = await getDoc('paymentLinks', token);

    if (!paymentLink) return res.status(404).json({ error: "Payment link not found" });
    if (new Date(paymentLink.expiresAt) < new Date()) return res.status(400).json({ error: "Payment link has expired" });
    if (paymentLink.used) return res.status(400).json({ error: "Payment link has already been used" });

    const invoice = await getDoc('invoices', paymentLink.invoiceId);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const customer = await getDoc('customers', invoice.customerId);

    res.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        subtotal: invoice.subtotal,
        tax: invoice.tax || 0,
        items: invoice.items,
        notes: invoice.notes,
        dueDate: invoice.dueDate
      },
      customer: customer ? { name: customer.name, email: customer.email } : null
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get payment link" });
  }
});

// Process payment with Authorize.net
router.post("/process", async (req, res) => {
  const { token, paymentData, idempotencyKey } = req.body;

  try {
    if (!token || !paymentData) return res.status(400).json({ error: "Token and data required" });

    // Idempotency Check
    if (idempotencyKey) {
      const existingAttempt = await getDoc('paymentAttempts', idempotencyKey);
      if (existingAttempt) {
        if (existingAttempt.status === 'success') {
          return res.json({ success: true, transactionId: existingAttempt.transactionId, cached: true });
        } else if (existingAttempt.status === 'processing') {
          return res.status(409).json({ error: "Payment is currently processing" });
        }
        // If failed, we allow retry, so proceed.
      }

      // Mark as processing
      await setDoc('paymentAttempts', idempotencyKey, {
        status: 'processing',
        createdAt: new Date().toISOString(),
        token
      });
    }

    const paymentLink = await getDoc('paymentLinks', token);
    if (!paymentLink || paymentLink.used || paymentLink.status === 'processing') {
      if (idempotencyKey) await setDoc('paymentAttempts', idempotencyKey, { status: 'failed', error: "Invalid link or processing" });
      return res.status(400).json({ error: "Invalid payment link or already processing" });
    }

    const invoice = await getDoc('invoices', paymentLink.invoiceId);
    if (!invoice || invoice.status === 'paid' || invoice.status === 'processing') {
      if (idempotencyKey) await setDoc('paymentAttempts', idempotencyKey, { status: 'failed', error: "Invalid invoice" });
      return res.status(400).json({ error: "Invalid invoice" });
    }

    // LOCK: Mark link and invoice as processing to prevent double-submit race condition
    await setDoc('paymentLinks', token, { ...paymentLink, status: 'processing' });
    await setDoc('invoices', invoice.id, { ...invoice, status: 'processing' });

    const config = getAuthorizeNetConfig(paymentLink.userId);
    if (!config.apiLoginId || !config.transactionKey) {
      if (idempotencyKey) await setDoc('paymentAttempts', idempotencyKey, { status: 'failed', error: "Config missing" });
      return res.status(500).json({ error: "Gateway not configured" });
    }

    const merchantAuthenticationType = new AuthorizeNet.APIContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(config.apiLoginId);
    merchantAuthenticationType.setTransactionKey(config.transactionKey);

    let expirationDate = paymentData.expirationDate;
    if (expirationDate.includes('/')) {
      const [month, year] = expirationDate.split('/');
      expirationDate = `20${year}-${month.padStart(2, '0')}`;
    }

    const creditCard = new AuthorizeNet.APIContracts.CreditCardType();
    creditCard.setCardNumber(paymentData.cardNumber.replace(/\s/g, ''));
    creditCard.setExpirationDate(expirationDate);
    creditCard.setCardCode(paymentData.cvv);

    const paymentType = new AuthorizeNet.APIContracts.PaymentType();
    paymentType.setCreditCard(creditCard);

    const transactionRequestType = new AuthorizeNet.APIContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(AuthorizeNet.APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
    transactionRequestType.setPayment(paymentType);
    transactionRequestType.setAmount(invoice.total.toFixed(2));

    const createRequest = new AuthorizeNet.APIContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionRequestType);

    const ctrl = new AuthorizeNet.APIControllers.CreateTransactionController(createRequest.getJSON());
    ctrl.setEnvironment(config.isSandbox ? Constants.endpoint.sandbox : Constants.endpoint.production);

    return new Promise((resolve) => {
      ctrl.execute(async function () {
        const apiResponse = ctrl.getResponse();
        const response = new AuthorizeNet.APIContracts.CreateTransactionResponse(apiResponse);

        if (response != null && response.getMessages().getResultCode() === AuthorizeNet.APIContracts.MessageTypeEnum.OK) {
          const txnResponse = response.getTransactionResponse();
          if (txnResponse != null && txnResponse.getMessages() != null) {
            // Success
            invoice.status = 'paid';
            invoice.paidAt = new Date().toISOString();
            invoice.transactionId = txnResponse.getTransId();
            await setDoc('invoices', invoice.id, invoice);

            paymentLink.used = true;
            paymentLink.usedAt = new Date().toISOString();
            paymentLink.transactionId = txnResponse.getTransId();
            await setDoc('paymentLinks', token, paymentLink);

            if (idempotencyKey) {
              await setDoc('paymentAttempts', idempotencyKey, {
                status: 'success',
                transactionId: txnResponse.getTransId(),
                completedAt: new Date().toISOString()
              });
            }

            return resolve(res.json({ success: true, transactionId: txnResponse.getTransId() }));
          }
        }

        let errorMsg = "Payment failed";
        if (response != null && response.getMessages() != null) {
          errorMsg = response.getMessages().getMessage()[0].getText();
        }

        // UNLOCK: Revert statuses on failure
        await setDoc('paymentLinks', token, { ...paymentLink, status: 'active' }); // Revert to active
        // Only revert invoice if it was processing
        if (invoice.status === 'processing') {
          await setDoc('invoices', invoice.id, { ...invoice, status: 'sent' }); // Revert to sent
        }

        if (idempotencyKey) {
          await setDoc('paymentAttempts', idempotencyKey, {
            status: 'failed',
            error: errorMsg,
            failedAt: new Date().toISOString()
          });
        }

        resolve(res.status(400).json({ success: false, error: errorMsg }));
      });
    });
  } catch (error) {
    console.error("Payment Process Error:", error);
    if (idempotencyKey) {
      // Try to record failure if possible
      try { await setDoc('paymentAttempts', idempotencyKey, { status: 'failed', error: "Internal error" }); } catch (e) { }
    }
    res.status(500).json({ error: "Internal error" });
  }
});

// Get payment configuration status
router.get("/config", authRequired, async (req, res) => {
  try {
    const userId = req.user.uid;
    const config = getAuthorizeNetConfig(userId);

    // Return whether payments are enabled/configured, not the actual keys
    res.json({
      enabled: !!(config.apiLoginId && config.transactionKey),
      isSandbox: config.isSandbox,
      currency: 'USD'
    });
  } catch (error) {
    console.error("Payment Config Error:", error);
    res.status(500).json({ error: "Failed to fetch payment config" });
  }
});

module.exports = router;
