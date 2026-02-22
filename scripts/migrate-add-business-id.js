/**
 * Database Migration Script
 * Adds businessId to all existing documents in Firestore
 * 
 * Run this script ONCE to migrate existing data
 * Usage: node scripts/migrate-add-business-id.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
try {
    const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
    const serviceAccount = require(serviceAccountPath);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    console.log('✅ Firebase Admin initialized');
} catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    process.exit(1);
}

const db = admin.firestore();

// Collections that need businessId
const COLLECTIONS_TO_MIGRATE = [
    'customers',
    'properties',
    'workOrders',
    'services',
    'products',
    'contracts',
    'estimates',
    'invoices',
    'scheduling'
];

/**
 * Get the first business ID to use as default
 */
async function getDefaultBusinessId() {
    try {
        const businessesSnapshot = await db.collection('businesses').limit(1).get();

        if (businessesSnapshot.empty) {
            console.error('❌ No businesses found in database!');
            console.log('Please create a business first before running migration.');
            return null;
        }

        const firstBusiness = businessesSnapshot.docs[0];
        return firstBusiness.id;
    } catch (error) {
        console.error('❌ Error fetching businesses:', error);
        return null;
    }
}

/**
 * Add businessId to documents in a collection
 */
async function migrateCollection(collectionName, defaultBusinessId) {
    console.log(`\n📦 Processing collection: ${collectionName}`);

    try {
        const snapshot = await db.collection(collectionName).get();

        if (snapshot.empty) {
            console.log(`   ℹ️  Collection is empty, skipping`);
            return { updated: 0, skipped: 0 };
        }

        let updated = 0;
        let skipped = 0;
        const batch = db.batch();
        let batchCount = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();

            // Skip if already has businessId
            if (data.businessId) {
                skipped++;
                continue;
            }

            // Add businessId
            batch.update(doc.ref, {
                businessId: defaultBusinessId,
                migratedAt: new Date().toISOString()
            });

            updated++;
            batchCount++;

            // Firestore batch limit is 500 operations
            if (batchCount >= 500) {
                await batch.commit();
                console.log(`   ✅ Committed batch of ${batchCount} updates`);
                batchCount = 0;
            }
        }

        // Commit remaining updates
        if (batchCount > 0) {
            await batch.commit();
            console.log(`   ✅ Committed final batch of ${batchCount} updates`);
        }

        console.log(`   📊 Updated: ${updated}, Skipped: ${skipped}, Total: ${snapshot.size}`);

        return { updated, skipped };
    } catch (error) {
        console.error(`   ❌ Error migrating ${collectionName}:`, error);
        return { updated: 0, skipped: 0, error: error.message };
    }
}

/**
 * Main migration function
 */
async function migrate() {
    console.log('🚀 Starting database migration...\n');
    console.log('This script will add businessId to all existing documents.');
    console.log('Documents that already have businessId will be skipped.\n');

    // Get default business ID
    const defaultBusinessId = await getDefaultBusinessId();

    if (!defaultBusinessId) {
        console.error('❌ Cannot proceed without a business ID');
        process.exit(1);
    }

    console.log(`📌 Using default businessId: ${defaultBusinessId}\n`);
    console.log('⚠️  WARNING: This will modify your database!');
    console.log('Make sure you have a backup before proceeding.\n');

    // Wait 3 seconds to allow user to cancel
    console.log('Starting in 3 seconds... (Press Ctrl+C to cancel)');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const results = {
        totalUpdated: 0,
        totalSkipped: 0,
        errors: []
    };

    // Migrate each collection
    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
        const result = await migrateCollection(collectionName, defaultBusinessId);
        results.totalUpdated += result.updated || 0;
        results.totalSkipped += result.skipped || 0;

        if (result.error) {
            results.errors.push({
                collection: collectionName,
                error: result.error
            });
        }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total documents updated: ${results.totalUpdated}`);
    console.log(`Total documents skipped: ${results.totalSkipped}`);
    console.log(`Collections processed: ${COLLECTIONS_TO_MIGRATE.length}`);

    if (results.errors.length > 0) {
        console.log(`\n⚠️  Errors encountered: ${results.errors.length}`);
        results.errors.forEach(err => {
            console.log(`   - ${err.collection}: ${err.error}`);
        });
    }

    console.log('\n✅ Migration complete!');
    console.log('\nNext steps:');
    console.log('1. Verify the migration by checking a few documents in Firestore');
    console.log('2. Deploy the updated route files with businessId filtering');
    console.log('3. Test that each business can only see their own data');

    process.exit(0);
}

// Run migration
migrate().catch(error => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
});
