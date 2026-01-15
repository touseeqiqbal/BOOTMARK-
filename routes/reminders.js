const express = require('express');
const router = express.Router();
const { triggerRemindersManually, processReminders } = require('../utils/reminderScheduler');
const { authRequired } = require('../middleware/auth');

// POST /api/reminders/trigger - Manually trigger reminder check (admin only)
router.post('/trigger', authRequired, async (req, res) => {
    try {
        // Check if user is admin or super admin
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        console.log('Manual reminder trigger requested by:', req.user.email);

        // Trigger reminders in background
        processReminders().catch(error => {
            console.error('Error in background reminder processing:', error);
        });

        res.json({
            success: true,
            message: 'Reminder check triggered successfully. Processing in background.'
        });
    } catch (error) {
        console.error('Error triggering reminders:', error);
        res.status(500).json({ error: 'Failed to trigger reminders', details: error.message });
    }
});

// GET /api/reminders/status - Get reminder system status
router.get('/status', authRequired, async (req, res) => {
    try {
        const fs = require('fs').promises;
        const path = require('path');

        // Get reminder history count
        let historyCount = 0;
        try {
            const historyPath = path.join(__dirname, '..', 'data', 'reminderHistory.json');
            const data = await fs.readFile(historyPath, 'utf8');
            const history = JSON.parse(data);
            historyCount = history.length;
        } catch (error) {
            // File doesn't exist yet
        }

        res.json({
            status: 'active',
            schedule: 'Daily at 9:00 AM',
            totalRemindersSent: historyCount,
            lastCheck: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting reminder status:', error);
        res.status(500).json({ error: 'Failed to get status' });
    }
});

module.exports = router;
