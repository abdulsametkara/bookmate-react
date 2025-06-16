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
        is_favorite BOOLEAN DEFAULT FALSE,
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

    // 11. Create relationship_types table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS relationship_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) UNIQUE NOT NULL,
        icon VARCHAR(50),
        color_code VARCHAR(7),
        description TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Relationship types table created');

    // 12. Create user_relationships table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_relationships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        requester_id UUID NOT NULL,
        addressee_id UUID NOT NULL,
        relationship_type_id UUID REFERENCES relationship_types(id),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
        request_message TEXT,
        responded_at TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(requester_id, addressee_id)
      )
    `);
    console.log('✅ User relationships table created');

    // Insert default relationship types
    await pool.query(`
      INSERT INTO relationship_types (name, icon, color_code, description) VALUES
      ('okuma_arkadasi', '📚', '#4CAF50', 'Okuma arkadaşı'),
      ('aile_uyesi', '👨‍👩‍👧‍👦', '#FF9800', 'Aile üyesi'),
      ('okul_arkadasi', '🎓', '#2196F3', 'Okul/Üniversite arkadaşı'),
      ('sevgili', '💕', '#E91E63', 'Sevgili/Eş')
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('✅ Default relationship types inserted');

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

    // Insert default badges
    await pool.query(`
      INSERT INTO badges (name, description, icon, criteria, points, rarity) VALUES
      ('İlk Kitap', 'İlk kitabınızı bitirdiniz!', '📖', '{"type": "books_finished", "value": 1}', 50, 'common'),
      ('Kitap Kurdu', '10 kitap bitirdiniz!', '🐛', '{"type": "books_finished", "value": 10}', 500, 'rare'),
      ('Okuma Maratonu', '30 gün ardı ardına okuma', '🏃‍♂️', '{"type": "reading_streak", "value": 30}', 1000, 'epic'),
      ('İlk İnceleme', 'İlk kitap incelemenizi yazdınız', '✍️', '{"type": "reviews_written", "value": 1}', 25, 'common'),
      ('Sosyal Okuyucu', 'İlk okuma arkadaşınızı eklediniz', '👥', '{"type": "friends_added", "value": 1}', 100, 'uncommon'),
      ('Hızlı Okuyucu', 'Bir günde 100 sayfa okudunuz', '⚡', '{"type": "pages_per_day", "value": 100}', 200, 'uncommon'),
      ('Gece Kuşu', 'Gece 00:00-06:00 arası okuma', '🦉', '{"type": "night_reading", "value": 1}', 75, 'common'),
      ('Erken Kuş', 'Sabah 05:00-08:00 arası okuma', '🐦', '{"type": "morning_reading", "value": 1}', 75, 'common')
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('✅ Default badges inserted');

    // Insert default reading challenges
    await pool.query(`
      INSERT INTO reading_challenges (title, description, challenge_type, target_value, start_date, end_date, is_public) VALUES
      ('2025 Okuma Hedefi', '2025 yılında 25 kitap okuma hedefi', 'books_per_year', 25, '2025-01-01', '2025-12-31', true),
      ('Haftalık Sayfa Hedefi', 'Haftada 200 sayfa okuma', 'pages_per_week', 200, '2025-01-01', '2025-12-31', true),
      ('Türk Edebiyatı Keşfi', '5 Türk edebiyatı eseri okuma', 'category_specific', 5, '2025-01-01', '2025-06-30', true),
      ('Klasik Eserler', '10 klasik eser okuma', 'classic_books', 10, '2025-01-01', '2025-12-31', true)
      ON CONFLICT (title) DO NOTHING
    `);
    console.log('✅ Default challenges inserted');

    // Migrate existing data from local database
    console.log('🔄 Migrating existing data...');
    
    // Read and execute migration SQL
    const fs = require('fs');
    const path = require('path');
    const migrationPath = path.join(__dirname, 'data-migration.sql');
    
    if (fs.existsSync(migrationPath)) {
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      const statements = migrationSQL.split('\n').filter(line => line.trim() && !line.startsWith('--'));
      
      console.log(`📊 Executing ${statements.length} migration statements...`);
      
      for (const statement of statements) {
        try {
          await pool.query(statement);
        } catch (error) {
          // Ignore conflicts and constraint errors - data might already exist
          if (!error.code || !['23505', '23503'].includes(error.code)) {
            console.warn('⚠️ Migration statement failed:', statement.substring(0, 100) + '...');
          }
        }
      }
      
      console.log('✅ Data migration completed');
    } else {
      console.log('ℹ️ No migration file found, skipping data migration');
    }

    // 13. Create badges table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS badges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        icon VARCHAR(255),
        criteria JSONB,
        points INTEGER DEFAULT 0,
        rarity VARCHAR(50) DEFAULT 'common',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Badges table created');

    // 14. Create user_badges table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        badge_id UUID NOT NULL,
        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        progress JSONB,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
        UNIQUE(user_id, badge_id)
      )
    `);
    console.log('✅ User badges table created');

    // 15. Create notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        type VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        data JSONB,
        is_read BOOLEAN DEFAULT FALSE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Notifications table created');

    // 16. Create book_reviews table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS book_reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        book_id UUID NOT NULL,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        review_text TEXT,
        is_spoiler BOOLEAN DEFAULT FALSE,
        likes_count INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        UNIQUE(user_id, book_id)
      )
    `);
    console.log('✅ Book reviews table created');

    // 17. Create book_categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS book_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        book_id UUID NOT NULL,
        category_id UUID NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
        UNIQUE(book_id, category_id)
      )
    `);
    console.log('✅ Book categories table created');

    // 18. Create reading_challenges table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reading_challenges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        challenge_type VARCHAR(100) NOT NULL,
        target_value INTEGER NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        created_by UUID,
        is_public BOOLEAN DEFAULT TRUE,
        badge_id UUID,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (badge_id) REFERENCES badges(id)
      )
    `);
    console.log('✅ Reading challenges table created');

    // 19. Create challenge_participations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS challenge_participations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        challenge_id UUID NOT NULL,
        current_progress INTEGER DEFAULT 0,
        is_completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (challenge_id) REFERENCES reading_challenges(id) ON DELETE CASCADE,
        UNIQUE(user_id, challenge_id)
      )
    `);
    console.log('✅ Challenge participations table created');

    // 20. Create reading_goals table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reading_goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        year INTEGER NOT NULL,
        target_books INTEGER NOT NULL,
        current_books INTEGER DEFAULT 0,
        target_pages INTEGER,
        current_pages INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, year)
      )
    `);
    console.log('✅ Reading goals table created');

    // 21. Create reading_statistics table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reading_statistics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        date DATE NOT NULL,
        pages_read INTEGER DEFAULT 0,
        books_finished INTEGER DEFAULT 0,
        reading_time_minutes INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, date)
      )
    `);
    console.log('✅ Reading statistics table created');

    // 22. Create reading_stats table (summary stats)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reading_stats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        total_books_read INTEGER DEFAULT 0,
        total_pages_read INTEGER DEFAULT 0,
        total_reading_time_minutes INTEGER DEFAULT 0,
        favorite_genre VARCHAR(255),
        average_rating DECIMAL(3,2),
        current_streak_days INTEGER DEFAULT 0,
        longest_streak_days INTEGER DEFAULT 0,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id)
      )
    `);
    console.log('✅ Reading stats table created');

    // 23. Create notes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        book_id UUID,
        title VARCHAR(255),
        content TEXT NOT NULL,
        page_number INTEGER,
        is_quote BOOLEAN DEFAULT FALSE,
        is_private BOOLEAN DEFAULT FALSE,
        tags TEXT[],
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Notes table created');

    // 24. Create shared_libraries table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_libraries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id UUID NOT NULL,
        is_public BOOLEAN DEFAULT FALSE,
        member_limit INTEGER DEFAULT 50,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Shared libraries table created');

    // 25. Create shared_library_members table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_library_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        library_id UUID NOT NULL,
        user_id UUID NOT NULL,
        role VARCHAR(50) DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (library_id) REFERENCES shared_libraries(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(library_id, user_id)
      )
    `);
    console.log('✅ Shared library members table created');

    // 26. Create shared_library_books table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_library_books (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        library_id UUID NOT NULL,
        book_id UUID NOT NULL,
        added_by UUID NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (library_id) REFERENCES shared_libraries(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        FOREIGN KEY (added_by) REFERENCES users(id),
        UNIQUE(library_id, book_id)
      )
    `);
    console.log('✅ Shared library books table created');

    // 27. Create shared_library_notes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_library_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        library_id UUID NOT NULL,
        user_id UUID NOT NULL,
        book_id UUID,
        content TEXT NOT NULL,
        is_public BOOLEAN DEFAULT TRUE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (library_id) REFERENCES shared_libraries(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Shared library notes table created');

    // 28. Create shared_reading_groups table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_reading_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id UUID NOT NULL,
        is_private BOOLEAN DEFAULT FALSE,
        member_limit INTEGER DEFAULT 20,
        current_book_id UUID,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (current_book_id) REFERENCES books(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Shared reading groups table created');

    // 29. Create shared_reading_memberships table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_reading_memberships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL,
        user_id UUID NOT NULL,
        role VARCHAR(50) DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES shared_reading_groups(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(group_id, user_id)
      )
    `);
    console.log('✅ Shared reading memberships table created');

    // 30. Create shared_reading_messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_reading_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL,
        user_id UUID NOT NULL,
        content TEXT NOT NULL,
        message_type VARCHAR(50) DEFAULT 'text',
        reply_to_id UUID,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES shared_reading_groups(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reply_to_id) REFERENCES shared_reading_messages(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Shared reading messages table created');

    // 31. Create shared_reading_progress table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_reading_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL,
        user_id UUID NOT NULL,
        book_id UUID NOT NULL,
        current_page INTEGER DEFAULT 0,
        total_pages INTEGER DEFAULT 300,
        progress_percentage DECIMAL(5,2) DEFAULT 0,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES shared_reading_groups(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        UNIQUE(group_id, user_id, book_id)
      )
    `);
    console.log('✅ Shared reading progress table created');

    // 32. Create books_backup table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS books_backup (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        original_book_id UUID,
        title VARCHAR(500) NOT NULL,
        author VARCHAR(500) NOT NULL,
        isbn VARCHAR(20),
        publisher VARCHAR(255),
        published_year INTEGER,
        page_count INTEGER,
        genre VARCHAR(255),
        description TEXT,
        cover_image_url TEXT,
        backup_reason VARCHAR(255),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Books backup table created');

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