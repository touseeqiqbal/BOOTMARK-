const axios = require('axios');
const fs = require('fs');

async function testApi() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await axios.post('http://localhost:4000/api/auth/login', {
            email: 'admin@bootmark.com', // Assuming default admin from seed? Or I need a valid user.
            password: 'password123' // Common default. If fail, I can't test.
        });

        // If login fails, I can try to read 'data/users.json' to find a user.
        // Or I can use the session cookie if I can get it.
        // Axios stores cookies? No, need cookie jar.

        const cookie = loginRes.headers['set-cookie'];
        console.log('Login successful. Cookie:', cookie);

        // 2. Fetch Services
        console.log('Fetching services...');
        const servicesRes = await axios.get('http://localhost:4000/api/services', {
            headers: {
                Cookie: cookie
            }
        });

        console.log(`API returned ${servicesRes.data.length} services.`);
        if (servicesRes.data.length > 0) {
            console.log('Sample:', servicesRes.data[0]);
        } else {
            console.log('API returned empty array.');
        }

    } catch (error) {
        console.error('API Test Failed:', error.response?.data || error.message);

        // Fallback: Read users to find credentials
        try {
            console.log('Attempting to find valid user...');
            const { getCollectionRef } = require('../utils/db');
            const users = await getCollectionRef('users').limit(1).get();
            if (!users.empty) {
                console.log('Found user in DB:', users.docs[0].data().email);
            }
        } catch (e) { console.log(e.message) }
    }
}

testApi();
