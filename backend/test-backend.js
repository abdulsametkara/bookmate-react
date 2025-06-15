const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = 5000;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`📩 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (req.method !== 'GET') {
    console.log('Request body:', req.body);
  }
  next();
});

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

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully');
    release();
  }
});

// JWT Secret
const JWT_SECRET = 'bookmate_secret_key_2025';

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Token bulunamadı' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Geçersiz token' });
  }
};

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'BookMate Test API is running!',
    version: '1.0.0',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.get('/api/test-endpoint', (req, res) => {
  console.log('🧪 Test endpoint called successfully!');
  res.json({ message: 'Test endpoint working!', timestamp: new Date().toISOString() });
});

// Username check endpoint
app.get('/api/auth/check-username/:username', async (req, res) => {
  console.log('🚀 USERNAME CHECK ENDPOINT HIT!');
  try {
    const { username } = req.params;
    console.log(`🔍 Username check request: ${username}`);

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

    // Reserved username'leri kontrol et
    const reservedUsernames = ['admin', 'test', 'user', 'root', 'administrator'];
    if (reservedUsernames.includes(username.toLowerCase())) {
      console.log(`❌ Reserved username: ${username}`);
      return res.json({
        available: false,
        message: 'Bu kullanıcı adı zaten alınmış'
      });
    }

    // Veritabanında username kontrolü yap
    try {
      // Önce username kolonu var mı kontrol et
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'username'
      `);

      if (columnCheck.rows.length > 0) {
        // Username kolonu varsa, veritabanında kontrol et
        console.log('🔍 Checking username in database...');
        const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        const isAvailable = existingUser.rows.length === 0;
        
        console.log(`✅ Username ${username} availability (database): ${isAvailable}`);
        
        res.json({
          available: isAvailable,
          message: isAvailable ? 'Kullanıcı adı müsait' : 'Bu kullanıcı adı zaten alınmış'
        });
      } else {
        // Username kolonu yoksa, displayName ile kontrol et
        console.log('⚠️ Username column not found, checking displayName...');
        const existingUser = await pool.query('SELECT id FROM users WHERE "displayName" = $1', [username]);
        const isAvailable = existingUser.rows.length === 0;
        
        console.log(`✅ Username ${username} availability (displayName): ${isAvailable}`);
        
        res.json({
          available: isAvailable,
          message: isAvailable ? 'Kullanıcı adı müsait' : 'Bu kullanıcı adı zaten alınmış'
        });
      }
    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      // Veritabanı hatası durumunda sadece reserved kontrolü yap
      res.json({
        available: true,
        message: 'Kullanıcı adı müsait'
      });
    }
  } catch (error) {
    console.error('❌ Username check error:', error);
    res.status(500).json({
      available: false,
      message: 'Server error'
    });
  }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, displayName, username } = req.body;
    
    console.log('Register request:', { email, displayName, username });

    if (!email || !password || !displayName) {
      return res.status(400).json({ message: 'Tüm alanlar zorunludur' });
    }

    // Check if user exists by email
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Bu email adresi zaten kullanılıyor' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user - username kolonu varsa ekle
    try {
      // Username kolonu var mı kontrol et
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'username'
      `);

      let result;
      if (columnCheck.rows.length > 0 && username) {
        // Username kolonu varsa ve username verilmişse
        console.log('📝 Inserting user with username...');
        result = await pool.query(
          'INSERT INTO users (email, password, "displayName", username) VALUES ($1, $2, $3, $4) RETURNING id, email, "displayName", username, "createdAt"',
          [email, hashedPassword, displayName, username]
        );
      } else {
        // Username kolonu yoksa veya username verilmemişse
        console.log('📝 Inserting user without username...');
        result = await pool.query(
          'INSERT INTO users (email, password, "displayName") VALUES ($1, $2, $3) RETURNING id, email, "displayName", "createdAt"',
          [email, hashedPassword, displayName]
        );
      }

      const user = result.rows[0];
      console.log('User created:', user);

      // Generate token
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

      res.status(201).json({
        message: 'Kullanıcı başarıyla oluşturuldu',
        user,
        token
      });
    } catch (insertError) {
      console.error('Insert error:', insertError);
      if (insertError.code === '23505') { // Unique constraint violation
        return res.status(400).json({ message: 'Bu kullanıcı adı zaten kullanılıyor' });
      }
      throw insertError;
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login request:', { email });

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

    res.json({
      message: 'Giriş başarılı',
      user,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, "displayName", "createdAt" FROM users WHERE id = $1',
      [req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
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
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 BookMate Test Server running on port ${port}`);
  console.log(`📚 Local: http://localhost:${port}/`);
  console.log(`🌐 Network: http://192.168.30.4:${port}/`);
  console.log(`🔍 Waiting for requests...`);
  console.log('');
  console.log('✅ Test endpoints available:');
  console.log(`  GET  http://192.168.30.4:${port}/`);
  console.log(`  GET  http://192.168.30.4:${port}/api/test-endpoint`);
  console.log(`  GET  http://192.168.30.4:${port}/api/auth/check-username/:username`);
  console.log(`  POST http://192.168.30.4:${port}/api/auth/register`);
  console.log(`  POST http://192.168.30.4:${port}/api/auth/login`);
  console.log(`  GET  http://192.168.30.4:${port}/api/auth/me`);
}); 