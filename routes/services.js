const express = require('express');
const router = express.Router();
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getCollectionRef, getDoc, setDoc, deleteDoc } = require(path.join(__dirname, "..", "utils", "db"));
const { validateRequest, serviceSchema } = require('../utils/validation');
const { paginate } = require('../utils/pagination');

const readServices = async (businessId = null) => {
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
};

router.get('/', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        if (!businessId) {
            return res.status(400).json({ error: 'Business ID required' });
        }

        // Reverted to fetch all services to prevent frontend crash
        // const result = await paginate({ query, req, allowedFilters: ['category', 'recurring'] });
        const result = await readServices(businessId);

        res.json(result);
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ error: 'Failed to fetch services' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const service = await getDoc('services', req.params.id);
        if (!service) {
            return res.status(404).json({ error: 'Service not found' });
        }
        if (req.user?.businessId && service.businessId !== req.user.businessId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json(service);
    } catch (error) {
        console.error('Error fetching service:', error);
        res.status(500).json({ error: 'Failed to fetch service' });
    }
});

router.post('/', validateRequest(serviceSchema), async (req, res) => {
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

        await setDoc('services', id, newService);
        res.status(201).json(newService);
    } catch (error) {
        console.error('Error creating service:', error);
        res.status(500).json({ error: 'Failed to create service' });
    }
});

router.put('/:id', validateRequest(serviceSchema), async (req, res) => {
    try {
        const businessId = req.user?.businessId;
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
    } catch (error) {
        console.error('Error updating service:', error);
        res.status(500).json({ error: 'Failed to update service' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const service = await getDoc('services', req.params.id);
        if (!service) {
            return res.status(404).json({ error: 'Service not found' });
        }
        if (businessId && service.businessId !== businessId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        await deleteDoc('services', req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting service:', error);
        res.status(500).json({ error: 'Failed to delete service' });
    }
});

module.exports = router;
