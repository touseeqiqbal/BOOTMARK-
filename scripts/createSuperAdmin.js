/**
 * Bootstrap Super Admin Script
 * 
 * This script creates the first super admin account in your system.
 * Run this ONCE when setting up a new database.
 * 
 * Usage:
 *   node scripts/createSuperAdmin.js
 */

const path = require('path');
const fs = require('fs').promises;
const readline = require('readline');

// Import database utilities
const { useFirestore, setDoc, getCollectionRef } = require('../utils/db');
const { getDataFilePath } = require('../utils/dataPath');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function createSuperAdmin() {
    console.log('\n==============================================');
    console.log('   SUPER ADMIN ACCOUNT CREATION');
    console.log('==============================================\n');

    try {
        // Get super admin details
        const email = await question('Enter super admin email: ');
        const name = await question('Enter super admin name: ');
        const uid = await question('Enter Firebase UID (from Firebase Auth): ');

        if (!email || !name || !uid) {
            console.error('\n❌ Error: All fields are required!');
            rl.close();
            return;
        }

        // Create super admin user object
        const superAdmin = {
            id: uid,
            uid: uid,
            email: email.trim(),
            name: name.trim(),
            isSuperAdmin: true,
            isAdmin: true,
            accountStatus: 'active',
            accountType: 'super-admin',
            role: 'super-admin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        console.log('\n📝 Creating super admin with details:');
        console.log(JSON.stringify(superAdmin, null, 2));

        const confirm = await question('\nProceed with creation? (yes/no): ');

        if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
            console.log('\n❌ Cancelled.');
            rl.close();
            return;
        }

        // Save to database
        if (useFirestore) {
            console.log('\n💾 Saving to Firestore...');
            await setDoc('users', uid, superAdmin);
            console.log('✅ Super admin created in Firestore!');
        } else {
            console.log('\n💾 Saving to JSON file...');
            const USERS_FILE = getDataFilePath('users.json');

            // Ensure directory exists
            const dir = path.dirname(USERS_FILE);
            await fs.mkdir(dir, { recursive: true });

            // Read existing users or create empty array
            let users = [];
            try {
                const data = await fs.readFile(USERS_FILE, 'utf8');
                users = JSON.parse(data);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }

            // Check if user already exists
            const existingIndex = users.findIndex(u => u.uid === uid || u.email === email);
            if (existingIndex !== -1) {
                console.log('\n⚠️  User already exists. Updating to super admin...');
                users[existingIndex] = { ...users[existingIndex], ...superAdmin };
            } else {
                users.push(superAdmin);
            }

            // Save to file
            await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
            console.log(`✅ Super admin created in ${USERS_FILE}!`);
        }

        console.log('\n==============================================');
        console.log('✅ SUCCESS! Super admin account created.');
        console.log('==============================================\n');
        console.log('Next steps:');
        console.log('1. Login with this account using Firebase Auth');
        console.log('2. Navigate to /admin/approvals to approve businesses');
        console.log('3. You can now approve/reject business registrations\n');

    } catch (error) {
        console.error('\n❌ Error creating super admin:', error.message);
        console.error(error);
    } finally {
        rl.close();
    }
}

// Run the script
createSuperAdmin();
