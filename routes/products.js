const express = require('express');
const router = express.Router();
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getCollectionRef, getDoc, setDoc, deleteDoc } = require(path.join(__dirname, "..", "utils", "db"));
const { validateRequest, productSchema } = require('../utils/validation');
const { paginate } = require('../utils/pagination');

const readProducts = async (businessId = null) => {
    try {
        let query = getCollectionRef('products');
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

        // Reverted to fetch all products to prevent frontend crash (frontend expects array)
        // const result = await paginate({ query, req, allowedFilters: ['category'] });
        const result = await readProducts(businessId);

        res.json(result);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const product = await getDoc('products', req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        if (req.user?.businessId && product.businessId !== req.user.businessId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json(product);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

router.post('/', validateRequest(productSchema), async (req, res) => {
    try {
        const businessId = req.user?.businessId || req.body.businessId;
        if (!businessId) {
            return res.status(400).json({ error: 'Business ID is required' });
        }

        const id = uuidv4();
        const newProduct = {
            id,
            businessId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...req.body
        };

        await setDoc('products', id, newProduct);
        res.status(201).json(newProduct);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

router.put('/:id', validateRequest(productSchema), async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const existing = await getDoc('products', req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Product not found' });
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

        await setDoc('products', req.params.id, updated);
        res.json(updated);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const product = await getDoc('products', req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        if (businessId && product.businessId !== businessId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        await deleteDoc('products', req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

module.exports = router;
