const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('🔐 Login testi başlıyor...');
    
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'samet@gmail.com',
        password: '123456'
      })
    });
    
    const data = await response.json();
    
    console.log('📡 Response Status:', response.status);
    console.log('📋 Response Data:', data);
    
    if (response.ok) {
      console.log('✅ Login başarılı!');
      console.log('🔑 Token:', data.token.substring(0, 20) + '...');
    } else {
      console.log('❌ Login başarısız:', data.message);
    }
    
  } catch (error) {
    console.error('🚨 Test hatası:', error.message);
  }
}

testLogin(); 