const express = require("express");
const path = require("path");
const crypto = require("crypto");
const formService = require("../utils/FormService");
const defaultTemplates = require("../data/defaultFormTemplates");
const { validateRequest, formSchema } = require('../utils/validation');

const router = express.Router();

// Middleware-like helper for permissions
async function getFormsPermissionContext(req) {
  const userId = req.user?.uid || req.user?.id;
  if (!userId) throw new Error('Not authenticated');

  if (!req.formPermissionContext || req.formPermissionContext.userId !== userId) {
    req.formPermissionContext = await formService.getFormAccessContext(userId);
  }
  return req.formPermissionContext;
}

// Templates
router.get("/templates", async (req, res) => {
  try {
    const businessId = req.user?.businessId || req.user?.uid;
    const userTemplates = await formService.getCustomTemplates(businessId);
    res.json([...defaultTemplates, ...userTemplates]);
  } catch (error) {
    res.status(500).json({ error: "Failed to load templates" });
  }
});

router.post("/templates", async (req, res) => {
  try {
    const businessId = req.user?.businessId || req.user?.uid;
    if (!businessId) return res.status(401).json({ error: "Not authenticated" });
    const template = await formService.saveCustomTemplate(businessId, req.body);
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: "Failed to save template" });
  }
});

router.delete("/templates/:templateId", async (req, res) => {
  try {
    const businessId = req.user?.businessId || req.user?.uid;
    await formService.deleteTemplate(req.params.templateId, businessId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Forms CRUD
router.get("/", async (req, res) => {
  try {
    const ctx = await getFormsPermissionContext(req);
    if (ctx.business && !ctx.hasFormsPermission) return res.status(403).json({ error: "Access denied" });

    const businessId = ctx.business?.id || ctx.userId;
    const forms = await formService.getForms(businessId);
    res.json(forms);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch forms" });
  }
});

// Get forms where user has pending invitations
router.get("/invited", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // TODO: Implement full invitation system
    // For now, return empty array to prevent 404 errors
    // Future implementation should query invites collection and join with forms
    res.json([]);
  } catch (error) {
    console.error('Error fetching invited forms:', error);
    res.status(500).json({ error: "Failed to fetch invited forms" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const form = await formService.getFormById(req.params.id);
    if (!form) return res.status(404).json({ error: "Form not found" });

    const ctx = await getFormsPermissionContext(req);
    const businessId = ctx.business?.id || ctx.userId;
    if (form.businessId !== businessId && !ctx.allowedUserIds.has(form.userId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(form);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch form" });
  }
});

router.post("/", validateRequest(formSchema), async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    const ctx = await getFormsPermissionContext(req);
    if (ctx.business && !ctx.hasFormsPermission) return res.status(403).json({ error: "Access denied" });

    const form = await formService.createForm(req.body, userId, ctx.formsOwnerId, ctx.business?.id);
    res.status(201).json(form);
  } catch (error) {
    res.status(500).json({ error: "Failed to create form" });
  }
});

router.put("/:id", validateRequest(formSchema), async (req, res) => {
  try {
    const ctx = await getFormsPermissionContext(req);
    const businessId = ctx.business?.id || ctx.userId;
    const updated = await formService.updateForm(req.params.id, businessId, req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update form" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const ctx = await getFormsPermissionContext(req);
    const businessId = ctx.business?.id || ctx.userId;
    await formService.deleteForm(req.params.id, businessId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete form" });
  }
});

// Members & Invites
router.get("/:id/members", async (req, res) => {
  try {
    const members = await formService.getFormMembers(req.params.id);
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

router.get("/:id/invites", async (req, res) => {
  try {
    const invites = await formService.getFormInvites(req.params.id);
    res.json(invites);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch invites" });
  }
});

router.post("/:id/invites", async (req, res) => {
  try {
    const invite = await formService.createInvite(req.params.id, req.body);
    const form = await formService.getFormById(req.params.id);
    const owner = await formService.getUserById(form.userId);

    const { sendEmail } = require('../utils/emailService');
    const appUrl = process.env.APP_URL || 'http://localhost:4000';
    const acceptUrl = `${appUrl}/accept-invite/${invite.token}`;

    await sendEmail({
      to: invite.email,
      subject: `Invite: ${form.title}`,
      html: `<a href="${acceptUrl}">Accept Invitation</a>`,
      userSmtpConfig: owner?.smtpConfig
    });
    res.json(invite);
  } catch (e) { res.status(500).json({ error: "Failed" }); }
});

router.post("/invites/:inviteId/accept", async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    const user = await formService.getUserById(userId);
    const result = await formService.acceptInvite(req.params.inviteId, userId, user.email);
    res.json({ success: true, formId: result.formId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
module.exports.getFormById = (id) => formService.getFormById(id);
