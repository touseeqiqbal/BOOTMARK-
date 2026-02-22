import io from 'socket.io-client';

let socket = null;

/**
 * Initialize Socket.IO client connection
 */
export function initializeSocket() {
    if (socket) return socket;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    let serverUrl = apiUrl;

    // Clean URL to ensure we connect to the root namespace
    try {
        if (apiUrl.startsWith('http')) {
            const urlObj = new URL(apiUrl);
            serverUrl = urlObj.origin;
        }
    } catch (e) {
        console.warn('Failed to parse API URL for socket connection:', e);
    }

    socket = io(serverUrl, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        path: '/socket.io/' // Explicitly set default path
    });

    socket.on('connect', () => {
        console.log('[Socket.IO] Connected to server');
    });

    socket.on('disconnect', () => {
        console.log('[Socket.IO] Disconnected from server');
    });

    socket.on('connect_error', (error) => {
        console.error('[Socket.IO] Connection error:', error);
    });

    return socket;
}

/**
 * Join business room for multi-tenant notifications
 */
export function joinBusiness(businessId) {
    if (!socket) initializeSocket();
    if (businessId) {
        socket.emit('join-business', businessId);
        console.log(`[Socket.IO] Joined business room: ${businessId}`);
    }
}

/**
 * Join user room for personal notifications
 */
export function joinUser(userId) {
    if (!socket) initializeSocket();
    if (userId) {
        socket.emit('join-user', userId);
        console.log(`[Socket.IO] Joined user room: ${userId}`);
    }
}

/**
 * Join work order room for crew tracking
 */
export function joinWorkOrder(workOrderId) {
    if (!socket) initializeSocket();
    if (workOrderId) {
        socket.emit('join-work-order', workOrderId);
        console.log(`[Socket.IO] Joined work order room: ${workOrderId}`);
    }
}

/**
 * Listen for notifications
 */
export function onNotification(callback) {
    if (!socket) initializeSocket();
    socket.on('notification', callback);
}

/**
 * Listen for live updates
 */
export function onLiveUpdate(callback) {
    if (!socket) initializeSocket();
    socket.on('live-update', callback);
}

/**
 * Remove notification listener
 */
export function offNotification(callback) {
    if (socket) {
        socket.off('notification', callback);
    }
}

/**
 * Remove live update listener
 */
export function offLiveUpdate(callback) {
    if (socket) {
        socket.off('live-update', callback);
    }
}

/**
 * Send notification to specific user or business
 */
export function sendNotification(targetId, notification) {
    if (!socket) initializeSocket();

    // Determine if target is user or business
    if (targetId.startsWith('user-')) {
        socket.emit('notification', { userId: targetId.replace('user-', ''), notification });
    } else if (targetId.startsWith('business-')) {
        socket.emit('notification', { businessId: targetId.replace('business-', ''), notification });
    } else {
        // Assume it's a user ID
        socket.emit('notification', { userId: targetId, notification });
    }
}

/**
 * Disconnect socket
 */
export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

export default {
    initializeSocket,
    joinBusiness,
    joinUser,
    joinWorkOrder,
    onNotification,
    onLiveUpdate,
    offNotification,
    offLiveUpdate,
    sendNotification,
    disconnectSocket
};

