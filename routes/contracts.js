const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
const { useFirestore, getCollectionRef, getDoc, setDoc, deleteDoc } = require(path.join(__dirname, "..", "utils", "db"));

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
        const businessId = req.user?.businessId || req.body.businessId;
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

module.exports = router;
