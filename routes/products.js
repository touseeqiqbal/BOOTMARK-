const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
const { useFirestore, getCollectionRef, getDoc, setDoc, deleteDoc } = require(path.join(__dirname, "..", "utils", "db"));

function getProductsFilePath() {
    return getDataFilePath("products.json");
}

const readProducts = async (businessId = null) => {
    if (useFirestore) {
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
    }

    const DATA_FILE = getProductsFilePath();
    try {
        await fs.access(DATA_FILE);
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

const saveProducts = async (products) => {
    if (useFirestore) return;
    const DATA_FILE = getProductsFilePath();
    const dir = path.dirname(DATA_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(products, null, 2));
};

router.get('/', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const products = await readProducts(businessId);
        res.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        if (useFirestore) {
            const product = await getDoc('products', req.params.id);
            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }
            if (req.user?.businessId && product.businessId !== req.user.businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            res.json(product);
        } else {
            const products = await readProducts();
            const product = products.find(p => p.id === req.params.id);
            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }
            if (req.user?.businessId && product.businessId !== req.user.businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            res.json(product);
        }
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

router.post('/', async (req, res) => {
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

        if (useFirestore) {
            await setDoc('products', id, newProduct);
        } else {
            const products = await readProducts();
            products.push(newProduct);
            await saveProducts(products);
        }

        res.status(201).json(newProduct);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const businessId = req.user?.businessId;

        if (useFirestore) {
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
        } else {
            const products = await readProducts();
            const index = products.findIndex(p => p.id === req.params.id);
            if (index === -1) {
                return res.status(404).json({ error: 'Product not found' });
            }
            if (businessId && products[index].businessId !== businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            products[index] = {
                ...products[index],
                ...req.body,
                businessId: products[index].businessId,
                updatedAt: new Date().toISOString()
            };

            await saveProducts(products);
            res.json(products[index]);
        }
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const businessId = req.user?.businessId;

        if (useFirestore) {
            const product = await getDoc('products', req.params.id);
            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }
            if (businessId && product.businessId !== businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            await deleteDoc('products', req.params.id);
        } else {
            const products = await readProducts();
            const product = products.find(p => p.id === req.params.id);
            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }
            if (businessId && product.businessId !== businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            const filtered = products.filter(p => p.id !== req.params.id);
            await saveProducts(filtered);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

module.exports = router;
