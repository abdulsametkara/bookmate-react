const { Pool } = require('pg');

async function resetDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.DATABASE_URL ? undefined : (process.env.DB_HOST || 'localhost'),
    port: process.env.DATABASE_URL ? undefined : (process.env.DB_PORT || 5432),
    database: process.env.DATABASE_URL ? undefined : (process.env.DB_NAME || 'bookmate_db'),
    user: process.env.DATABASE_URL ? undefined : (process.env.DB_USER || 'postgres'),
    password: process.env.DATABASE_URL ? undefined : (process.env.DB_PASSWORD || '246595'),
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('🗑️ Starting database reset...');

    // Delete data in correct order to respect foreign key constraints
    console.log('🧹 Clearing all table data in correct order...');
    
    // Delete dependent tables first (those with foreign keys)
    const deleteQueries = [
      'DELETE FROM shared_session_progress',
      'DELETE FROM shared_session_messages', 
      'DELETE FROM shared_reading_sessions',
      'DELETE FROM user_relationships',
      'DELETE FROM reading_sessions',
      'DELETE FROM user_books',
      'DELETE FROM wishlists',
      'DELETE FROM books',
      'DELETE FROM user_preferences',
      'DELETE FROM users'
      // Don't delete categories and relationship_types - we'll keep them
    ];

    for (const query of deleteQueries) {
      try {
        const result = await pool.query(query);
        const tableName = query.split(' FROM ')[1];
        console.log(`✅ Cleared table: ${tableName} (${result.rowCount} rows deleted)`);
      } catch (error) {
        const tableName = query.split(' FROM ')[1];
        console.log(`⚠️ Table ${tableName} might not exist or already empty:`, error.message);
      }
    }

    // Reset auto-increment sequences for tables that use SERIAL
    console.log('🔄 Resetting ID sequences...');
    const sequenceResets = [
      'ALTER SEQUENCE users_id_seq RESTART WITH 1',
      'ALTER SEQUENCE books_id_seq RESTART WITH 1',
      'ALTER SEQUENCE reading_sessions_id_seq RESTART WITH 1',
      'ALTER SEQUENCE categories_id_seq RESTART WITH 1',
      'ALTER SEQUENCE shared_reading_sessions_id_seq RESTART WITH 1'
    ];

    for (const query of sequenceResets) {
      try {
        await pool.query(query);
        console.log(`✅ Reset sequence: ${query.split(' ')[2]}`);
      } catch (error) {
        console.log(`⚠️ Sequence might not exist: ${error.message}`);
      }
    }

    // Ensure essential data exists (categories and relationship types)
    console.log('📝 Ensuring essential data exists...');

    // Kategorileri yeniden ekle (sadece yoksa)
    await pool.query(`
      INSERT INTO categories (name, description) VALUES
      ('Roman', 'Kurgu edebiyat eserleri'),
      ('Bilim Kurgu', 'Bilim kurgu ve fantastik eserler'),
      ('Tarih', 'Tarihsel eserler ve biyografiler'),
      ('Kişisel Gelişim', 'Kişisel gelişim ve yaşam koçluğu'),
      ('Felsefe', 'Felsefi düşünce ve teoriler'),
      ('Bilim', 'Bilimsel araştırma ve popüler bilim'),
      ('Sanat', 'Sanat ve estetik üzerine eserler'),
      ('Türk Edebiyatı', 'Türk yazarların eserleri')
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('✅ Categories ensured');

    // Relationship types'ları yeniden ekle (sadece yoksa)
    await pool.query(`
      INSERT INTO relationship_types (name, icon, color_code, description) VALUES
      ('okuma_arkadasi', '📚', '#4CAF50', 'Okuma arkadaşı'),
      ('aile_uyesi', '👨‍👩‍👧‍👦', '#FF9800', 'Aile üyesi'),
      ('okul_arkadasi', '🎓', '#2196F3', 'Okul/Üniversite arkadaşı'),
      ('sevgili', '💕', '#E91E63', 'Sevgili/Eş')
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('✅ Relationship types ensured');

    console.log('🎉 Database reset completed successfully!');
    console.log('🔄 All user data, books, and sessions have been cleared');
    console.log('✨ Ready for fresh start!');

  } catch (error) {
    console.error('❌ Database reset error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  resetDatabase()
    .then(() => {
      console.log('✅ Database reset completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database reset failed:', error);
      process.exit(1);
    });
}

module.exports = resetDatabase; 