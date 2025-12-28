require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const jwtSecret = process.env.JWT_SECRET || 'development-secret';
const BASE_URL = 'http://localhost:4000/api';

async function testLogin() {
  try {
    console.log('Testing login flow...\n');
    
    // Generate a test JWT token (simulating a user login)
    const userId = 'test-login-' + crypto.randomBytes(4).toString('hex');
    
    const payload = {
      id: userId,
      uid: userId,
      email: 'testlogin@example.com',
      name: 'Test User',
    };
    
    const token = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });
    console.log('Test user:', userId);
    console.log('Test email:', payload.email, '\n');
    
    // Call verify-firebase-token endpoint (fallback path when Firebase not initialized)
    console.log('1. Calling /auth/verify-firebase-token...');
    const verifyRes = await axios.post(`${BASE_URL}/auth/verify-firebase-token`, {
      token
    });
    
    if (verifyRes.status !== 200) {
      console.error('❌ Token verification failed:', verifyRes.status, verifyRes.data);
      process.exit(1);
    }
    
    console.log('✓ Token verification succeeded');
    console.log('  Success:', verifyRes.data.success);
    console.log('  User:', verifyRes.data.user?.email || 'user info not returned');
    console.log('');
    
    // Fetch the user from the database
    console.log('2. Fetching user account info...');
    const headers = { Authorization: `Bearer ${token}` };
    const accountRes = await axios.get(`${BASE_URL}/auth/account`, { headers });
    
    if (accountRes.status !== 200) {
      console.error('❌ Account fetch failed:', accountRes.status, accountRes.data);
      process.exit(1);
    }
    
    console.log('✓ Account info fetched');
    console.log('  Name:', accountRes.data.name);
    console.log('  Email:', accountRes.data.email);
    console.log('');
    
    console.log('✅ Login flow test passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test error:', error.response?.status, error.response?.data || error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testLogin();
