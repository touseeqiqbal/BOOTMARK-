const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')

let app
try {
  if (!admin.apps || admin.apps.length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Use service account from environment variable (JSON string)
      const creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      app = admin.initializeApp({ credential: admin.credential.cert(creds) })
      console.log('✅ Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT environment variable')
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Use service account file path from environment variable
      app = admin.initializeApp()
      console.log('✅ Firebase Admin initialized from GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS)
    } else {
      // Auto-detect firebase-service-account.json in project root
      const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json')
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require(serviceAccountPath)
        app = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
        console.log('✅ Firebase Admin initialized from firebase-service-account.json')
      } else if (process.env.FIREBASE_PROJECT_ID) {
        // Will use default credentials (e.g., from Google Cloud)
        app = admin.initializeApp()
        console.log('✅ Firebase Admin initialized with default credentials')
      } else {
        console.warn('⚠️  Firebase Admin not initialized: No service account found. Using JSON files for data storage.')
        console.warn('   To use Firestore, set up one of:')
        console.warn('   1. FIREBASE_SERVICE_ACCOUNT environment variable')
        console.warn('   2. GOOGLE_APPLICATION_CREDENTIALS environment variable')
        console.warn('   3. firebase-service-account.json file in project root')
      }
    }
  } else {
    app = admin.app()
  }
} catch (e) {
  console.warn('⚠️  Firebase Admin init skipped or failed:', e && e.message ? e.message : e)
  console.warn('   Falling back to JSON files for data storage.')
}

const db = admin.apps && admin.apps.length ? admin.firestore() : null

// Whether Firestore is available for use
const useFirestore = !!db

if (useFirestore) {
  console.log('✅ Firestore database initialized successfully')
  console.log('   All data will be stored in Firestore collections: users, forms, submissions')
} else {
  console.log('ℹ️  Using JSON files for data storage (located in data/ directory)')
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
