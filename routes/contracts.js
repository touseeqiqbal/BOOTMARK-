const express = require('express');
const contractService = require('../utils/ContractService');
const { getDoc, deleteDoc, setDoc } = require('../utils/db');
const { validateRequest, contractSchema } = require('../utils/validation');

const router = express.Router();

// ============================================
// CONTRACT SETTINGS
// ============================================

// Get contract settings
router.get('/settings', async (req, res) => {
    try {
        const businessId = req.user?.businessId || req.user?.uid || req.user?.id;
        if (!businessId) {
            return res.status(400).json({ error: 'Business ID is required' });
        }

        let settings = await getDoc('contractSettings', businessId);

        // Return default settings if none exist
        if (!settings) {
            settings = {
                businessId,
                prefix: 'CON-',
                nextNumber: 1001,
                defaultTerms: '',
                autoRenewalDefault: false,
                renewalNoticePeriodDefault: 30,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        }

        res.json(settings);
    } catch (error) {
        console.error('Error fetching contract settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Update contract settings
router.put('/settings', async (req, res) => {
    try {
        const businessId = req.user?.businessId || req.user?.uid || req.user?.id;
        if (!businessId) {
            return res.status(400).json({ error: 'Business ID is required' });
        }

        const settings = {
            ...req.body,
            businessId,
            updatedAt: new Date().toISOString()
        };

        // Ensure createdAt exists
        if (!settings.createdAt) {
            settings.createdAt = new Date().toISOString();
        }

        await setDoc('contractSettings', businessId, settings);
        res.json({ success: true, settings });
    } catch (error) {
        console.error('Error updating contract settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});


// GET all contracts (PAGINATED)
router.get('/', async (req, res) => {
    try {
        const businessId = req.user?.businessId;

        if (!businessId) {
            return res.status(403).json({ error: 'Business ID required' });
        }

        const { paginate } = require('../utils/pagination');
        const { getCollectionRef } = require('../utils/db');

        // Build base query
        const baseQuery = getCollectionRef('contracts')
            .where('businessId', '==', businessId);

        // Reverted to fetch all contracts to prevent frontend crash
        // Apply pagination with filtering
        /*const result = await paginate({
            query: baseQuery,
            req,
            allowedFilters: ['status', 'customerId', 'autoRenewal'],
            defaultSort: 'createdAt',
            defaultOrder: 'desc'
        });
        res.json(result);*/

        const snapshot = await baseQuery.get();
        const contracts = [];
        snapshot.forEach(doc => contracts.push({ id: doc.id, ...doc.data() }));

        // Sort in memory by createdAt desc
        contracts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(contracts);
    } catch (error) {
        console.error('Error fetching contracts:', error);
        res.status(500).json({ error: 'Failed to fetch contracts' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const businessId = req.user?.businessId;

        if (!businessId) {
            return res.status(403).json({ error: 'Business ID required' });
        }

        const contract = await contractService.getContractById(req.params.id);

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        // CRITICAL: Verify tenant ownership to prevent cross-tenant data access
        if (contract.businessId !== businessId) {
            console.warn(`[Security] Unauthorized access attempt: User ${req.user?.id} tried to access contract ${req.params.id} belonging to business ${contract.businessId}`);
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(contract);
    } catch (error) {
        console.error('Error fetching contract:', error);
        res.status(500).json({ error: 'Failed to fetch contract' });
    }
});

router.post('/', validateRequest(contractSchema), async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const creatorId = req.user?.uid || req.user?.id;
        const contract = await contractService.createContract(businessId, creatorId, req.body);
        res.status(201).json(contract);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/:id', validateRequest(contractSchema), async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const updated = await contractService.updateContract(req.params.id, businessId, req.body);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/:id/sign', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        if (!businessId) return res.status(400).json({ error: "Business ID required" });

        const signatureData = {
            signature: req.body.signature,
            ip: req.ip || req.connection.remoteAddress,
            signedBy: req.body.signedBy || req.user?.name || req.body.signerName || 'Client'
        };

        if (!signatureData.signature) {
            return res.status(400).json({ error: "Signature data required" });
        }

        const result = await contractService.signContract(req.params.id, businessId, signatureData);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const contract = await getDoc('contracts', req.params.id);
        if (contract.businessId !== businessId) return res.status(403).json({ error: 'Denied' });
        await deleteDoc('contracts', req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

router.get('/:id/pdf', async (req, res) => {
    try {
        const businessId = req.user?.businessId;

        if (!businessId) {
            return res.status(403).json({ error: 'Business ID required' });
        }

        // CRITICAL: Verify ownership before generating PDF
        const contract = await getDoc('contracts', req.params.id);

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        if (contract.businessId !== businessId) {
            console.warn(`[Security] Unauthorized PDF access attempt: User ${req.user?.id} tried to access contract PDF ${req.params.id} belonging to business ${contract.businessId}`);
            return res.status(403).json({ error: 'Access denied' });
        }

        const pdfBuffer = await contractService.generatePDF(req.params.id);
        res.setHeader('Content-Type', 'application/pdf');
        res.end(pdfBuffer, 'binary');
    } catch (error) {
        console.error('Error generating contract PDF:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/:id/send-email', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        if (!businessId) return res.status(403).json({ error: 'Business ID required' });

        const { recipientEmail, templateId, customMessage, ccEmails, bccEmails } = req.body;

        // 1. Get Contract & Verify
        const contract = await contractService.getContractById(req.params.id);
        if (!contract) return res.status(404).json({ error: 'Contract not found' });
        if (contract.businessId !== businessId) return res.status(403).json({ error: 'Access denied' });

        // 2. Generate Link
        // Ensure token exists (migrate old contracts if needed)
        let token = contract.signToken;
        if (!token) {
            const crypto = require('crypto');
            token = crypto.randomBytes(32).toString('hex');
            await contractService.updateContract(contract.id, businessId, { signToken: token });
        }

        // We need the frontend URL. Ideally from ENV or req.get('origin')
        const frontendUrl = process.env.FRONTEND_URL || req.get('origin') || 'http://localhost:3000';
        const signLink = `${frontendUrl}/contracts/${contract.id}/sign/${token}`;

        // 3. Prepare Email Content (Mocking template logic for now)
        // In a real app, fetch template content and replace placeholders
        const emailSubject = `Contract for Review: ${contract.title}`;
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h2>${contract.title}</h2>
                <p>Hello,</p>
                <p>You have been sent a contract for review and signature.</p>
                ${customMessage ? `<p><strong>Message:</strong><br/>${customMessage}</p>` : ''}
                <p>Please click the button below to view and sign the contract:</p>
                <a href="${signLink}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">View & Sign Contract</a>
                <p style="margin-top: 20px; font-size: 12px; color: #666;">If the button doesn't work, copy and paste this link: ${signLink}</p>
            </div>
        `;

        // 4. Send Email (Placeholder call - replace with actual email service)
        // const { sendEmail } = require('../utils/emailService');
        // await sendEmail({ to: recipientEmail, subject: emailSubject, html: emailHtml, cc: ccEmails, bcc: bccEmails });

        // For now, just log it and update status
        console.log(`[Mock Email] Sending to ${recipientEmail} with link: ${signLink}`);

        // 5. Update Status
        if (contract.status === 'draft') {
            await contractService.updateContract(contract.id, businessId, { status: 'sent', sentAt: new Date().toISOString() });
        }

        res.json({ success: true, message: 'Email sent successfully (mocked)' });

    } catch (error) {
        console.error('Error sending contract email:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

module.exports = router;
