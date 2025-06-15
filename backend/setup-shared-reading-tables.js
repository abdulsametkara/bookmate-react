import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'bookmate',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function setupSharedLibraryTables() {
  try {
    console.log('🚀 Setting up shared library tables...');

    // Ortak kütüphaneler tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_libraries (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ shared_libraries table created');

    // Ortak kütüphane üyeleri tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_library_members (
        id SERIAL PRIMARY KEY,
        library_id INTEGER REFERENCES shared_libraries(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member', -- admin, member
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(library_id, user_id)
      )
    `);
    console.log('✅ shared_library_members table created');

    // Ortak kütüphane kitapları tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_library_books (
        id SERIAL PRIMARY KEY,
        library_id INTEGER REFERENCES shared_libraries(id) ON DELETE CASCADE,
        book_id UUID REFERENCES books(id) ON DELETE CASCADE,
        added_by UUID REFERENCES users(id) ON DELETE CASCADE,
        notes TEXT,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(library_id, book_id)
      )
    `);
    console.log('✅ shared_library_books table created');

    // Ortak kütüphane kitap notları tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_library_notes (
        id SERIAL PRIMARY KEY,
        library_id INTEGER REFERENCES shared_libraries(id) ON DELETE CASCADE,
        book_id UUID REFERENCES books(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        page_number INTEGER,
        note_type VARCHAR(50) DEFAULT 'general', -- general, highlight, question, idea
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ shared_library_notes table created');

    console.log('🎉 All shared library tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up shared library tables:', error);
  } finally {
    await pool.end();
  }
}

setupSharedLibraryTables(); 