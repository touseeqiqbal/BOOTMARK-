/**
 * Contract Signature Utilities
 * Handle signature storage, validation, and metadata
 */

const crypto = require('crypto');

/**
 * Generate secure signature token
 */
function generateSignatureToken(contractId, signerEmail) {
    const data = `${contractId}-${signerEmail}-${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Validate signature data (base64 image)
 */
function validateSignatureData(signatureData) {
    if (!signatureData || typeof signatureData !== 'string') {
        return { valid: false, error: 'Invalid signature data' };
    }

    // Check if it's a valid base64 data URL
    const base64Regex = /^data:image\/(png|jpeg|jpg);base64,/;
    if (!base64Regex.test(signatureData)) {
        return { valid: false, error: 'Signature must be a base64 PNG or JPEG image' };
    }

    // Check size (max 2MB)
    const base64Data = signatureData.split(',')[1];
    const sizeInBytes = Buffer.from(base64Data, 'base64').length;
    const sizeInMB = sizeInBytes / (1024 * 1024);

    if (sizeInMB > 2) {
        return { valid: false, error: 'Signature image too large (max 2MB)' };
    }

    return { valid: true };
}

/**
 * Get client IP address from request
 */
function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.headers['x-real-ip'] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        'unknown';
}

/**
 * Get device metadata from request
 */
function getDeviceMetadata(req) {
    const userAgent = req.headers['user-agent'] || '';

    // Simple device detection
    let deviceType = 'desktop';
    if (/mobile/i.test(userAgent)) deviceType = 'mobile';
    else if (/tablet|ipad/i.test(userAgent)) deviceType = 'tablet';

    // Simple browser detection
    let browserName = 'unknown';
    if (/chrome/i.test(userAgent)) browserName = 'Chrome';
    else if (/firefox/i.test(userAgent)) browserName = 'Firefox';
    else if (/safari/i.test(userAgent)) browserName = 'Safari';
    else if (/edge/i.test(userAgent)) browserName = 'Edge';

    // Simple OS detection
    let osName = 'unknown';
    if (/windows/i.test(userAgent)) osName = 'Windows';
    else if (/mac/i.test(userAgent)) osName = 'macOS';
    else if (/linux/i.test(userAgent)) osName = 'Linux';
    else if (/android/i.test(userAgent)) osName = 'Android';
    else if (/ios|iphone|ipad/i.test(userAgent)) osName = 'iOS';

    return {
        deviceType,
        browserName,
        osName,
        userAgent
    };
}

/**
 * Create signature record
 */
function createSignatureRecord(data, req) {
    const metadata = getDeviceMetadata(req);
    const ipAddress = getClientIP(req);

    return {
        id: `sig-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        contractId: data.contractId,
        signedBy: data.signerEmail || data.signedBy,
        signerName: data.signerName,
        signerType: data.signerType || 'client', // 'business' | 'client'
        signatureData: data.signatureData,
        signedAt: new Date().toISOString(),
        ipAddress,
        userAgent: metadata.userAgent,
        consentGiven: data.consentGiven || false,
        status: 'completed',
        metadata: {
            signatureMethod: 'canvas',
            deviceType: metadata.deviceType,
            browserName: metadata.browserName,
            osName: metadata.osName
        }
    };
}

/**
 * Create audit log entry
 */
function createAuditLogEntry(action, contractId, performedBy, req, details = {}) {
    return {
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        contractId,
        action, // 'requested' | 'viewed' | 'signed' | 'declined' | 'pdf_generated'
        performedBy,
        timestamp: new Date().toISOString(),
        ipAddress: getClientIP(req),
        details
    };
}

/**
 * Check if all required signatures are complete
 */
function areAllSignaturesComplete(contract, signatures) {
    if (!contract.requiredSigners || contract.requiredSigners.length === 0) {
        return false;
    }

    const signedEmails = signatures.map(s => s.signedBy.toLowerCase());

    return contract.requiredSigners.every(signer => {
        return signedEmails.includes(signer.email.toLowerCase());
    });
}

/**
 * Update contract signature status
 */
function updateContractSignatureStatus(contract, signatures) {
    if (!contract.requiredSigners || contract.requiredSigners.length === 0) {
        return 'unsigned';
    }

    if (signatures.length === 0) {
        return 'unsigned';
    }

    const allComplete = areAllSignaturesComplete(contract, signatures);

    if (allComplete) {
        return 'fully-signed';
    } else if (signatures.length > 0) {
        return 'partially-signed';
    }

    return 'unsigned';
}

/**
 * Verify signature token
 */
function verifySignatureToken(token, contractId) {
    // In production, you'd store tokens in database with expiration
    // For now, we'll do basic validation
    return token && token.length === 64; // SHA256 hash length
}

module.exports = {
    generateSignatureToken,
    validateSignatureData,
    getClientIP,
    getDeviceMetadata,
    createSignatureRecord,
    createAuditLogEntry,
    areAllSignaturesComplete,
    updateContractSignatureStatus,
    verifySignatureToken
};
