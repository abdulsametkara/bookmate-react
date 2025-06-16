const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const router = express.Router();

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

// 📚 Tüm kitapları listele
router.get('/', async (req, res) => {
  try {
    const { search, genre, author, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM books WHERE 1=1';
    let params = [];
    let paramCount = 0;
    
    if (search) {
      paramCount++;
      query += ` AND (title ILIKE $${paramCount} OR author ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    if (genre) {
      paramCount++;
      query += ` AND genre ILIKE $${paramCount}`;
      params.push(`%${genre}%`);
    }
    
    if (author) {
      paramCount++;
      query += ` AND author ILIKE $${paramCount}`;
      params.push(`%${author}%`);
    }
    
    query += ` ORDER BY "createdAt" DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Toplam sayısını al
    const countQuery = 'SELECT COUNT(*) FROM books WHERE 1=1' + 
      (search ? ' AND (title ILIKE $1 OR author ILIKE $1)' : '') +
      (genre ? ` AND genre ILIKE $${search ? 2 : 1}` : '') +
      (author ? ` AND author ILIKE $${search && genre ? 3 : search || genre ? 2 : 1}` : '');
    
    const countResult = await pool.query(countQuery, params.slice(0, paramCount));
    
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
    console.error('Books fetch error:', error);
    res.status(500).json({ message: 'Kitaplar getirilemedi' });
  }
});

// 🔍 Kitap ara - ÖNEMLİ: Bu route /:id route'undan ÖNCE olmalı
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ message: 'En az 2 karakter girmelisiniz' });
    }
    
    const result = await pool.query(`
      SELECT *, 
        CASE 
          WHEN title ILIKE $1 THEN 3
          WHEN author ILIKE $1 THEN 2
          ELSE 1
        END as relevance
      FROM books 
      WHERE title ILIKE $2 OR author ILIKE $2 OR description ILIKE $2
      ORDER BY relevance DESC, title ASC
      LIMIT 20
    `, [`%${q}%`, `%${q}%`]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Book search error:', error);
    res.status(500).json({ message: 'Arama yapılamadı' });
  }
});

// 📖 Kitap detayı
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Kitap bulunamadı' });
    }
    
    // Kitabın kategorilerini de getir
    const categoriesResult = await pool.query(`
      SELECT c.* FROM categories c
      JOIN book_categories bc ON c.id = bc.category_id
      WHERE bc.book_id = $1
    `, [id]);
    
    // Kitabın ortalama puanını hesapla
    const ratingsResult = await pool.query(`
      SELECT AVG(rating) as average_rating, COUNT(*) as review_count
      FROM book_reviews WHERE book_id = $1
    `, [id]);
    
    const book = {
      ...result.rows[0],
      categories: categoriesResult.rows,
      average_rating: ratingsResult.rows[0].average_rating ? parseFloat(ratingsResult.rows[0].average_rating).toFixed(1) : null,
      review_count: parseInt(ratingsResult.rows[0].review_count)
    };
    
    res.json(book);
  } catch (error) {
    console.error('Book detail error:', error);
    res.status(500).json({ message: 'Kitap detayı getirilemedi' });
  }
});

// 🔍 Kitap var mı kontrol et (ISBN ile)
router.post('/check-or-create', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      author,
      isbn,
      publisher,
      published_year,
      page_count,
      genre,
      description,
      cover_image_url,
      language = 'tr'
    } = req.body;
    
    if (!title || !author) {
      return res.status(400).json({ message: 'Başlık ve yazar alanları zorunludur' });
    }
    
    let book;
    
    // ISBN varsa önce ISBN ile kontrol et
    if (isbn) {
      const existingBook = await pool.query('SELECT * FROM books WHERE isbn = $1', [isbn]);
      if (existingBook.rows.length > 0) {
        book = existingBook.rows[0];
        console.log('📚 Existing book found by ISBN:', book.title);
        return res.json({
          message: 'Kitap zaten sistemde mevcut',
          book,
          isExisting: true
        });
      }
    }
    
    // Kitap yoksa oluştur
    const result = await pool.query(`
      INSERT INTO books (title, author, isbn, publisher, "publishedYear", "pageCount", genre, description, cover_image_url, language)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [title, author, isbn, publisher, published_year, page_count, genre, description, cover_image_url, language]);
    
    book = result.rows[0];
    console.log('📚 New book created:', book.title);
    
    res.status(201).json({
      message: 'Kitap başarıyla eklendi',
      book,
      isExisting: false
    });
    
  } catch (error) {
    console.error('Book check/create error:', error);
    res.status(500).json({ 
      message: 'Kitap kontrol/oluşturma sırasında hata oluştu',
      error: error.message 
    });
  }
});

// ➕ Yeni kitap ekle (Smart - mevcut kitabı kontrol eder)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      author,
      isbn,
      publisher,
      published_year,
      page_count,
      genre,
      description,
      cover_image_url,
      language = 'tr',
      category_ids = []
    } = req.body;
    
    if (!title || !author) {
      return res.status(400).json({ message: 'Başlık ve yazar alanları zorunludur' });
    }
    
    let book;
    let isExisting = false;
    
    // ISBN varsa önce mevcut kitabı kontrol et
    if (isbn) {
      const existingBook = await pool.query('SELECT * FROM books WHERE isbn = $1', [isbn]);
      if (existingBook.rows.length > 0) {
        book = existingBook.rows[0];
        isExisting = true;
        console.log('📚 Using existing book:', book.title);
      }
    }
    
    // Kitap yoksa oluştur
    if (!book) {
      const result = await pool.query(`
        INSERT INTO books (title, author, isbn, publisher, "publishedYear", "pageCount", genre, description, cover_image_url, language)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [title, author, isbn, publisher, published_year, page_count, genre, description, cover_image_url, language]);
      
      book = result.rows[0];
      console.log('📚 New book created:', book.title);
    }
    
    // Kategorileri ekle (sadece yeni kitap için)
    if (!isExisting && category_ids && category_ids.length > 0) {
      for (const categoryId of category_ids) {
        await pool.query(
          'INSERT INTO book_categories (book_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [book.id, categoryId]
        );
      }
    }
    
    res.status(isExisting ? 200 : 201).json({
      message: isExisting ? 'Mevcut kitap kullanıldı' : 'Yeni kitap oluşturuldu',
      book,
      isExisting
    });
  } catch (error) {
    console.error('Book create error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error detail:', error.detail);
    
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ message: 'Bu ISBN numarası zaten kullanılıyor' });
    } else if (error.code === '42703') { // Column does not exist
      res.status(500).json({ message: 'Veritabanı sütun hatası: ' + error.message });
    } else {
      res.status(500).json({ message: 'Kitap eklenemedi: ' + error.message });
    }
  }
});

module.exports = router; 
 

