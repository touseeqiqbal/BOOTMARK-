const express = require("express");
const router = express.Router();
const { admin, getCollectionRef, getDoc, setDoc } = require("../utils/db");

const { authRequired } = require("../middleware/auth");



// Verify Firebase token
router.post("/verify-firebase-token", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token is required" });

    const decodedToken = await admin.auth().verifyIdToken(token);
    const doc = await getDoc('users', decodedToken.uid);
    let user = doc;

    if (!user) {
      user = {
        id: decodedToken.uid,
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email?.split("@")[0],
        photoURL: decodedToken.picture || "",
        createdAt: new Date().toISOString(),
        provider: decodedToken.firebase.sign_in_provider
      };
      await setDoc('users', user.uid, user);
    }

    req.session.userId = user.uid;
    req.session.userEmail = user.email;
    req.session.authenticated = true;

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 24 * 60 * 60 * 1000
    });

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: "Token verification failed" });
  }
});

// Check if user exists
router.post('/check-user', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const usersRef = getCollectionRef('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) {
      return res.status(404).json({ exists: false });
    }

    const user = snapshot.docs[0].data();
    res.json({
      exists: true,
      hasPassword: !!user.passwordHash, // simplistic check
      provider: user.provider || 'password'
    });
  } catch (error) {
    console.error('Check user error:', error);
    res.status(500).json({ error: 'Failed to check user' });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy();
  res.clearCookie('token');
  res.clearCookie('sessionId');
  res.json({ message: "Logged out successfully" });
});

router.post("/2fa/send-code", authRequired, async (req, res) => {
  try {
    const userId = req.user.uid;
    const user = await getDoc('users', userId);
    if (!user || !user.email) return res.status(404).json({ error: "User/Email not found" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await setDoc('users', userId, { ...user, twoFactorCode: code, twoFactorCodeExpires: new Date(Date.now() + 600000).toISOString() });

    const { sendEmail } = require('../utils/emailService');
    await sendEmail({ to: user.email, subject: 'Your 2FA Code', html: `<b>${code}</b>` });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Failed" }); }
});

router.post("/2fa/verify-code", authRequired, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { code } = req.body;
    const user = await getDoc('users', userId);
    if (!user || user.twoFactorCode !== code) return res.status(400).json({ error: "Invalid code" });
    await setDoc('users', userId, { ...user, twoFactorCode: null, twoFactorVerifiedAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Failed" }); }
});

router.get("/me", authRequired, async (req, res) => {
  const user = await getDoc('users', req.user.uid);
  res.json({ user });
});

router.get("/account", authRequired, async (req, res) => {
  const user = await getDoc('users', req.user.uid);
  res.json(user);
});

const { validateRequest, accountUpdateSchema } = require("../utils/validation");

router.put("/account", authRequired, validateRequest(accountUpdateSchema), async (req, res) => {
  const userId = req.user.uid;
  const existing = await getDoc('users', userId);

  if (!existing) {
    return res.status(404).json({ error: "User not found" });
  }

  // Schema filters input, but we rely on existing structure
  const allowedUpdates = req.body;

  const updated = {
    ...existing,
    ...allowedUpdates,
    id: userId, // Ensure ID doesn't change
    updatedAt: new Date().toISOString()
  };

  // Double check sensitive fields are not overwritten even if schema missed them
  if (existing.email) updated.email = existing.email; // Prevent email change
  if (existing.role) updated.role = existing.role;
  if (existing.businessId) updated.businessId = existing.businessId;

  await setDoc('users', userId, updated);
  res.json({ success: true, user: updated });
});

// SMTP Settings
router.get("/account/smtp", authRequired, async (req, res) => {
  try {
    const userId = req.user.uid;
    const user = await getDoc('users', userId);
    // Return SMTP settings or empty object
    res.json(user?.smtpSettings || {
      host: "",
      port: 587,
      user: "",
      pass: "",
      secure: false
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch SMTP settings" });
  }
});

router.put("/account/smtp", authRequired, async (req, res) => {
  try {
    const userId = req.user.uid;
    const smtpSettings = req.body;

    // Basic validation
    if (!smtpSettings.host || !smtpSettings.user) {
      return res.status(400).json({ error: "Host and User are required" });
    }

    const user = await getDoc('users', userId);
    await setDoc('users', userId, {
      ...user,
      smtpSettings,
      updatedAt: new Date().toISOString()
    });

    res.json({ success: true, message: "SMTP settings saved" });
  } catch (error) {
    res.status(500).json({ error: "Failed to save SMTP settings" });
  }
});

module.exports = router;
