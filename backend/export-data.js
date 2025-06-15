const { Pool } = require('pg');
const fs = require('fs');

// Local database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595',
  ssl: false,
});

async function exportData() {
  try {
    console.log('📤 Exporting data from local database...\n');

    let insertStatements = [];

    // Export users
    const users = await pool.query('SELECT * FROM users ORDER BY "createdAt"');
    console.log(`👥 Exporting ${users.rows.length} users...`);
    
    for (const user of users.rows) {
      const values = [
        `'${user.id}'`,
        `'${user.email.replace(/'/g, "''")}'`,
        `'${user.password}'`,
        `'${user.displayName.replace(/'/g, "''")}'`,
        user.username ? `'${user.username.replace(/'/g, "''")}'` : 'NULL',
        user.avatar_url ? `'${user.avatar_url}'` : 'NULL',
        user.bio ? `'${user.bio.replace(/'/g, "''")}'` : 'NULL',
        `'${user.createdAt.toISOString()}'`,
        `'${user.updatedAt.toISOString()}'`
      ];
      
      insertStatements.push(`INSERT INTO users (id, email, password, "displayName", username, avatar_url, bio, "createdAt", "updatedAt") VALUES (${values.join(', ')}) ON CONFLICT (id) DO NOTHING;`);
    }

    // Export books
    const books = await pool.query('SELECT * FROM books ORDER BY "createdAt"');
    console.log(`📚 Exporting ${books.rows.length} books...`);
    
    for (const book of books.rows) {
      const values = [
        `'${book.id}'`,
        `'${book.title.replace(/'/g, "''")}'`,
        `'${book.author.replace(/'/g, "''")}'`,
        book.isbn ? `'${book.isbn}'` : 'NULL',
        book.publisher ? `'${book.publisher.replace(/'/g, "''")}'` : 'NULL',
        book.publishedYear || 'NULL',
        book.pageCount || 300,
        book.genre ? `'${book.genre.replace(/'/g, "''")}'` : 'NULL',
        book.description ? `'${book.description.replace(/'/g, "''")}'` : 'NULL',
        book.cover_image_url ? `'${book.cover_image_url}'` : 'NULL',
        book.language ? `'${book.language}'` : "'tr'",
        `'${book.createdAt.toISOString()}'`,
        `'${book.updatedAt.toISOString()}'`
      ];
      
      insertStatements.push(`INSERT INTO books (id, title, author, isbn, publisher, "publishedYear", "pageCount", genre, description, cover_image_url, language, "createdAt", "updatedAt") VALUES (${values.join(', ')}) ON CONFLICT (id) DO NOTHING;`);
    }

    // Export user_books
    const userBooks = await pool.query('SELECT * FROM user_books ORDER BY "createdAt"');
    console.log(`📖 Exporting ${userBooks.rows.length} user books...`);
    
    for (const ub of userBooks.rows) {
      const values = [
        `'${ub.id}'`,
        `'${ub.user_id}'`,
        `'${ub.book_id}'`,
        `'${ub.status}'`,
        ub.current_page || 0,
        ub.rating || 'NULL',
        ub.notes ? `'${ub.notes.replace(/'/g, "''")}'` : 'NULL',
        ub.start_date ? `'${ub.start_date.toISOString().split('T')[0]}'` : 'NULL',
        ub.finish_date ? `'${ub.finish_date.toISOString().split('T')[0]}'` : 'NULL',
        `'${ub.createdAt.toISOString()}'`,
        `'${ub.updatedAt.toISOString()}'`
      ];
      
      insertStatements.push(`INSERT INTO user_books (id, user_id, book_id, status, current_page, rating, notes, start_date, finish_date, "createdAt", "updatedAt") VALUES (${values.join(', ')}) ON CONFLICT (id) DO NOTHING;`);
    }

    // Export user_preferences
    const userPrefs = await pool.query('SELECT * FROM user_preferences');
    console.log(`⚙️ Exporting ${userPrefs.rows.length} user preferences...`);
    
    for (const pref of userPrefs.rows) {
      const values = [
        `'${pref.id}'`,
        `'${pref.user_id}'`,
        pref.reading_goal || 30,
        pref.notifications !== false ? 'true' : 'false',
        `'${pref.privacy_level || 'public'}'`,
        `'${pref.theme || 'light'}'`,
        `'${pref.language || 'tr'}'`,
        `'${pref.createdAt.toISOString()}'`,
        `'${pref.updatedAt.toISOString()}'`
      ];
      
      insertStatements.push(`INSERT INTO user_preferences (id, user_id, reading_goal, notifications, privacy_level, theme, language, "createdAt", "updatedAt") VALUES (${values.join(', ')}) ON CONFLICT (user_id) DO NOTHING;`);
    }

    // Export wishlists
    const wishlists = await pool.query('SELECT * FROM wishlists ORDER BY "createdAt"');
    console.log(`⭐ Exporting ${wishlists.rows.length} wishlists...`);
    
    for (const wish of wishlists.rows) {
      const values = [
        `'${wish.id}'`,
        `'${wish.user_id}'`,
        `'${wish.book_id}'`,
        wish.priority || 1,
        wish.notes ? `'${wish.notes.replace(/'/g, "''")}'` : 'NULL',
        `'${wish.createdAt.toISOString()}'`
      ];
      
      insertStatements.push(`INSERT INTO wishlists (id, user_id, book_id, priority, notes, "createdAt") VALUES (${values.join(', ')}) ON CONFLICT (id) DO NOTHING;`);
    }

    // Write to file
    const sqlContent = insertStatements.join('\n');
    fs.writeFileSync('data-migration.sql', sqlContent);
    
    console.log('\n✅ Data export completed!');
    console.log(`📄 Generated: data-migration.sql (${insertStatements.length} statements)`);
    console.log('\n📊 Summary:');
    console.log(`- Users: ${users.rows.length}`);
    console.log(`- Books: ${books.rows.length}`);
    console.log(`- User Books: ${userBooks.rows.length}`);
    console.log(`- User Preferences: ${userPrefs.rows.length}`);
    console.log(`- Wishlists: ${wishlists.rows.length}`);

  } catch (error) {
    console.error('❌ Error exporting data:', error);
  } finally {
    await pool.end();
  }
}

exportData(); 