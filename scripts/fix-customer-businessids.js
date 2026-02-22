/**
 * Migration script to fix existing customers with null businessId
 * Run this once to update all existing customers
 */

const path = require('path');
const { useFirestore, getCollectionRef, setDoc } = require('./utils/db');

async function fixCustomerBusinessIds() {
    console.log('[Migration] Starting customer businessId fix...');

    try {
        if (!useFirestore) {
            console.log('[Migration] Firestore not configured, skipping migration');
            return;
        }

        const db = require('./utils/db').admin.firestore();

        // Get all customers with null or missing businessId
        const customersSnapshot = await db.collection('customers').get();

        let fixed = 0;
        let skipped = 0;

        for (const doc of customersSnapshot.docs) {
            const customer = doc.data();

            // If customer has no businessId, set it to their userId
            if (!customer.businessId && customer.userId) {
                await db.collection('customers').doc(doc.id).update({
                    businessId: customer.userId
                });
                console.log(`[Migration] Fixed customer ${doc.id}: businessId set to ${customer.userId}`);
                fixed++;
            } else {
                skipped++;
            }
        }

        console.log(`[Migration] Complete! Fixed: ${fixed}, Skipped: ${skipped}`);
    } catch (error) {
        console.error('[Migration] Error:', error);
    }
}

// Run if executed directly
if (require.main === module) {
    fixCustomerBusinessIds().then(() => {
        console.log('[Migration] Done');
        process.exit(0);
    }).catch(error => {
        console.error('[Migration] Failed:', error);
        process.exit(1);
    });
}

module.exports = { fixCustomerBusinessIds };
