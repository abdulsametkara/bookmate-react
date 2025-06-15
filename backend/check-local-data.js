const { Pool } = require('pg');

// Local database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595',
  ssl: false,
});

async function checkLocalData() {
  try {
    console.log('🔍 Checking local database data...\n');

    // Check users
    const users = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Users: ${users.rows[0].count}`);
    
    if (users.rows[0].count > 0) {
      const userSample = await pool.query('SELECT id, email, "displayName", "createdAt" FROM users LIMIT 3');
      console.log('Sample users:', userSample.rows);
    }

    // Check books
    const books = await pool.query('SELECT COUNT(*) as count FROM books');
    console.log(`\n📚 Books: ${books.rows[0].count}`);
    
    if (books.rows[0].count > 0) {
      const bookSample = await pool.query('SELECT id, title, author FROM books LIMIT 3');
      console.log('Sample books:', bookSample.rows);
    }

    // Check user_books
    const userBooks = await pool.query('SELECT COUNT(*) as count FROM user_books');
    console.log(`\n📖 User Books: ${userBooks.rows[0].count}`);

    // Check reading_sessions
    const sessions = await pool.query('SELECT COUNT(*) as count FROM reading_sessions');
    console.log(`\n⏱️ Reading Sessions: ${sessions.rows[0].count}`);

    // Check categories
    const categories = await pool.query('SELECT COUNT(*) as count FROM categories');
    console.log(`\n🏷️ Categories: ${categories.rows[0].count}`);
    
    if (categories.rows[0].count > 0) {
      const catSample = await pool.query('SELECT name FROM categories');
      console.log('Categories:', catSample.rows.map(c => c.name));
    }

    // Check wishlists
    const wishlists = await pool.query('SELECT COUNT(*) as count FROM wishlists');
    console.log(`\n⭐ Wishlists: ${wishlists.rows[0].count}`);

    console.log('\n✅ Local data check completed!');

  } catch (error) {
    console.error('❌ Error checking local data:', error);
  } finally {
    await pool.end();
  }
}

checkLocalData(); 