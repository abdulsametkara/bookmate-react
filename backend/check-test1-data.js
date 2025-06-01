const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595',
  ssl: false,
});

async function checkTest1Data() {
  try {
    console.log('🔍 test1 kullanıcısının verilerini kontrol ediliyor...\n');

    // 1. test1 kullanıcısını bul
    const userResult = await pool.query(`
      SELECT id, email, "displayName", "createdAt" 
      FROM users 
      WHERE "displayName" = 'test1' OR email ILIKE '%test1%'
    `);

    if (userResult.rows.length === 0) {
      console.log('❌ test1 kullanıcısı bulunamadı!');
      return;
    }

    const user = userResult.rows[0];
    console.log('👤 test1 kullanıcısı bulundu:');
    console.log(user);
    console.log('');

    // 2. Kullanıcının user_books tablosundaki kitapları
    const userBooksResult = await pool.query(`
      SELECT ub.*, b.title, b.author 
      FROM user_books ub
      LEFT JOIN books b ON ub.book_id = b.id
      WHERE ub.user_id = $1
    `, [user.id]);

    console.log('📚 user_books tablosundaki kitaplar:', userBooksResult.rows.length);
    userBooksResult.rows.forEach(book => {
      console.log(`- ${book.title || 'Başlık yok'} (${book.author || 'Yazar yok'}) - Status: ${book.status}`);
    });
    console.log('');

    // 3. Kullanıcının wishlists tablosundaki kitapları
    const wishlistResult = await pool.query(`
      SELECT w.*, b.title, b.author 
      FROM wishlists w
      LEFT JOIN books b ON w.book_id = b.id
      WHERE w.user_id = $1
      ORDER BY w.priority ASC
    `, [user.id]);

    console.log('🎯 wishlists tablosundaki kitaplar:', wishlistResult.rows.length);
    wishlistResult.rows.forEach(book => {
      console.log(`- ${book.title || 'Başlık yok'} (${book.author || 'Yazar yok'}) - Priority: ${book.priority}`);
    });
    console.log('');

    // 4. Tüm books tablosundaki kitap sayısı
    const booksCountResult = await pool.query('SELECT COUNT(*) as count FROM books');
    console.log('📖 books tablosundaki toplam kitap sayısı:', booksCountResult.rows[0].count);

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    pool.end();
  }
}

checkTest1Data(); 
 