require('dotenv').config();
const axios = require('axios');
const BASE_URL = 'http://localhost:4000/api';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const jwtSecret = process.env.JWT_SECRET || 'development-secret';

async function generateMockToken() {
  // Generate a properly signed JWT using the app's secret
  const userId = 'test-user-' + crypto.randomBytes(4).toString('hex');
  
  const payload = {
    id: userId,
    uid: userId,
    email: 'test@example.com',
  };
  
  const token = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });
  
  return { token, userId };
}

async function main() {
  try {
    console.log('Starting CRUD test for forms...\n');
    
    const { token, userId } = await generateMockToken();
    console.log('Test userId:', userId);
    console.log('Test token:', token.substring(0, 50) + '...\n');
    
    const headers = { Authorization: `Bearer ${token}` };
    
    // 1. Create form
    console.log('1. Creating form...');
    const createRes = await axios.post(`${BASE_URL}/forms`, {
      title: 'Test Form for CRUD',
      fields: [
        { id: 'field1', type: 'text', label: 'Name', required: true }
      ],
      settings: {
        theme: 'default',
        confirmationMessage: 'Thanks for submitting!'
      }
    }, { headers });
    
    if (createRes.status !== 201) {
      console.error('❌ Create form failed:', createRes.status, createRes.data);
      process.exit(1);
    }
    
    const formId = createRes.data.id;
    console.log('✓ Form created:', formId);
    console.log('  Title:', createRes.data.title);
    console.log('  ShareKey:', createRes.data.shareKey);
    console.log('');
    
    // 2. Get form
    console.log('2. Fetching form...');
    const getRes = await axios.get(`${BASE_URL}/forms/${formId}`, { headers });
    if (getRes.status !== 200) {
      console.error('❌ Get form failed:', getRes.status, getRes.data);
      process.exit(1);
    }
    console.log('✓ Form fetched:', getRes.data.title);
    console.log('');
    
    // 3. Update form
    console.log('3. Updating form...');
    const updateRes = await axios.put(`${BASE_URL}/forms/${formId}`, {
      title: 'Updated Test Form',
      fields: [
        { id: 'field1', type: 'text', label: 'Full Name', required: true },
        { id: 'field2', type: 'email', label: 'Email', required: true }
      ]
    }, { headers });
    
    if (updateRes.status !== 200) {
      console.error('❌ Update form failed:', updateRes.status, updateRes.data);
      process.exit(1);
    }
    console.log('✓ Form updated:', updateRes.data.title);
    console.log('  Fields count:', updateRes.data.fields.length);
    console.log('');
    
    // 4. Delete form
    console.log('4. Deleting form...');
    const deleteRes = await axios.delete(`${BASE_URL}/forms/${formId}`, { headers });
    
    if (deleteRes.status !== 200) {
      console.error('❌ Delete form failed:', deleteRes.status, deleteRes.data);
      process.exit(1);
    }
    console.log('✓ Form deleted:', deleteRes.data.message);
    console.log('');
    
    // 5. Verify form is gone
    console.log('5. Verifying form is deleted...');
    try {
      await axios.get(`${BASE_URL}/forms/${formId}`, { headers });
      console.error('❌ Form still exists after delete!');
      process.exit(1);
    } catch (e) {
      if (e.response && e.response.status === 404) {
        console.log('✓ Form correctly returns 404 after deletion');
      } else {
        throw e;
      }
    }
    
    console.log('\n✅ All CRUD tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test error:', error.response?.status, error.response?.data || error.message);
    process.exit(1);
  }
}

main();
