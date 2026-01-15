const express = require('express');
const router = express.Router();
const path = require('path');
const { useFirestore, getCollectionRef } = require(path.join(__dirname, '..', 'utils', 'db'));

// GET /api/messages - Get all messages
router.get('/', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        let messages = [];

        if (useFirestore) {
            // Fetch all messages and filter in JavaScript to avoid composite index
            const snap = await getCollectionRef('messages').get();
            snap.forEach(doc => {
                const data = { id: doc.id, ...doc.data() };
                // Filter by businessId if available
                if (!businessId || data.businessId === businessId) {
                    messages.push(data);
                }
            });
            // Sort in JavaScript
            messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else {
            const fs = require('fs').promises;
            const { getDataFilePath } = require(path.join(__dirname, '..', 'utils', 'dataPath'));
            const messagesPath = getDataFilePath('messages.json');

            try {
                const data = await fs.readFile(messagesPath, 'utf8');
                messages = JSON.parse(data);

                // Filter by businessId if available
                if (businessId) {
                    messages = messages.filter(m => m.businessId === businessId);
                }

                // Sort by createdAt descending
                messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            } catch (e) {
                // File doesn't exist yet
                messages = [];
            }
        }

        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to fetch messages', details: error.message });
    }
});

// GET /api/messages/:id - Get single message
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (useFirestore) {
            const doc = await getCollectionRef('messages').doc(id).get();
            if (!doc.exists) {
                return res.status(404).json({ error: 'Message not found' });
            }
            res.json({ id: doc.id, ...doc.data() });
        } else {
            const fs = require('fs').promises;
            const { getDataFilePath } = require(path.join(__dirname, '..', 'utils', 'dataPath'));
            const messagesPath = getDataFilePath('messages.json');

            try {
                const data = await fs.readFile(messagesPath, 'utf8');
                const messages = JSON.parse(data);
                const message = messages.find(m => m.id === id);

                if (!message) {
                    return res.status(404).json({ error: 'Message not found' });
                }

                res.json(message);
            } catch (e) {
                return res.status(404).json({ error: 'Message not found' });
            }
        }
    } catch (error) {
        console.error('Error fetching message:', error);
        res.status(500).json({ error: 'Failed to fetch message' });
    }
});

// DELETE /api/messages/:id - Delete a message
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (useFirestore) {
            await getCollectionRef('messages').doc(id).delete();
            res.json({ success: true, message: 'Message deleted successfully' });
        } else {
            const fs = require('fs').promises;
            const { getDataFilePath } = require(path.join(__dirname, '..', 'utils', 'dataPath'));
            const messagesPath = getDataFilePath('messages.json');

            try {
                const data = await fs.readFile(messagesPath, 'utf8');
                const messages = JSON.parse(data);
                const filteredMessages = messages.filter(m => m.id !== id);

                await fs.writeFile(messagesPath, JSON.stringify(filteredMessages, null, 2));
                res.json({ success: true, message: 'Message deleted successfully' });
            } catch (e) {
                return res.status(404).json({ error: 'Message not found' });
            }
        }
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

module.exports = router;
