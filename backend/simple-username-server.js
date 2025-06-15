const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Ana route
app.get('/', (req, res) => {
  console.log('🏠 Home route called');
  res.json({ 
    message: 'BookMate Simple API is running!',
    version: '1.0.0',
    endpoints: {
      'GET /': 'Home',
      'GET /api/auth/check-username/:username': 'Check username availability'
    }
  });
});

// Username check endpoint
app.get('/api/auth/check-username/:username', (req, res) => {
  const { username } = req.params;
  console.log(`🔍 Username check request: ${username}`);
  
  try {
    // Basic validation
    if (!username || username.length < 3 || username.length > 20) {
      console.log(`❌ Invalid username length: ${username?.length || 0}`);
      return res.status(400).json({
        available: false,
        message: 'Kullanıcı adı 3-20 karakter olmalıdır'
      });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      console.log(`❌ Invalid username format: ${username}`);
      return res.status(400).json({
        available: false,
        message: 'Kullanıcı adı sadece harf, rakam ve _ içerebilir'
      });
    }

    // Simulate database check - for now, all usernames are available except 'admin', 'test', 'user'
    const reservedUsernames = ['admin', 'test', 'user', 'root', 'administrator'];
    const isAvailable = !reservedUsernames.includes(username.toLowerCase());
    
    console.log(`✅ Username ${username} availability: ${isAvailable}`);
    
    res.json({
      available: isAvailable,
      message: isAvailable ? 'Kullanıcı adı müsait' : 'Bu kullanıcı adı zaten alınmış'
    });
    
  } catch (error) {
    console.error('❌ Username check error:', error);
    res.status(500).json({
      available: false,
      message: 'Server error'
    });
  }
});

// Test endpoint
app.get('/test', (req, res) => {
  console.log('🧪 Test endpoint called');
  res.json({ message: 'Test endpoint working!' });
});

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ message: 'Endpoint bulunamadı' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('💥 Server error:', err);
  res.status(500).json({ message: 'Server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Simple BookMate Server started!');
  console.log(`🏠 Local: http://localhost:${PORT}`);
  console.log(`📱 Network: http://192.168.30.4:${PORT}`);
  console.log(`🤖 Android Emulator: http://10.0.2.2:${PORT}`);
  console.log('🎯 Ready for username checks!');
  console.log('');
  console.log('Available endpoints:');
  console.log(`  GET http://192.168.30.4:${PORT}/`);
  console.log(`  GET http://192.168.30.4:${PORT}/api/auth/check-username/:username`);
  console.log(`  GET http://192.168.30.4:${PORT}/test`);
}); 