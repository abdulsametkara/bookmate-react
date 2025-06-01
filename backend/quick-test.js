const http = require('http');

const postData = JSON.stringify({
  email: 'samet@gmail.com',
  password: '123456'
});

const options = {
  hostname: '192.168.1.5',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🔐 Testing login...');

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
 