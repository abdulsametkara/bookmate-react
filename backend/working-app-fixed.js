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

// JWT Secret (production'da environment variable olmalı)
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
    message: 'BookMate API is running!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/*',
      books: '/api/books/*',
      userBooks: '/api/user/books/*',
      readingSessions: '/api/user/reading-sessions/*',
      wishlists: '/api/user/wishlists/*',
      sharedReading: '/api/shared-reading/*',
      sharedSessions: '/api/shared-sessions/*'
    }
  });
});

// 🔐 Authentication Routes

// Test endpoint
app.get('/api/test-endpoint', (req, res) => {
  console.log('🧪 Test endpoint called successfully!');
  res.json({ message: 'Test endpoint working!', timestamp: new Date().toISOString() });
});

// Username check endpoint - EN ÖNEMLİ ENDPOINT
app.get('/api/auth/check-username/:username', async (req, res) => {
  console.log('🚀 USERNAME CHECK ENDPOINT HIT!');
  try {
    const { username } = req.params;
    console.log(`🔍 Username check request: ${username}`);

    // Username formatını kontrol et
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

    // Check if user exists
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

      // Create default user preferences
      await pool.query(
        'INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
        [user.id]
      );

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

// 📊 Dashboard endpoint
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    // Kullanıcının kitap istatistikleri
    const bookStats = await pool.query(`
      SELECT 
        COUNT(*) as total_books,
        COUNT(CASE WHEN status = 'reading' THEN 1 END) as currently_reading,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'to_read' THEN 1 END) as to_read
      FROM user_books WHERE user_id = $1
    `, [req.userId]);

    // Bu hafta okuma aktivitesi
    const weeklyStats = await pool.query(`
      SELECT 
        COALESCE(SUM(duration_minutes), 0) as total_minutes,
        COALESCE(SUM(pages_read), 0) as total_pages,
        COUNT(*) as sessions
      FROM reading_sessions 
      WHERE user_id = $1 AND start_time >= CURRENT_DATE - INTERVAL '7 days'
    `, [req.userId]);

    // Son okunan kitaplar
    const recentBooks = await pool.query(`
      SELECT ub.*, b.title, b.author, b.cover_image_url
      FROM user_books ub
      JOIN books b ON ub.book_id = b.id
      WHERE ub.user_id = $1
      ORDER BY ub."updatedAt" DESC
      LIMIT 5
    `, [req.userId]);

    // Aktif okuma seansı
    const activeSession = await pool.query(`
      SELECT rs.*, b.title, b.author
      FROM reading_sessions rs
      JOIN books b ON rs.book_id = b.id
      WHERE rs.user_id = $1 AND rs.end_time IS NULL
      LIMIT 1
    `, [req.userId]);

    res.json({
      bookStats: bookStats.rows[0],
      weeklyStats: weeklyStats.rows[0],
      recentBooks: recentBooks.rows,
      activeSession: activeSession.rows[0] || null
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Dashboard verileri getirilemedi' });
  }
});

// 🏷️ Categories endpoint
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ message: 'Kategoriler getirilemedi' });
  }
});

// Temel route'ları yükle
console.log('📚 Loading routes...');

try {
  const booksRouter = require('./routes/books');
  app.use('/api/books', booksRouter);
  console.log('✅ Books routes mounted');
} catch (error) {
  console.error('❌ Books routes error:', error.message);
}

try {
  const userBooksRouter = require('./routes/userBooks');
  app.use('/api/user/books', userBooksRouter);
  console.log('✅ UserBooks routes mounted');
} catch (error) {
  console.error('❌ UserBooks routes error:', error.message);
}

try {
  const readingSessionsRouter = require('./routes/readingSessions');
  app.use('/api/user/reading-sessions', readingSessionsRouter);
  console.log('✅ ReadingSessions routes mounted');
} catch (error) {
  console.error('❌ ReadingSessions routes error:', error.message);
}

try {
  const wishlistsRouter = require('./routes/wishlists');
  app.use('/api/user/wishlists', wishlistsRouter);
  console.log('✅ Wishlists routes mounted');
} catch (error) {
  console.error('❌ Wishlists routes error:', error.message);
}

// Ortak okuma route'ları (opsiyonel)
try {
  const { router: sharedReadingRouter, initializePool: initSharedReading } = require('./routes/sharedReading');
  initSharedReading(pool);
  app.use('/api/shared-reading', authenticateToken, sharedReadingRouter);
  console.log('✅ SharedReading routes mounted');
} catch (error) {
  console.error('❌ SharedReading routes error:', error.message);
}

try {
  const { router: sharedSessionsRouter, initializePool: initSharedSessions } = require('./routes/sharedReadingSessions');
  initSharedSessions(pool);
  app.use('/api/shared-sessions', authenticateToken, sharedSessionsRouter);
  console.log('✅ SharedSessions routes mounted');
} catch (error) {
  console.error('❌ SharedSessions routes error:', error.message);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Sunucu hatası' });
});

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ message: 'Endpoint bulunamadı' });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 BookMate Server running on port ${port}`);
  console.log(`📚 Local: http://localhost:${port}/`);
  console.log(`🌐 Network: http://192.168.30.4:${port}/`);
  console.log(`📱 Mobile API (Emulator): http://10.0.2.2:${port}/api/auth/login`);
  console.log(`🔍 Waiting for requests...`);
}); 