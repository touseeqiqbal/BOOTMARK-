const express = require('express');
const router = express.Router();
const path = require('path');
const { getDoc, setDoc, getCollectionRef, deleteDoc, updateDoc } = require(path.join(__dirname, '..', 'utils', 'db'));
const { validateRequest, clientMessageSchema } = require('../utils/validation');

// GET /api/messages - Get all messages
router.get('/', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        let query = getCollectionRef('messages');

        if (businessId) {
            query = query.where('businessId', '==', businessId);
        }

        const snap = await query.get();
        const messages = [];
        snap.forEach(doc => {
            messages.push({ id: doc.id, ...doc.data() });
        });
        messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// GET /api/messages/:id - Get single message
router.get('/:id', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const message = await getDoc('messages', req.params.id);

        if (!message) return res.status(404).json({ error: 'Message not found' });

        // Ownership check
        if (businessId && message.businessId !== businessId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(message);
    } catch (error) {
        console.error('Error fetching message:', error);
        res.status(500).json({ error: 'Failed to fetch message' });
    }
});

// POST /api/messages - Send a message (Business to Client)
router.post('/', validateRequest(clientMessageSchema), async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const { message, customerId, fromClient } = req.body;

        if (!businessId) return res.status(401).json({ error: 'Not authenticated' });

        // Get customer details
        const customer = await getDoc('customers', customerId);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        // Ensure customer belongs to business
        if (customer.businessId !== businessId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const newMessage = {
            id: Date.now().toString(),
            customerId: customer.id,
            customerName: customer.name,
            businessId: businessId,
            message,
            fromClient: fromClient || false, // Default to false (from business)
            createdAt: new Date().toISOString(),
            read: false
        };

        await setDoc('messages', newMessage.id, newMessage);

        // Notify client (if we had socket for clients)
        // For now, we only notify business room for visibility 
        // or just save it.

        res.json({ success: true, message: newMessage });
    } catch (error) {
        console.error('Message send error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// DELETE /api/messages/:id - Delete a message
router.delete('/:id', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const message = await getDoc('messages', req.params.id);

        if (!message) return res.status(404).json({ error: 'Message not found' });

        // Ownership check
        if (businessId && message.businessId !== businessId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await deleteDoc('messages', req.params.id);
        res.json({ success: true, message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

module.exports = router;
