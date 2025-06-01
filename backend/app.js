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

const app = express();
const port = 5000;

// Middleware
app.use(cors());
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
        wishlists: '/api/user/wishlists/*'
      }
  });
});

// 🔐 Authentication Routes

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    
    console.log('Register request:', { email, displayName });

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
 