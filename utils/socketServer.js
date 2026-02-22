const socketIO = require('socket.io');

let io = null;

/**
 * Initialize Socket.IO server
 * @param {Object} server - HTTP server instance
 * @returns {Object} Socket.IO instance
 */
function initializeSocket(server) {
    io = socketIO(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log(`[Socket.IO] Client connected: ${socket.id}`);

        // Join business room for multi-tenant isolation
        socket.on('join-business', (businessId) => {
            if (businessId) {
                socket.join(`business-${businessId}`);
                console.log(`[Socket.IO] Client ${socket.id} joined business-${businessId}`);
            }
        });

        // Join user room for personal notifications
        socket.on('join-user', (userId) => {
            if (userId) {
                socket.join(`user-${userId}`);
                console.log(`[Socket.IO] Client ${socket.id} joined user-${userId}`);
            }
        });

        // Join work order room for crew tracking
        socket.on('join-work-order', (workOrderId) => {
            if (workOrderId) {
                socket.join(`work-order-${workOrderId}`);
                console.log(`[Socket.IO] Client ${socket.id} joined work-order-${workOrderId}`);
            }
        });

        socket.on('disconnect', () => {
            console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
        });
    });

    console.log('✅ Socket.IO server initialized');
    return io;
}

/**
 * Get Socket.IO instance
 */
function getIO() {
    if (!io) {
        throw new Error('Socket.IO not initialized. Call initializeSocket first.');
    }
    return io;
}

/**
 * Send notification to specific business
 */
function sendBusinessNotification(businessId, notification) {
    if (!io) return;

    io.to(`business-${businessId}`).emit('notification', {
        ...notification,
        timestamp: new Date().toISOString()
    });

    console.log(`[Socket.IO] Sent notification to business-${businessId}:`, notification.type);
}

/**
 * Send notification to specific user
 */
function sendUserNotification(userId, notification) {
    if (!io) return;

    io.to(`user-${userId}`).emit('notification', {
        ...notification,
        timestamp: new Date().toISOString()
    });

    console.log(`[Socket.IO] Sent notification to user-${userId}:`, notification.type);
}

/**
 * Broadcast live update to business
 */
function broadcastUpdate(businessId, updateType, data) {
    if (!io) return;

    io.to(`business-${businessId}`).emit('live-update', {
        type: updateType,
        data,
        timestamp: new Date().toISOString()
    });

    console.log(`[Socket.IO] Broadcast ${updateType} to business-${businessId}`);
}

/**
 * Emit GPS location update
 */
function emitGPSUpdate(businessId, locationData) {
    if (!io) return;

    io.to(`business-${businessId}`).emit('gps:location-update', {
        ...locationData,
        timestamp: new Date().toISOString()
    });

    console.log(`[Socket.IO] GPS update for employee ${locationData.employeeId}`);
}

/**
 * Emit geofence event
 */
function emitGeofenceEvent(businessId, eventData) {
    if (!io) return;

    io.to(`business-${businessId}`).emit('gps:geofence-event', {
        ...eventData,
        timestamp: new Date().toISOString()
    });

    console.log(`[Socket.IO] Geofence ${eventData.type} for ${eventData.employeeName}`);
}

/**
 * Emit crew arrival notification to client
 */
function notifyClientCrewArrival(workOrderId, crewData) {
    if (!io) return;

    io.to(`work-order-${workOrderId}`).emit('client:crew-arrived', {
        ...crewData,
        timestamp: new Date().toISOString()
    });

    console.log(`[Socket.IO] Crew arrival notification for work order ${workOrderId}`);
}

/**
 * Emit crew approaching notification to client
 */
function notifyClientCrewApproaching(workOrderId, etaData) {
    if (!io) return;

    io.to(`work-order-${workOrderId}`).emit('client:crew-approaching', {
        ...etaData,
        timestamp: new Date().toISOString()
    });

    console.log(`[Socket.IO] Crew approaching notification for work order ${workOrderId}`);
}

/**
 * Emit invoice update to client
 */
function notifyClientInvoiceUpdate(userId, invoiceData) {
    if (!io) return;

    io.to(`user-${userId}`).emit('client:invoice-update', {
        ...invoiceData,
        timestamp: new Date().toISOString()
    });

    console.log(`[Socket.IO] Invoice update notification for user ${userId}`);
}

/**
 * Emit appointment reminder to client
 */
function notifyClientAppointmentReminder(userId, appointmentData) {
    if (!io) return;

    io.to(`user-${userId}`).emit('client:appointment-reminder', {
        ...appointmentData,
        timestamp: new Date().toISOString()
    });

    console.log(`[Socket.IO] Appointment reminder for user ${userId}`);
}

/**
 * Emit new message notification
 */
function notifyNewMessage(userId, messageData) {
    if (!io) return;

    io.to(`user-${userId}`).emit('client:message', {
        ...messageData,
        timestamp: new Date().toISOString()
    });

    console.log(`[Socket.IO] New message notification for user ${userId}`);
}

module.exports = {
    initializeSocket,
    getIO,
    sendBusinessNotification,
    sendUserNotification,
    broadcastUpdate,
    emitGPSUpdate,
    emitGeofenceEvent,
    notifyClientCrewArrival,
    notifyClientCrewApproaching,
    notifyClientInvoiceUpdate,
    notifyClientAppointmentReminder,
    notifyNewMessage
};

