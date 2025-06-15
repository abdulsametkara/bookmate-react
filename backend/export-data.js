const { Pool } = require('pg');
const fs = require('fs');

// Local database connection
const localPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595',
  ssl: false,
});

async function exportData() {
  try {
    console.log('🔄 Connecting to local database...');
    
    // Test connection
    await localPool.connect();
    console.log('✅ Connected to local database');

    // Export users
    const users = await localPool.query('SELECT * FROM users');
    console.log(`📊 Found ${users.rows.length} users`);

    // Export books
    const books = await localPool.query('SELECT * FROM books');
    console.log(`📚 Found ${books.rows.length} books`);

    // Export user_books
    const userBooks = await localPool.query('SELECT * FROM user_books');
    console.log(`📖 Found ${userBooks.rows.length} user books`);

    // Create backup object
    const backup = {
      timestamp: new Date().toISOString(),
      users: users.rows,
      books: books.rows,
      user_books: userBooks.rows
    };

    // Save to file
    fs.writeFileSync('database-backup.json', JSON.stringify(backup, null, 2));
    console.log('💾 Data exported to database-backup.json');

    // Print sample data
    console.log('\n📝 Sample data preview:');
    console.log('Users:', users.rows.slice(0, 2).map(u => ({ id: u.id, email: u.email, displayName: u.displayName })));
    console.log('Books:', books.rows.slice(0, 2).map(b => ({ id: b.id, title: b.title, author: b.author })));

  } catch (error) {
    console.error('❌ Export error:', error);
  } finally {
    await localPool.end();
  }
}

exportData(); 