const express = require('express');
const router = express.Router();
const path = require('path');
const { getCollectionRef } = require(path.join(__dirname, '..', 'utils', 'db'));

// GET /api/service-requests - Get all service requests
// GET /api/service-requests - Get all service requests
router.get('/', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        if (!businessId) {
            return res.status(400).json({ error: 'Business context required' });
        }

        let query = getCollectionRef('serviceRequests').where('businessId', '==', businessId);

        const snap = await query.get();
        const serviceRequests = [];
        snap.forEach(doc => serviceRequests.push({ id: doc.id, ...doc.data() }));
        res.json(serviceRequests);
    } catch (error) {
        console.error('Error fetching service requests:', error);
        res.status(500).json({ error: 'Failed to fetch service requests' });
    }
});

// GET /api/service-requests/:id - Get single service request
// GET /api/service-requests/:id - Get single service request
router.get('/:id', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const { id } = req.params;
        const doc = await getCollectionRef('serviceRequests').doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Service request not found' });
        }

        const data = doc.data();
        // Enforce Tenant Isolation
        if (businessId && data.businessId !== businessId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({ id: doc.id, ...data });
    } catch (error) {
        console.error('Error fetching service request:', error);
        res.status(500).json({ error: 'Failed to fetch service request' });
    }
});

// PUT /api/service-requests/:id - Update service request status
// PUT /api/service-requests/:id - Update service request status
router.put('/:id', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        const { id } = req.params;
        const { status } = req.body;

        const docRef = getCollectionRef('serviceRequests').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Service request not found' });
        }

        // Enforce Tenant Isolation
        if (businessId && doc.data().businessId !== businessId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await docRef.update({
            status,
            updatedAt: new Date().toISOString()
        });

        const updatedDoc = await docRef.get();
        res.json({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
        console.error('Error updating service request:', error);
        res.status(500).json({ error: 'Failed to update service request' });
    }
});

module.exports = router;
