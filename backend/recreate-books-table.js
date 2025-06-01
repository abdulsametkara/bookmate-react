const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595'
});

async function recreateBooksTable() {
  try {
    console.log('🔄 Books tablosunu yeniden oluşturuluyor...\n');
    
    // 1. Önce bağımlı tabloları kontrol et
    console.log('🔍 Bağımlı tabloları kontrol ediliyor...');
    
    // Mevcut books tablosunu yedekle
    console.log('💾 Mevcut books tablosunu yedekleniyor...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS books_backup AS 
      SELECT * FROM books
    `);
    
    // Bağımlı constraint'leri kaldır
    console.log('🔗 Bağımlı constraint\'leri kaldırılıyor...');
    try {
      await pool.query('ALTER TABLE user_books DROP CONSTRAINT IF EXISTS fk_book');
      await pool.query('ALTER TABLE wishlists DROP CONSTRAINT IF EXISTS fk_book');
      await pool.query('ALTER TABLE book_categories DROP CONSTRAINT IF EXISTS fk_book');
    } catch (e) {
      console.log('⚠️ Constraint kaldırma hatası (normal olabilir):', e.message);
    }
    
    // Eski books tablosunu sil
    console.log('🗑️ Eski books tablosunu siliniyor...');
    await pool.query('DROP TABLE IF EXISTS books CASCADE');
    
    // Yeni books tablosunu oluştur
    console.log('📋 Yeni books tablosunu oluşturuluyor...');
    await pool.query(`
      CREATE TABLE books (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        isbn VARCHAR(20) UNIQUE,
        publisher TEXT,
        "publishedYear" INTEGER,
        "pageCount" INTEGER,
        genre VARCHAR(100),
        description TEXT,
        cover_image_url TEXT,
        language VARCHAR(10) DEFAULT 'tr',
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Yeni books tablosu oluşturuldu');
    
    // Test kitap ekle
    console.log('📚 Test kitap ekleniyor...');
    const testBook = await pool.query(`
      INSERT INTO books (title, author, isbn, publisher, "publishedYear", "pageCount", genre, description, cover_image_url, language)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      'Test Kitabı',
      'Test Yazar',
      'TEST123456',
      'Test Yayınevi',
      2024,
      200,
      'Test',
      'Test açıklama',
      'https://via.placeholder.com/150x200',
      'tr'
    ]);
    
    console.log('✅ Test kitap başarıyla eklendi:', testBook.rows[0]);
    
    // Test kitabı sil
    await pool.query('DELETE FROM books WHERE isbn = $1', ['TEST123456']);
    console.log('🗑️ Test kitap silindi');
    
    console.log('\n🎉 Books tablosu başarıyla yeniden oluşturuldu!');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error('Kod:', error.code);
    console.error('Detay:', error.detail);
  } finally {
    await pool.end();
  }
}

recreateBooksTable(); 