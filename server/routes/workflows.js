const express = require('express');
const router = express.Router();
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const {
    getCollectionRef,
    getDoc,
    setDoc,
    deleteDoc,
    queryByFieldIn
} = require(path.join(__dirname, "..", "utils", "db"));

// Helper: Ensure business ID is present
const requireBusinessId = (req, res, next) => {
    const businessId = req.user?.businessId || req.user?.uid || req.user?.id;
    if (!businessId) {
        return res.status(400).json({ error: 'Business ID is required' });
    }
    req.businessId = businessId;
    next();
};

// GET all workflows for the authenticated business
router.get('/', requireBusinessId, async (req, res) => {
    try {
        const query = getCollectionRef('workflows').where('businessId', '==', req.businessId);
        const snapshot = await query.get();
        const workflows = [];
        snapshot.forEach(doc => workflows.push({ id: doc.id, ...doc.data() }));
        res.json(workflows);
    } catch (error) {
        console.error('Error fetching workflows:', error);
        res.status(500).json({ error: 'Failed to fetch workflows' });
    }
});

// GET single workflow
router.get('/:id', requireBusinessId, async (req, res) => {
    try {
        const workflow = await getDoc('workflows', req.params.id);

        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        // Enforce business tenant isolation
        if (workflow.businessId !== req.businessId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(workflow);
    } catch (error) {
        console.error('Error fetching workflow:', error);
        res.status(500).json({ error: 'Failed to fetch workflow' });
    }
});

// POST create new workflow
router.post('/', requireBusinessId, async (req, res) => {
    try {
        const { name, description, stages, isDefault } = req.body;

        if (!name || !stages || !Array.isArray(stages) || stages.length === 0) {
            return res.status(400).json({ error: 'Name and at least one stage are required' });
        }

        // If setting as default, unset other defaults first (optional logic, can be handled in UI or here)
        // For simplicity, we'll handle single default logic if requested, but for now just save.

        const id = uuidv4();
        const newWorkflow = {
            id,
            businessId: req.businessId,
            name,
            description: description || '',
            stages: stages.map(stage => ({
                id: stage.id || uuidv4(),
                name: stage.name,
                color: stage.color || '#cccccc',
                type: stage.type || 'custom',
                order: stage.order || 0
            })), // Sanitize and ensure IDs
            isDefault: !!isDefault,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await setDoc('workflows', id, newWorkflow);
        res.status(201).json(newWorkflow);
    } catch (error) {
        console.error('Error creating workflow:', error);
        res.status(500).json({ error: 'Failed to create workflow' });
    }
});

// PUT update workflow
router.put('/:id', requireBusinessId, async (req, res) => {
    try {
        const existing = await getDoc('workflows', req.params.id);

        if (!existing) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        if (existing.businessId !== req.businessId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { name, description, stages, isDefault } = req.body;

        const updatedWorkflow = {
            ...existing,
            name: name || existing.name,
            description: description !== undefined ? description : existing.description,
            stages: stages ? stages.map(stage => ({
                id: stage.id || uuidv4(),
                name: stage.name,
                color: stage.color || '#cccccc',
                type: stage.type || 'custom',
                order: stage.order || 0
            })) : existing.stages,
            isDefault: isDefault !== undefined ? isDefault : existing.isDefault,
            updatedAt: new Date().toISOString()
        };

        await setDoc('workflows', req.params.id, updatedWorkflow);
        res.json(updatedWorkflow);
    } catch (error) {
        console.error('Error updating workflow:', error);
        res.status(500).json({ error: 'Failed to update workflow' });
    }
});

// DELETE workflow
router.delete('/:id', requireBusinessId, async (req, res) => {
    try {
        const existing = await getDoc('workflows', req.params.id);

        if (!existing) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        if (existing.businessId !== req.businessId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Check availability - Prevent deletion if Work Orders are using it
        // This query might need an index
        const linkedOrdersRef = getCollectionRef('workOrders')
            .where('businessId', '==', req.businessId)
            .where('workflowId', '==', req.params.id)
            .limit(1);

        const linkedOrdersSnapshot = await linkedOrdersRef.get();
        if (!linkedOrdersSnapshot.empty) {
            return res.status(400).json({ error: 'Cannot delete workflow that is in use by active Work Orders.' });
        }

        await deleteDoc('workflows', req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting workflow:', error);
        res.status(500).json({ error: 'Failed to delete workflow' });
    }
});

module.exports = router;
