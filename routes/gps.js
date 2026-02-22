const express = require('express');
const router = express.Router();
const gpsService = require('../utils/GPSService');
const { getDoc, getCollectionRef, deleteDoc, setDoc } = require('../utils/db');

router.post('/:employeeId/location', async (req, res) => {
    try {
        const userId = req.user?.uid || req.user?.id;
        const businessId = req.user?.businessId || userId;
        const location = await gpsService.updateLocation(req.params.employeeId, businessId, userId, req.body);
        res.json({ success: true, location });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:employeeId/location', async (req, res) => {
    try {
        const businessId = req.user?.businessId || req.user?.uid || req.user?.id;
        const employee = await getDoc('employees', req.params.employeeId);

        if (employee && employee.businessId !== businessId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(employee?.currentLocation || null);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get location' });
    }
});

router.get('/locations/all', async (req, res) => {
    try {
        const businessId = req.user?.businessId || req.user?.uid || req.user?.id;
        const snap = await getCollectionRef('employees').where('businessId', '==', businessId).get();
        const locations = [];
        snap.forEach(doc => {
            const emp = doc.data();
            if (emp.currentLocation) locations.push({ id: doc.id, name: emp.name, ...emp.currentLocation });
        });
        res.json(locations);
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

router.post('/geofences', async (req, res) => {
    try {
        const businessId = req.user?.businessId || req.user?.uid || req.user?.id;
        const id = `geofence-${Date.now()}`;
        const geofence = { ...req.body, id, businessId, createdAt: new Date().toISOString() };
        await setDoc('geofences', id, geofence);
        res.json({ success: true, geofence });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

module.exports = router;
