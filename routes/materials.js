const express = require('express');
const router = express.Router();
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getCollectionRef, getDoc, setDoc, deleteDoc } = require(path.join(__dirname, "..", "utils", "db"));
const { validateRequest, materialSchema } = require('../utils/validation');
const { paginate } = require('../utils/pagination');

const readMaterials = async (businessId = null) => {
    try {
        let query = getCollectionRef('materials');
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

        // Reverted to fetch all materials to prevent frontend crash
        // const result = await paginate({ query, req, allowedFilters: ['supplier'] });
        const result = await readMaterials(businessId);

        res.json(result);
    } catch (error) {
        console.error('Error fetching materials:', error);
        res.status(500).json({ error: 'Failed to fetch materials' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const material = await getDoc('materials', req.params.id);
        if (!material) {
            return res.status(404).json({ error: 'Material not found' });
        }
        if (req.user?.businessId && material.businessId !== req.user.businessId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json(material);
    } catch (error) {
        console.error('Error fetching material:', error);
        res.status(500).json({ error: 'Failed to fetch material' });
    }
});

router.post('/', validateRequest(materialSchema), async (req, res) => {
    try {
        const businessId = req.user?.businessId || req.body.businessId;
        if (!businessId) {
            return res.status(400).json({ error: 'Business ID is required' });
        }

        const id = uuidv4();
        const newMaterial = {
            id,
            businessId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...req.body
        };

        await setDoc('materials', id, newMaterial);
        res.status(201).json(newMaterial);
    } catch (error) {
        console.error('Error creating material:', error);
        res.status(500).json({ error: 'Failed to create material' });
    }
});

router.put('/:id', validateRequest(materialSchema), async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const existing = await getDoc('materials', req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Material not found' });
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

        await setDoc('materials', req.params.id, updated);
        res.json(updated);
    } catch (error) {
        console.error('Error updating material:', error);
        res.status(500).json({ error: 'Failed to update material' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const material = await getDoc('materials', req.params.id);
        if (!material) {
            return res.status(404).json({ error: 'Material not found' });
        }
        if (businessId && material.businessId !== businessId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        await deleteDoc('materials', req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting material:', error);
        res.status(500).json({ error: 'Failed to delete material' });
    }
});

module.exports = router;
