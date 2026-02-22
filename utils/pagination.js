/**
 * Pagination Utility for BOOTMARK
 * Provides consistent pagination across all list endpoints
 * Reduces Firestore costs and improves performance
 */

/**
 * Parse pagination parameters from request query
 * @param {Object} query - Express req.query object
 * @returns {Object} Parsed pagination params { page, limit, offset }
 */
function parsePaginationParams(query) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 50)); // Max 100, default 50
    const offset = (page - 1) * limit;

    return { page, limit, offset };
}

/**
 * Create standardized paginated response
 * @param {Array} data - Array of items for current page
 * @param {number} total - Total count of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {Object} Paginated response object
 */
function createPaginatedResponse(data, total, page, limit) {
    const totalPages = Math.ceil(total / limit);

    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
            nextPage: page < totalPages ? page + 1 : null,
            prevPage: page > 1 ? page - 1 : null
        }
    };
}

/**
 * Apply pagination to Firestore query
 * @param {FirebaseFirestore.Query} query - Firestore query
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Array>} Paginated results
 */
async function paginateFirestoreQuery(query, page, limit) {
    const offset = (page - 1) * limit;

    // Get paginated results
    const snapshot = await query
        .limit(limit)
        .offset(offset)
        .get();

    const data = [];
    snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
    });

    return data;
}

/**
 * Get total count for Firestore query
 * Note: Firestore count() is more efficient than fetching all docs
 * @param {FirebaseFirestore.Query} query - Firestore query
 * @returns {Promise<number>} Total count
 */
async function getFirestoreCount(query) {
    try {
        const snapshot = await query.count().get();
        return snapshot.data().count;
    } catch (error) {
        // Fallback for older Firestore versions without count()
        console.warn('Firestore count() not available, using fallback');
        const snapshot = await query.get();
        return snapshot.size;
    }
}

/**
 * Apply pagination to in-memory array (for already-fetched data)
 * @param {Array} items - Array of items
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} Paginated response
 */
function paginateArray(items, page, limit) {
    const offset = (page - 1) * limit;
    const paginatedItems = items.slice(offset, offset + limit);

    return createPaginatedResponse(paginatedItems, items.length, page, limit);
}

/**
 * Parse filter parameters from query string
 * @param {Object} query - Express req.query object
 * @param {Array<string>} allowedFilters - List of allowed filter fields
 * @returns {Object} Parsed filters
 */
function parseFilterParams(query, allowedFilters = []) {
    const filters = {};

    allowedFilters.forEach(field => {
        if (query[field] !== undefined && query[field] !== '') {
            filters[field] = query[field];
        }
    });

    return filters;
}

/**
 * Apply filters to Firestore query
 * @param {FirebaseFirestore.Query} query - Base query
 * @param {Object} filters - Filter object { field: value }
 * @returns {FirebaseFirestore.Query} Filtered query
 */
function applyFilters(query, filters) {
    let filteredQuery = query;

    Object.entries(filters).forEach(([field, value]) => {
        filteredQuery = filteredQuery.where(field, '==', value);
    });

    return filteredQuery;
}

/**
 * Parse sort parameters from query string
 * @param {Object} query - Express req.query object
 * @param {string} defaultSort - Default sort field
 * @param {string} defaultOrder - Default sort order ('asc' or 'desc')
 * @returns {Object} Sort params { field, order }
 */
function parseSortParams(query, defaultSort = 'createdAt', defaultOrder = 'desc') {
    const sortField = query.sortBy || defaultSort;
    const sortOrder = (query.sortOrder || defaultOrder).toLowerCase();

    return {
        field: sortField,
        order: sortOrder === 'asc' ? 'asc' : 'desc'
    };
}

/**
 * Complete pagination helper - combines all functionality
 * @param {Object} options - Configuration object
 * @returns {Promise<Object>} Paginated response
 */
async function paginate(options) {
    const {
        query,           // Firestore query
        req,             // Express request object
        allowedFilters = [],
        defaultSort = 'createdAt',
        defaultOrder = 'desc'
    } = options;

    // Parse parameters
    const { page, limit } = parsePaginationParams(req.query);
    const filters = parseFilterParams(req.query, allowedFilters);
    const sort = parseSortParams(req.query, defaultSort, defaultOrder);

    // Apply filters
    let filteredQuery = applyFilters(query, filters);

    // Apply sorting
    filteredQuery = filteredQuery.orderBy(sort.field, sort.order);

    // Get total count and paginated data in parallel
    const [total, data] = await Promise.all([
        getFirestoreCount(filteredQuery),
        paginateFirestoreQuery(filteredQuery, page, limit)
    ]);

    return createPaginatedResponse(data, total, page, limit);
}

module.exports = {
    parsePaginationParams,
    createPaginatedResponse,
    paginateFirestoreQuery,
    getFirestoreCount,
    paginateArray,
    parseFilterParams,
    applyFilters,
    parseSortParams,
    paginate
};
