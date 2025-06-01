const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595'
});

async function addTestUserBook() {
  try {
    console.log('🔍 Test kullanıcısı ve kitap bulunuyor...');
    
    // Test kullanıcısını bul
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', ['testuser123@gmail.com']);
    if (userResult.rows.length === 0) {
      console.log('❌ Test kullanıcısı bulunamadı');
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log('✅ Test kullanıcısı bulundu:', userId);
    
    // Rastgele bir kitap bul
    const bookResult = await pool.query('SELECT * FROM books LIMIT 1');
    if (bookResult.rows.length === 0) {
      console.log('❌ Test kitabı bulunamadı');
      return;
    }
    
    const book = bookResult.rows[0];
    console.log('✅ Test kitabı bulundu:', book.title, 'by', book.author);
    
    // User_books tablosuna ekle
    console.log('📚 Kitap kullanıcı koleksiyonuna ekleniyor...');
    
    const userBookResult = await pool.query(`
      INSERT INTO user_books (user_id, book_id, status, current_page)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, book_id) DO UPDATE SET
        status = EXCLUDED.status,
        current_page = EXCLUDED.current_page,
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING *
    `, [userId, book.id, 'to_read', 0]);
    
    console.log('✅ Kitap kullanıcı koleksiyonuna eklendi:', {
      title: book.title,
      status: userBookResult.rows[0].status,
      current_page: userBookResult.rows[0].current_page
    });
    
    console.log('\n🎉 Test verisi hazırlandı!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addTestUserBook(); 