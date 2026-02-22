const path = require('path');

class GPSService {
    constructor(database, sockets) {
        this.dbFunctions = database || require('./db');
        this.socketFunctions = sockets || require('./socketServer');
    }

    get getDoc() { return this.dbFunctions.getDoc; }
    get setDoc() { return this.dbFunctions.setDoc; }
    get getCollectionRef() { return this.dbFunctions.getCollectionRef; }
    get emitGPSUpdate() { return this.socketFunctions.emitGPSUpdate; }
    get sendBusinessNotification() { return this.socketFunctions.sendBusinessNotification; }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    calculateETA(distanceKm, averageSpeedKmh = 40) {
        const hours = distanceKm / averageSpeedKmh;
        const minutes = Math.round(hours * 60);
        return { minutes, estimatedArrival: new Date(Date.now() + minutes * 60000).toISOString() };
    }

    isInsideGeofence(lat, lng, geofence) {
        if (geofence.type === 'circle') {
            const distance = this.calculateDistance(lat, lng, geofence.center.lat, geofence.center.lng);
            return distance <= geofence.radius / 1000;
        }
        return false;
    }

    async updateLocation(employeeId, businessId, userId, locationData) {
        const location = {
            id: `${employeeId}-${Date.now()}`,
            employeeId, userId, businessId,
            lat: parseFloat(locationData.lat),
            lng: parseFloat(locationData.lng),
            accuracy: locationData.accuracy || null,
            speed: locationData.speed || null,
            heading: locationData.heading || null,
            battery: locationData.battery || null,
            timestamp: locationData.timestamp || new Date().toISOString(),
            createdAt: new Date().toISOString()
        };

        await this.setDoc('gpsHistory', location.id, location);

        const employee = await this.getDoc('employees', employeeId);
        if (employee) {
            if (employee.businessId && employee.businessId !== businessId) {
                throw new Error("Access denied: Employee does not belong to this business");
            }
            const previousLocation = employee.currentLocation;
            employee.currentLocation = {
                lat: location.lat, lng: location.lng, speed: location.speed,
                heading: location.heading, battery: location.battery, lastUpdate: location.timestamp
            };

            await this.processGeofences(businessId, employee, location, previousLocation);
            await this.setDoc('employees', employeeId, employee);

            if (this.emitGPSUpdate) this.emitGPSUpdate(businessId, { employeeId, location: employee.currentLocation });
        }
        return location;
    }

    async processGeofences(businessId, employee, location, previousLocation) {
        try {
            const geofencesSnap = await this.getCollectionRef('geofences').where('businessId', '==', businessId).where('active', '==', true).get();
            const operations = [];
            geofencesSnap.forEach(doc => {
                const geofence = { id: doc.id, ...doc.data() };
                const isInside = this.isInsideGeofence(location.lat, location.lng, geofence);
                const wasInside = previousLocation ? this.isInsideGeofence(previousLocation.lat, previousLocation.lng, geofence) : false;

                if ((isInside && !wasInside) || (!isInside && wasInside)) {
                    const type = isInside ? 'entry' : 'exit';
                    const event = {
                        id: `geofence-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        type, employeeId: employee.id, employeeName: employee.name,
                        geofenceId: geofence.id, geofenceName: geofence.name,
                        businessId, timestamp: new Date().toISOString()
                    };
                    operations.push(this.setDoc('geofenceEvents', event.id, event));

                    if (this.sendBusinessNotification) {
                        this.sendBusinessNotification(businessId, {
                            type: 'info', title: `Geofence ${type === 'entry' ? 'Entry' : 'Exit'}`,
                            message: `${employee.name} ${type}ed ${geofence.name}`
                        });
                    }
                }
            });
            await Promise.all(operations);
        } catch (e) {
            console.error('[GPSService] Error processing geofences:', e);
        }
    }
}

module.exports = new GPSService();
module.exports.GPSService = GPSService;
