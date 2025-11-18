/**
 * Helper script to convert firebase-service-account.json to a single-line string
 * for use in Render environment variables (FIREBASE_SERVICE_ACCOUNT)
 * 
 * Usage:
 *   node scripts/prepare-firestore-env.js
 * 
 * This will output the JSON as a single-line string that you can copy-paste
 * into Render Dashboard → Environment Variables → FIREBASE_SERVICE_ACCOUNT
 */

const fs = require('fs')
const path = require('path')

const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json')

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ firebase-service-account.json not found!')
  console.error('   Please make sure firebase-service-account.json exists in the project root.')
  process.exit(1)
}

try {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
  const singleLine = JSON.stringify(serviceAccount)
  
  console.log('\n✅ Firestore Environment Variable for Render:\n')
  console.log('─'.repeat(80))
  console.log('\nFIREBASE_PROJECT_ID=' + serviceAccount.project_id + '\n')
  console.log('FIREBASE_SERVICE_ACCOUNT=' + singleLine)
  console.log('\n' + '─'.repeat(80))
  console.log('\n📋 Instructions:')
  console.log('   1. Copy the FIREBASE_PROJECT_ID value above')
  console.log('   2. Copy the FIREBASE_SERVICE_ACCOUNT value above (it\'s all one line)')
  console.log('   3. Go to Render Dashboard → Your Service → Environment → Environment Variables')
  console.log('   4. Add FIREBASE_PROJECT_ID with the value from above')
  console.log('   5. Add FIREBASE_SERVICE_ACCOUNT with the value from above')
  console.log('   6. Deploy/restart your service on Render')
  console.log('\n⚠️  Important: Never commit firebase-service-account.json to git!')
  console.log('   It\'s already in .gitignore, but double-check before committing.\n')
  
} catch (error) {
  console.error('❌ Error reading service account file:', error.message)
  process.exit(1)
}

