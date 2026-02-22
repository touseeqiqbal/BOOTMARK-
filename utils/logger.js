/**
 * Structured Logger for BOOTMARK
 * Wraps console methods to output JSON-formatted logs for better observability
 * compatible with CloudWatch, Datadog, Splunk, etc.
 */

const LOG_LEVELS = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
};

const CURRENT_LEVEL = process.env.LOG_LEVEL || LOG_LEVELS.INFO;

const shouldLog = (level) => {
    const levels = Object.values(LOG_LEVELS);
    return levels.indexOf(level) <= levels.indexOf(CURRENT_LEVEL);
};

const formatMessage = (level, message, meta = {}) => {
    return JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        ...meta,
        environment: process.env.NODE_ENV || 'development'
    });
};

const logger = {
    info: (message, meta) => {
        if (shouldLog(LOG_LEVELS.INFO)) {
            console.log(formatMessage(LOG_LEVELS.INFO, message, meta));
        }
    },

    warn: (message, meta) => {
        if (shouldLog(LOG_LEVELS.WARN)) {
            console.warn(formatMessage(LOG_LEVELS.WARN, message, meta));
        }
    },

    error: (message, errorOrMeta) => {
        if (shouldLog(LOG_LEVELS.ERROR)) {
            const meta = errorOrMeta instanceof Error
                ? { error: errorOrMeta.message, stack: errorOrMeta.stack }
                : errorOrMeta;
            console.error(formatMessage(LOG_LEVELS.ERROR, message, meta));
        }
    },

    debug: (message, meta) => {
        if (shouldLog(LOG_LEVELS.DEBUG)) {
            console.debug(formatMessage(LOG_LEVELS.DEBUG, message, meta));
        }
    }
};

module.exports = logger;
