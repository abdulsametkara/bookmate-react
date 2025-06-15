const { Pool } = require('pg');

async function initializeDatabase(dbPool = null) {
  // Use provided pool or create a new one
  const pool = dbPool || new Pool({
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
    console.log('🚀 Starting database initialization...');

    // 1. Create users table first
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        "displayName" VARCHAR(255) NOT NULL,
        username VARCHAR(100) UNIQUE,
        avatar_url TEXT,
        bio TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created');

    // 2. Create user preferences table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE NOT NULL,
        reading_goal INTEGER DEFAULT 30,
        notifications BOOLEAN DEFAULT true,
        privacy_level VARCHAR(50) DEFAULT 'public',
        theme VARCHAR(50) DEFAULT 'light',
        language VARCHAR(10) DEFAULT 'tr',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ User preferences table created');

    // 3. Create categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Categories table created');

    // 4. Create books table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS books (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(500) NOT NULL,
        author VARCHAR(500) NOT NULL,
        isbn VARCHAR(20) UNIQUE,
        publisher VARCHAR(255),
        "publishedYear" INTEGER,
        "pageCount" INTEGER DEFAULT 300,
        genre VARCHAR(255),
        description TEXT,
        cover_image_url TEXT,
        language VARCHAR(10) DEFAULT 'tr',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Books table created');

    // 5. Create user_books table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_books (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        book_id UUID NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'to_read',
        current_page INTEGER DEFAULT 0,
        rating INTEGER CHECK (rating >= 0 AND rating <= 5),
        notes TEXT,
        start_date DATE,
        finish_date DATE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        UNIQUE(user_id, book_id)
      )
    `);
    console.log('✅ User books table created');

    // 6. Create reading sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reading_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        book_id UUID NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        duration_minutes INTEGER,
        pages_read INTEGER DEFAULT 0,
        notes TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Reading sessions table created');

    // 7. Create wishlists table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wishlists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        book_id UUID NOT NULL,
        priority INTEGER DEFAULT 1,
        notes TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        UNIQUE(user_id, book_id)
      )
    `);
    console.log('✅ Wishlists table created');

    // 8. Create shared reading sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_reading_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        initiator_id UUID NOT NULL,
        partner_ids UUID[],
        reading_mode VARCHAR(50) NOT NULL DEFAULT 'same_book',
        book_id UUID,
        book_title VARCHAR(255),
        book_author VARCHAR(255),
        book_total_pages INTEGER DEFAULT 300,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (initiator_id) REFERENCES users(id)
      )
    `);
    console.log('✅ Shared reading sessions table created');

    // 9. Create shared session messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_session_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL,
        user_id UUID NOT NULL,
        content TEXT NOT NULL,
        message_type VARCHAR(50) DEFAULT 'text',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES shared_reading_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('✅ Shared session messages table created');

    // 10. Create shared session progress table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_session_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL,
        user_id UUID NOT NULL,
        book_id UUID,
        current_page INTEGER NOT NULL DEFAULT 0,
        total_pages INTEGER NOT NULL DEFAULT 300,
        progress_percentage DECIMAL(5,2) DEFAULT 0,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES shared_reading_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(session_id, user_id)
      )
    `);
    console.log('✅ Shared session progress table created');

    // Insert default categories
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
    console.log('✅ Default categories inserted');

    console.log('🎉 Database initialization completed successfully!');

  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    // Only close pool if we created it (not shared)
    if (!dbPool) {
      await pool.end();
    }
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('✅ Database ready for use!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Initialization failed:', error);
      process.exit(1);
    });
}

module.exports = initializeDatabase; 