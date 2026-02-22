const express = require('express');
const router = express.Router();
const path = require('path');
const { processReminders } = require('../utils/reminderScheduler');
const { authRequired } = require('../middleware/auth');
const { getCollectionRef } = require(path.join(__dirname, '..', 'utils', 'db'));

// POST /api/reminders/trigger - Manually trigger reminder check (admin only)
router.post('/trigger', authRequired, async (req, res) => {
    try {
        // STRICT: Only super_admin can see global status
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({ error: 'Super Admin access required' });
        }
        processReminders().catch(error => {
            console.error('Error in background reminder processing:', error);
        });
        res.json({ success: true, message: 'Reminder check triggered successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to trigger reminders' });
    }
});

// GET /api/reminders/status - Get reminder system status
router.get('/status', authRequired, async (req, res) => {
    try {
        let historyCount = 0;
        try {
            const snap = await getCollectionRef('reminderHistory').get();
            historyCount = snap.size;
        } catch (error) {
            console.error('Error getting reminder history count:', error);
        }

        res.json({
            status: 'active',
            schedule: 'Daily at 9:00 AM',
            totalRemindersSent: historyCount,
            lastCheck: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get status' });
    }
});

module.exports = router;
