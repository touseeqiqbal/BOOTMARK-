const express = require('express');
const router = express.Router();
const { authRequired } = require('../middleware/auth');
const { getNumberFormats, updateNumberFormats, previewNumber, DEFAULT_FORMATS } = require('../utils/numberGenerator');

router.get('/number-formats', authRequired, async (req, res) => {
    try {
        const businessId = req.user.businessId || req.user.uid || req.user.id;
        if (!businessId) return res.status(400).json({ error: 'Business ID not found' });
        const formats = await getNumberFormats(businessId);
        res.json(formats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch number formats' });
    }
});

router.put('/number-formats', authRequired, async (req, res) => {
    try {
        const businessId = req.user.businessId || req.user.uid || req.user.id;
        if (!businessId) return res.status(400).json({ error: 'Business ID not found' });
        const formats = req.body;
        const updatedFormats = await updateNumberFormats(businessId, formats);
        res.json(updatedFormats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update number formats' });
    }
});

router.post('/number-formats/preview', authRequired, async (req, res) => {
    try {
        const { format, counter, padding } = req.body;
        if (!format) return res.status(400).json({ error: 'Format string is required' });
        const preview = previewNumber(format, counter || 1, padding || 5);
        res.json({ preview });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate preview' });
    }
});

router.get('/number-formats/defaults', authRequired, async (req, res) => {
    res.json(DEFAULT_FORMATS);
});

module.exports = router;
