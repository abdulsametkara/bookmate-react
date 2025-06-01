const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const app = express();
const port = 5001; // Farklı port kullan

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

// Test database connection
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT current_database(), current_user');
    res.json({ 
      success: true, 
      database: result.rows[0].current_database,
      user: result.rows[0].current_user 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test kitap ekleme
app.post('/test-book', async (req, res) => {
  try {
    console.log('📚 Test kitap ekleme başlatıldı...');
    console.log('Request body:', req.body);
    
    const {
      title = 'Test Kitap',
      author = 'Test Yazar',
      isbn = '123456789',
      publisher = 'Test Yayınevi',
      published_year = 2023,
      page_count = 100,
      genre = 'Test',
      description = 'Test açıklama',
      cover_image_url = 'https://via.placeholder.com/150',
      language = 'tr'
    } = req.body;

    console.log('📊 Veritabanına eklenecek veriler:', {
      title, author, isbn, publisher, published_year, page_count, genre, description, cover_image_url, language
    });

    // SQL sorgusunu test et
    const query = `
      INSERT INTO books (title, author, isbn, publisher, "publishedYear", "pageCount", genre, description, cover_image_url, language)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const values = [title, author, isbn, publisher, published_year, page_count, genre, description, cover_image_url, language];
    
    console.log('📝 SQL Query:', query);
    console.log('📝 Values:', values);
    
    const result = await pool.query(query, values);
    
    console.log('✅ Kitap başarıyla eklendi:', result.rows[0]);
    
    res.status(201).json({
      success: true,
      message: 'Kitap başarıyla eklendi',
      book: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Kitap ekleme hatası:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error detail:', error.detail);
    console.error('Error hint:', error.hint);
    console.error('Full error:', error);
    
    res.status(500).json({ 
      success: false,
      error: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
  }
});

// Books tablosunun sütunlarını kontrol et
app.get('/check-columns', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'books'
      ORDER BY ordinal_position
    `);
    
    res.json({
      success: true,
      columns: result.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`🧪 Test server running on port ${port}`);
  console.log(`📊 Test endpoints:`);
  console.log(`   GET  http://localhost:${port}/test-db`);
  console.log(`   GET  http://localhost:${port}/check-columns`);
  console.log(`   POST http://localhost:${port}/test-book`);
}); 