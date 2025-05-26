const http = require('http');

const postData = JSON.stringify({
  email: 'test123@gmail.com',
  password: '123456'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🔐 Testing test123@gmail.com login on localhost...');

const req = http.request(options, (res) => {
  console.log(`📡 Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      console.log('📋 Response:', jsonData);
      
      if (res.statusCode === 200) {
        console.log('✅ test123@gmail.com ile giriş BAŞARILI!');
      } else {
        console.log('❌ Giriş başarısız:', jsonData.message);
      }
    } catch (e) {
      console.log('📋 Raw Response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('🚨 Error:', e.message);
});

req.write(postData);
req.end(); 