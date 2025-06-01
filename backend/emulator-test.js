const http = require('http');

// Test Android emulator IP (10.0.2.2 = localhost for emulator)
const postData = JSON.stringify({
  email: 'samet@gmail.com',
  password: '123456'
});

const options = {
  hostname: '10.0.2.2',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🔐 Testing Android emulator IP (10.0.2.2) login...');

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
 