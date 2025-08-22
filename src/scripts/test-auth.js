const axios = require('axios');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:4000/api';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password123';

async function testAuth() {
  console.log('🧪 Testing authentication flow...');
  console.log('API URL:', API_URL);
  
  try {
    // Step 1: Login
    console.log('\n1️⃣ Attempting login...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    }, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Login successful');
    console.log('Response status:', loginResponse.status);
    console.log('Response headers:', loginResponse.headers);
    console.log('Response data:', {
      user: loginResponse.data.user?.email,
      organization: loginResponse.data.organization?.name,
      hasToken: !!loginResponse.data.token
    });
    
    // Step 2: Test /auth/me endpoint
    console.log('\n2️⃣ Testing /auth/me endpoint...');
    const meResponse = await axios.get(`${API_URL}/auth/me`, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ /auth/me successful');
    console.log('Response status:', meResponse.status);
    console.log('Response data:', meResponse.data);
    
    // Step 3: Test analytics dashboard endpoint
    console.log('\n3️⃣ Testing analytics dashboard endpoint...');
    const analyticsResponse = await axios.get(`${API_URL}/analytics/dashboard`, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Analytics dashboard successful');
    console.log('Response status:', analyticsResponse.status);
    console.log('Response data keys:', Object.keys(analyticsResponse.data));
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      console.error('Response headers:', error.response.headers);
    }
    
    if (error.request) {
      console.error('Request made but no response received');
    }
    
    process.exit(1);
  }
}

// Run the test
testAuth();
