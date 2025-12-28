const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
const { useFirestore, getCollectionRef, getDoc, setDoc, deleteDoc } = require(path.join(__dirname, "..", "utils", "db"));

function getServicesFilePath() {
    return getDataFilePath("services.json");
}

const readServices = async (businessId = null) => {
    if (useFirestore) {
        try {
            let query = getCollectionRef('services');
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

    const DATA_FILE = getServicesFilePath();
    try {
        await fs.access(DATA_FILE);
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

const saveServices = async (services) => {
    if (useFirestore) return;
    const DATA_FILE = getServicesFilePath();
    const dir = path.dirname(DATA_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(services, null, 2));
};

router.get('/', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const services = await readServices(businessId);
        res.json(services);
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ error: 'Failed to fetch services' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        if (useFirestore) {
            const service = await getDoc('services', req.params.id);
            if (!service) {
                return res.status(404).json({ error: 'Service not found' });
            }
            if (req.user?.businessId && service.businessId !== req.user.businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            res.json(service);
        } else {
            const services = await readServices();
            const service = services.find(s => s.id === req.params.id);
            if (!service) {
                return res.status(404).json({ error: 'Service not found' });
            }
            if (req.user?.businessId && service.businessId !== req.user.businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            res.json(service);
        }
    } catch (error) {
        console.error('Error fetching service:', error);
        res.status(500).json({ error: 'Failed to fetch service' });
    }
});

router.post('/', async (req, res) => {
    try {
        const businessId = req.user?.businessId || req.body.businessId;
        if (!businessId) {
            return res.status(400).json({ error: 'Business ID is required' });
        }

        const id = uuidv4();
        const newService = {
            id,
            businessId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...req.body
        };

        if (useFirestore) {
            await setDoc('services', id, newService);
        } else {
            const services = await readServices();
            services.push(newService);
            await saveServices(services);
        }

        res.status(201).json(newService);
    } catch (error) {
        console.error('Error creating service:', error);
        res.status(500).json({ error: 'Failed to create service' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const businessId = req.user?.businessId;

        if (useFirestore) {
            const existing = await getDoc('services', req.params.id);
            if (!existing) {
                return res.status(404).json({ error: 'Service not found' });
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

            await setDoc('services', req.params.id, updated);
            res.json(updated);
        } else {
            const services = await readServices();
            const index = services.findIndex(s => s.id === req.params.id);
            if (index === -1) {
                return res.status(404).json({ error: 'Service not found' });
            }
            if (businessId && services[index].businessId !== businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            services[index] = {
                ...services[index],
                ...req.body,
                businessId: services[index].businessId,
                updatedAt: new Date().toISOString()
            };

            await saveServices(services);
            res.json(services[index]);
        }
    } catch (error) {
        console.error('Error updating service:', error);
        res.status(500).json({ error: 'Failed to update service' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const businessId = req.user?.businessId;

        if (useFirestore) {
            const service = await getDoc('services', req.params.id);
            if (!service) {
                return res.status(404).json({ error: 'Service not found' });
            }
            if (businessId && service.businessId !== businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            await deleteDoc('services', req.params.id);
        } else {
            const services = await readServices();
            const service = services.find(s => s.id === req.params.id);
            if (!service) {
                return res.status(404).json({ error: 'Service not found' });
            }
            if (businessId && service.businessId !== businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            const filtered = services.filter(s => s.id !== req.params.id);
            await saveServices(filtered);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting service:', error);
        res.status(500).json({ error: 'Failed to delete service' });
    }
});

module.exports = router;
