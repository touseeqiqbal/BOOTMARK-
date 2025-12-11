const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
const { useFirestore, getCollectionRef, getDoc, setDoc, deleteDoc } = require(path.join(__dirname, "..", "utils", "db"));

// Data file path (fallback)
function getWorkOrdersFilePath() {
    return getDataFilePath("workOrders.json");
}

// Helper: Read work orders
const readWorkOrders = async (businessId = null) => {
    if (useFirestore) {
        try {
            let query = getCollectionRef('workOrders');
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

    // Fallback to JSON
    const DATA_FILE = getWorkOrdersFilePath();
    try {
        await fs.access(DATA_FILE);
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

// Helper: Write work orders (JSON only)
const saveWorkOrders = async (orders) => {
    if (useFirestore) {
        // Not used when Firestore is enabled
        return;
    }
    const DATA_FILE = getWorkOrdersFilePath();
    const dir = path.dirname(DATA_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(orders, null, 2));
};

// GET all work orders
router.get('/', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const orders = await readWorkOrders(businessId);
        res.json(orders);
    } catch (error) {
        console.error('Error fetching work orders:', error);
        res.status(500).json({ error: 'Failed to fetch work orders' });
    }
});

// GET query filter
router.get('/query', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        let orders = await readWorkOrders(businessId);

        // Apply additional filters
        if (req.query.clientId) {
            orders = orders.filter(o => o.clientId === req.query.clientId);
        }
        if (req.query.status) {
            orders = orders.filter(o => o.status === req.query.status);
        }
        if (req.query.propertyId) {
            orders = orders.filter(o => o.propertyId === req.query.propertyId);
        }

        res.json(orders);
    } catch (error) {
        console.error('Error querying work orders:', error);
        res.status(500).json({ error: 'Failed to query work orders' });
    }
});

// GET single work order
router.get('/:id', async (req, res) => {
    try {
        if (useFirestore) {
            const order = await getDoc('workOrders', req.params.id);
            if (!order) {
                return res.status(404).json({ error: 'Work order not found' });
            }

            // Check business access
            if (req.user?.businessId && order.businessId !== req.user.businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            res.json(order);
        } else {
            const orders = await readWorkOrders();
            const order = orders.find(o => o.id === req.params.id);

            if (!order) {
                return res.status(404).json({ error: 'Work order not found' });
            }

            // Check business access
            if (req.user?.businessId && order.businessId !== req.user.businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            res.json(order);
        }
    } catch (error) {
        console.error('Error fetching work order:', error);
        res.status(500).json({ error: 'Failed to fetch work order' });
    }
});

// POST create work order
router.post('/', async (req, res) => {
    try {
        const businessId = req.user?.businessId || req.body.businessId;

        if (!businessId) {
            return res.status(400).json({ error: 'Business ID is required' });
        }

        if (!req.body.clientId) {
            return res.status(400).json({ error: 'Client ID is required' });
        }

        const id = uuidv4();
        const newOrder = {
            id,
            businessId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'draft', // draft, scheduled, in-progress, completed, invoiced, paid
            workOrderNumber: `WO-${Date.now().toString().slice(-6)}`,
            ...req.body
        };

        if (useFirestore) {
            await setDoc('workOrders', id, newOrder);
        } else {
            const orders = await readWorkOrders();
            orders.push(newOrder);
            await saveWorkOrders(orders);
        }

        res.status(201).json(newOrder);
    } catch (error) {
        console.error('Error creating work order:', error);
        res.status(500).json({ error: 'Failed to create work order' });
    }
});

// PUT update work order
router.put('/:id', async (req, res) => {
    try {
        const businessId = req.user?.businessId;

        if (useFirestore) {
            const existing = await getDoc('workOrders', req.params.id);

            if (!existing) {
                return res.status(404).json({ error: 'Work order not found' });
            }

            // Check business access
            if (businessId && existing.businessId !== businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            const updatedOrder = {
                ...existing,
                ...req.body,
                id: req.params.id,
                businessId: existing.businessId, // Prevent businessId from being changed
                updatedAt: new Date().toISOString()
            };

            await setDoc('workOrders', req.params.id, updatedOrder);
            res.json(updatedOrder);
        } else {
            const orders = await readWorkOrders();
            const index = orders.findIndex(o => o.id === req.params.id);

            if (index === -1) {
                return res.status(404).json({ error: 'Work order not found' });
            }

            // Check business access
            if (businessId && orders[index].businessId !== businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            orders[index] = {
                ...orders[index],
                ...req.body,
                businessId: orders[index].businessId, // Prevent businessId from being changed
                updatedAt: new Date().toISOString()
            };

            await saveWorkOrders(orders);
            res.json(orders[index]);
        }
    } catch (error) {
        console.error('Error updating work order:', error);
        res.status(500).json({ error: 'Failed to update work order' });
    }
});

// DELETE work order
router.delete('/:id', async (req, res) => {
    try {
        const businessId = req.user?.businessId;

        if (useFirestore) {
            const order = await getDoc('workOrders', req.params.id);

            if (!order) {
                return res.status(404).json({ error: 'Work order not found' });
            }

            // Check business access
            if (businessId && order.businessId !== businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            await deleteDoc('workOrders', req.params.id);
        } else {
            const orders = await readWorkOrders();
            const order = orders.find(o => o.id === req.params.id);

            if (!order) {
                return res.status(404).json({ error: 'Work order not found' });
            }

            // Check business access
            if (businessId && order.businessId !== businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            const filtered = orders.filter(o => o.id !== req.params.id);
            await saveWorkOrders(filtered);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting work order:', error);
        res.status(500).json({ error: 'Failed to delete work order' });
    }
});

module.exports = router;
