const express = require('express');
const router = express.Router();
const path = require('path');
const { useFirestore, getCollectionRef } = require(path.join(__dirname, '..', 'utils', 'db'));

// GET /api/service-requests - Get all service requests
router.get('/', async (req, res) => {
    try {
        const businessId = req.user?.businessId;
        let serviceRequests = [];

        if (useFirestore) {
            let query = getCollectionRef('serviceRequests');

            // Filter by businessId if available
            if (businessId) {
                query = query.where('businessId', '==', businessId);
            }

            const snap = await query.get();
            snap.forEach(doc => serviceRequests.push({ id: doc.id, ...doc.data() }));
        } else {
            const fs = require('fs').promises;
            const { getDataFilePath } = require(path.join(__dirname, '..', 'utils', 'dataPath'));
            const requestsPath = getDataFilePath('serviceRequests.json');

            try {
                const data = await fs.readFile(requestsPath, 'utf8');
                serviceRequests = JSON.parse(data);

                // Filter by businessId if available
                if (businessId) {
                    serviceRequests = serviceRequests.filter(sr => sr.businessId === businessId);
                }
            } catch (e) {
                // File doesn't exist yet
                serviceRequests = [];
            }
        }

        res.json(serviceRequests);
    } catch (error) {
        console.error('Error fetching service requests:', error);
        res.status(500).json({ error: 'Failed to fetch service requests' });
    }
});

// GET /api/service-requests/:id - Get single service request
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (useFirestore) {
            const doc = await getCollectionRef('serviceRequests').doc(id).get();
            if (!doc.exists) {
                return res.status(404).json({ error: 'Service request not found' });
            }
            res.json({ id: doc.id, ...doc.data() });
        } else {
            const fs = require('fs').promises;
            const { getDataFilePath } = require(path.join(__dirname, '..', 'utils', 'dataPath'));
            const requestsPath = getDataFilePath('serviceRequests.json');

            try {
                const data = await fs.readFile(requestsPath, 'utf8');
                const serviceRequests = JSON.parse(data);
                const request = serviceRequests.find(sr => sr.id === id);

                if (!request) {
                    return res.status(404).json({ error: 'Service request not found' });
                }

                res.json(request);
            } catch (e) {
                return res.status(404).json({ error: 'Service request not found' });
            }
        }
    } catch (error) {
        console.error('Error fetching service request:', error);
        res.status(500).json({ error: 'Failed to fetch service request' });
    }
});

// PUT /api/service-requests/:id - Update service request status
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (useFirestore) {
            await getCollectionRef('serviceRequests').doc(id).update({
                status,
                updatedAt: new Date().toISOString()
            });

            const doc = await getCollectionRef('serviceRequests').doc(id).get();
            res.json({ id: doc.id, ...doc.data() });
        } else {
            const fs = require('fs').promises;
            const { getDataFilePath } = require(path.join(__dirname, '..', 'utils', 'dataPath'));
            const requestsPath = getDataFilePath('serviceRequests.json');

            const data = await fs.readFile(requestsPath, 'utf8');
            const serviceRequests = JSON.parse(data);
            const index = serviceRequests.findIndex(sr => sr.id === id);

            if (index === -1) {
                return res.status(404).json({ error: 'Service request not found' });
            }

            serviceRequests[index] = {
                ...serviceRequests[index],
                status,
                updatedAt: new Date().toISOString()
            };

            await fs.writeFile(requestsPath, JSON.stringify(serviceRequests, null, 2));
            res.json(serviceRequests[index]);
        }
    } catch (error) {
        console.error('Error updating service request:', error);
        res.status(500).json({ error: 'Failed to update service request' });
    }
});

module.exports = router;
