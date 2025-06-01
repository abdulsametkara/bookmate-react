const axios = require('axios');

async function testCurlStatus() {
  try {
    // Login
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'testuser123@gmail.com',
      password: '123456'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Token alındı');
    
    // Direct curl test
    console.log('\n🔗 Testing endpoint: GET /api/user/books/status/reading');
    
    const response = await axios.get('http://localhost:5000/api/user/books/status/reading', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Response status:', response.status);
    console.log('📋 Response data:', response.data);
    
  } catch (error) {
    console.error('❌ Error details:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

testCurlStatus(); 