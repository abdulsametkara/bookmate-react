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

    // 1. Önce foreign key constraint'lerini göz ardı etmek için
    await pool.query('SET session_replication_role = replica;');
    
    // 2. Tüm tabloları temizle (veriler silinir, yapı korunur)
    const tables = [
      'shared_session_progress',
      'shared_session_messages', 
      'shared_reading_sessions',
      'user_relationships',
      'reading_sessions',
      'user_books',
      'wishlists',
      'books',
      'user_preferences',
      'users',
      'categories',
      'relationship_types'
    ];

    console.log('🧹 Clearing all table data...');
    
    for (const table of tables) {
      try {
        await pool.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
        console.log(`✅ Cleared table: ${table}`);
      } catch (error) {
        console.log(`⚠️ Table ${table} might not exist or already empty`);
      }
    }

    // 3. Foreign key constraint'lerini geri aç
    await pool.query('SET session_replication_role = DEFAULT;');

    // 4. Temel verileri yeniden ekle (kategoriler ve relationship types)
    console.log('📝 Recreating essential data...');

    // Kategorileri yeniden ekle
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
    console.log('✅ Categories recreated');

    // Relationship types'ları yeniden ekle
    await pool.query(`
      INSERT INTO relationship_types (name, icon, color_code, description) VALUES
      ('okuma_arkadasi', '📚', '#4CAF50', 'Okuma arkadaşı'),
      ('aile_uyesi', '👨‍👩‍👧‍👦', '#FF9800', 'Aile üyesi'),
      ('okul_arkadasi', '🎓', '#2196F3', 'Okul/Üniversite arkadaşı'),
      ('sevgili', '💕', '#E91E63', 'Sevgili/Eş')
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('✅ Relationship types recreated');

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