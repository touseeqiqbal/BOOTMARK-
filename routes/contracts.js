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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'draft',
            ...req.body
        };

        if (useFirestore) {
            await setDoc('contracts', id, newContract);
        } else {
            const contracts = await readContracts();
            contracts.push(newContract);
            await saveContracts(contracts);
        }

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

            // Send PDF
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="contract-${contract.id}.pdf"`);
            res.send(pdfBuffer);
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

module.exports = router;
