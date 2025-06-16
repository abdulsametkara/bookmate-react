const { Pool } = require('pg');

async function migrateDatabase() {
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
    console.log('🚀 Starting database migration...');

    // Migration 1: Add is_favorite column to user_books table if it doesn't exist
    console.log('📝 Checking for is_favorite column in user_books table...');
    
    const columnExists = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_books' 
      AND column_name = 'is_favorite'
    `);

    if (columnExists.rows.length === 0) {
      console.log('➕ Adding is_favorite column to user_books table...');
      await pool.query(`
        ALTER TABLE user_books 
        ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE
      `);
      console.log('✅ is_favorite column added successfully');
    } else {
      console.log('✅ is_favorite column already exists');
    }

    // Migration 2: Create relationship_types table if it doesn't exist
    console.log('📝 Checking for relationship_types table...');
    
    const relationshipTypesExists = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'relationship_types'
    `);

    if (relationshipTypesExists.rows.length === 0) {
      console.log('➕ Creating relationship_types table...');
      await pool.query(`
        CREATE TABLE relationship_types (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(50) UNIQUE NOT NULL,
          icon VARCHAR(50),
          color_code VARCHAR(7),
          description TEXT,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ relationship_types table created');

      // Insert default relationship types
      await pool.query(`
        INSERT INTO relationship_types (name, icon, color_code, description) VALUES
        ('okuma_arkadasi', '📚', '#4CAF50', 'Okuma arkadaşı'),
        ('aile_uyesi', '👨‍👩‍👧‍👦', '#FF9800', 'Aile üyesi'),
        ('okul_arkadasi', '🎓', '#2196F3', 'Okul/Üniversite arkadaşı'),
        ('sevgili', '💕', '#E91E63', 'Sevgili/Eş')
      `);
      console.log('✅ Default relationship types inserted');
    } else {
      console.log('✅ relationship_types table already exists');
    }

    // Migration 3: Create user_relationships table if it doesn't exist
    console.log('📝 Checking for user_relationships table...');
    
    const userRelationshipsExists = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'user_relationships'
    `);

    if (userRelationshipsExists.rows.length === 0) {
      console.log('➕ Creating user_relationships table...');
      await pool.query(`
        CREATE TABLE user_relationships (
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
      console.log('✅ user_relationships table created');
    } else {
      console.log('✅ user_relationships table already exists');
      
      // Check if relationship_type_id column exists in user_relationships
      console.log('📝 Checking for relationship_type_id column in user_relationships table...');
      const relationshipTypeIdExists = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'user_relationships' 
        AND column_name = 'relationship_type_id'
      `);

      if (relationshipTypeIdExists.rows.length === 0) {
        console.log('➕ Adding relationship_type_id column to user_relationships table...');
        await pool.query(`
          ALTER TABLE user_relationships 
          ADD COLUMN relationship_type_id UUID REFERENCES relationship_types(id)
        `);
        console.log('✅ relationship_type_id column added to user_relationships');
      } else {
        console.log('✅ relationship_type_id column already exists in user_relationships');
      }
    }

    console.log('🎉 Database migration completed successfully!');

  } catch (error) {
    console.error('❌ Database migration error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  migrateDatabase()
    .then(() => {
      console.log('✅ Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateDatabase; 