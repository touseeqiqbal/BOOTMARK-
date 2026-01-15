const NodeCache = require('node-cache');

// Create cache instance with default TTL of 5 minutes
const cache = new NodeCache({
    stdTTL: 300, // 5 minutes default
    checkperiod: 60, // Check for expired keys every 60 seconds
    useClones: false // Better performance, but be careful with object mutations
});

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {any} Cached value or undefined
 */
function getCache(key) {
    const value = cache.get(key);
    if (value !== undefined) {
        console.log(`[Cache] HIT: ${key}`);
    } else {
        console.log(`[Cache] MISS: ${key}`);
    }
    return value;
}

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (optional)
 */
function setCache(key, value, ttl = 300) {
    const success = cache.set(key, value, ttl);
    if (success) {
        console.log(`[Cache] SET: ${key} (TTL: ${ttl}s)`);
    }
    return success;
}

/**
 * Invalidate cache by pattern
 * @param {string} pattern - Pattern to match keys
 */
function invalidateCache(pattern) {
    const keys = cache.keys().filter(k => k.includes(pattern));
    if (keys.length > 0) {
        cache.del(keys);
        console.log(`[Cache] INVALIDATED: ${keys.length} keys matching "${pattern}"`);
    }
    return keys.length;
}

/**
 * Clear all cache
 */
function clearCache() {
    cache.flushAll();
    console.log('[Cache] CLEARED: All cache entries removed');
}

/**
 * Get cache statistics
 */
function getCacheStats() {
    return cache.getStats();
}

module.exports = {
    getCache,
    setCache,
    invalidateCache,
    clearCache,
    getCacheStats
};
