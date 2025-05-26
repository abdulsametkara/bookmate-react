const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const router = express.Router();

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595'
});

const JWT_SECRET = 'bookmate_secret_key_2025';

// Middleware: JWT token kontrolü
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

// 📝 Okuma seansı başlat
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { book_id, current_page } = req.body;
    
    if (!book_id) {
      return res.status(400).json({ message: 'Kitap ID gerekli' });
    }
    
    // Kitap kullanıcının koleksiyonunda mı kontrol et
    const userBookCheck = await pool.query(
      'SELECT id FROM user_books WHERE user_id = $1 AND book_id = $2',
      [req.userId, book_id]
    );
    
    if (userBookCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Bu kitap koleksiyonunuzda yok' });
    }
    
    // Aktif okuma seansı var mı kontrol et
    const activeSession = await pool.query(
      'SELECT id FROM reading_sessions WHERE user_id = $1 AND end_time IS NULL',
      [req.userId]
    );
    
    if (activeSession.rows.length > 0) {
      return res.status(400).json({ message: 'Zaten aktif bir okuma seansınız var' });
    }
    
    const result = await pool.query(`
      INSERT INTO reading_sessions (user_id, book_id, start_time, current_page)
      VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
      RETURNING *
    `, [req.userId, book_id, current_page]);
    
    res.status(201).json({
      message: 'Okuma seansı başlatıldı',
      session: result.rows[0]
    });
  } catch (error) {
    console.error('Start reading session error:', error);
    res.status(500).json({ message: 'Okuma seansı başlatılamadı' });
  }
});

// 🔚 Okuma seansı bitir
router.put('/:id/end', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { pages_read, current_page, session_notes } = req.body;
    
    const result = await pool.query(`
      UPDATE reading_sessions 
      SET end_time = CURRENT_TIMESTAMP,
          pages_read = COALESCE($2, 0),
          current_page = COALESCE($3, current_page),
          session_notes = $4
      WHERE id = $1 AND user_id = $5 AND end_time IS NULL
      RETURNING *
    `, [id, pages_read, current_page, session_notes, req.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Aktif okuma seansı bulunamadı' });
    }
    
    const session = result.rows[0];
    
    // Günlük istatistikleri güncelle
    const today = new Date().toISOString().split('T')[0];
    await pool.query(`
      INSERT INTO reading_stats (user_id, date, total_minutes, total_pages)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, date)
      DO UPDATE SET 
        total_minutes = reading_stats.total_minutes + $3,
        total_pages = reading_stats.total_pages + $4
    `, [req.userId, today, session.duration_minutes || 0, pages_read || 0]);
    
    res.json({
      message: 'Okuma seansı tamamlandı',
      session
    });
  } catch (error) {
    console.error('End reading session error:', error);
    res.status(500).json({ message: 'Okuma seansı bitirilemedi' });
  }
});

// 📊 Kullanıcının okuma seansları
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { book_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT rs.*, b.title, b.author, b.cover_image_url
      FROM reading_sessions rs
      JOIN books b ON rs.book_id = b.id
      WHERE rs.user_id = $1
    `;
    let params = [req.userId];
    
    if (book_id) {
      query += ` AND rs.book_id = $2`;
      params.push(book_id);
    }
    
    query += ` ORDER BY rs.start_time DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get reading sessions error:', error);
    res.status(500).json({ message: 'Okuma seansları getirilemedi' });
  }
});

// 🎯 Okuma istatistikleri
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    
    let dateFilter = '';
    switch (period) {
      case 'today':
        dateFilter = "DATE(start_time) = CURRENT_DATE";
        break;
      case 'week':
        dateFilter = "start_time >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "start_time >= CURRENT_DATE - INTERVAL '30 days'";
        break;
      case 'year':
        dateFilter = "start_time >= CURRENT_DATE - INTERVAL '365 days'";
        break;
      default:
        dateFilter = "start_time >= CURRENT_DATE - INTERVAL '7 days'";
    }
    
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(duration_minutes) as total_minutes,
        SUM(pages_read) as total_pages,
        AVG(duration_minutes) as avg_session_duration,
        COUNT(DISTINCT book_id) as books_read_count,
        COUNT(DISTINCT DATE(start_time)) as reading_days
      FROM reading_sessions 
      WHERE user_id = $1 AND ${dateFilter} AND end_time IS NOT NULL
    `, [req.userId]);
    
    // Günlük okuma verileri (grafik için)
    const dailyStats = await pool.query(`
      SELECT 
        DATE(start_time) as date,
        SUM(duration_minutes) as minutes,
        SUM(pages_read) as pages,
        COUNT(*) as sessions
      FROM reading_sessions 
      WHERE user_id = $1 AND ${dateFilter} AND end_time IS NOT NULL
      GROUP BY DATE(start_time)
      ORDER BY DATE(start_time)
    `, [req.userId]);
    
    // En çok okunan kitaplar
    const topBooks = await pool.query(`
      SELECT 
        b.title,
        b.author,
        SUM(rs.duration_minutes) as total_minutes,
        SUM(rs.pages_read) as total_pages,
        COUNT(rs.id) as session_count
      FROM reading_sessions rs
      JOIN books b ON rs.book_id = b.id
      WHERE rs.user_id = $1 AND ${dateFilter} AND rs.end_time IS NOT NULL
      GROUP BY b.id, b.title, b.author
      ORDER BY total_minutes DESC
      LIMIT 5
    `, [req.userId]);
    
    res.json({
      overview: stats.rows[0],
      daily_stats: dailyStats.rows,
      top_books: topBooks.rows
    });
  } catch (error) {
    console.error('Get reading stats error:', error);
    res.status(500).json({ message: 'İstatistikler getirilemedi' });
  }
});

// 📈 Aktif okuma seansı
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT rs.*, b.title, b.author, b.cover_image_url, b.page_count
      FROM reading_sessions rs
      JOIN books b ON rs.book_id = b.id
      WHERE rs.user_id = $1 AND rs.end_time IS NULL
      ORDER BY rs.start_time DESC
      LIMIT 1
    `, [req.userId]);
    
    if (result.rows.length === 0) {
      return res.json({ activeSession: null });
    }
    
    res.json({ activeSession: result.rows[0] });
  } catch (error) {
    console.error('Get active session error:', error);
    res.status(500).json({ message: 'Aktif seans getirilemedi' });
  }
});

module.exports = router; 