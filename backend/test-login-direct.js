const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('🔐 Testing login for test123@gmail.com');
    
    const response = await fetch('http://192.168.1.116:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test123@gmail.com',
        password: '123456'
      })
    });
    
    console.log('📡 Response status:', response.status);
    
    const data = await response.json();
    console.log('📄 Response data:', data);
    
    if (response.ok) {
      console.log('✅ Login successful!');
      console.log('🔑 Token:', data.token);
      console.log('👤 User:', data.user);
    } else {
      console.log('❌ Login failed:', data.message);
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

testLogin(); 