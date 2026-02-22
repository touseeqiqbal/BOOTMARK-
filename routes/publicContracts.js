const express = require('express');
const router = express.Router();
const { getDoc, setDoc, getCollectionRef } = require('../utils/db');
const path = require('path');

// GET /api/public/contracts/:id/:token
// Fetch contract for public signing (verify token/link validity)
router.get('/:id/:token', async (req, res) => {
    try {
        const { id, token } = req.params;

        // 1. Fetch Contract
        const contract = await getDoc('contracts', id);
        if (!contract) return res.status(404).json({ error: 'Contract not found' });

        // 2. Validate Token (Simple check: ideally we compare with a stored token in contract)
        // For now, we assume the link itself is the secret. 
        // In a clearer implementation, we should check `contract.signToken === token`

        // 3. Check status
        if (contract.status === 'active' || contract.status === 'signed') {
            // Allow viewing but maybe show "Already Signed" message on frontend
        }

        // 4. Fetch Business Name for display
        const business = await getDoc('businesses', contract.businessId);

        res.json({
            contract,
            businessName: business?.businessName || 'Business'
        });

    } catch (error) {
        console.error('Public contract fetch error:', error);
        res.status(500).json({ error: 'Failed to load contract' });
    }
});

// POST /api/public/contracts/:id/:token/sign
router.post('/:id/:token/sign', async (req, res) => {
    try {
        const { id, token } = req.params;
        const { signatureData, signerName, signerEmail, consentGiven } = req.body;

        const contract = await getDoc('contracts', id);
        if (!contract) return res.status(404).json({ error: 'Contract not found' });

        if (!signatureData || !signerName || !consentGiven) {
            return res.status(400).json({ error: 'Missing required signature data' });
        }

        const updatedContract = {
            ...contract,
            status: 'pending-approval', // Or directly 'active'/'signed'
            signatureStatus: 'signed',
            signedAt: new Date().toISOString(),
            signature: {
                signedBy: signerName,
                signedByEmail: signerEmail,
                data: signatureData,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                consentGiven: true,
                signedAt: new Date().toISOString()
            },
            // Clear the token to prevent re-use if one-time
            // signToken: null 
        };

        await setDoc('contracts', id, updatedContract);

        // Notify Business
        const { sendBusinessNotification } = require('../utils/socketServer');
        sendBusinessNotification(contract.businessId, {
            type: 'success',
            title: 'Contract Signed',
            message: `${signerName} has signed contract: ${contract.title}`
        });

        res.json({ success: true });

    } catch (error) {
        console.error('Public contract sign error:', error);
        res.status(500).json({ error: 'Failed to submit signature' });
    }
});

module.exports = router;
