const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
const { useFirestore, getCollectionRef, getDoc, setDoc, deleteDoc } = require(path.join(__dirname, "..", "utils", "db"));
const { getAllTemplates, getTemplateById } = require(path.join(__dirname, "..", "utils", "contractTemplates"));
const { generateContractPDF } = require(path.join(__dirname, "..", "utils", "contractPDF"));
const { notifyContractCreated } = require(path.join(__dirname, "..", "utils", "contractNotifications"));

function getContractsFilePath() {
    return getDataFilePath("contracts.json");
}

const readContracts = async (businessId = null) => {
    if (useFirestore) {
        try {
            let query = getCollectionRef('contracts');
            if (businessId) {
                query = query.where('businessId', '==', businessId);
            }
            const snapshot = await query.get();
            const items = [];
            snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
            return items;
        } catch (error) {
            console.error('Firestore read error:', error);
            return [];
        }
    }

    const DATA_FILE = getContractsFilePath();
    try {
        await fs.access(DATA_FILE);
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

const saveContracts = async (contracts) => {
    if (useFirestore) return;
    const DATA_FILE = getContractsFilePath();
    const dir = path.dirname(DATA_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(contracts, null, 2));
};

// GET /api/contracts/templates - Get all contract templates
router.get('/templates', async (req, res) => {
    try {
        const templates = getAllTemplates();
        res.json(templates);
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

// GET /api/contracts/templates/:id - Get specific template
router.get('/templates/:id', async (req, res) => {
    try {
        const template = getTemplateById(req.params.id);
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        res.json(template);
    } catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({ error: 'Failed to fetch template' });
    }
});

router.get('/', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const contracts = await readContracts(businessId);
        res.json(contracts);
    } catch (error) {
        console.error('Error fetching contracts:', error);
        res.status(500).json({ error: 'Failed to fetch contracts' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        if (useFirestore) {
            const contract = await getDoc('contracts', req.params.id);
            if (!contract) {
                return res.status(404).json({ error: 'Contract not found' });
            }
            if (req.user?.businessId && contract.businessId !== req.user.businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            res.json(contract);
        } else {
            const contracts = await readContracts();
            const contract = contracts.find(c => c.id === req.params.id);
            if (!contract) {
                return res.status(404).json({ error: 'Contract not found' });
            }
            if (req.user?.businessId && contract.businessId !== req.user.businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            res.json(contract);
        }
    } catch (error) {
        console.error('Error fetching contract:', error);
        res.status(500).json({ error: 'Failed to fetch contract' });
    }
});

router.post('/', async (req, res) => {
    try {
        // Use businessId if available, otherwise use user ID as fallback
        const businessId = req.user?.businessId || req.user?.uid || req.user?.id || req.body.businessId;
        if (!businessId) {
            return res.status(400).json({ error: 'Business ID is required' });
        }

        const id = uuidv4();
        const newContract = {
            id,
            businessId,
            clientId: req.body.clientId,  // Explicitly set clientId
            customerId: req.body.clientId, // Set customerId for compatibility with client portal
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'draft',
            ...req.body
        };

        // Debug logging
        console.log('[Contract Creation] New contract created:', {
            id: newContract.id,
            businessId: newContract.businessId,
            clientId: newContract.clientId,
            customerId: newContract.customerId,
            title: newContract.title,
            status: newContract.status
        });

        if (useFirestore) {
            await setDoc('contracts', id, newContract);
        } else {
            const contracts = await readContracts();
            contracts.push(newContract);
            await saveContracts(contracts);
        }

        console.log('[Contract Creation] Contract saved successfully');
        res.status(201).json(newContract);
    } catch (error) {
        console.error('Error creating contract:', error);
        res.status(500).json({ error: 'Failed to create contract' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const businessId = req.user?.businessId;

        if (useFirestore) {
            const existing = await getDoc('contracts', req.params.id);
            if (!existing) {
                return res.status(404).json({ error: 'Contract not found' });
            }
            if (businessId && existing.businessId !== businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            const updated = {
                ...existing,
                ...req.body,
                id: req.params.id,
                businessId: existing.businessId,
                clientId: req.body.clientId || existing.clientId,  // Preserve clientId
                customerId: req.body.clientId || existing.clientId || existing.customerId, // Ensure customerId matches clientId
                updatedAt: new Date().toISOString()
            };

            await setDoc('contracts', req.params.id, updated);
            res.json(updated);
        } else {
            const contracts = await readContracts();
            const index = contracts.findIndex(c => c.id === req.params.id);
            if (index === -1) {
                return res.status(404).json({ error: 'Contract not found' });
            }
            if (businessId && contracts[index].businessId !== businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            contracts[index] = {
                ...contracts[index],
                ...req.body,
                businessId: contracts[index].businessId,
                clientId: req.body.clientId || contracts[index].clientId,  // Preserve clientId
                customerId: req.body.clientId || contracts[index].clientId || contracts[index].customerId, // Ensure customerId matches clientId
                updatedAt: new Date().toISOString()
            };

            await saveContracts(contracts);
            res.json(contracts[index]);
        }
    } catch (error) {
        console.error('Error updating contract:', error);
        res.status(500).json({ error: 'Failed to update contract' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const businessId = req.user?.businessId;

        if (useFirestore) {
            const contract = await getDoc('contracts', req.params.id);
            if (!contract) {
                return res.status(404).json({ error: 'Contract not found' });
            }
            if (businessId && contract.businessId !== businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            await deleteDoc('contracts', req.params.id);
        } else {
            const contracts = await readContracts();
            const contract = contracts.find(c => c.id === req.params.id);
            if (!contract) {
                return res.status(404).json({ error: 'Contract not found' });
            }
            if (businessId && contract.businessId !== businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            const filtered = contracts.filter(c => c.id !== req.params.id);
            await saveContracts(filtered);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting contract:', error);
        res.status(500).json({ error: 'Failed to delete contract' });
    }
});

// GET /api/contracts/:id/pdf - Download contract as PDF
router.get('/:id/pdf', async (req, res) => {
    try {
        const businessId = req.user?.businessId || req.user?.uid || req.user?.id;

        // Get contract
        let contract;
        if (useFirestore) {
            contract = await getDoc('contracts', req.params.id);
        } else {
            const contracts = await readContracts();
            contract = contracts.find(c => c.id === req.params.id);
        }

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        if (businessId && contract.businessId !== businessId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get client data
        let client = { name: 'Client', email: '' };
        try {
            if (useFirestore) {
                client = await getDoc('customers', contract.clientId) || client;
            } else {
                const customersPath = path.join(__dirname, '..', 'data', 'customers.json');
                const customersData = await fs.readFile(customersPath, 'utf8');
                const customers = JSON.parse(customersData);
                client = customers.find(c => c.id === contract.clientId) || client;
            }
        } catch (error) {
            console.error('Error fetching client:', error);
        }

        // Get business data
        let business = { name: 'Business' };
        try {
            if (useFirestore) {
                business = await getDoc('businesses', contract.businessId) || business;
            } else {
                const businessPath = path.join(__dirname, '..', 'data', 'businesses.json');
                const businessData = await fs.readFile(businessPath, 'utf8');
                const businesses = JSON.parse(businessData);
                business = businesses.find(b => b.id === contract.businessId) || business;
            }
        } catch (error) {
            console.error('Error fetching business:', error);
        }


        // Try to generate PDF, fallback to text if it fails
        try {
            const pdfBuffer = await generateContractPDF(contract, client, business);

            // Send PDF with proper binary handling
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Length', pdfBuffer.length);
            res.setHeader('Content-Disposition', `attachment; filename="contract-${contract.id}.pdf"`);
            res.setHeader('Cache-Control', 'no-cache');
            return res.end(pdfBuffer, 'binary');
        } catch (pdfError) {
            console.error('PDF generation failed, sending as text:', pdfError);

            // Fallback: Generate text version
            const textContent = `CONTRACT DOCUMENT\n\n${business.name || 'Business'}\n${contract.title || 'Contract'}\n\nContract ID: ${contract.id}\nDate: ${new Date(contract.createdAt || Date.now()).toLocaleDateString()}\n\nPARTIES:\nService Provider: ${business.name || '[Business Name]'}\nClient: ${client.name || '[Client Name]'}\n\nCONTRACT DETAILS:\nStart Date: ${new Date(contract.startDate).toLocaleDateString()}\nEnd Date: ${new Date(contract.endDate).toLocaleDateString()}\nTotal Value: $${parseFloat(contract.amount || 0).toLocaleString()}\nBilling Frequency: ${(contract.billingFrequency || 'monthly').charAt(0).toUpperCase() + (contract.billingFrequency || 'monthly').slice(1)}\nStatus: ${(contract.status || 'draft').charAt(0).toUpperCase() + (contract.status || 'draft').slice(1)}\n\n${contract.terms || ''}\n\nSIGNATURES:\nService Provider: _____________________ Date: _______\nClient: _____________________ Date: _______`;

            res.setHeader('Content-Type', 'text/plain');
            res.setHeader('Content-Disposition', `attachment; filename="contract-${contract.id}.txt"`);
            res.send(textContent);
        }
    } catch (error) {
        console.error('Error in PDF endpoint:', error);
        res.status(500).json({ error: 'Failed to generate contract document', details: error.message });
    }
});

// POST /api/contracts/:id/notify - Send contract notification
router.post('/:id/notify', async (req, res) => {
    try {
        const businessId = req.user?.businessId;

        // Get contract
        let contract;
        if (useFirestore) {
            contract = await getDoc('contracts', req.params.id);
        } else {
            const contracts = await readContracts();
            contract = contracts.find(c => c.id === req.params.id);
        }

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        if (businessId && contract.businessId !== businessId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get client and business data (similar to PDF endpoint)
        let client = { name: 'Client', email: req.body.email || '' };
        let business = { name: 'Business' };

        try {
            if (useFirestore) {
                client = await getDoc('customers', contract.clientId) || client;
                business = await getDoc('businesses', contract.businessId) || business;
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }

        // Get SMTP config
        const smtpConfig = req.body.smtpConfig || {};

        // Send notification
        const result = await notifyContractCreated(contract, client, business, smtpConfig);

        if (result.success) {
            res.json({ success: true, message: 'Notification sent successfully' });
        } else {
            res.status(500).json({ success: false, error: result.error || 'Failed to send notification' });
        }
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ error: 'Failed to send notification', details: error.message });
    }
});

// POST /api/contracts/:id/send-email - Send contract email with template
router.post('/:id/send-email', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const { templateId, recipientEmail, customMessage, ccEmails, bccEmails } = req.body;

        // Get contract
        let contract;
        if (useFirestore) {
            contract = await getDoc('contracts', req.params.id);
        } else {
            const contracts = await readContracts();
            contract = contracts.find(c => c.id === req.params.id);
        }

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        if (businessId && contract.businessId !== businessId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get client and business data
        let client = { name: 'Client', email: recipientEmail || '' };
        let business = { name: 'Business', businessName: 'Business' };

        try {
            if (useFirestore) {
                client = await getDoc('customers', contract.clientId) || client;
                business = await getDoc('businesses', contract.businessId) || business;
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }

        // Get email template
        const { getTemplateById, replaceTemplateVariables } = require('../utils/contractEmailTemplates');
        const template = getTemplateById(templateId);

        if (!template) {
            return res.status(400).json({ error: 'Invalid template ID' });
        }

        // Prepare template data
        const appUrl = process.env.APP_URL || process.env.CLIENT_URL || 'http://localhost:4000';
        const templateData = {
            clientName: client.name || 'Valued Client',
            contractTitle: contract.title || 'Contract',
            startDate: contract.startDate ? new Date(contract.startDate).toLocaleDateString() : 'TBD',
            endDate: contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'TBD',
            amount: parseFloat(contract.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            contractLink: `${appUrl}/contracts/${contract.id}`,
            signatureLink: `${appUrl}/contracts/${contract.id}/sign`,
            renewalLink: `${appUrl}/contracts/${contract.id}/renew`,
            paymentLink: `${appUrl}/contracts/${contract.id}/payment`,
            businessName: business.businessName || business.name || 'Our Company',
            daysRemaining: contract.endDate ? Math.ceil((new Date(contract.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0,
            renewalPeriod: '1 Year',
            paymentAmount: parseFloat(contract.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            dueDate: new Date().toLocaleDateString()
        };

        // Replace variables in template
        const { subject, body } = replaceTemplateVariables(template, templateData);

        // Add custom message if provided
        let finalBody = body;
        if (customMessage) {
            finalBody = body.replace('</div>\n        <div class="footer">',
                `</div>\n        <div style="background: #eff6ff; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #3b82f6;"><p style="margin: 0; font-weight: 600; color: #1e40af;">Personal Message:</p><p style="margin: 10px 0 0 0;">${customMessage}</p></div>\n        <div class="footer">`);
        }

        // Send email
        const { sendEmail } = require('../utils/emailService');
        const emailResult = await sendEmail({
            to: recipientEmail || client.email,
            cc: ccEmails,
            bcc: bccEmails,
            subject,
            html: finalBody
        });

        if (!emailResult.success) {
            return res.status(500).json({ error: 'Failed to send email', details: emailResult.error });
        }

        // Store email history
        const emailRecord = {
            id: `email-${Date.now()}`,
            contractId: contract.id,
            templateId,
            recipientEmail: recipientEmail || client.email,
            ccEmails: ccEmails || [],
            bccEmails: bccEmails || [],
            subject,
            sentAt: new Date().toISOString(),
            sentBy: req.user?.uid || req.user?.id,
            status: 'sent'
        };

        if (useFirestore) {
            await setDoc('contractEmails', emailRecord.id, emailRecord);
        } else {
            // Store in JSON file
            const emailsPath = path.join(__dirname, '..', 'data', 'contractEmails.json');
            try {
                let emails = [];
                try {
                    const data = await fs.readFile(emailsPath, 'utf8');
                    emails = JSON.parse(data);
                } catch (e) {
                    // File doesn't exist yet
                }
                emails.push(emailRecord);
                await fs.mkdir(path.dirname(emailsPath), { recursive: true });
                await fs.writeFile(emailsPath, JSON.stringify(emails, null, 2));
            } catch (error) {
                console.error('Error saving email history:', error);
            }
        }

        res.json({
            success: true,
            message: 'Email sent successfully',
            emailId: emailRecord.id
        });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Failed to send email', details: error.message });
    }
});

// GET /api/contracts/:id/email-history - Get email history for contract
router.get('/:id/email-history', async (req, res) => {
    try {
        const businessId = req.user?.businessId;

        // Verify contract access
        let contract;
        if (useFirestore) {
            contract = await getDoc('contracts', req.params.id);
        } else {
            const contracts = await readContracts();
            contract = contracts.find(c => c.id === req.params.id);
        }

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        if (businessId && contract.businessId !== businessId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get email history
        let emails = [];
        if (useFirestore) {
            const snapshot = await getCollectionRef('contractEmails')
                .where('contractId', '==', req.params.id)
                .orderBy('sentAt', 'desc')
                .get();
            snapshot.forEach(doc => emails.push({ id: doc.id, ...doc.data() }));
        } else {
            const emailsPath = path.join(__dirname, '..', 'data', 'contractEmails.json');
            try {
                const data = await fs.readFile(emailsPath, 'utf8');
                const allEmails = JSON.parse(data);
                emails = allEmails.filter(e => e.contractId === req.params.id)
                    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
            } catch (error) {
                // No emails yet
            }
        }

        res.json(emails);
    } catch (error) {
        console.error('Error fetching email history:', error);
        res.status(500).json({ error: 'Failed to fetch email history' });
    }
});

// GET /api/contracts/email-templates - Get all email templates
router.get('/email-templates/list', async (req, res) => {
    try {
        const { getTemplateList } = require('../utils/contractEmailTemplates');
        const templates = getTemplateList();
        res.json(templates);
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

// ==================== SIGNATURE ENDPOINTS ====================

const {
    generateSignatureToken,
    validateSignatureData,
    createSignatureRecord,
    createAuditLogEntry,
    updateContractSignatureStatus,
    verifySignatureToken
} = require('../utils/signatureUtils');

// POST /api/contracts/:id/request-signature - Request signature from client
router.post('/:id/request-signature', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const { signerEmail, signerName, signerType, message, deadline } = req.body;

        // Get contract
        let contract;
        if (useFirestore) {
            contract = await getDoc('contracts', req.params.id);
        } else {
            const contracts = await readContracts();
            contract = contracts.find(c => c.id === req.params.id);
        }

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        if (businessId && contract.businessId !== businessId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Generate secure token
        const token = generateSignatureToken(contract.id, signerEmail);

        // Create signature request
        const signatureRequest = {
            contractId: contract.id,
            signerEmail,
            signerName,
            signerType: signerType || 'client',
            token,
            requestedAt: new Date().toISOString(),
            requestedBy: req.user?.uid || req.user?.id,
            deadline: deadline || null,
            status: 'pending',
            message: message || ''
        };

        // Store token (in production, store in database with expiration)
        // For now, we'll include it in the response

        // Update contract with required signers
        const updatedContract = {
            ...contract,
            signatureRequired: true,
            requiredSigners: contract.requiredSigners || []
        };

        // Add signer if not already in list
        const existingSigner = updatedContract.requiredSigners.find(
            s => s.email.toLowerCase() === signerEmail.toLowerCase()
        );

        if (!existingSigner) {
            updatedContract.requiredSigners.push({
                type: signerType || 'client',
                email: signerEmail,
                name: signerName,
                signed: false,
                signedAt: null
            });
        }

        // Save updated contract
        if (useFirestore) {
            await setDoc('contracts', contract.id, updatedContract);
        } else {
            const contracts = await readContracts();
            const index = contracts.findIndex(c => c.id === contract.id);
            if (index !== -1) {
                contracts[index] = updatedContract;
                await saveContracts(contracts);
            }
        }

        // Create audit log
        const auditEntry = createAuditLogEntry(
            'signature_requested',
            contract.id,
            req.user?.email || req.user?.uid,
            req,
            { signerEmail, signerName, signerType }
        );

        if (useFirestore) {
            await setDoc('signatureAuditLog', auditEntry.id, auditEntry);
        }

        // Send email notification
        const { sendEmail } = require('../utils/emailService');
        const appUrl = process.env.APP_URL || process.env.CLIENT_URL || 'http://localhost:4000';
        const signatureLink = `${appUrl}/contracts/${contract.id}/sign/${token}`;

        await sendEmail({
            to: signerEmail,
            subject: `Signature Required: ${contract.title}`,
            html: `
                <h2>Signature Request</h2>
                <p>Hello ${signerName},</p>
                <p>You have been requested to sign the following contract:</p>
                <p><strong>${contract.title}</strong></p>
                ${message ? `<p><em>${message}</em></p>` : ''}
                <p><a href="${signatureLink}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Sign Contract</a></p>
                <p>This link will expire in 30 days.</p>
            `
        });

        res.json({
            success: true,
            message: 'Signature request sent',
            signatureLink,
            token
        });
    } catch (error) {
        console.error('Error requesting signature:', error);
        res.status(500).json({ error: 'Failed to request signature', details: error.message });
    }
});

// POST /api/contracts/:id/signatures - Submit signature
router.post('/:id/signatures', async (req, res) => {
    try {
        const { signatureData, signerName, signerEmail, signerType, consentGiven, token } = req.body;

        // Validate signature data
        const validation = validateSignatureData(signatureData);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Verify token (in production, check database)
        if (!verifySignatureToken(token, req.params.id)) {
            return res.status(401).json({ error: 'Invalid or expired signature token' });
        }

        // Get contract
        let contract;
        if (useFirestore) {
            contract = await getDoc('contracts', req.params.id);
        } else {
            const contracts = await readContracts();
            contract = contracts.find(c => c.id === req.params.id);
        }

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        // Create signature record
        const signatureRecord = createSignatureRecord({
            contractId: contract.id,
            signatureData,
            signerName,
            signerEmail,
            signerType,
            consentGiven
        }, req);

        // Save signature
        if (useFirestore) {
            await setDoc('contractSignatures', signatureRecord.id, signatureRecord);
        } else {
            const signaturesPath = path.join(__dirname, '..', 'data', 'contractSignatures.json');
            try {
                let signatures = [];
                try {
                    const data = await fs.readFile(signaturesPath, 'utf8');
                    signatures = JSON.parse(data);
                } catch (e) {
                    // File doesn't exist yet
                }
                signatures.push(signatureRecord);
                await fs.mkdir(path.dirname(signaturesPath), { recursive: true });
                await fs.writeFile(signaturesPath, JSON.stringify(signatures, null, 2));
            } catch (error) {
                console.error('Error saving signature:', error);
            }
        }

        // Update contract required signers
        const updatedContract = { ...contract };
        if (updatedContract.requiredSigners) {
            const signerIndex = updatedContract.requiredSigners.findIndex(
                s => s.email.toLowerCase() === signerEmail.toLowerCase()
            );
            if (signerIndex !== -1) {
                updatedContract.requiredSigners[signerIndex].signed = true;
                updatedContract.requiredSigners[signerIndex].signedAt = signatureRecord.signedAt;
            }
        }

        // Update signature status
        const allSignatures = [signatureRecord]; // In production, fetch all signatures
        updatedContract.signatureStatus = updateContractSignatureStatus(contract, allSignatures);

        // Save updated contract
        if (useFirestore) {
            await setDoc('contracts', contract.id, updatedContract);
        } else {
            const contracts = await readContracts();
            const index = contracts.findIndex(c => c.id === contract.id);
            if (index !== -1) {
                contracts[index] = updatedContract;
                await saveContracts(contracts);
            }
        }

        // Create audit log
        const auditEntry = createAuditLogEntry(
            'signature_completed',
            contract.id,
            signerEmail,
            req,
            { signerName, signerType }
        );

        if (useFirestore) {
            await setDoc('signatureAuditLog', auditEntry.id, auditEntry);
        }

        res.json({
            success: true,
            message: 'Signature saved successfully',
            signatureId: signatureRecord.id,
            signatureStatus: updatedContract.signatureStatus
        });
    } catch (error) {
        console.error('Error saving signature:', error);
        res.status(500).json({ error: 'Failed to save signature', details: error.message });
    }
});

// GET /api/contracts/:id/signatures - Get all signatures for contract
router.get('/:id/signatures', async (req, res) => {
    try {
        const businessId = req.user?.businessId;

        // Verify contract access
        let contract;
        if (useFirestore) {
            contract = await getDoc('contracts', req.params.id);
        } else {
            const contracts = await readContracts();
            contract = contracts.find(c => c.id === req.params.id);
        }

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        if (businessId && contract.businessId !== businessId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get signatures
        let signatures = [];
        if (useFirestore) {
            const snapshot = await getCollectionRef('contractSignatures')
                .where('contractId', '==', req.params.id)
                .orderBy('signedAt', 'desc')
                .get();
            snapshot.forEach(doc => signatures.push({ id: doc.id, ...doc.data() }));
        } else {
            const signaturesPath = path.join(__dirname, '..', 'data', 'contractSignatures.json');
            try {
                const data = await fs.readFile(signaturesPath, 'utf8');
                const allSignatures = JSON.parse(data);
                signatures = allSignatures.filter(s => s.contractId === req.params.id)
                    .sort((a, b) => new Date(b.signedAt) - new Date(a.signedAt));
            } catch (error) {
                // No signatures yet
            }
        }

        res.json(signatures);
    } catch (error) {
        console.error('Error fetching signatures:', error);
        res.status(500).json({ error: 'Failed to fetch signatures' });
    }
});

// GET /api/contracts/:id/audit-trail - Get audit trail for contract
router.get('/:id/audit-trail', async (req, res) => {
    try {
        const businessId = req.user?.businessId;

        // Verify contract access
        let contract;
        if (useFirestore) {
            contract = await getDoc('contracts', req.params.id);
        } else {
            const contracts = await readContracts();
            contract = contracts.find(c => c.id === req.params.id);
        }

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        if (businessId && contract.businessId !== businessId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get audit logs
        let auditLogs = [];
        if (useFirestore) {
            const snapshot = await getCollectionRef('signatureAuditLog')
                .where('contractId', '==', req.params.id)
                .orderBy('timestamp', 'desc')
                .get();
            snapshot.forEach(doc => auditLogs.push({ id: doc.id, ...doc.data() }));
        } else {
            const auditPath = path.join(__dirname, '..', 'data', 'signatureAuditLog.json');
            try {
                const data = await fs.readFile(auditPath, 'utf8');
                const allLogs = JSON.parse(data);
                auditLogs = allLogs.filter(log => log.contractId === req.params.id)
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            } catch (error) {
                // No logs yet
            }
        }

        res.json(auditLogs);
    } catch (error) {
        console.error('Error fetching audit trail:', error);
        res.status(500).json({ error: 'Failed to fetch audit trail' });
    }
});

module.exports = router;


