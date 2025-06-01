const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595'
});

async function fixAllIssues() {
  try {
    console.log('🔧 Tüm sorunları düzeltiliyor...\n');
    
    // 1. Books tablosunun mevcut yapısını kontrol et
    console.log('📋 Books tablosunun mevcut sütunları:');
    const currentColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'books'
      ORDER BY ordinal_position
    `);
    
    currentColumns.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
    
    // 2. Eksik sütunları kontrol et ve ekle
    const existingColumns = currentColumns.rows.map(col => col.column_name);
    
    const requiredColumns = [
      { name: 'language', type: 'VARCHAR(10)', default: "'tr'" }
    ];
    
    for (const column of requiredColumns) {
      if (!existingColumns.includes(column.name)) {
        console.log(`\n➕ ${column.name} sütunu ekleniyor...`);
        await pool.query(`
          ALTER TABLE books 
          ADD COLUMN ${column.name} ${column.type} DEFAULT ${column.default}
        `);
        console.log(`✅ ${column.name} sütunu eklendi`);
      }
    }
    
    // 3. Test kitap ekleme
    console.log('\n📚 Test kitap ekleniyor...');
    try {
      const testBook = await pool.query(`
        INSERT INTO books (title, author, isbn, publisher, "publishedYear", "pageCount", genre, description, cover_image_url, language)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        'Test Kitabı Fix',
        'Test Yazar Fix', 
        'TEST123456',
        'Test Publisher',
        2024,
        150,
        'Test',
        'Test description',
        'https://via.placeholder.com/150x200',
        'tr'
      ]);
      
      console.log('✅ Test kitap başarıyla eklendi:', testBook.rows[0].title);
      
      // Test kitabı sil
      await pool.query('DELETE FROM books WHERE isbn = $1', ['TEST123456']);
      console.log('🗑️ Test kitap silindi');
      
    } catch (error) {
      console.error('❌ Test kitap ekleme hatası:', error.message);
      console.error('Code:', error.code);
      console.error('Detail:', error.detail);
    }
    
    // 4. User preferences tablosunu kontrol et
    console.log('\n🔍 User preferences tablosu kontrol ediliyor...');
    const userPrefsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_preferences'
      );
    `);
    
    if (!userPrefsCheck.rows[0].exists) {
      console.log('📋 User preferences tablosu oluşturuluyor...');
      await pool.query(`
        CREATE TABLE user_preferences (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL UNIQUE,
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
      console.log('✅ User preferences tablosu oluşturuldu');
    }
    
    console.log('\n🎉 Tüm düzeltmeler tamamlandı!');
    
  } catch (error) {
    console.error('❌ Genel hata:', error.message);
  } finally {
    await pool.end();
  }
}

fixAllIssues(); 