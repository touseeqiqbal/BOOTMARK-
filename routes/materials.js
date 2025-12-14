const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDataFilePath } = require(path.join(__dirname, "..", "utils", "dataPath"));
const { useFirestore, getCollectionRef, getDoc, setDoc, deleteDoc } = require(path.join(__dirname, "..", "utils", "db"));

function getMaterialsFilePath() {
    return getDataFilePath("materials.json");
}

const readMaterials = async (businessId = null) => {
    if (useFirestore) {
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
    }

    const DATA_FILE = getMaterialsFilePath();
    try {
        await fs.access(DATA_FILE);
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

const saveMaterials = async (materials) => {
    if (useFirestore) return;
    const DATA_FILE = getMaterialsFilePath();
    const dir = path.dirname(DATA_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(materials, null, 2));
};

router.get('/', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const materials = await readMaterials(businessId);
        res.json(materials);
    } catch (error) {
        console.error('Error fetching materials:', error);
        res.status(500).json({ error: 'Failed to fetch materials' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        if (useFirestore) {
            const material = await getDoc('materials', req.params.id);
            if (!material) {
                return res.status(404).json({ error: 'Material not found' });
            }
            if (req.user?.businessId && material.businessId !== req.user.businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            res.json(material);
        } else {
            const materials = await readMaterials();
            const material = materials.find(m => m.id === req.params.id);
            if (!material) {
                return res.status(404).json({ error: 'Material not found' });
            }
            if (req.user?.businessId && material.businessId !== req.user.businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            res.json(material);
        }
    } catch (error) {
        console.error('Error fetching material:', error);
        res.status(500).json({ error: 'Failed to fetch material' });
    }
});

router.post('/', async (req, res) => {
    try {
        const businessId = req.user?.businessId || req.user?.uid || req.user?.id || req.body.businessId;
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

        if (useFirestore) {
            await setDoc('materials', id, newMaterial);
        } else {
            const materials = await readMaterials();
            materials.push(newMaterial);
            await saveMaterials(materials);
        }

        res.status(201).json(newMaterial);
    } catch (error) {
        console.error('Error creating material:', error);
        res.status(500).json({ error: 'Failed to create material' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const businessId = req.user?.businessId;

        if (useFirestore) {
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
        } else {
            const materials = await readMaterials();
            const index = materials.findIndex(m => m.id === req.params.id);
            if (index === -1) {
                return res.status(404).json({ error: 'Material not found' });
            }
            if (businessId && materials[index].businessId !== businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            materials[index] = {
                ...materials[index],
                ...req.body,
                businessId: materials[index].businessId,
                updatedAt: new Date().toISOString()
            };

            await saveMaterials(materials);
            res.json(materials[index]);
        }
    } catch (error) {
        console.error('Error updating material:', error);
        res.status(500).json({ error: 'Failed to update material' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const businessId = req.user?.businessId;

        if (useFirestore) {
            const material = await getDoc('materials', req.params.id);
            if (!material) {
                return res.status(404).json({ error: 'Material not found' });
            }
            if (businessId && material.businessId !== businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            await deleteDoc('materials', req.params.id);
        } else {
            const materials = await readMaterials();
            const material = materials.find(m => m.id === req.params.id);
            if (!material) {
                return res.status(404).json({ error: 'Material not found' });
            }
            if (businessId && material.businessId !== businessId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            const filtered = materials.filter(m => m.id !== req.params.id);
            await saveMaterials(filtered);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting material:', error);
        res.status(500).json({ error: 'Failed to delete material' });
    }
});

module.exports = router;
