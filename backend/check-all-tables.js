const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595',
  ssl: false,
});

async function checkAllTables() {
  try {
    console.log('🔍 Tüm tabloları kontrol ediliyor...\n');

    // 1. users tablosu
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`👤 users tablosu: ${usersResult.rows[0].count} kullanıcı`);

    // 2. books tablosu
    const booksResult = await pool.query('SELECT COUNT(*) as count FROM books');
    console.log(`📚 books tablosu: ${booksResult.rows[0].count} kitap`);

    // 3. user_books tablosu
    const userBooksResult = await pool.query('SELECT COUNT(*) as count FROM user_books');
    console.log(`📖 user_books tablosu: ${userBooksResult.rows[0].count} kayıt`);

    // 4. wishlists tablosu
    const wishlistsResult = await pool.query('SELECT COUNT(*) as count FROM wishlists');
    console.log(`🎯 wishlists tablosu: ${wishlistsResult.rows[0].count} kayıt`);

    // 5. categories tablosu
    const categoriesResult = await pool.query('SELECT COUNT(*) as count FROM categories');
    console.log(`🏷️ categories tablosu: ${categoriesResult.rows[0].count} kategori`);

    console.log('\n📊 Detaylı kontrol:\n');

    // Son 5 kullanıcı
    const recentUsers = await pool.query('SELECT "displayName", email, "createdAt" FROM users ORDER BY "createdAt" DESC LIMIT 5');
    console.log('Son 5 kullanıcı:');
    recentUsers.rows.forEach(user => {
      console.log(`- ${user.displayName} (${user.email}) - ${user.createdAt}`);
    });

    console.log('\n');

    // Eğer kitap varsa, onları göster
    if (booksResult.rows[0].count > 0) {
      const allBooks = await pool.query('SELECT title, author, "createdAt" FROM books ORDER BY "createdAt" DESC LIMIT 5');
      console.log('Son 5 kitap:');
      allBooks.rows.forEach(book => {
        console.log(`- ${book.title} (${book.author}) - ${book.createdAt}`);
      });
    } else {
      console.log('❌ books tablosunda hiç kitap yok!');
    }

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    pool.end();
  }
}

checkAllTables(); 
 