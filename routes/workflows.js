const express = require('express');
const router = express.Router();
const { db, getDoc, setDoc, deleteDoc } = require('../utils/db');
const crypto = require('crypto');
const { validateRequest, jobWorkflowSchema } = require('../utils/validation');

// Helper to generate IDs if crypto.randomUUID is not available (Node < 15.6)
const generateId = () => {
    if (crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Helper to sanitize workflow data
const sanitizeWorkflow = (data) => {
    return {
        name: data.name,
        description: data.description || '',
        isDefault: data.isDefault || false,
        stages: Array.isArray(data.stages) ? data.stages.map(s => ({
            id: s.id || generateId(),
            name: s.name,
            color: s.color || '#6b7280',
            type: s.type || 'custom',
            order: s.order || 0
        })) : [],
        updatedAt: new Date().toISOString()
    };
};

// GET / - List all workflows for the business
router.get('/', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ error: 'User does not belong to a business' });
        }

        const workflowsRef = db.collection('workflows');
        const snapshot = await workflowsRef.where('businessId', '==', businessId).get();

        const workflows = [];
        snapshot.forEach(doc => {
            workflows.push({ id: doc.id, ...doc.data() });
        });

        res.json(workflows);
    } catch (error) {
        console.error('Error fetching workflows:', error);
        res.status(500).json({ error: 'Failed to fetch workflows: ' + error.message });
    }
});

// GET /:id - Get a specific workflow
router.get('/:id', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const workflow = await getDoc('workflows', req.params.id);

        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        if (workflow.businessId !== businessId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        res.json(workflow);
    } catch (error) {
        console.error('Error fetching workflow:', error);
        res.status(500).json({ error: 'Failed to fetch workflow: ' + error.message });
    }
});

// POST / - Create a new workflow
router.post('/', validateRequest(jobWorkflowSchema), async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ error: 'User does not belong to a business' });
        }

        // If this one is set as default, unset others
        if (req.body.isDefault) {
            const workflowsRef = db.collection('workflows');
            const batch = db.batch();
            const snapshot = await workflowsRef.where('businessId', '==', businessId).where('isDefault', '==', true).get();
            snapshot.forEach(doc => {
                batch.update(doc.ref, { isDefault: false });
            });
            await batch.commit();
        }

        const newWorkflow = {
            id: generateId(),
            businessId,
            ...sanitizeWorkflow(req.body),
            createdAt: new Date().toISOString()
        };

        // Use setDoc instead of addDoc because we have the ID and utils/db sets document by ID
        await setDoc('workflows', newWorkflow.id, newWorkflow);
        res.status(201).json(newWorkflow);
    } catch (error) {
        console.error('Error creating workflow:', error);
        res.status(500).json({ error: 'Failed to create workflow: ' + error.message });
    }
});

// PUT /:id - Update a workflow
router.put('/:id', validateRequest(jobWorkflowSchema), async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const workflowId = req.params.id;

        const existing = await getDoc('workflows', workflowId);
        if (!existing) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        if (existing.businessId !== businessId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // If setting as default, unset others
        if (req.body.isDefault && !existing.isDefault) {
            const workflowsRef = db.collection('workflows');
            const batch = db.batch();
            const snapshot = await workflowsRef.where('businessId', '==', businessId).where('isDefault', '==', true).get();
            snapshot.forEach(doc => {
                if (doc.id !== workflowId) {
                    batch.update(doc.ref, { isDefault: false });
                }
            });
            await batch.commit();
        }

        const updates = sanitizeWorkflow(req.body);

        // Use direct update because setDoc in utils/db assumes overwrite (merge: false)
        await db.collection('workflows').doc(workflowId).update(updates);

        res.json({ id: workflowId, ...existing, ...updates });
    } catch (error) {
        console.error('Error updating workflow:', error);
        res.status(500).json({ error: 'Failed to update workflow: ' + error.message });
    }
});

// DELETE /:id - Delete a workflow
router.delete('/:id', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const workflowId = req.params.id;

        const existing = await getDoc('workflows', workflowId);
        if (!existing) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        if (existing.businessId !== businessId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await deleteDoc('workflows', workflowId);
        res.json({ message: 'Workflow deleted' });
    } catch (error) {
        console.error('Error deleting workflow:', error);
        res.status(500).json({ error: 'Failed to delete workflow: ' + error.message });
    }
});

module.exports = router;
