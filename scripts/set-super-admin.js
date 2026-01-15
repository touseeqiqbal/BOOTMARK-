#!/usr/bin/env node

/**
 * Script to set super admin status for a user
 * 
 * Usage:
 *   node scripts/set-super-admin.js <user-email-or-uid> [true|false]
 * 
 * Examples:
 *   node scripts/set-super-admin.js admin@example.com true
 *   node scripts/set-super-admin.js user-uid-12345 true
 */

const path = require('path');
const fs = require('fs').promises;
const { getDataFilePath } = require('../utils/dataPath');
const { db, useFirestore, getCollectionRef, getDoc, setDoc } = require('../utils/db');

// Helper to get users file path
function getUsersFilePath() {
  return getDataFilePath("users.json");
}

// Get all users (from Firestore or JSON file)
async function getUsers() {
  if (useFirestore && db) {
    try {
      const usersRef = getCollectionRef('users');
      const snapshot = await usersRef.get();
      const users = [];
      snapshot.forEach(doc => {
        users.push({ id: doc.id, ...doc.data() });
      });
      return users;
    } catch (e) {
      console.error('Error fetching users from Firestore:', e.message);
      throw e;
    }
  } else {
    try {
      const USERS_FILE = getUsersFilePath();
      const data = await fs.readFile(USERS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
}

// Save users (to Firestore or JSON file)
async function saveUsers(users) {
  if (useFirestore && db) {
    try {
      // Save each user to Firestore
      for (const user of users) {
        const userId = user.uid || user.id;
        if (!userId) continue;
        
        const cleanUser = {};
        for (const key in user) {
          if (user[key] !== undefined) {
            cleanUser[key] = user[key];
          }
        }
        delete cleanUser.id;
        
        await setDoc('users', userId, cleanUser);
      }
    } catch (e) {
      console.error('Error saving users to Firestore:', e.message);
      throw e;
    }
  } else {
    try {
      const USERS_FILE = getUsersFilePath();
      const dir = path.dirname(USERS_FILE);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    } catch (error) {
      throw error;
    }
  }
}

async function setSuperAdmin(userIdentifier, isSuperAdmin = true) {
  try {
    console.log(`\n🔧 Setting super admin status for: ${userIdentifier}`);
    console.log(`   Status: ${isSuperAdmin ? 'ENABLED' : 'DISABLED'}\n`);

    // Get all users
    const users = await getUsers();
    
    // Find user by email or uid
    const userIndex = users.findIndex(u => {
      const uid = u.uid || u.id;
      const email = u.email;
      return (
        uid === userIdentifier || 
        String(uid) === String(userIdentifier) ||
        email === userIdentifier ||
        email?.toLowerCase() === userIdentifier?.toLowerCase()
      );
    });

    if (userIndex === -1) {
      console.error(`❌ User not found: ${userIdentifier}`);
      console.error('\nAvailable users:');
      users.forEach(u => {
        console.error(`   - ${u.email} (${u.uid || u.id})`);
      });
      process.exit(1);
    }

    const user = users[userIndex];
    const userId = user.uid || user.id;
    
    console.log(`✅ Found user: ${user.email} (${user.name || 'No name'})`);
    console.log(`   Current isSuperAdmin: ${user.isSuperAdmin || false}`);
    
    // Update the user
    user.isSuperAdmin = isSuperAdmin === true || isSuperAdmin === 'true';
    user.updatedAt = new Date().toISOString();
    users[userIndex] = user;
    
    // Save to database (works for both Firestore and JSON)
    await saveUsers(users);
    
    if (useFirestore && db) {
      console.log(`✅ Updated user in Firestore`);
    } else {
      console.log(`✅ Updated user in JSON file`);
    }
    
    console.log(`\n✅ Success! User ${user.email} is now ${user.isSuperAdmin ? 'a SUPER ADMIN' : 'a regular user'}`);
    console.log(`\n📝 Note: User must log out and log back in for changes to take effect.\n`);
    
  } catch (error) {
    console.error('\n❌ Error setting super admin status:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length < 1) {
  console.error('\n❌ Usage: node scripts/set-super-admin.js <user-email-or-uid> [true|false]');
  console.error('\nExamples:');
  console.error('  node scripts/set-super-admin.js admin@example.com true');
  console.error('  node scripts/set-super-admin.js user-uid-12345 true');
  console.error('  node scripts/set-super-admin.js admin@example.com false\n');
  process.exit(1);
}

const userIdentifier = args[0];
const isSuperAdmin = args[1] !== undefined ? args[1] : true;

setSuperAdmin(userIdentifier, isSuperAdmin)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:');
    console.error(error);
    process.exit(1);
  });
