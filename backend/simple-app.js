const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595',
  ssl: false,
  connectionTimeoutMillis: 5000,
});

// JWT Secret
const JWT_SECRET = 'bookmate_secret_key_2025';

// Test endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'BookMate Simple API is running!',
    timestamp: new Date().toISOString()
  });
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login attempt:', { email });

    if (!email || !password) {
      return res.status(400).json({ message: 'Email ve şifre gerekli' });
    }

    // Find user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Geçersiz email veya şifre' });
    }

    const user = result.rows[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Geçersiz email veya şifre' });
    }

    // Generate token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    // Remove password from response
    delete user.password;

    console.log('✅ Login successful for:', email);

    res.json({
      message: 'Giriş başarılı',
      user,
      token
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    
    console.log('📝 Register attempt:', { email, displayName });

    if (!email || !password || !displayName) {
      return res.status(400).json({ message: 'Tüm alanlar zorunludur' });
    }

    // Check if user exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Bu email adresi zaten kullanılıyor' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (email, password, "displayName") VALUES ($1, $2, $3) RETURNING id, email, "displayName", "createdAt"',
      [email, hashedPassword, displayName]
    );

    const user = result.rows[0];

    // Generate token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    console.log('✅ Registration successful for:', email);

    res.status(201).json({
      message: 'Kullanıcı başarıyla oluşturuldu',
      user,
      token
    });
  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ message: 'Sunucu hatası' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Endpoint bulunamadı' });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 BookMate Simple Server running on port ${port}`);
  console.log(`📚 Test: http://localhost:${port}/`);
  console.log(`🔐 Login: POST http://localhost:${port}/api/auth/login`);
  console.log(`🌐 Network: http://192.168.1.5:${port}/`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 Server shutting down...');
  pool.end();
  process.exit(0);
}); 