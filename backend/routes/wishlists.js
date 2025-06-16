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
    req.userId = decoded.userId || decoded.id;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Geçersiz token' });
  }
};

// 📋 Kullanıcının istek listesini getir
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT w.*, b.title, b.author, b.cover_image_url, b."pageCount" as page_count, b.publisher
      FROM wishlists w
      JOIN books b ON w.book_id = b.id
      WHERE w.user_id = $1
      ORDER BY w.priority ASC, w."createdAt" DESC
    `, [req.userId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ message: 'İstek listesi getirilemedi' });
  }
});

// ➕ İstek listesine kitap ekle
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { book_id, priority = 3, notes } = req.body;
    
    if (!book_id) {
      return res.status(400).json({ message: 'Kitap ID gerekli' });
    }
    
    // Kitap var mı kontrol et
    const bookExists = await pool.query('SELECT id FROM books WHERE id = $1', [book_id]);
    if (bookExists.rows.length === 0) {
      return res.status(404).json({ message: 'Kitap bulunamadı' });
    }
    
    // ⚠️ MANTIK KONTROLÜ: Kitap zaten kütüphanede mi?
    const inLibrary = await pool.query(
      'SELECT id FROM user_books WHERE user_id = $1 AND book_id = $2',
      [req.userId, book_id]
    );
    
    if (inLibrary.rows.length > 0) {
      return res.status(400).json({ 
        message: 'Bu kitap zaten kütüphanenizde bulunuyor. Kütüphanedeki kitaplar istek listesine eklenemez.' 
      });
    }
    
    // Zaten istek listesinde mi kontrol et
    const existingWishlist = await pool.query(
      'SELECT id FROM wishlists WHERE user_id = $1 AND book_id = $2',
      [req.userId, book_id]
    );
    
    if (existingWishlist.rows.length > 0) {
      return res.status(400).json({ message: 'Bu kitap zaten istek listenizde' });
    }
    
    const result = await pool.query(`
      INSERT INTO wishlists (user_id, book_id, priority, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [req.userId, book_id, priority, notes]);
    
    res.status(201).json({
      message: 'Kitap istek listesine eklendi',
      wishlist: result.rows[0]
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ message: 'Kitap istek listesine eklenemedi' });
  }
});

// 🗑️ İstek listesinden kitap kaldır
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM wishlists WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'İstek listesi öğesi bulunamadı' });
    }
    
    res.json({ message: 'Kitap istek listesinden kaldırıldı' });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ message: 'Kitap istek listesinden kaldırılamadı' });
  }
});

// ✏️ İstek listesi öğesini güncelle
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { priority, notes } = req.body;
    
    const result = await pool.query(`
      UPDATE wishlists 
      SET priority = $1, notes = $2
      WHERE id = $3 AND user_id = $4
      RETURNING *
    `, [priority, notes, id, req.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'İstek listesi öğesi bulunamadı' });
    }
    
    res.json({
      message: 'İstek listesi güncellendi',
      wishlist: result.rows[0]
    });
  } catch (error) {
    console.error('Update wishlist error:', error);
    res.status(500).json({ message: 'İstek listesi güncellenemedi' });
  }
});

module.exports = router; 