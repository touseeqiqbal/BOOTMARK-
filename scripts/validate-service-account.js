/**
 * Validate firebase-service-account.json format
 */

const fs = require('fs')
const path = require('path')

const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json')

if (!fs.existsSync(serviceAccountPath)) {
  console.error('ERROR: firebase-service-account.json not found!')
  process.exit(1)
}

try {
  const sa = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
  
  console.log('\n=== Service Account Validation ===\n')
  console.log('✅ Valid JSON format')
  console.log('\nRequired fields check:')
  
  const required = [
    { key: 'type', expected: 'service_account' },
    { key: 'project_id' },
    { key: 'private_key' },
    { key: 'client_email' },
    { key: 'private_key_id' },
    { key: 'client_id' }
  ]
  
  let allValid = true
  
  for (const field of required) {
    const value = sa[field.key]
    if (!value) {
      console.log(`  ❌ ${field.key}: MISSING`)
      allValid = false
    } else if (field.expected && value !== field.expected) {
      console.log(`  ❌ ${field.key}: Expected "${field.expected}", got "${value}"`)
      allValid = false
    } else {
      if (field.key === 'project_id') {
        console.log(`  ✅ ${field.key}: ${value}`)
      } else if (field.key === 'client_email') {
        console.log(`  ✅ ${field.key}: ${value}`)
      } else {
        console.log(`  ✅ ${field.key}: Present (${typeof value})`)
      }
    }
  }
  
  if (allValid) {
    console.log('\n✅ All required fields are present and valid!')
    console.log('\n✅ Service account is ready for use in Render')
    console.log('\nTo get the environment variable values, run:')
    console.log('  node scripts/prepare-firestore-env.js')
  } else {
    console.log('\n❌ Service account is missing required fields!')
    process.exit(1)
  }
  
} catch (error) {
  console.error('\n❌ Failed to parse service account JSON:')
  console.error('   Error:', error.message)
  process.exit(1)
}

