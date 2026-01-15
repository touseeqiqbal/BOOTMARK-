const express = require('express');
const router = express.Router();
const path = require('path');
const { useFirestore, getDoc, setDoc, getCollectionRef, deleteDoc } = require(path.join(__dirname, '..', 'utils', 'db'));

// ============================================
// HELPER FUNCTIONS
// ============================================

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

// Calculate ETA based on distance and average speed
function calculateETA(distanceKm, averageSpeedKmh = 40) {
    const hours = distanceKm / averageSpeedKmh;
    const minutes = Math.round(hours * 60);
    return {
        minutes,
        estimatedArrival: new Date(Date.now() + minutes * 60000).toISOString()
    };
}

// Check if point is inside geofence (simple circle for now)
function isInsideGeofence(lat, lng, geofence) {
    if (geofence.type === 'circle') {
        const distance = calculateDistance(lat, lng, geofence.center.lat, geofence.center.lng);
        return distance <= geofence.radius / 1000; // Convert radius from meters to km
    }
    return false;
}

// Get work orders helper
async function getWorkOrders() {
    if (useFirestore) {
        try {
            const snap = await getCollectionRef('workOrders').get();
            const items = [];
            snap.forEach(d => items.push({ id: d.id, ...d.data() }));
            return items;
        } catch (e) {
            console.error('Error fetching work orders:', e);
            return [];
        }
    }

    const fs = require('fs').promises;
    const { getDataFilePath } = require(path.join(__dirname, '..', 'utils', 'dataPath'));
    const workOrdersPath = getDataFilePath('workOrders.json');
    try {
        const data = await fs.readFile(workOrdersPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// ============================================
// LOCATION TRACKING ENDPOINTS
// ============================================

// Store employee location with enhanced data
router.post('/:employeeId/location', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { lat, lng, accuracy, timestamp, speed, heading, battery } = req.body;
        const userId = req.user?.uid || req.user?.id;
        const businessId = req.user?.businessId || userId;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!lat || !lng) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }

        const location = {
            id: `${employeeId}-${Date.now()}`,
            employeeId,
            userId,
            businessId,
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            accuracy: accuracy || null,
            speed: speed || null,
            heading: heading || null,
            battery: battery || null,
            timestamp: timestamp || new Date().toISOString(),
            createdAt: new Date().toISOString()
        };

        // Store in GPS history
        if (useFirestore) {
            await setDoc('gpsHistory', location.id, location);

            // Update employee's current location
            const employee = await getDoc('employees', employeeId);
            if (employee) {
                const previousLocation = employee.currentLocation;

                employee.currentLocation = {
                    lat: location.lat,
                    lng: location.lng,
                    speed: location.speed,
                    heading: location.heading,
                    battery: location.battery,
                    lastUpdate: location.timestamp
                };

                // Check geofences
                const geofencesSnap = await getCollectionRef('geofences')
                    .where('businessId', '==', businessId)
                    .where('active', '==', true)
                    .get();

                geofencesSnap.forEach(async (doc) => {
                    const geofence = { id: doc.id, ...doc.data() };
                    const isInside = isInsideGeofence(location.lat, location.lng, geofence);
                    const wasInside = previousLocation ?
                        isInsideGeofence(previousLocation.lat, previousLocation.lng, geofence) : false;

                    // Geofence entry
                    if (isInside && !wasInside) {
                        const event = {
                            id: `geofence-${Date.now()}`,
                            type: 'entry',
                            employeeId,
                            employeeName: employee.name,
                            geofenceId: geofence.id,
                            geofenceName: geofence.name,
                            businessId,
                            timestamp: new Date().toISOString()
                        };
                        await setDoc('geofenceEvents', event.id, event);

                        // Send notification
                        const { sendBusinessNotification } = require(path.join(__dirname, '..', 'utils', 'socketServer'));
                        sendBusinessNotification(businessId, {
                            type: 'info',
                            title: 'Geofence Entry',
                            message: `${employee.name} entered ${geofence.name}`
                        });
                    }

                    // Geofence exit
                    if (!isInside && wasInside) {
                        const event = {
                            id: `geofence-${Date.now()}`,
                            type: 'exit',
                            employeeId,
                            employeeName: employee.name,
                            geofenceId: geofence.id,
                            geofenceName: geofence.name,
                            businessId,
                            timestamp: new Date().toISOString()
                        };
                        await setDoc('geofenceEvents', event.id, event);

                        // Send notification
                        const { sendBusinessNotification } = require(path.join(__dirname, '..', 'utils', 'socketServer'));
                        sendBusinessNotification(businessId, {
                            type: 'info',
                            title: 'Geofence Exit',
                            message: `${employee.name} exited ${geofence.name}`
                        });
                    }
                });

                await setDoc('employees', employeeId, employee);
            }

            // Emit real-time location update
            const { emitGPSUpdate } = require(path.join(__dirname, '..', 'utils', 'socketServer'));
            if (emitGPSUpdate) {
                emitGPSUpdate(businessId, {
                    employeeId,
                    location: employee.currentLocation
                });
            }
        } else {
            // JSON file fallback
            const fs = require('fs').promises;
            const { getDataFilePath } = require(path.join(__dirname, '..', 'utils', 'dataPath'));
            const historyPath = getDataFilePath('gpsHistory.json');

            let history = [];
            try {
                const data = await fs.readFile(historyPath, 'utf8');
                history = JSON.parse(data);
            } catch (error) {
                // File doesn't exist yet
            }

            history.push(location);

            // Keep only last 10000 locations total
            if (history.length > 10000) {
                history = history.slice(-10000);
            }

            await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
        }

        res.json({ success: true, location });
    } catch (error) {
        console.error('Update location error:', error);
        res.status(500).json({ error: 'Failed to update location' });
    }
});

// Get employee current location
router.get('/:employeeId/location', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const userId = req.user?.uid || req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (useFirestore) {
            const employee = await getDoc('employees', employeeId);
            if (!employee) {
                return res.status(404).json({ error: 'Employee not found' });
            }

            res.json(employee.currentLocation || null);
        } else {
            const fs = require('fs').promises;
            const { getDataFilePath } = require(path.join(__dirname, '..', 'utils', 'dataPath'));
            const historyPath = getDataFilePath('gpsHistory.json');

            try {
                const data = await fs.readFile(historyPath, 'utf8');
                const history = JSON.parse(data);
                const employeeLocations = history
                    .filter(l => l.employeeId === employeeId)
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                res.json(employeeLocations[0] || null);
            } catch (error) {
                res.json(null);
            }
        }
    } catch (error) {
        console.error('Get location error:', error);
        res.status(500).json({ error: 'Failed to get location' });
    }
});

// Get all employees with their current locations
router.get('/locations/all', async (req, res) => {
    try {
        const userId = req.user?.uid || req.user?.id;
        const businessId = req.user?.businessId || userId;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (useFirestore) {
            const snapshot = await getCollectionRef('employees')
                .where('businessId', '==', businessId)
                .get();

            const employees = [];
            snapshot.forEach(doc => {
                const emp = { id: doc.id, ...doc.data() };
                if (emp.currentLocation) {
                    employees.push({
                        id: emp.id,
                        name: emp.name,
                        status: emp.status || 'inactive',
                        currentTask: emp.currentTask,
                        lat: emp.currentLocation.lat,
                        lng: emp.currentLocation.lng,
                        speed: emp.currentLocation.speed,
                        heading: emp.currentLocation.heading,
                        battery: emp.currentLocation.battery,
                        lastUpdate: emp.currentLocation.lastUpdate
                    });
                }
            });

            res.json(employees);
        } else {
            const fs = require('fs').promises;
            const { getDataFilePath } = require(path.join(__dirname, '..', 'utils', 'dataPath'));
            const employeesPath = getDataFilePath('employees.json');

            try {
                const data = await fs.readFile(employeesPath, 'utf8');
                const allEmployees = JSON.parse(data);
                const employees = allEmployees
                    .filter(emp => emp.businessId === businessId && emp.currentLocation)
                    .map(emp => ({
                        id: emp.id,
                        name: emp.name,
                        status: emp.status || 'inactive',
                        currentTask: emp.currentTask,
                        lat: emp.currentLocation.lat,
                        lng: emp.currentLocation.lng,
                        speed: emp.currentLocation.speed,
                        heading: emp.currentLocation.heading,
                        battery: emp.currentLocation.battery,
                        lastUpdate: emp.currentLocation.lastUpdate
                    }));

                res.json(employees);
            } catch (error) {
                res.json([]);
            }
        }
    } catch (error) {
        console.error('Get all locations error:', error);
        res.status(500).json({ error: 'Failed to get locations' });
    }
});

// ============================================
// GPS HISTORY ENDPOINTS
// ============================================

// Get location history for an employee
router.get('/history/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { startDate, endDate, limit = 1000 } = req.query;
        const userId = req.user?.uid || req.user?.id;
        const businessId = req.user?.businessId || userId;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (useFirestore) {
            let query = getCollectionRef('gpsHistory')
                .where('employeeId', '==', employeeId)
                .where('businessId', '==', businessId)
                .orderBy('timestamp', 'desc')
                .limit(parseInt(limit));

            if (startDate) {
                query = query.where('timestamp', '>=', startDate);
            }
            if (endDate) {
                query = query.where('timestamp', '<=', endDate);
            }

            const snapshot = await query.get();
            const history = [];
            snapshot.forEach(doc => history.push({ id: doc.id, ...doc.data() }));

            res.json(history);
        } else {
            const fs = require('fs').promises;
            const { getDataFilePath } = require(path.join(__dirname, '..', 'utils', 'dataPath'));
            const historyPath = getDataFilePath('gpsHistory.json');

            try {
                const data = await fs.readFile(historyPath, 'utf8');
                let history = JSON.parse(data);

                history = history
                    .filter(l => l.employeeId === employeeId && l.businessId === businessId)
                    .filter(l => !startDate || l.timestamp >= startDate)
                    .filter(l => !endDate || l.timestamp <= endDate)
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .slice(0, parseInt(limit));

                res.json(history);
            } catch (error) {
                res.json([]);
            }
        }
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Failed to get location history' });
    }
});

// Get route for a work order
router.get('/route/:workOrderId', async (req, res) => {
    try {
        const { workOrderId } = req.params;
        const userId = req.user?.uid || req.user?.id;
        const businessId = req.user?.businessId || userId;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Get work order
        const workOrder = await getDoc('workOrders', workOrderId);
        if (!workOrder || workOrder.businessId !== businessId) {
            return res.status(404).json({ error: 'Work order not found' });
        }

        // Get assigned employees
        const assignedEmployees = workOrder.assignedEmployees || [];

        // Get location history for the work order date
        const workOrderDate = workOrder.scheduledDate || workOrder.createdAt;
        const startDate = new Date(workOrderDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(workOrderDate);
        endDate.setHours(23, 59, 59, 999);

        const routes = [];

        for (const employeeId of assignedEmployees) {
            if (useFirestore) {
                const snapshot = await getCollectionRef('gpsHistory')
                    .where('employeeId', '==', employeeId)
                    .where('businessId', '==', businessId)
                    .where('timestamp', '>=', startDate.toISOString())
                    .where('timestamp', '<=', endDate.toISOString())
                    .orderBy('timestamp', 'asc')
                    .get();

                const locations = [];
                snapshot.forEach(doc => locations.push(doc.data()));

                if (locations.length > 0) {
                    const employee = await getDoc('employees', employeeId);
                    routes.push({
                        employeeId,
                        employeeName: employee?.name || 'Unknown',
                        locations,
                        totalDistance: calculateRouteDistance(locations),
                        duration: calculateRouteDuration(locations)
                    });
                }
            }
        }

        res.json({
            workOrderId,
            workOrderTitle: workOrder.title,
            date: workOrderDate,
            routes
        });
    } catch (error) {
        console.error('Get route error:', error);
        res.status(500).json({ error: 'Failed to get route' });
    }
});

// Helper: Calculate total distance of a route
function calculateRouteDistance(locations) {
    let totalDistance = 0;
    for (let i = 1; i < locations.length; i++) {
        totalDistance += calculateDistance(
            locations[i - 1].lat,
            locations[i - 1].lng,
            locations[i].lat,
            locations[i].lng
        );
    }
    return totalDistance.toFixed(2); // km
}

// Helper: Calculate route duration
function calculateRouteDuration(locations) {
    if (locations.length < 2) return 0;
    const start = new Date(locations[0].timestamp);
    const end = new Date(locations[locations.length - 1].timestamp);
    return Math.round((end - start) / 60000); // minutes
}

// ============================================
// GEOFENCING ENDPOINTS
// ============================================

// Create geofence
router.post('/geofences', async (req, res) => {
    try {
        const userId = req.user?.uid || req.user?.id;
        const businessId = req.user?.businessId || userId;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { name, type, center, radius, active = true } = req.body;

        if (!name || !type || !center) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const geofence = {
            id: `geofence-${Date.now()}`,
            name,
            type, // 'circle' or 'polygon'
            center: { lat: parseFloat(center.lat), lng: parseFloat(center.lng) },
            radius: type === 'circle' ? parseFloat(radius) : null,
            active,
            businessId,
            userId,
            createdAt: new Date().toISOString()
        };

        if (useFirestore) {
            await setDoc('geofences', geofence.id, geofence);
        } else {
            const fs = require('fs').promises;
            const { getDataFilePath } = require(path.join(__dirname, '..', 'utils', 'dataPath'));
            const geofencesPath = getDataFilePath('geofences.json');

            let geofences = [];
            try {
                const data = await fs.readFile(geofencesPath, 'utf8');
                geofences = JSON.parse(data);
            } catch (error) {
                // File doesn't exist yet
            }

            geofences.push(geofence);
            await fs.writeFile(geofencesPath, JSON.stringify(geofences, null, 2));
        }

        res.json({ success: true, geofence });
    } catch (error) {
        console.error('Create geofence error:', error);
        res.status(500).json({ error: 'Failed to create geofence' });
    }
});

// Get all geofences
router.get('/geofences', async (req, res) => {
    try {
        const userId = req.user?.uid || req.user?.id;
        const businessId = req.user?.businessId || userId;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (useFirestore) {
            const snapshot = await getCollectionRef('geofences')
                .where('businessId', '==', businessId)
                .get();

            const geofences = [];
            snapshot.forEach(doc => geofences.push({ id: doc.id, ...doc.data() }));
            res.json(geofences);
        } else {
            const fs = require('fs').promises;
            const { getDataFilePath } = require(path.join(__dirname, '..', 'utils', 'dataPath'));
            const geofencesPath = getDataFilePath('geofences.json');

            try {
                const data = await fs.readFile(geofencesPath, 'utf8');
                const allGeofences = JSON.parse(data);
                const geofences = allGeofences.filter(g => g.businessId === businessId);
                res.json(geofences);
            } catch (error) {
                res.json([]);
            }
        }
    } catch (error) {
        console.error('Get geofences error:', error);
        res.status(500).json({ error: 'Failed to get geofences' });
    }
});

// Update geofence
router.put('/geofences/:id', async (req, res) => {
    try {
        const userId = req.user?.uid || req.user?.id;
        const businessId = req.user?.businessId || userId;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const geofence = await getDoc('geofences', req.params.id);
        if (!geofence || geofence.businessId !== businessId) {
            return res.status(404).json({ error: 'Geofence not found' });
        }

        const { name, center, radius, active } = req.body;
        const updatedGeofence = {
            ...geofence,
            name: name || geofence.name,
            center: center || geofence.center,
            radius: radius !== undefined ? parseFloat(radius) : geofence.radius,
            active: active !== undefined ? active : geofence.active,
            updatedAt: new Date().toISOString()
        };

        await setDoc('geofences', req.params.id, updatedGeofence);
        res.json({ success: true, geofence: updatedGeofence });
    } catch (error) {
        console.error('Update geofence error:', error);
        res.status(500).json({ error: 'Failed to update geofence' });
    }
});

// Delete geofence
router.delete('/geofences/:id', async (req, res) => {
    try {
        const userId = req.user?.uid || req.user?.id;
        const businessId = req.user?.businessId || userId;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const geofence = await getDoc('geofences', req.params.id);
        if (!geofence || geofence.businessId !== businessId) {
            return res.status(404).json({ error: 'Geofence not found' });
        }

        await deleteDoc('geofences', req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete geofence error:', error);
        res.status(500).json({ error: 'Failed to delete geofence' });
    }
});

// Get geofence events
router.get('/geofence-events', async (req, res) => {
    try {
        const userId = req.user?.uid || req.user?.id;
        const businessId = req.user?.businessId || userId;
        const { limit = 100 } = req.query;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (useFirestore) {
            const snapshot = await getCollectionRef('geofenceEvents')
                .where('businessId', '==', businessId)
                .orderBy('timestamp', 'desc')
                .limit(parseInt(limit))
                .get();

            const events = [];
            snapshot.forEach(doc => events.push({ id: doc.id, ...doc.data() }));
            res.json(events);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error('Get geofence events error:', error);
        res.status(500).json({ error: 'Failed to get geofence events' });
    }
});

// ============================================
// CLIENT-FACING ENDPOINTS
// ============================================

// Get crew location for client's work order
router.get('/client/crew-location/:workOrderId', async (req, res) => {
    try {
        const userEmail = req.user?.email;

        if (!userEmail) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const workOrder = await getDoc('workOrders', req.params.workOrderId);
        if (!workOrder) {
            return res.status(404).json({ error: 'Work order not found' });
        }

        // Verify this work order belongs to the client
        if (workOrder.clientEmail?.toLowerCase() !== userEmail.toLowerCase()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get assigned employees' current locations
        const assignedEmployees = workOrder.assignedEmployees || [];
        const crewLocations = [];

        for (const employeeId of assignedEmployees) {
            const employee = await getDoc('employees', employeeId);
            if (employee && employee.currentLocation) {
                crewLocations.push({
                    employeeId,
                    name: employee.name,
                    lat: employee.currentLocation.lat,
                    lng: employee.currentLocation.lng,
                    lastUpdate: employee.currentLocation.lastUpdate
                });
            }
        }

        res.json({
            workOrderId: req.params.workOrderId,
            workOrderTitle: workOrder.title,
            status: workOrder.status,
            scheduledDate: workOrder.scheduledDate,
            crewLocations
        });
    } catch (error) {
        console.error('Get crew location error:', error);
        res.status(500).json({ error: 'Failed to get crew location' });
    }
});

// Get ETA for client's work order
router.get('/client/eta/:workOrderId', async (req, res) => {
    try {
        const userEmail = req.user?.email;

        if (!userEmail) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const workOrder = await getDoc('workOrders', req.params.workOrderId);
        if (!workOrder) {
            return res.status(404).json({ error: 'Work order not found' });
        }

        // Verify this work order belongs to the client
        if (workOrder.clientEmail?.toLowerCase() !== userEmail.toLowerCase()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get property location
        const property = workOrder.propertyId ? await getDoc('properties', workOrder.propertyId) : null;
        if (!property || !property.latitude || !property.longitude) {
            return res.json({ eta: null, message: 'Property location not available' });
        }

        // Get closest crew member
        const assignedEmployees = workOrder.assignedEmployees || [];
        let closestDistance = Infinity;
        let eta = null;

        for (const employeeId of assignedEmployees) {
            const employee = await getDoc('employees', employeeId);
            if (employee && employee.currentLocation) {
                const distance = calculateDistance(
                    employee.currentLocation.lat,
                    employee.currentLocation.lng,
                    property.latitude,
                    property.longitude
                );

                if (distance < closestDistance) {
                    closestDistance = distance;
                    eta = calculateETA(distance);
                }
            }
        }

        res.json({
            workOrderId: req.params.workOrderId,
            distanceKm: closestDistance !== Infinity ? closestDistance.toFixed(2) : null,
            eta: eta ? eta.minutes : null,
            estimatedArrival: eta ? eta.estimatedArrival : null
        });
    } catch (error) {
        console.error('Get ETA error:', error);
        res.status(500).json({ error: 'Failed to calculate ETA' });
    }
});

// ============================================
// ANALYTICS ENDPOINTS
// ============================================

// Get GPS analytics
router.get('/analytics', async (req, res) => {
    try {
        const userId = req.user?.uid || req.user?.id;
        const businessId = req.user?.businessId || userId;
        const { startDate, endDate } = req.query;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Get all employees
        const employeesSnap = await getCollectionRef('employees')
            .where('businessId', '==', businessId)
            .get();

        const analytics = {
            totalEmployees: 0,
            activeEmployees: 0,
            totalDistanceTraveled: 0,
            averageSpeed: 0,
            geofenceEvents: {
                entries: 0,
                exits: 0
            }
        };

        employeesSnap.forEach(doc => {
            const emp = doc.data();
            analytics.totalEmployees++;
            if (emp.currentLocation) {
                analytics.activeEmployees++;
            }
        });

        // Get geofence events count
        if (useFirestore) {
            const eventsSnap = await getCollectionRef('geofenceEvents')
                .where('businessId', '==', businessId)
                .get();

            eventsSnap.forEach(doc => {
                const event = doc.data();
                if (event.type === 'entry') analytics.geofenceEvents.entries++;
                if (event.type === 'exit') analytics.geofenceEvents.exits++;
            });
        }

        res.json(analytics);
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

module.exports = router;
