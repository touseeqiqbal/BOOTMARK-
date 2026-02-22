const { getCollectionRef, useFirestore } = require('../utils/db');

async function verify() {
    console.log('Verifying Firestore data...');
    if (!useFirestore) {
        console.log('Firestore not active.');
        return;
    }

    try {
        const servicesSnapshot = await getCollectionRef('services').limit(1).get();
        if (!servicesSnapshot.empty) {
            console.log('Sample Service JSON:');
            console.log(JSON.stringify(servicesSnapshot.docs[0].data(), null, 2));
        } else {
            console.log('No services found.');
        }

        const productsSnapshot = await getCollectionRef('products').limit(1).get();
        if (!productsSnapshot.empty) {
            console.log('Sample Product JSON:');
            console.log(JSON.stringify(productsSnapshot.docs[0].data(), null, 2));
        }
    } catch (error) {
        console.error('Verification failed:', error);
    }
    process.exit(0);
}

verify();
