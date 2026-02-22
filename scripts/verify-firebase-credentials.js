#!/usr/bin/env node

/**
 * Script to verify Firebase service account credentials
 * 
 * Usage:
 *   node scripts/verify-firebase-credentials.js
 * 
 * This will test if the service account can actually authenticate with Firebase
 */

const { admin, db } = require('../utils/db')

async function verifyCredentials() {
  console.log('\n🔍 Verifying Firebase Service Account Credentials...\n')
  
  try {
    // Check if admin is initialized
    if (!admin) {
      console.error('❌ Firebase Admin is not initialized')
      process.exit(1)
    }
    
    console.log('✅ Firebase Admin initialized')
    
    // Check if db is available
    if (!db) {
      console.error('❌ Firestore database is not initialized')
      process.exit(1)
    }
    
    console.log('✅ Firestore database initialized')
    
    // Try to get project info
    try {
      const projectId = admin.app().options.projectId
      console.log(`✅ Project ID: ${projectId}`)
    } catch (error) {
      console.error('❌ Could not get project ID:', error.message)
    }
    
    // Try a simple Firestore operation
    console.log('\n🔍 Testing Firestore connection...')
    try {
      const testCollection = db.collection('_verification_test')
      const testDoc = testCollection.doc('test')
      
      // Try to read (this requires authentication)
      const doc = await testDoc.get()
      console.log('✅ Firestore read operation successful')
      
      // Try to write (this also requires authentication)
      await testDoc.set({ 
        test: true, 
        timestamp: new Date().toISOString() 
      })
      console.log('✅ Firestore write operation successful')
      
      // Clean up
      await testDoc.delete()
      console.log('✅ Firestore delete operation successful')
      
      console.log('\n✅ All Firestore operations successful!')
      console.log('   Your service account credentials are working correctly.\n')
      
    } catch (error) {
      console.error('\n❌ Firestore operation failed!')
      console.error('   Error Code:', error.code)
      console.error('   Error Message:', error.message)
      
      if (error.code === 16 || error.code === 7) {
        console.error('\n   This is an authentication error.')
        console.error('   Possible causes:')
        console.error('   1. Service account lacks Firestore permissions')
        console.error('   2. Service account has been disabled')
        console.error('   3. Service account key has been revoked')
        console.error('   4. Wrong project ID')
        console.error('\n   Solutions:')
        console.error('   1. Go to Firebase Console → IAM & Admin → Service Accounts')
        console.error('   2. Find: firebase-adminsdk-fbsvc@bootmarkapp.iam.gserviceaccount.com')
        console.error('   3. Verify it has "Firebase Admin SDK Administrator Service Agent" role')
        console.error('   4. If missing, add the role')
        console.error('   5. If still not working, generate a new service account key\n')
      } else {
        console.error('\n   This is a different error. Check the error message above.\n')
      }
      
      process.exit(1)
    }
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message)
    console.error('   Stack:', error.stack)
    process.exit(1)
  }
}

verifyCredentials()
