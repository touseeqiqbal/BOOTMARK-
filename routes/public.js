const express = require("express");
const path = require("path");
const formService = require("../utils/FormService");
const { sendSubmissionNotification } = require("../utils/emailService");
const { extractCustomerInfo, getCustomers, saveCustomers } = require("./customers");
const { getDoc, setDoc, getCollectionRef } = require("../utils/db");
const invoicesRouter = require("./invoices");
const { buildInvoiceFromSubmission } = require("../utils/invoiceGenerator");

const router = express.Router();

async function autoCreateInvoiceForSubmission(form, submission, customer) {
  if (!form || !submission || !buildInvoiceFromSubmission || !invoicesRouter.appendInvoice) return;
  try {
    const invoice = buildInvoiceFromSubmission(form, submission, customer);
    if (invoice) {
      await invoicesRouter.appendInvoice(invoice);
      submission.invoiceId = invoice.id;
    }
  } catch (error) {
    console.error("Auto invoice creation error:", error);
  }
}

async function verifyClientToken(req) {
  const authHeader = req.headers?.authorization;
  const token = req.cookies?.token || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.replace("Bearer ", "") : null);
  if (!token) return null;
  try {
    const { admin } = require("../utils/db");
    const decodedToken = await admin.auth().verifyIdToken(token);
    return { uid: decodedToken.uid, email: decodedToken.email };
  } catch (error) {
    return null;
  }
}

router.get("/form/:shareKey", async (req, res) => {
  try {
    const snap = await getCollectionRef('forms').where('shareKey', '==', req.params.shareKey).limit(1).get();
    if (snap.empty) return res.status(404).json({ error: "Form not found" });
    const form = { id: snap.docs[0].id, ...snap.docs[0].data() };

    if (form.settings?.isPrivateLink) {
      const clientUser = await verifyClientToken(req);
      if (!clientUser) return res.status(401).json({ error: "Auth required", requiresAuth: true });
      const allowed = form.settings.allowedEmails || [];
      if (allowed.length > 0 && !allowed.map(e => e.toLowerCase()).includes(clientUser.email?.toLowerCase())) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    await formService.updateForm(form.id, form.businessId, { views: (form.views || 0) + 1, lastViewedAt: new Date().toISOString() });
    res.json({ id: form.id, title: form.title, fields: form.fields || [], settings: form.settings || {} });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch form" });
  }
});

router.post("/form/:shareKey/submit", async (req, res) => {
  try {
    const snap = await getCollectionRef('forms').where('shareKey', '==', req.params.shareKey).limit(1).get();
    if (snap.empty) return res.status(404).json({ error: "Form not found" });
    const form = { id: snap.docs[0].id, ...snap.docs[0].data() };

    const clientUser = form.settings?.isPrivateLink ? await verifyClientToken(req) : null;
    const { data: submissionData, draftId } = req.body;
    const newSubmission = {
      id: draftId || Date.now().toString(), formId: form.id, data: submissionData,
      submittedAt: new Date().toISOString(), submittedBy: clientUser?.uid || null, ipAddress: req.ip
    };

    const { customerName, customerEmail } = extractCustomerInfo(form, submissionData);
    if (customerName || customerEmail) {
      const customers = await getCustomers();
      let customer = customers.find(c => c.userId === form.userId && (
        (customerEmail && c.email?.toLowerCase() === customerEmail.toLowerCase()) ||
        (customerName && c.name?.toLowerCase() === customerName.toLowerCase())
      ));
      if (!customer) {
        customer = { id: Date.now().toString(), userId: form.userId, name: customerName || customerEmail.split('@')[0], email: customerEmail || null };
        customers.push(customer);
      }
      customer.submissionCount = (customer.submissionCount || 0) + 1;
      newSubmission.customerId = customer.id;
      await saveCustomers(customers);
    }

    await autoCreateInvoiceForSubmission(form, newSubmission);
    await setDoc('submissions', newSubmission.id, newSubmission);
    res.json({ success: true, message: "Submitted!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to submit" });
  }
});

module.exports = router;
