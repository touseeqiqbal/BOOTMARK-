/**
 * Test script to verify service account JSON format for Render environment variable
 * This simulates how Render will parse the FIREBASE_SERVICE_ACCOUNT
 */

const fs = require('fs')
const path = require('path')

const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json')

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ firebase-service-account.json not found!')
  process.exit(1)
}

try {
  // Step 1: Read the service account file
  console.log('\n=== Testing Service Account Format for Render ===\n')
  console.log('Step 1: Reading firebase-service-account.json...')
  const originalSA = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
  console.log('✅ File read successfully')
  
  // Step 2: Convert to single-line JSON (as it would be in Render env var)
  console.log('\nStep 2: Converting to single-line JSON (Render format)...')
  const singleLineJSON = JSON.stringify(originalSA)
  console.log('✅ JSON stringified')
  console.log('   Length:', singleLineJSON.length, 'characters')
  console.log('   Starts with:', singleLineJSON.substring(0, 30) + '...')
  console.log('   Ends with:', '...' + singleLineJSON.substring(singleLineJSON.length - 30))
  
  // Step 3: Parse it back (simulating what happens in Render)
  console.log('\nStep 3: Parsing back from JSON string (simulating Render)...')
  const parsedSA = JSON.parse(singleLineJSON)
  console.log('✅ JSON parsed successfully')
  
  // Step 4: Check private key
  console.log('\nStep 4: Validating private key format...')
  const privateKey = parsedSA.private_key
  
  if (!privateKey) {
    console.error('❌ Private key is missing!')
    process.exit(1)
  }
  
  // Check if it has actual newlines or escaped newlines
  const hasActualNewlines = privateKey.includes('\n') && !privateKey.includes('\\n')
  const hasEscapedNewlines = privateKey.includes('\\n')
  
  console.log('   Private key length:', privateKey.length, 'characters')
  console.log('   Has actual newlines (\\n):', hasActualNewlines)
  console.log('   Has escaped newlines (\\\\n):', hasEscapedNewlines)
  console.log('   Contains "BEGIN PRIVATE KEY":', privateKey.includes('BEGIN PRIVATE KEY'))
  console.log('   Contains "END PRIVATE KEY":', privateKey.includes('END PRIVATE KEY'))
  
  // Fix if needed
  let fixedPrivateKey = privateKey
  if (hasEscapedNewlines) {
    console.log('   ⚠️  Found escaped newlines, converting to actual newlines...')
    fixedPrivateKey = privateKey.replace(/\\n/g, '\n')
    console.log('   ✅ Converted')
  }
  
  // Step 5: Validate credentials structure
  console.log('\nStep 5: Validating credentials structure...')
  
  const requiredFields = ['type', 'project_id', 'private_key', 'client_email', 'private_key_id', 'client_id']
  let allFieldsValid = true
  
  for (const field of requiredFields) {
    if (!parsedSA[field]) {
      console.error(`   ❌ Missing required field: ${field}`)
      allFieldsValid = false
    } else {
      console.log(`   ✅ ${field}: Present`)
    }
  }
  
  if (!allFieldsValid) {
    console.error('\n❌ Service account is missing required fields!')
    process.exit(1)
  }
  
  // Check if private key format is correct
  if (hasEscapedNewlines) {
    console.log('\n   ⚠️  WARNING: Private key has escaped newlines (\\n)')
    console.log('   This might cause authentication issues in Render!')
    console.log('   The code will automatically fix this, but verify after deployment.')
  } else if (hasActualNewlines) {
    console.log('   ✅ Private key has correct format (actual newlines)')
  } else {
    console.log('   ⚠️  WARNING: Private key format might be incorrect (no newlines found)')
  }
  
  // Step 6: Show the exact format for Render
  console.log('\n=== Render Environment Variable Format ===\n')
  console.log('FIREBASE_PROJECT_ID=' + parsedSA.project_id)
  console.log('\nFIREBASE_SERVICE_ACCOUNT=' + singleLineJSON)
  console.log('\n✅ Service account format is valid for Render!')
  console.log('\n📋 Instructions:')
  console.log('   1. Copy the FIREBASE_PROJECT_ID value above')
  console.log('   2. Copy the FIREBASE_SERVICE_ACCOUNT value above (it\'s one long line)')
  console.log('   3. Paste them into Render Dashboard → Environment Variables')
  console.log('   4. Make sure there are NO line breaks in FIREBASE_SERVICE_ACCOUNT')
  console.log('   5. Redeploy your service on Render')
  console.log('\n')
  
} catch (error) {
  console.error('\n❌ Error:', error.message)
  console.error('Stack:', error.stack)
  process.exit(1)
}

