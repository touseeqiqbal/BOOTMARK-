const express = require('express');
const router = express.Router();
const { getCollectionRef, getDoc, setDoc, deleteDoc, admin } = require('../utils/db');
const { validateRequest, contractTemplateSchema } = require('../utils/validation');

// ============================================
// CONTRACT TEMPLATES
// ============================================

// GET /api/contract-templates
// List all templates (Default Hardcoded + Custom DB)
router.get('/', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        if (!businessId) return res.status(400).json({ error: 'Business ID required' });

        // 1. Fetch Custom Templates from DB
        const snap = await getCollectionRef('contractTemplates')
            .where('businessId', '==', businessId)
            .where('isActive', '==', true)
            .get();

        const customTemplates = [];
        snap.forEach(doc => customTemplates.push({ id: doc.id, ...doc.data(), type: 'custom' }));

        // 2. Default Templates (Hardcoded for now, but served via API)
        // In a real app, these might also be in DB or a separate file
        const defaultTemplates = [
            {
                id: 'service-agreement',
                name: 'Service Agreement',
                description: 'Ongoing service contracts with recurring deliverables',
                icon: '🔧',
                color: '#3b82f6',
                defaultDuration: 12,
                billingFrequency: 'monthly',
                autoRenewal: true,
                type: 'system',
                terms: `SERVICE AGREEMENT\n\nThis Service Agreement ("Agreement") is entered into as of [START_DATE]...`
            },
            {
                id: 'maintenance-contract',
                name: 'Maintenance Contract',
                description: 'Regular maintenance and support agreements',
                icon: '🛠️',
                color: '#10b981',
                defaultDuration: 12,
                billingFrequency: 'monthly',
                autoRenewal: true,
                type: 'system',
                terms: `MAINTENANCE CONTRACT\n\nThis Maintenance Contract ("Contract") is entered into as of [START_DATE]...`
            },
            {
                id: 'project-contract',
                name: 'Project Contract',
                description: 'One-time project-based contracts with milestones',
                icon: '📋',
                color: '#8b5cf6',
                defaultDuration: 6,
                billingFrequency: 'milestone',
                autoRenewal: false,
                type: 'system',
                terms: `PROJECT CONTRACT\n\nThis Project Contract ("Contract") is entered into as of [START_DATE]...`
            }
        ];

        // Merge: Custom overrides Default if IDs match (though IDs should be unique)
        const allTemplates = [...defaultTemplates, ...customTemplates];

        res.json(allTemplates);
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

// GET /api/contract-templates/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const businessId = req.user?.businessId;

        // Check DB first
        const doc = await getDoc('contractTemplates', id);
        if (doc) {
            if (doc.businessId !== businessId) return res.status(403).json({ error: 'Access denied' });
            return res.json(doc);
        }

        // Check defaults
        const defaultTemplates = [
            'service-agreement', 'maintenance-contract', 'project-contract'
        ]; // Simplified check
        // In reality, we'd fetch the full object again or store defaults centrally

        return res.status(404).json({ error: 'Template not found' });
    } catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({ error: 'Failed to fetch template' });
    }
});

// POST /api/contract-templates
router.post('/', validateRequest(contractTemplateSchema), async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        if (!businessId) return res.status(400).json({ error: 'Business ID required' });

        const newTemplate = {
            id: `tpl_${Date.now()}`,
            businessId,
            ...req.body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await setDoc('contractTemplates', newTemplate.id, newTemplate);
        res.status(201).json(newTemplate);
    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({ error: 'Failed to create template' });
    }
});

// PUT /api/contract-templates/:id
router.put('/:id', validateRequest(contractTemplateSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const businessId = req.user?.businessId;

        const doc = await getDoc('contractTemplates', id);
        if (!doc) return res.status(404).json({ error: 'Template not found' });
        if (doc.businessId !== businessId) return res.status(403).json({ error: 'Access denied' });

        const updatedTemplate = {
            ...doc,
            ...req.body,
            updatedAt: new Date().toISOString()
        };

        await setDoc('contractTemplates', id, updatedTemplate);
        res.json(updatedTemplate);
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({ error: 'Failed to update template' });
    }
});

// DELETE /api/contract-templates/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const businessId = req.user?.businessId;

        const doc = await getDoc('contractTemplates', id);
        if (!doc) return res.status(404).json({ error: 'Template not found' });
        if (doc.businessId !== businessId) return res.status(403).json({ error: 'Access denied' });

        // Soft delete
        await setDoc('contractTemplates', id, { ...doc, isActive: false });
        // Or hard delete: await deleteDoc('contractTemplates', id);

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ error: 'Failed to delete template' });
    }
});

module.exports = router;
