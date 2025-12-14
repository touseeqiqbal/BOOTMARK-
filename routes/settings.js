const express = require('express');
const router = express.Router();
const { authRequired } = require('../middleware/auth');
const { generateNumber, getNumberFormats, updateNumberFormats, previewNumber, DEFAULT_FORMATS } = require('../utils/numberGenerator');

/**
 * GET /api/settings/number-formats
 * Get number format settings for the current business
 */
router.get('/number-formats', authRequired, async (req, res) => {
    try {
        // Use businessId if available, otherwise use user ID as fallback
        const businessId = req.user.businessId || req.user.uid || req.user.id;

        if (!businessId) {
            return res.status(400).json({ error: 'Business ID not found in user session' });
        }

        const formats = await getNumberFormats(businessId);
        res.json(formats);
    } catch (error) {
        console.error('Error fetching number formats:', error);
        res.status(500).json({ error: 'Failed to fetch number formats', details: error.message });
    }
});

/**
 * PUT /api/settings/number-formats
 * Update number format settings for the current business
 */
router.put('/number-formats', authRequired, async (req, res) => {
    try {
        // Use businessId if available, otherwise use user ID as fallback
        const businessId = req.user.businessId || req.user.uid || req.user.id;

        if (!businessId) {
            return res.status(400).json({ error: 'Business ID not found in user session' });
        }

        const formats = req.body;

        // Validate format structure
        const validTypes = ['workOrder', 'invoice', 'client', 'scheduling', 'contract'];
        for (const type of Object.keys(formats)) {
            if (!validTypes.includes(type)) {
                return res.status(400).json({ error: `Invalid format type: ${type}` });
            }

            const config = formats[type];
            if (!config.format || typeof config.format !== 'string') {
                return res.status(400).json({ error: `Invalid format string for ${type}` });
            }

            // Ensure counter is preserved or set to 1
            if (!config.counter) {
                config.counter = 1;
            }

            // Ensure lastReset is set
            if (!config.lastReset) {
                config.lastReset = new Date().toISOString();
            }
        }

        const updatedFormats = await updateNumberFormats(businessId, formats);
        res.json(updatedFormats);
    } catch (error) {
        console.error('Error updating number formats:', error);
        res.status(500).json({ error: 'Failed to update number formats', details: error.message });
    }
});

/**
 * POST /api/settings/number-formats/preview
 * Preview what a number format would look like
 */
router.post('/number-formats/preview', authRequired, async (req, res) => {
    try {
        const { format, counter, padding } = req.body;

        if (!format) {
            return res.status(400).json({ error: 'Format string is required' });
        }

        const preview = previewNumber(
            format,
            counter || 1,
            padding || 5
        );

        res.json({ preview });
    } catch (error) {
        console.error('Error generating preview:', error);
        res.status(500).json({ error: 'Failed to generate preview' });
    }
});

/**
 * GET /api/settings/number-formats/defaults
 * Get default number format templates
 */
router.get('/number-formats/defaults', authRequired, async (req, res) => {
    res.json(DEFAULT_FORMATS);
});

module.exports = router;
