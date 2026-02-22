const express = require("express");
const submissionService = require("../utils/SubmissionService");
const formService = require("../utils/FormService");
const customerService = require("../utils/CustomerService");
const invoiceService = require("../utils/InvoiceService");
const { buildInvoiceFromSubmission } = require("../utils/invoiceGenerator");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(400).json({ error: "Business context required" });
    }

    // 1. Get all forms for this business
    const forms = await formService.getForms(businessId);
    if (!forms || forms.length === 0) {
      return res.json([]);
    }

    const formIds = forms.map(f => f.id);

    // 2. Fetch submissions for these forms
    // Optimize: If too many forms, might need batching, but for now strict filtering is key
    const submissions = await submissionService.getSubmissionsByFormIds(formIds);
    res.json(submissions);
  } catch (error) {
    console.error("Fetch submissions error:", error);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

router.get("/form/:formId", async (req, res) => {
  try {
    const businessId = req.user?.businessId;
    const { formId } = req.params;

    // 1. Verify access to the Form
    const form = await formService.getFormById(formId);
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    if (businessId && form.businessId !== businessId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // 2. Fetch submissions
    const submissions = await submissionService.getSubmissionsByFormId(formId);
    res.json(submissions);
  } catch (error) {
    console.error("Fetch form submissions error:", error);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const businessId = req.user?.businessId;
    const submissionId = req.params.id;

    // 1. Get submission to find formId
    const submission = await submissionService.getSubmissionById(submissionId);
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    // 2. Get form to verify business ownership
    const form = await formService.getFormById(submission.formId);
    if (form && businessId && form.businessId !== businessId) {
      return res.status(403).json({ error: "Access denied" });
    }

    await submissionService.deleteSubmission(submissionId);
    res.json({ success: true });
  } catch (error) {
    console.error("Delete submission error:", error);
    res.status(500).json({ error: "Failed to delete submission" });
  }
});

router.post("/:formId/entries", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    const form = await formService.getFormById(req.params.formId);
    if (!form) return res.status(404).json({ error: "Form not found" });

    const submission = await submissionService.createSubmission({
      formId: form.id,
      data: req.body.data,
      submittedBy: userId,
      submittedVia: 'internal-entry'
    });

    const { customerName, customerEmail } = customerService.extractCustomerInfo(form, req.body.data);
    if (customerName || customerEmail) {
      // Further customer logic could be service-ified too
    }

    res.json({ success: true, submission });
  } catch (e) { res.status(500).json({ error: "Failed" }); }
});

module.exports = router;
