/**
 * Multi-Tenant Helper Middleware
 * 
 * Provides helper functions for filtering data by businessId
 * to ensure proper data isolation between businesses
 */

const { getCollectionRef } = require('./db');

/**
 * Get all documents from a Firestore collection filtered by businessId
 * @param {string} collectionName - Name of the Firestore collection
 * @param {string} businessId - Business ID to filter by
 * @returns {Promise<Array>} Array of documents
 */
async function getBusinessDocuments(collectionName, businessId) {
    if (!businessId) {
        console.warn(`[getBusinessDocuments] No businessId provided for ${collectionName}`);
        return [];
    }

    try {
        const collectionRef = getCollectionRef(collectionName);
        const snapshot = await collectionRef.where('businessId', '==', businessId).get();

        const documents = [];
        snapshot.forEach(doc => {
            documents.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return documents;
    } catch (error) {
        console.error(`[getBusinessDocuments] Error fetching ${collectionName}:`, error);
        return [];
    }
}

/**
 * Get a single document from Firestore and verify it belongs to the business
 * @param {string} collectionName - Name of the Firestore collection
 * @param {string} documentId - Document ID
 * @param {string} businessId - Business ID to verify ownership
 * @returns {Promise<Object|null>} Document data or null if not found/unauthorized
 */
async function getBusinessDocument(collectionName, documentId, businessId) {
    if (!businessId) {
        console.warn(`[getBusinessDocument] No businessId provided for ${collectionName}/${documentId}`);
        return null;
    }

    try {
        const collectionRef = getCollectionRef(collectionName);
        const docRef = collectionRef.doc(documentId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return null;
        }

        const data = doc.data();

        // Verify document belongs to the business
        if (data.businessId !== businessId) {
            console.warn(`[getBusinessDocument] Access denied: ${collectionName}/${documentId} does not belong to business ${businessId}`);
            return null;
        }

        return {
            id: doc.id,
            ...data
        };
    } catch (error) {
        console.error(`[getBusinessDocument] Error fetching ${collectionName}/${documentId}:`, error);
        return null;
    }
}

/**
 * Middleware to require businessId in request
 * Attaches businessId to req for easy access
 */
function requireBusinessId(req, res, next) {
    const businessId = req.user?.businessId;

    if (!businessId) {
        // Super admins don't need businessId
        if (req.user?.isSuperAdmin) {
            return next();
        }

        return res.status(403).json({
            error: 'No business associated with your account. Please contact support.'
        });
    }

    // Attach to req for easy access
    req.businessId = businessId;
    next();
}

/**
 * Add businessId to document data before saving
 * @param {Object} data - Document data
 * @param {string} businessId - Business ID
 * @returns {Object} Data with businessId added
 */
function addBusinessId(data, businessId) {
    return {
        ...data,
        businessId: businessId
    };
}

/**
 * Verify user has permission to access a specific business's data
 * @param {Object} user - User object from req.user
 * @param {string} businessId - Business ID to check
 * @returns {boolean} True if user can access this business's data
 */
function canAccessBusiness(user, businessId) {
    if (!user) return false;

    // Super admins can access all businesses
    if (user.isSuperAdmin) return true;

    // User must belong to the business
    return user.businessId === businessId;
}

module.exports = {
    getBusinessDocuments,
    getBusinessDocument,
    requireBusinessId,
    addBusinessId,
    canAccessBusiness
};
