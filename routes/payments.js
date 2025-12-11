const express = require("express");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs").promises;
const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
const { db, useFirestore, getCollectionRef, setDoc, getDoc } = require("../utils/db");
const { authRequired } = require("../middleware/auth");
const AuthorizeNet = require("authorizenet").APIContracts;
const Constants = require("authorizenet").Constants;

const router = express.Router();

// Helper to get payment links
async function getPaymentLinks() {
  if (useFirestore) {
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
  const FILE = getDataFilePath("paymentLinks.json");
  try {
    const data = await fs.readFile(FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    console.error("Error reading payment links file:", error);
    return {};
  }
}

// Helper to save payment links
async function savePaymentLinks(paymentLinks) {
  if (useFirestore) {
    try {
      for (const [token, link] of Object.entries(paymentLinks)) {
        await setDoc('paymentLinks', token, link);
      }
      return;
    } catch (e) {
      console.error('Error saving payment links to Firestore:', e);
      throw e;
    }
  }
  const FILE = getDataFilePath("paymentLinks.json");
  const dir = path.dirname(FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(paymentLinks, null, 2), 'utf8');
}

// Get Authorize.net API credentials from user settings
function getAuthorizeNetConfig(userId) {
  // In production, get from user's businessInfo or environment
  // For now, use environment variables
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
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Get invoice
    const invoicesRouter = require("./invoices");
    const invoices = await invoicesRouter.getInvoices();
    const invoice = invoices.find((inv) => inv.id === req.params.id);

    if (!invoice || invoice.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: "Invoice is already paid" });
    }

    // Generate payment token
    const paymentToken = crypto.randomBytes(32).toString('hex');
    const baseUrl = process.env.BASE_URL || req.protocol + '://' + req.get('host');
    const paymentUrl = `${baseUrl}/pay/${paymentToken}`;
    
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
      const paymentLinks = await getPaymentLinks();
      paymentLinks[paymentToken] = paymentLink;
      await savePaymentLinks(paymentLinks);
    }

    res.json({
      success: true,
      paymentUrl,
      token: paymentToken
    });
  } catch (error) {
    console.error("Create payment link error:", error);
    res.status(500).json({ error: "Failed to create payment link" });
  }
});

// Get payment link details (public endpoint for payment page)
router.get("/link/:token", async (req, res) => {
  try {
    const { token } = req.params;
    
    let paymentLink;
    if (useFirestore) {
      paymentLink = await getDoc('paymentLinks', token);
    } else {
      const paymentLinks = await getPaymentLinks();
      paymentLink = paymentLinks[token];
    }

    if (!paymentLink) {
      return res.status(404).json({ error: "Payment link not found" });
    }

    // Check if expired
    if (new Date(paymentLink.expiresAt) < new Date()) {
      return res.status(400).json({ error: "Payment link has expired" });
    }

    // Check if already used
    if (paymentLink.used) {
      return res.status(400).json({ error: "Payment link has already been used" });
    }

    // Get invoice details
    const invoicesRouter = require("./invoices");
    const invoices = await invoicesRouter.getInvoices();
    const invoice = invoices.find((inv) => inv.id === paymentLink.invoiceId);

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // Get customer details
    const customersRouter = require("./customers");
    const customers = await customersRouter.getCustomers();
    const customer = customers.find((c) => c.id === invoice.customerId);

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
      customer: customer ? {
        name: customer.name,
        email: customer.email
      } : null
    });
  } catch (error) {
    console.error("Get payment link error:", error);
    res.status(500).json({ error: "Failed to get payment link" });
  }
});

// Process payment with Authorize.net
router.post("/process", async (req, res) => {
  try {
    const { token, paymentData } = req.body;

    if (!token || !paymentData) {
      return res.status(400).json({ error: "Token and payment data are required" });
    }

    // Get payment link
    let paymentLink;
    if (useFirestore) {
      paymentLink = await getDoc('paymentLinks', token);
    } else {
      const paymentLinks = await getPaymentLinks();
      paymentLink = paymentLinks[token];
    }

    if (!paymentLink) {
      return res.status(404).json({ error: "Payment link not found" });
    }

    // Check if expired or used
    if (new Date(paymentLink.expiresAt) < new Date()) {
      return res.status(400).json({ error: "Payment link has expired" });
    }

    if (paymentLink.used) {
      return res.status(400).json({ error: "Payment link has already been used" });
    }

    // Get invoice
    const invoicesRouter = require("./invoices");
    const invoices = await invoicesRouter.getInvoices();
    const invoice = invoices.find((inv) => inv.id === paymentLink.invoiceId);

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: "Invoice is already paid" });
    }

    // Get Authorize.net config
    const config = getAuthorizeNetConfig(paymentLink.userId);
    
    if (!config.apiLoginId || !config.transactionKey) {
      return res.status(500).json({ error: "Payment gateway not configured. Please contact the invoice owner." });
    }

    // Create Authorize.net transaction
    const merchantAuthenticationType = new AuthorizeNet.APIContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(config.apiLoginId);
    merchantAuthenticationType.setTransactionKey(config.transactionKey);

    // Convert MM/YY to YYYY-MM format for Authorize.net
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

    // Parse cardholder name into first and last name
    const nameParts = (paymentData.cardholderName || '').trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || firstName;

    const customerAddress = new AuthorizeNet.APIContracts.CustomerAddressType();
    customerAddress.setFirstName(firstName);
    customerAddress.setLastName(lastName);
    if (paymentData.address) customerAddress.setAddress(paymentData.address);
    if (paymentData.city) customerAddress.setCity(paymentData.city);
    if (paymentData.state) customerAddress.setState(paymentData.state);
    if (paymentData.zip) customerAddress.setZip(paymentData.zip);
    if (paymentData.country) customerAddress.setCountry(paymentData.country);

    const customerData = new AuthorizeNet.APIContracts.CustomerDataType();
    customerData.setEmail(paymentData.email);
    customerData.setCustomerId(paymentData.email);

    const orderType = new AuthorizeNet.APIContracts.OrderType();
    orderType.setInvoiceNumber(invoice.invoiceNumber);
    orderType.setDescription(`Payment for invoice ${invoice.invoiceNumber}`);

    const transactionRequestType = new AuthorizeNet.APIContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(AuthorizeNet.APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
    transactionRequestType.setPayment(paymentType);
    transactionRequestType.setAmount(invoice.total.toFixed(2));
    transactionRequestType.setCustomer(customerData);
    transactionRequestType.setBillTo(customerAddress);
    transactionRequestType.setOrder(orderType);

    const createRequest = new AuthorizeNet.APIContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionRequestType);

    const ctrl = new AuthorizeNet.APIControllers.CreateTransactionController(createRequest.getJSON());
    ctrl.setEnvironment(config.isSandbox ? Constants.endpoint.sandbox : Constants.endpoint.production);

    return new Promise((resolve, reject) => {
      ctrl.execute(async function() {
        const apiResponse = ctrl.getResponse();
        const response = new AuthorizeNet.APIContracts.CreateTransactionResponse(apiResponse);

        if (response != null) {
          if (response.getMessages().getResultCode() === AuthorizeNet.APIContracts.MessageTypeEnum.OK) {
            const txnResponse = response.getTransactionResponse();

            if (txnResponse != null && txnResponse.getMessages() != null) {
              // Payment successful
              try {
                // Update invoice status
                invoice.status = 'paid';
                invoice.paidAt = new Date().toISOString();
                invoice.paymentMethod = 'authorize.net';
                invoice.transactionId = txnResponse.getTransId();
                
                // Save invoice
                await invoicesRouter.saveInvoices(invoices);

                // Mark payment link as used
                paymentLink.used = true;
                paymentLink.usedAt = new Date().toISOString();
                paymentLink.transactionId = txnResponse.getTransId();
                
                if (useFirestore) {
                  await setDoc('paymentLinks', token, paymentLink);
                } else {
                  const paymentLinks = await getPaymentLinks();
                  paymentLinks[token] = paymentLink;
                  await savePaymentLinks(paymentLinks);
                }

                resolve(res.json({
                  success: true,
                  message: "Payment processed successfully",
                  transactionId: txnResponse.getTransId(),
                  invoiceId: invoice.id
                }));
              } catch (saveError) {
                console.error("Error saving payment data:", saveError);
                // Payment was successful but saving failed - still return success
                resolve(res.json({
                  success: true,
                  message: "Payment processed successfully",
                  transactionId: txnResponse.getTransId(),
                  invoiceId: invoice.id,
                  warning: "Payment successful but invoice update may be delayed"
                }));
              }
            } else {
              let errorMessages = [];
              if (txnResponse.getErrors() != null) {
                txnResponse.getErrors().forEach(error => {
                  errorMessages.push(error.getErrorText());
                });
              }
              reject(res.status(400).json({
                success: false,
                error: errorMessages.join(', ') || "Payment processing failed"
              }));
            }
          } else {
            let errorMessages = [];
            if (response.getTransactionResponse() != null && response.getTransactionResponse().getErrors() != null) {
              response.getTransactionResponse().getErrors().forEach(error => {
                errorMessages.push(error.getErrorText());
              });
            } else {
              response.getMessages().getMessage().forEach(msg => {
                errorMessages.push(msg.getText());
              });
            }
            reject(res.status(400).json({
              success: false,
              error: errorMessages.join(', ') || "Payment processing failed"
            }));
          }
        } else {
          reject(res.status(500).json({
            success: false,
            error: "No response from payment gateway"
          }));
        }
      });
    });
  } catch (error) {
    console.error("Process payment error:", error);
    res.status(500).json({ error: "Failed to process payment", message: error.message });
  }
});

module.exports = router;
