const express = require('express');
const router = express.Router();
const path = require('path');
const crypto = require('crypto');
const { useFirestore, getCollectionRef, getDoc, setDoc } = require(path.join(__dirname, '..', 'utils', 'db'));
const { getCustomers, saveCustomers } = require('./customers');
const { authRequired } = require('../middleware/auth');

// Helper: Find customer by invitation token
async function findCustomerByToken(token) {
    const customers = await getCustomers();
    return customers.find(c => c.invitationToken === token);
}

// GET /api/client-invitations/verify/:token
// Verify invitation token is valid
router.get('/verify/:token', async (req, res) => {
    try {
        const { token } = req.params;

        // Find customer with this token
        const customer = await findCustomerByToken(token);

        if (!customer) {
            return res.status(404).json({ error: 'Invalid invitation link' });
        }

        // Check if expired
        if (customer.invitationExpiry && new Date(customer.invitationExpiry) < new Date()) {
            return res.status(400).json({ error: 'This invitation has expired. Please contact the business for a new invitation.' });
        }

        // Check if already used
        if (customer.accountCreated) {
            return res.status(400).json({ error: 'Account already created. Please use the login page.' });
        }

        res.json({
            valid: true,
            email: customer.email,
            name: customer.name
        });
    } catch (error) {
        console.error('Verify invitation error:', error);
        res.status(500).json({ error: 'Failed to verify invitation' });
    }
});

// POST /api/client-invitations/accept
// Accept invitation and create account
router.post('/accept', async (req, res) => {
    try {
        const { token, password, name } = req.body;

        if (!token || !password) {
            return res.status(400).json({ error: 'Token and password are required' });
        }

        // Verify token
        const customer = await findCustomerByToken(token);

        if (!customer) {
            return res.status(404).json({ error: 'Invalid invitation' });
        }

        if (customer.invitationExpiry && new Date(customer.invitationExpiry) < new Date()) {
            return res.status(400).json({ error: 'Invitation expired' });
        }

        if (customer.accountCreated) {
            return res.status(400).json({ error: 'Account already created' });
        }

        // Create Firebase Auth account
        const admin = require('firebase-admin');
        let userRecord;
        try {
            userRecord = await admin.auth().createUser({
                email: customer.email,
                password: password,
                displayName: name || customer.name,
                emailVerified: true // Pre-verify email since they came from invitation
            });

            console.log(`[Client Invitation] Created Firebase account for ${customer.email}`);

            // Set custom claims for client user with business tenant info
            await admin.auth().setCustomUserClaims(userRecord.uid, {
                role: 'client',
                businessId: customer.businessId || customer.userId,
                customerId: customer.id
            });

            console.log(`[Client Invitation] Set custom claims for ${customer.email} - businessId: ${customer.businessId}, customerId: ${customer.id}`);
        } catch (authError) {
            console.error('Firebase account creation error:', authError);

            // Check if user already exists
            if (authError.code === 'auth/email-already-exists') {
                // User exists, get user and update custom claims
                console.log(`[Client Invitation] User already exists: ${customer.email}`);
                try {
                    const existingUser = await admin.auth().getUserByEmail(customer.email);
                    await admin.auth().setCustomUserClaims(existingUser.uid, {
                        role: 'client',
                        businessId: customer.businessId || customer.userId,
                        customerId: customer.id
                    });
                    console.log(`[Client Invitation] Updated custom claims for existing user ${customer.email}`);
                } catch (claimError) {
                    console.error('Failed to set custom claims for existing user:', claimError);
                }
            } else {
                return res.status(500).json({ error: 'Failed to create account. Please try again.' });
            }
        }

        // Update customer record
        customer.accountCreated = true;
        customer.accountCreatedAt = new Date().toISOString();
        customer.invitationToken = null; // Clear token for security
        customer.name = name || customer.name; // Update name if provided

        // Save customer
        if (useFirestore) {
            await setDoc('customers', customer.id, customer);
        } else {
            const allCustomers = await getCustomers();
            const index = allCustomers.findIndex(c => c.id === customer.id);
            if (index !== -1) {
                allCustomers[index] = customer;
                await saveCustomers(allCustomers);
            }
        }

        res.json({
            success: true,
            email: customer.email,
            message: 'Account created successfully! You can now log in.'
        });
    } catch (error) {
        console.error('Accept invitation error:', error);
        res.status(500).json({ error: 'Failed to create account' });
    }
});

// POST /api/client-invitations/resend/:customerId
// Resend invitation email (admin only)
router.post('/resend/:customerId', authRequired, async (req, res) => {
    try {
        const userId = req.user?.uid || req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Get customer
        let customer;
        if (useFirestore) {
            customer = await getDoc('customers', req.params.customerId);
        } else {
            const customers = await getCustomers();
            customer = customers.find(c => c.id === req.params.customerId);
        }

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Verify ownership
        if (customer.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Check if account already created
        if (customer.accountCreated) {
            return res.status(400).json({ error: 'Customer already has an account' });
        }

        // Generate new token
        const newToken = crypto.randomBytes(32).toString('hex');
        const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        customer.invitationToken = newToken;
        customer.invitationExpiry = newExpiry.toISOString();
        customer.invitationSentAt = new Date().toISOString();

        // Save customer
        if (useFirestore) {
            await setDoc('customers', customer.id, customer);
        } else {
            const allCustomers = await getCustomers();
            const index = allCustomers.findIndex(c => c.id === customer.id);
            if (index !== -1) {
                allCustomers[index] = customer;
                await saveCustomers(allCustomers);
            }
        }

        // Send invitation email
        const { sendClientInvitation } = require('./customers');
        await sendClientInvitation(customer, customer.invitationToken);


        res.json({
            success: true,
            message: 'Invitation email sent successfully'
        });
    } catch (error) {
        console.error('Resend invitation error:', error);
        res.status(500).json({ error: 'Failed to resend invitation' });
    }
});

module.exports = router;
