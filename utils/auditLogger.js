const path = require('path');
const { useFirestore, setDoc, getCollectionRef } = require('./db');

/**
 * Log audit events for security and compliance
 * @param {Object} options - Audit log options
 * @param {string} options.userId - User ID performing the action
 * @param {string} options.action - Action performed (CREATE, UPDATE, DELETE, VIEW, LOGIN, LOGOUT)
 * @param {string} options.resource - Resource type (customers, invoices, workOrders, etc.)
 * @param {string} options.resourceId - ID of the resource
 * @param {Object} options.details - Additional details about the action
 * @param {string} options.ip - IP address of the request
 * @param {string} options.userAgent - User agent string
 * @param {string} options.businessId - Business tenant ID
 */
async function logAudit({
  userId,
  action,
  resource,
  resourceId = null,
  details = {},
  ip = null,
  userAgent = null,
  businessId = null
}) {
  try {
    const log = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      action,
      resource,
      resourceId,
      details,
      ip,
      userAgent,
      businessId,
      timestamp: new Date().toISOString()
    };

    if (useFirestore) {
      await setDoc('auditLogs', log.id, log);
    } else {
      // Fallback to JSON file
      const fs = require('fs').promises;
      const { getDataFilePath } = require('./dataPath');
      const auditLogsPath = getDataFilePath('auditLogs.json');
      
      let logs = [];
      try {
        const data = await fs.readFile(auditLogsPath, 'utf8');
        logs = JSON.parse(data);
      } catch (error) {
        // File doesn't exist yet
      }
      
      logs.push(log);
      
      // Keep only last 10000 logs to prevent file from growing too large
      if (logs.length > 10000) {
        logs = logs.slice(-10000);
      }
      
      await fs.writeFile(auditLogsPath, JSON.stringify(logs, null, 2));
    }

    console.log(`[Audit] ${action} on ${resource} by user ${userId}`);
  } catch (error) {
    console.error('[Audit] Failed to log audit event:', error);
    // Don't throw error - audit logging should not break the application
  }
}

/**
 * Get audit logs with filtering
 * @param {Object} filters - Filter options
 * @param {string} filters.userId - Filter by user ID
 * @param {string} filters.resource - Filter by resource type
 * @param {string} filters.action - Filter by action type
 * @param {string} filters.businessId - Filter by business ID
 * @param {number} filters.limit - Limit number of results
 */
async function getAuditLogs(filters = {}) {
  try {
    let logs = [];

    if (useFirestore) {
      let query = getCollectionRef('auditLogs');
      
      if (filters.userId) query = query.where('userId', '==', filters.userId);
      if (filters.resource) query = query.where('resource', '==', filters.resource);
      if (filters.action) query = query.where('action', '==', filters.action);
      if (filters.businessId) query = query.where('businessId', '==', filters.businessId);
      
      query = query.orderBy('timestamp', 'desc');
      
      if (filters.limit) query = query.limit(filters.limit);
      
      const snapshot = await query.get();
      snapshot.forEach(doc => logs.push({ id: doc.id, ...doc.data() }));
    } else {
      const fs = require('fs').promises;
      const { getDataFilePath } = require('./dataPath');
      const auditLogsPath = getDataFilePath('auditLogs.json');
      
      try {
        const data = await fs.readFile(auditLogsPath, 'utf8');
        logs = JSON.parse(data);
        
        // Apply filters
        if (filters.userId) logs = logs.filter(l => l.userId === filters.userId);
        if (filters.resource) logs = logs.filter(l => l.resource === filters.resource);
        if (filters.action) logs = logs.filter(l => l.action === filters.action);
        if (filters.businessId) logs = logs.filter(l => l.businessId === filters.businessId);
        
        // Sort by timestamp descending
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Apply limit
        if (filters.limit) logs = logs.slice(0, filters.limit);
      } catch (error) {
        // No logs file yet
      }
    }

    return logs;
  } catch (error) {
    console.error('[Audit] Failed to get audit logs:', error);
    return [];
  }
}

/**
 * Express middleware to automatically log requests
 */
function auditMiddleware(req, res, next) {
  // Store original send function
  const originalSend = res.send;
  
  // Override send function to log after response
  res.send = function(data) {
    // Only log successful requests (2xx status codes)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const action = req.method === 'GET' ? 'VIEW' : 
                     req.method === 'POST' ? 'CREATE' :
                     req.method === 'PUT' || req.method === 'PATCH' ? 'UPDATE' :
                     req.method === 'DELETE' ? 'DELETE' : 'UNKNOWN';
      
      // Extract resource from path
      const pathParts = req.path.split('/').filter(p => p);
      const resource = pathParts[1] || 'unknown'; // e.g., /api/customers -> customers
      const resourceId = pathParts[2] || null;
      
      // Don't log health checks and other noise
      if (resource !== 'health' && resource !== 'api-docs') {
        logAudit({
          userId: req.user?.uid || req.user?.id || 'anonymous',
          action,
          resource,
          resourceId,
          details: {
            method: req.method,
            path: req.path,
            query: req.query
          },
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          businessId: req.user?.businessId || null
        });
      }
    }
    
    // Call original send
    originalSend.call(this, data);
  };
  
  next();
}

module.exports = {
  logAudit,
  getAuditLogs,
  auditMiddleware
};
