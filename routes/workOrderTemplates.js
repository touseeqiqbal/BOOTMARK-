const express = require('express');
const router = express.Router();
const { db } = require('../utils/db');
const { authRequired } = require('../middleware/auth');

// Get all work order templates for the business
router.get('/', authRequired, async (req, res) => {
    try {
        console.log('[WorkOrderTemplates] GET / - User:', req.user?.uid, 'BusinessId:', req.user?.businessId);
        const businessId = req.user?.businessId;

        if (!businessId) {
            console.error('[WorkOrderTemplates] No businessId found');
            return res.status(400).json({ error: 'Business registration required. Please register your business first.' });
        }

        const templatesRef = db.collection('workOrderTemplates');
        const snapshot = await templatesRef.where('businessId', '==', businessId).get();

        const templates = [];
        snapshot.forEach(doc => {
            templates.push({ id: doc.id, ...doc.data() });
        });

        console.log('[WorkOrderTemplates] Found', templates.length, 'templates');
        res.json(templates);
    } catch (error) {
        console.error('[WorkOrderTemplates] Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates', details: error.message });
    }
});

// Get a single work order template
router.get('/:id', authRequired, async (req, res) => {
    try {
        console.log('[WorkOrderTemplates] GET /:id - ID:', req.params.id);
        const businessId = req.user?.businessId;

        if (!businessId) {
            return res.status(400).json({ error: 'Business registration required' });
        }

        const templateDoc = await db.collection('workOrderTemplates').doc(req.params.id).get();

        if (!templateDoc.exists) {
            console.log('[WorkOrderTemplates] Template not found:', req.params.id);
            return res.status(404).json({ error: 'Template not found' });
        }

        const template = templateDoc.data();
        if (template.businessId !== businessId) {
            console.log('[WorkOrderTemplates] Access denied - wrong business');
            return res.status(403).json({ error: 'Access denied' });
        }

        console.log('[WorkOrderTemplates] Template found:', req.params.id);
        res.json({ id: templateDoc.id, ...template });
    } catch (error) {
        console.error('[WorkOrderTemplates] Error fetching template:', error);
        res.status(500).json({ error: 'Failed to fetch template', details: error.message });
    }
});

// Create a new work order template
router.post('/', authRequired, async (req, res) => {
    try {
        console.log('[WorkOrderTemplates] POST / - Creating template');
        console.log('[WorkOrderTemplates] User:', req.user?.uid, 'BusinessId:', req.user?.businessId);
        console.log('[WorkOrderTemplates] Body:', JSON.stringify(req.body, null, 2));

        const businessId = req.user?.businessId;
        if (!businessId) {
            console.error('[WorkOrderTemplates] No businessId found in user');
            return res.status(400).json({ error: 'Business registration required. Please register your business first.' });
        }

        const { name, title, description, defaultDuration, defaultPrice, defaultStatus, fields, settings } = req.body;

        // Support both 'name' and 'title' for compatibility
        const templateName = name || title;
        if (!templateName) {
            console.error('[WorkOrderTemplates] No name/title provided');
            return res.status(400).json({ error: 'Template name is required' });
        }

        const templateData = {
            businessId,
            name: templateName,
            title: templateName,
            description: description || '',
            defaultDuration: defaultDuration || settings?.defaultDuration || '',
            defaultPrice: defaultPrice || settings?.defaultPrice || '',
            defaultStatus: defaultStatus || settings?.defaultStatus || 'draft',
            fields: fields || [],
            settings: settings || {
                defaultDuration: defaultDuration || '',
                defaultPrice: defaultPrice || '',
                defaultStatus: defaultStatus || 'draft'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: req.user.uid
        };

        console.log('[WorkOrderTemplates] Creating template with data:', JSON.stringify(templateData, null, 2));
        const docRef = await db.collection('workOrderTemplates').add(templateData);
        console.log('[WorkOrderTemplates] Template created successfully with ID:', docRef.id);

        res.status(201).json({ id: docRef.id, ...templateData });
    } catch (error) {
        console.error('[WorkOrderTemplates] Error creating template:', error);
        console.error('[WorkOrderTemplates] Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to create template', details: error.message });
    }
});

// Update a work order template
router.put('/:id', authRequired, async (req, res) => {
    try {
        console.log('[WorkOrderTemplates] PUT /:id - Updating template:', req.params.id);
        const businessId = req.user?.businessId;

        if (!businessId) {
            return res.status(400).json({ error: 'Business registration required' });
        }

        const templateRef = db.collection('workOrderTemplates').doc(req.params.id);
        const templateDoc = await templateRef.get();

        if (!templateDoc.exists) {
            console.log('[WorkOrderTemplates] Template not found for update:', req.params.id);
            return res.status(404).json({ error: 'Template not found' });
        }

        const template = templateDoc.data();
        if (template.businessId !== businessId) {
            console.log('[WorkOrderTemplates] Access denied - wrong business');
            return res.status(403).json({ error: 'Access denied' });
        }

        const { name, title, description, defaultDuration, defaultPrice, defaultStatus, fields, settings } = req.body;

        const updateData = {
            name: name || title || template.name,
            title: title || name || template.title,
            description: description !== undefined ? description : template.description,
            defaultDuration: defaultDuration !== undefined ? defaultDuration : (settings?.defaultDuration || template.defaultDuration),
            defaultPrice: defaultPrice !== undefined ? defaultPrice : (settings?.defaultPrice || template.defaultPrice),
            defaultStatus: defaultStatus || settings?.defaultStatus || template.defaultStatus,
            fields: fields !== undefined ? fields : template.fields,
            settings: settings || template.settings || {},
            updatedAt: new Date().toISOString(),
            updatedBy: req.user.uid
        };

        console.log('[WorkOrderTemplates] Updating with data:', JSON.stringify(updateData, null, 2));
        await templateRef.update(updateData);
        console.log('[WorkOrderTemplates] Template updated successfully');

        res.json({ id: req.params.id, ...template, ...updateData });
    } catch (error) {
        console.error('[WorkOrderTemplates] Error updating template:', error);
        res.status(500).json({ error: 'Failed to update template', details: error.message });
    }
});

// Delete a work order template
router.delete('/:id', authRequired, async (req, res) => {
    try {
        console.log('[WorkOrderTemplates] DELETE /:id - Deleting template:', req.params.id);
        const businessId = req.user?.businessId;

        if (!businessId) {
            return res.status(400).json({ error: 'Business registration required' });
        }

        const templateRef = db.collection('workOrderTemplates').doc(req.params.id);
        const templateDoc = await templateRef.get();

        if (!templateDoc.exists) {
            console.log('[WorkOrderTemplates] Template not found for deletion:', req.params.id);
            return res.status(404).json({ error: 'Template not found' });
        }

        const template = templateDoc.data();
        if (template.businessId !== businessId) {
            console.log('[WorkOrderTemplates] Access denied - wrong business');
            return res.status(403).json({ error: 'Access denied' });
        }

        await templateRef.delete();
        console.log('[WorkOrderTemplates] Template deleted successfully');
        res.json({ message: 'Template deleted successfully' });
    } catch (error) {
        console.error('[WorkOrderTemplates] Error deleting template:', error);
        res.status(500).json({ error: 'Failed to delete template', details: error.message });
    }
});

module.exports = router;
