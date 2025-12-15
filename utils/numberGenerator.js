const fs = require('fs').promises;
const path = require('path');
const { useFirestore, getCollectionRef, getDoc, setDoc } = require('./db');

/**
 * Number Generator Utility
 * Generates custom formatted numbers for work orders, invoices, clients, etc.
 * Supports multi-tenant isolation with separate counters per business
 * Supports both Firestore and JSON file storage
 */

const DATA_DIR = path.join(__dirname, '../data');
const BUSINESSES_FILE = path.join(DATA_DIR, 'businesses.json');

/**
 * Default number formats for new businesses
 */
const DEFAULT_FORMATS = {
    workOrder: {
        format: 'WO-{YEAR}-{COUNTER:5}',
        counter: 1,
        prefix: 'WO',
        padding: 5,
        resetPeriod: 'never',
        lastReset: new Date().toISOString()
    },
    invoice: {
        format: 'INV-{YEAR}{MONTH}-{COUNTER:4}',
        counter: 1,
        prefix: 'INV',
        padding: 4,
        resetPeriod: 'monthly',
        lastReset: new Date().toISOString()
    },
    client: {
        format: 'CLIENT-{COUNTER:6}',
        counter: 1,
        prefix: 'CLIENT',
        padding: 6,
        resetPeriod: 'never',
        lastReset: new Date().toISOString()
    },
    scheduling: {
        format: 'SCH-{COUNTER:5}',
        counter: 1,
        prefix: 'SCH',
        padding: 5,
        resetPeriod: 'never',
        lastReset: new Date().toISOString()
    },
    contract: {
        format: 'CONT-{YEAR}-{COUNTER:4}',
        counter: 1,
        prefix: 'CONT',
        padding: 4,
        resetPeriod: 'yearly',
        lastReset: new Date().toISOString()
    }
};

/**
 * Check if counter should be reset based on reset period
 */
function shouldResetCounter(config) {
    if (!config.resetPeriod || config.resetPeriod === 'never') {
        return false;
    }

    const now = new Date();
    const lastReset = new Date(config.lastReset || now);

    switch (config.resetPeriod) {
        case 'daily':
            return now.toDateString() !== lastReset.toDateString();
        case 'monthly':
            return now.getMonth() !== lastReset.getMonth() ||
                now.getFullYear() !== lastReset.getFullYear();
        case 'yearly':
            return now.getFullYear() !== lastReset.getFullYear();
        default:
            return false;
    }
}

/**
 * Parse format string and replace placeholders
 */
function parseFormat(format, counter, padding = 5) {
    const now = new Date();

    // Pad counter with leading zeros
    const paddedCounter = String(counter).padStart(padding, '0');

    // Replace all placeholders
    let result = format
        .replace(/{PREFIX}/g, '') // Prefix is already in the format
        .replace(/{YEAR}/g, now.getFullYear().toString())
        .replace(/{YY}/g, now.getFullYear().toString().slice(-2))
        .replace(/{MONTH}/g, String(now.getMonth() + 1).padStart(2, '0'))
        .replace(/{DAY}/g, String(now.getDate()).padStart(2, '0'))
        .replace(/{COUNTER:(\d+)}/g, (match, pad) => {
            return String(counter).padStart(parseInt(pad), '0');
        })
        .replace(/{COUNTER}/g, paddedCounter)
        .replace(/{SUFFIX}/g, '');

    return result;
}

/**
 * Read businesses data (supports both Firestore and JSON)
 */
async function readBusinesses() {
    if (useFirestore) {
        try {
            const snap = await getCollectionRef('businesses').get();
            const businesses = [];
            snap.forEach(doc => {
                businesses.push({ id: doc.id, ...doc.data() });
            });
            return businesses;
        } catch (error) {
            console.error('Error reading businesses from Firestore:', error);
            return [];
        }
    }

    // Fallback to JSON file
    try {
        const data = await fs.readFile(BUSINESSES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Error reading businesses file:', error);
        }
        return [];
    }
}

/**
 * Write businesses data (supports both Firestore and JSON)
 */
async function writeBusinesses(businesses) {
    if (useFirestore) {
        try {
            // Update each business document in Firestore
            for (const business of businesses) {
                if (business.id) {
                    await setDoc('businesses', business.id, business);
                }
            }
            return;
        } catch (error) {
            console.error('Error writing businesses to Firestore:', error);
            throw error;
        }
    }

    // Fallback to JSON file
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.writeFile(BUSINESSES_FILE, JSON.stringify(businesses, null, 2));
    } catch (error) {
        console.error('Error writing businesses file:', error);
        throw error;
    }
}

/**
 * Get number format configuration for a business
 */
async function getNumberFormats(businessId) {
    try {
        const businesses = await readBusinesses();
        const business = businesses.find(b => b.id === businessId);

        if (!business) {
            // Return defaults if business not found
            console.log(`Business not found (${businessId}), returning default formats`);
            return DEFAULT_FORMATS;
        }

        // Return existing formats or defaults
        return business.numberFormats || DEFAULT_FORMATS;
    } catch (error) {
        console.error('Error getting number formats:', error);
        // Return defaults on error
        return DEFAULT_FORMATS;
    }
}

/**
 * Update number format configuration for a business
 */
async function updateNumberFormats(businessId, formats) {
    try {
        const businesses = await readBusinesses();
        let businessIndex = businesses.findIndex(b => b.id === businessId);

        // Create business entry if it doesn't exist
        if (businessIndex === -1) {
            console.log(`Creating new business entry for ${businessId}`);
            businesses.push({
                id: businessId,
                numberFormats: { ...DEFAULT_FORMATS }
            });
            businessIndex = businesses.length - 1;
        }

        // Merge with existing formats
        businesses[businessIndex].numberFormats = {
            ...DEFAULT_FORMATS,
            ...businesses[businessIndex].numberFormats,
            ...formats
        };

        await writeBusinesses(businesses);
        return businesses[businessIndex].numberFormats;
    } catch (error) {
        console.error('Error updating number formats:', error);
        throw error;
    }
}

/**
 * Generate next number for a specific type
 * @param {string} businessId - Business ID
 * @param {string} type - Type: 'workOrder', 'invoice', 'client', 'scheduling', 'contract'
 * @returns {Promise<string>} Generated number
 */
async function generateNumber(businessId, type) {
    if (useFirestore) {
        // Use Firestore transaction for atomic counter update
        const admin = require('firebase-admin');
        const db = admin.firestore();
        const businessRef = db.collection('businesses').doc(businessId);

        try {
            const generatedNumber = await db.runTransaction(async (transaction) => {
                const businessDoc = await transaction.get(businessRef);

                if (!businessDoc.exists) {
                    throw new Error(`Business not found: ${businessId}`);
                }

                const businessData = businessDoc.data();

                // Initialize number formats if not exists
                if (!businessData.numberFormats) {
                    businessData.numberFormats = JSON.parse(JSON.stringify(DEFAULT_FORMATS));
                }

                const config = businessData.numberFormats[type];

                if (!config) {
                    throw new Error(`Invalid number type: ${type}`);
                }

                // Check if counter should be reset
                if (shouldResetCounter(config)) {
                    config.counter = 1;
                    config.lastReset = new Date().toISOString();
                }

                // Get current counter value
                const currentCounter = config.counter || 1;

                // Generate the number
                const generatedNumber = parseFormat(
                    config.format,
                    currentCounter,
                    config.padding
                );

                // Increment counter for next time
                config.counter = currentCounter + 1;

                // Update business document with new counter
                transaction.update(businessRef, {
                    numberFormats: businessData.numberFormats
                });

                return generatedNumber;
            });

            return generatedNumber;
        } catch (error) {
            console.error('Error generating number in Firestore:', error);
            throw error;
        }
    }

    // Fallback to JSON file method
    const businesses = await readBusinesses();
    const businessIndex = businesses.findIndex(b => b.id === businessId);

    if (businessIndex === -1) {
        throw new Error(`Business not found: ${businessId}`);
    }

    // Initialize number formats if not exists
    if (!businesses[businessIndex].numberFormats) {
        businesses[businessIndex].numberFormats = JSON.parse(JSON.stringify(DEFAULT_FORMATS));
    }

    const config = businesses[businessIndex].numberFormats[type];

    if (!config) {
        throw new Error(`Invalid number type: ${type}`);
    }

    // Check if counter should be reset
    if (shouldResetCounter(config)) {
        config.counter = 1;
        config.lastReset = new Date().toISOString();
    }

    // Get current counter value
    const currentCounter = config.counter || 1;

    // Generate the number
    const generatedNumber = parseFormat(
        config.format,
        currentCounter,
        config.padding
    );

    // Increment counter for next time
    config.counter = currentCounter + 1;

    // Save updated counter
    await writeBusinesses(businesses);

    return generatedNumber;
}

/**
 * Preview what a number would look like without incrementing counter
 */
function previewNumber(format, counter = 1, padding = 5) {
    return parseFormat(format, counter, padding);
}

module.exports = {
    generateNumber,
    getNumberFormats,
    updateNumberFormats,
    previewNumber,
    DEFAULT_FORMATS
};
