const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Route imports
const booksRouter = require('./routes/books');
const userBooksRouter = require('./routes/userBooks');
const readingSessionsRouter = require('./routes/readingSessions');
const wishlistsRouter = require('./routes/wishlists');

// Ortak okuma route'ları - YENİ YAPISI
const sharedReadingRouter = require('./routes/sharedReading');
const sharedSessionsRouter = require('./routes/sharedSessions');

// Admin routes
const adminRouter = require('./routes/admin');

// Database initialization
const initializeDatabase = require('./init-database');

const app = express();
const port = process.env.PORT || 5000;

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

// Database connection - Production ve Development için
const pool = new Pool({
  // DATABASE_URL varsa onu kullan (Production), yoksa local config (Development)
  connectionString: process.env.DATABASE_URL || undefined,
  // Local development config
  host: process.env.DATABASE_URL ? undefined : 'localhost',
  port: process.env.DATABASE_URL ? undefined : 5432,
  database: process.env.DATABASE_URL ? undefined : 'bookmate_db',
  user: process.env.DATABASE_URL ? undefined : 'postgres',
  password: process.env.DATABASE_URL ? undefined : '246595',
  // Production için SSL gerekli, development için değil
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
});

// Test database connection and initialize tables
pool.connect(async (err, client, release) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully');
    release();
    
    // Initialize database tables
    try {
      console.log('🔄 Initializing database tables...');
      await initializeDatabase(pool);
      console.log('✅ Database tables initialized successfully');
    } catch (initError) {
      console.error('❌ Database initialization failed:', initError);
    }
  }
});

// Database pool is set later for routes

// JWT Secret - Fixed for consistency
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
    req.userId = decoded.userId || decoded.id;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    return res.status(403).json({ message: 'Geçersiz token' });
  }
};

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'BookMate API is running!',
    version: '1.0.1',
    status: 'JWT Secret Fixed',
          endpoints: {
        auth: '/api/auth/*',
        books: '/api/books/*',
        userBooks: '/api/user/books/*',
        readingSessions: '/api/user/reading-sessions/*',
        wishlists: '/api/user/wishlists/*'
      }
  });
});

// 🔐 Authentication Routes

// Database görüntüleme endpoint'i (sadece test için)
app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        email, 
        "displayName", 
        username,
        "createdAt"
      FROM users 
      ORDER BY "createdAt" DESC 
      LIMIT 20
    `);
    
    res.json({
      message: 'Kullanıcı listesi',
      users: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ message: 'Database error', error: error.message });
  }
});

// Database istatistikleri endpoint'i
app.get('/api/admin/stats', async (req, res) => {
  try {
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const bookCount = await pool.query('SELECT COUNT(*) FROM books');
    const userBooksCount = await pool.query('SELECT COUNT(*) FROM user_books');
    const wishlistCount = await pool.query('SELECT COUNT(*) FROM wishlists');
    
    // Son 5 kullanıcı
    const recentUsers = await pool.query(`
      SELECT id, email, "displayName", "createdAt" 
      FROM users 
      ORDER BY "createdAt" DESC 
      LIMIT 5
    `);
    
    res.json({
      message: 'Database istatistikleri',
      stats: {
        users: parseInt(userCount.rows[0].count),
        books: parseInt(bookCount.rows[0].count),
        userBooks: parseInt(userBooksCount.rows[0].count),
        wishlists: parseInt(wishlistCount.rows[0].count)
      },
      recentUsers: recentUsers.rows
    });
  } catch (error) {
    console.error('Database stats error:', error);
    res.status(500).json({ message: 'Database error', error: error.message });
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
    const token = jwt.sign({ userId: user.id, id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

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
    const token = jwt.sign({ userId: user.id, id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

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

// Test endpoint for debugging
app.get('/api/test-endpoint', (req, res) => {
  console.log('🧪 Test endpoint called successfully!');
  res.json({ message: 'Test endpoint working!', timestamp: new Date().toISOString() });
});

// Check username availability
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
      return res.status(400).json({
        available: false,
        message: 'Bu kullanıcı adı kullanılamaz'
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
      console.error('Database check error:', dbError);
      // Fallback to reserved usernames check
      const isAvailable = !reservedUsernames.includes(username.toLowerCase());
      res.json({
        available: isAvailable,
        message: isAvailable ? 'Kullanıcı adı müsait (fallback)' : 'Bu kullanıcı adı zaten alınmış'
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

// Verify current password
app.post('/api/auth/verify-password', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;
    
    console.log('🔍 Password verification request for user:', req.userId);

    if (!password) {
      return res.status(400).json({ message: 'Şifre gerekli' });
    }

    // Get user with password hash
    const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    const user = result.rows[0];
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    console.log('✅ Password verification result:', isValidPassword);
    
    res.json({ 
      valid: isValidPassword,
      message: isValidPassword ? 'Şifre doğru' : 'Şifre hatalı'
    });
  } catch (error) {
    console.error('Password verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    console.log('🔐 Password change request for user:', req.userId);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Mevcut şifre ve yeni şifre gerekli' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Yeni şifre en az 6 karakter olmalıdır' });
    }

    // Get current user
    const userResult = await pool.query('SELECT password FROM users WHERE id = $1', [req.userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isCurrentPasswordValid) {
      console.log('❌ Current password verification failed');
      return res.status(401).json({ message: 'Mevcut şifreniz hatalı' });
    }

    // Check if new password is different
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ message: 'Yeni şifreniz mevcut şifrenizden farklı olmalıdır' });
    }

    // Hash new password
    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    await pool.query(
      'UPDATE users SET password = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2',
      [newHashedPassword, req.userId]
    );

    console.log('✅ Password updated successfully for user:', req.userId);

    res.json({
      success: true,
      message: 'Şifreniz başarıyla değiştirildi'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'Şifre değiştirilirken bir hata oluştu' });
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

// Mount routes
app.use('/api/books', booksRouter);
app.use('/api/user/books', userBooksRouter);
app.use('/api/user/reading-sessions', readingSessionsRouter);
app.use('/api/user/wishlists', wishlistsRouter);

// Set database pool for shared reading routes
app.set('db', pool);

// Mount shared reading routes (authentication is handled inside the routes)
try {
  app.use('/api/shared-reading', sharedReadingRouter);
  app.use('/api/shared-sessions', sharedSessionsRouter);
  console.log('✅ Shared reading routes mounted');
} catch (error) {
  console.error('❌ Error mounting shared reading routes:', error);
}

// Mount admin routes
app.use('/api/admin', adminRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Sunucu hatası' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint bulunamadı' });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 BookMate Server running on port ${port}`);
  console.log(`📚 Local: http://localhost:${port}/`);
  console.log(`🌐 Network: http://192.168.1.5:${port}/`);
  console.log(`📱 Mobile API (Emulator): http://10.22.7.154:${port}/api/auth/login`);
  console.log(`🔍 Waiting for requests...`);
}); 
 