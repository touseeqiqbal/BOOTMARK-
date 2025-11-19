const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')

let app
let initError = null
try {
  if (!admin.apps || admin.apps.length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Use service account from environment variable (JSON string)
      try {
        const creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        
        // Validate required fields
        if (!creds.type || creds.type !== 'service_account') {
          throw new Error('Invalid service account: missing or incorrect "type" field')
        }
        if (!creds.project_id) {
          throw new Error('Invalid service account: missing "project_id" field')
        }
        if (!creds.private_key) {
          throw new Error('Invalid service account: missing "private_key" field')
        }
        if (!creds.client_email) {
          throw new Error('Invalid service account: missing "client_email" field')
        }
        
        app = admin.initializeApp({ 
          credential: admin.credential.cert(creds),
          projectId: creds.project_id
        })
        console.log('✅ Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT environment variable')
        console.log('   Project ID:', creds.project_id)
        console.log('   Client Email:', creds.client_email)
      } catch (parseError) {
        console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:')
        console.error('   Error:', parseError.message)
        console.error('   The FIREBASE_SERVICE_ACCOUNT should be a valid JSON string.')
        console.error('   Run: node scripts/prepare-firestore-env.js to get the correct format.')
        throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT: ${parseError.message}`)
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Use service account file path from environment variable
      const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
      if (!fs.existsSync(credsPath)) {
        throw new Error(`Service account file not found: ${credsPath}`)
      }
      app = admin.initializeApp()
      console.log('✅ Firebase Admin initialized from GOOGLE_APPLICATION_CREDENTIALS:', credsPath)
    } else {
      // Auto-detect firebase-service-account.json in project root
      const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json')
      if (fs.existsSync(serviceAccountPath)) {
        try {
          const serviceAccount = require(serviceAccountPath)
          app = admin.initializeApp({ 
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id
          })
          console.log('✅ Firebase Admin initialized from firebase-service-account.json')
        } catch (fileError) {
          throw new Error(`Failed to load service account file: ${fileError.message}`)
        }
      } else if (process.env.FIREBASE_PROJECT_ID) {
        // Only use default credentials if explicitly requested (e.g., in Google Cloud environment)
        // This won't work on Render without proper service account
        console.warn('⚠️  Attempting to use default credentials with FIREBASE_PROJECT_ID')
        console.warn('   This may not work on Render. Consider setting FIREBASE_SERVICE_ACCOUNT instead.')
        app = admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID
        })
        console.log('✅ Firebase Admin initialized with default credentials (may fail if credentials are not available)')
      } else {
        console.warn('⚠️  Firebase Admin not initialized: No service account found. Using JSON files for data storage.')
        console.warn('   To use Firestore, set up one of:')
        console.warn('   1. FIREBASE_SERVICE_ACCOUNT environment variable (recommended for Render)')
        console.warn('   2. GOOGLE_APPLICATION_CREDENTIALS environment variable')
        console.warn('   3. firebase-service-account.json file in project root')
        console.warn('   Run: node scripts/prepare-firestore-env.js to get the correct format for Render.')
      }
    }
  } else {
    app = admin.app()
  }
} catch (e) {
  initError = e
  console.error('❌ Firebase Admin initialization failed:', e && e.message ? e.message : e)
  if (e.stack) {
    console.error('   Stack:', e.stack.split('\n').slice(0, 3).join('\n'))
  }
  console.warn('   Falling back to JSON files for data storage.')
}

const db = admin.apps && admin.apps.length ? admin.firestore() : null

// Whether Firestore is available for use
// Only set to true if we have both a db instance AND no initialization error
const useFirestore = !!db && !initError

if (useFirestore) {
  console.log('✅ Firestore database initialized successfully')
  console.log('   All data will be stored in Firestore collections: users, forms, submissions')
  
  // Test credentials by attempting a simple operation (non-blocking)
  // This helps catch authentication issues early
  if (app && db) {
    // Set Firestore settings for better error handling
    db.settings({ 
      ignoreUndefinedProperties: true,
      // Add retry settings
      maxRetries: 3,
    })
    
    // Async test (non-blocking - won't prevent server startup)
    // This will help diagnose authentication issues in logs
    setTimeout(async () => {
      try {
        // Try to access Firestore to verify credentials
        await db.collection('_healthcheck').limit(1).get()
        console.log('✅ Firestore credentials verified successfully')
      } catch (testError) {
        if (testError.code === 16 || testError.code === 7) {
          console.error('❌ Firestore authentication failed!')
          console.error('   Error:', testError.message)
          console.error('   This usually means:')
          console.error('   1. FIREBASE_SERVICE_ACCOUNT environment variable is not set correctly in Render')
          console.error('   2. The service account JSON is malformed or incomplete')
          console.error('   3. The service account has expired or been revoked')
          console.error('   Solution:')
          console.error('   - Run: node scripts/prepare-firestore-env.js')
          console.error('   - Copy the FIREBASE_SERVICE_ACCOUNT value to Render Dashboard → Environment Variables')
          console.error('   - Make sure the entire JSON is on a single line')
        } else {
          console.warn('⚠️  Firestore health check failed:', testError.message)
        }
      }
    }, 1000) // Wait 1 second after startup
  }
} else {
  if (initError) {
    console.log('❌ Firestore not available due to initialization error')
  } else {
    console.log('ℹ️  Using JSON files for data storage (located in data/ directory)')
  }
}

// Helper: get collection reference
function getCollectionRef(name) {
  if (!useFirestore) throw new Error('Firestore not initialized')
  return db.collection(name)
}

// Helper: get a single document by id
async function getDoc(collection, id) {
  if (!useFirestore) throw new Error('Firestore not initialized')
  const snap = await db.collection(collection).doc(id).get()
  if (!snap.exists) return null
  return { id: snap.id, ...snap.data() }
}

// Helper: set/create/update a document
async function setDoc(collection, id, data) {
  if (!useFirestore) throw new Error('Firestore not initialized')
  await db.collection(collection).doc(id).set(data)
  return { id, ...data }
}

// Helper: delete a document
async function deleteDoc(collection, id) {
  if (!useFirestore) throw new Error('Firestore not initialized')
  await db.collection(collection).doc(id).delete()
}

// Helper: query documents where a field is in a list (handles Firestore 10-item 'in' limit)
async function queryByFieldIn(collection, field, values) {
  if (!useFirestore) throw new Error('Firestore not initialized')
  if (!Array.isArray(values) || values.length === 0) return []
  const chunkSize = 10
  const results = []
  for (let i = 0; i < values.length; i += chunkSize) {
    const chunk = values.slice(i, i + chunkSize)
    const snap = await db.collection(collection).where(field, 'in', chunk).get()
    snap.forEach(doc => results.push({ id: doc.id, ...doc.data() }))
  }
  return results
}

module.exports = { admin, db, useFirestore, getCollectionRef, getDoc, setDoc, deleteDoc, queryByFieldIn }
