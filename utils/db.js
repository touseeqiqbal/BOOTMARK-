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
        
        // Ensure private_key has proper newlines
        // Handle multiple cases: \\n (double escaped), \n (JSON escaped), or actual newlines
        if (typeof creds.private_key === 'string') {
          // First, handle double-escaped newlines (\\n)
          if (creds.private_key.includes('\\n')) {
            creds.private_key = creds.private_key.replace(/\\n/g, '\n')
          }
          // Also handle single-escaped newlines that might come from environment variables
          // JSON.parse should handle this, but sometimes environment variables need extra handling
          if (creds.private_key.includes('\\n') && !creds.private_key.includes('\n')) {
            // If we still have \n but no actual newlines, try replacing
            creds.private_key = creds.private_key.replace(/\\n/g, '\n')
          }
        }
        
        // Validate private key format
        if (!creds.private_key || typeof creds.private_key !== 'string') {
          throw new Error('Private key is missing or invalid type')
        }
        if (!creds.private_key.includes('BEGIN PRIVATE KEY') || !creds.private_key.includes('END PRIVATE KEY')) {
          console.warn('⚠️  Warning: Private key format may be incorrect')
          console.warn('   Private key length:', creds.private_key.length)
          console.warn('   First 50 chars:', creds.private_key.substring(0, 50))
          console.warn('   Contains BEGIN:', creds.private_key.includes('BEGIN'))
          console.warn('   Contains END:', creds.private_key.includes('END'))
        }
        
        app = admin.initializeApp({ 
          credential: admin.credential.cert(creds),
          projectId: creds.project_id
        })
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT environment variable')
          console.log('   Project ID:', creds.project_id)
        }
        
        // Try to verify credentials actually work by getting the app name
        try {
          const testAppName = app.name
          if (process.env.NODE_ENV !== 'production') {
            console.log('   App Name:', testAppName)
          }
        } catch (verifyError) {
          console.warn('⚠️  Warning: Could not verify app initialization:', verifyError.message)
        }
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
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Firebase Admin initialized from GOOGLE_APPLICATION_CREDENTIALS:', credsPath)
      }
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
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ Firebase Admin initialized with default credentials (may fail if credentials are not available)')
        }
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
  console.log('   All data will be stored in Firestore collections: users, businesses, forms, submissions, customers, invoices, formTemplates')
  
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
        // First verify the app has credentials
        if (app && app.options && app.options.credential) {
          console.log('   Credential type:', app.options.credential.constructor.name)
        }
        
        // Try to access Firestore to verify credentials
        // Use a simple operation that requires authentication
        const testCollection = db.collection('_healthcheck')
        const testDoc = testCollection.doc('test')
        
        // Try to read (this will fail if auth is wrong, but won't create anything)
        await testDoc.get()
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ Firestore credentials verified successfully')
        }
      } catch (testError) {
        if (testError.code === 16 || testError.code === 7) {
          console.error('❌ Firestore authentication failed!')
          console.error('   Error Code:', testError.code)
          console.error('   Error Message:', testError.message)
          console.error('')
          
          // Additional debugging info
          if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            try {
              const testCreds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
              console.error('   Debug Info:')
              console.error('   - Service account parsed successfully')
              console.error('   - Project ID:', testCreds.project_id)
              console.error('   - Client Email:', testCreds.client_email)
              console.error('   - Private key length:', testCreds.private_key?.length || 'missing')
              console.error('   - Private key has newlines:', testCreds.private_key?.includes('\n') ? 'YES' : 'NO')
              console.error('   - Private key has \\n:', testCreds.private_key?.includes('\\n') ? 'YES' : 'NO')
              console.error('   - Private key starts correctly:', testCreds.private_key?.startsWith('-----BEGIN') ? 'YES' : 'NO')
            } catch (debugError) {
              console.error('   - Could not parse FIREBASE_SERVICE_ACCOUNT for debugging')
            }
          }
          
          console.error('')
          console.error('   Common causes:')
          console.error('   1. FIREBASE_SERVICE_ACCOUNT environment variable is malformed in Render')
          console.error('   2. Private key newlines are not preserved correctly')
          console.error('   3. Service account lacks Firestore permissions')
          console.error('   4. Service account has been disabled or revoked')
          console.error('')
          console.error('   Troubleshooting steps:')
          console.error('   1. Verify FIREBASE_SERVICE_ACCOUNT in Render Dashboard')
          console.error('      - It should be ONE long line (no line breaks)')
          console.error('      - It should start with {" and end with "}')
          console.error('      - The private_key field should contain \\n (backslash-n) for newlines')
          console.error('      - Run: node scripts/prepare-firestore-env.js to get correct format')
          console.error('   2. Check Firebase Console → IAM & Admin → Service Accounts')
          console.error('      - Verify the service account exists and is enabled')
          console.error('      - Check that it has "Firebase Admin SDK Administrator Service Agent" role')
          console.error('   3. Check Firebase Console → Firestore Database')
          console.error('      - Verify Firestore is enabled for your project')
          console.error('   4. Generate a new service account key if needed:')
          console.error('      - Firebase Console → Project Settings → Service Accounts')
          console.error('      - Click "Generate new private key"')
          console.error('      - Make sure to copy the ENTIRE JSON including all \\n in private_key')
          initError = testError
        } else {
          // Other errors (network, etc.) - don't treat as fatal
          console.warn('⚠️  Could not verify Firestore credentials:', testError.message)
        }
      }
    }, 2000) // Wait 2 seconds after startup to let everything initialize
  }
} else {
  if (initError) {
    console.error('❌ Firestore not available due to initialization error')
  } else {
    console.warn('⚠️  Firestore not initialized - using JSON files for data storage')
  }
  
  // In production (Render, Vercel, etc.), warn that data won't persist
  if (process.env.NODE_ENV === 'production' || process.env.RENDER || process.env.VERCEL) {
    console.error('')
    console.error('❌ CRITICAL: Firestore is not available in production!')
    console.error('   Data will NOT persist across deployments on Render/Vercel')
    console.error('   All data will be lost when the server restarts or redeploys')
    console.error('')
    console.error('   To fix this, set up Firestore:')
    console.error('   1. Set FIREBASE_SERVICE_ACCOUNT environment variable in Render')
    console.error('   2. Run: node scripts/prepare-firestore-env.js to get the correct format')
    console.error('   3. Copy the output and paste it as FIREBASE_SERVICE_ACCOUNT in Render Dashboard')
    console.error('')
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
