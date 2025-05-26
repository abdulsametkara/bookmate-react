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

// 📚 Kullanıcının kitap koleksiyonu
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT ub.*, b.title, b.author, b.cover_image_url, b.page_count, b.genre
      FROM user_books ub
      JOIN books b ON ub.book_id = b.id
      WHERE ub.user_id = $1
    `;
    let params = [req.userId];
    
    if (status) {
      query += ` AND ub.status = $2`;
      params.push(status);
    }
    
    query += ` ORDER BY ub."updatedAt" DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Toplam sayı
    const countQuery = `
      SELECT COUNT(*) FROM user_books 
      WHERE user_id = $1 ${status ? 'AND status = $2' : ''}
    `;
    const countResult = await pool.query(countQuery, status ? [req.userId, status] : [req.userId]);
    
    res.json({
      books: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(countResult.rows[0].count / limit),
        totalBooks: parseInt(countResult.rows[0].count),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('User books fetch error:', error);
    res.status(500).json({ message: 'Kitaplar getirilemedi' });
  }
});

// 📊 Kullanıcının kitap istatistikleri
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const statsResult = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count,
        AVG(rating) as avg_rating
      FROM user_books 
      WHERE user_id = $1 
      GROUP BY status
    `, [req.userId]);
    
    const totalBooksResult = await pool.query(`
      SELECT COUNT(*) as total FROM user_books WHERE user_id = $1
    `, [req.userId]);
    
    const stats = {
      total: parseInt(totalBooksResult.rows[0].total),
      by_status: {}
    };
    
    statsResult.rows.forEach(row => {
      stats.by_status[row.status] = {
        count: parseInt(row.count),
        avg_rating: row.avg_rating ? parseFloat(row.avg_rating).toFixed(1) : null
      };
    });
    
    res.json(stats);
  } catch (error) {
    console.error('User books stats error:', error);
    res.status(500).json({ message: 'İstatistikler getirilemedi' });
  }
});

// ➕ Kitabı koleksiyona ekle
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { book_id, status = 'to_read', rating, notes, is_favorite = false } = req.body;
    
    if (!book_id) {
      return res.status(400).json({ message: 'Kitap ID gerekli' });
    }
    
    // Kitap var mı kontrol et
    const bookExists = await pool.query('SELECT id FROM books WHERE id = $1', [book_id]);
    if (bookExists.rows.length === 0) {
      return res.status(404).json({ message: 'Kitap bulunamadı' });
    }
    
    // Kullanıcı zaten bu kitabı koleksiyonuna eklemiş mi?
    const existingBook = await pool.query(
      'SELECT id FROM user_books WHERE user_id = $1 AND book_id = $2',
      [req.userId, book_id]
    );
    
    if (existingBook.rows.length > 0) {
      return res.status(400).json({ message: 'Bu kitap zaten koleksiyonunuzda' });
    }
    
    const result = await pool.query(`
      INSERT INTO user_books (user_id, book_id, status, rating, notes, is_favorite)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [req.userId, book_id, status, rating, notes, is_favorite]);
    
    res.status(201).json({
      message: 'Kitap koleksiyona eklendi',
      userBook: result.rows[0]
    });
  } catch (error) {
    console.error('Add book to collection error:', error);
    res.status(500).json({ message: 'Kitap koleksiyona eklenemedi' });
  }
});

// ✏️ Kitap durumunu güncelle
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rating, notes, is_favorite, start_date, finish_date } = req.body;
    
    const result = await pool.query(`
      UPDATE user_books 
      SET status = COALESCE($2, status),
          rating = COALESCE($3, rating),
          notes = COALESCE($4, notes),
          is_favorite = COALESCE($5, is_favorite),
          start_date = COALESCE($6, start_date),
          finish_date = COALESCE($7, finish_date),
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $8
      RETURNING *
    `, [id, status, rating, notes, is_favorite, start_date, finish_date, req.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Kitap bulunamadı veya size ait değil' });
    }
    
    res.json({
      message: 'Kitap güncellendi',
      userBook: result.rows[0]
    });
  } catch (error) {
    console.error('Update user book error:', error);
    res.status(500).json({ message: 'Kitap güncellenemedi' });
  }
});

// 🗑️ Kitabı koleksiyondan çıkar
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM user_books WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Kitap bulunamadı veya size ait değil' });
    }
    
    res.json({
      message: 'Kitap koleksiyondan çıkarıldı'
    });
  } catch (error) {
    console.error('Remove book from collection error:', error);
    res.status(500).json({ message: 'Kitap koleksiyondan çıkarılamadı' });
  }
});

// 📖 Duruma göre kitapları getir
router.get('/status/:status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const validStatuses = ['to_read', 'reading', 'completed', 'paused', 'dropped'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Geçersiz durum' });
    }
    
    const result = await pool.query(`
      SELECT ub.*, b.title, b.author, b.cover_image_url, b.page_count, b.genre
      FROM user_books ub
      JOIN books b ON ub.book_id = b.id
      WHERE ub.user_id = $1 AND ub.status = $2
      ORDER BY ub."updatedAt" DESC
      LIMIT $3 OFFSET $4
    `, [req.userId, status, limit, offset]);
    
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM user_books WHERE user_id = $1 AND status = $2',
      [req.userId, status]
    );
    
    res.json({
      books: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(countResult.rows[0].count / limit),
        totalBooks: parseInt(countResult.rows[0].count),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get books by status error:', error);
    res.status(500).json({ message: 'Kitaplar getirilemedi' });
  }
});

// ⭐ Favori kitaplar
router.get('/favorites', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ub.*, b.title, b.author, b.cover_image_url, b.page_count, b.genre
      FROM user_books ub
      JOIN books b ON ub.book_id = b.id
      WHERE ub.user_id = $1 AND ub.is_favorite = true
      ORDER BY ub."updatedAt" DESC
    `, [req.userId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get favorite books error:', error);
    res.status(500).json({ message: 'Favori kitaplar getirilemedi' });
  }
});

module.exports = router; 