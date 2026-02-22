const express = require('express');
const router = express.Router();
const path = require('path');
const crypto = require('crypto');
const { getDoc, setDoc, getCollectionRef } = require(path.join(__dirname, '..', 'utils', 'db'));
const { getCustomers } = require('./customers');
const { authRequired } = require('../middleware/auth');

// Helper: Find customer by invitation token
async function findCustomerByToken(token) {
    const snap = await getCollectionRef('customers').where('invitationToken', '==', token).limit(1).get();
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

// GET /api/client-invitations/verify/:token
router.get('/verify/:token', async (req, res) => {
    try {
        const customer = await findCustomerByToken(req.params.token);
        if (!customer) return res.status(404).json({ error: 'Invalid invitation link' });

        if (customer.invitationExpiry && new Date(customer.invitationExpiry) < new Date()) {
            return res.status(400).json({ error: 'Invitation expired' });
        }

        if (customer.accountCreated) {
            return res.status(400).json({ error: 'Account already created' });
        }

        res.json({ valid: true, email: customer.email, name: customer.name });
    } catch (error) {
        res.status(500).json({ error: 'Failed to verify invitation' });
    }
});

// POST /api/client-invitations/accept
router.post('/accept', async (req, res) => {
    try {
        const { token, password, name } = req.body;
        const customer = await findCustomerByToken(token);
        if (!customer) return res.status(404).json({ error: 'Invalid invitation' });

        const admin = require('firebase-admin');
        let userRecord;
        try {
            userRecord = await admin.auth().createUser({
                email: customer.email,
                password,
                displayName: name || customer.name,
                emailVerified: true
            });
            await admin.auth().setCustomUserClaims(userRecord.uid, {
                role: 'client',
                businessId: customer.businessId || customer.userId,
                customerId: customer.id
            });
        } catch (authError) {
            if (authError.code === 'auth/email-already-exists') {
                const existingUser = await admin.auth().getUserByEmail(customer.email);
                await admin.auth().setCustomUserClaims(existingUser.uid, {
                    role: 'client',
                    businessId: customer.businessId || customer.userId,
                    customerId: customer.id
                });
            } else {
                throw authError;
            }
        }

        customer.accountCreated = true;
        customer.accountCreatedAt = new Date().toISOString();
        customer.invitationToken = null;
        customer.name = name || customer.name;

        await setDoc('customers', customer.id, customer);
        res.json({ success: true, email: customer.email });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create account' });
    }
});

// POST /api/client-invitations/resend/:customerId
router.post('/resend/:customerId', authRequired, async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const customer = await getDoc('customers', req.params.customerId);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        // Enforce Tenant Isolation
        if (customer.businessId !== businessId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        customer.invitationToken = token;
        customer.invitationExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        customer.invitationSentAt = new Date().toISOString();

        await setDoc('customers', customer.id, customer);
        const { sendClientInvitation } = require('./customers');
        await sendClientInvitation(customer, token);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to resend invitation' });
    }
});

module.exports = router;
