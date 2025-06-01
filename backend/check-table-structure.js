const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595'
});

async function checkAndFixTableStructure() {
  try {
    console.log('🔍 Checking database table structures...');
    
    // 1. Check if wishlists table exists
    const checkWishlistsTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'wishlists'
      );
    `);
    
    if (!checkWishlistsTable.rows[0].exists) {
      console.log('❌ Wishlists table does not exist, creating...');
      await pool.query(`
        CREATE TABLE wishlists (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          book_id UUID NOT NULL,
          priority INTEGER DEFAULT 3,
          notes TEXT,
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
        );
      `);
      console.log('✅ Wishlists table created successfully');
    } else {
      console.log('✅ Wishlists table exists');
    }
    
    // 2. Check if cover_image_url column exists in books table
    const checkCoverColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'books' AND column_name = 'cover_image_url'
    `);
    
    if (checkCoverColumn.rows.length === 0) {
      console.log('❌ cover_image_url column missing in books table, adding...');
      await pool.query(`
        ALTER TABLE books 
        ADD COLUMN cover_image_url TEXT;
      `);
      
      // Update existing books with placeholder images
      await pool.query(`
        UPDATE books 
        SET cover_image_url = 'https://via.placeholder.com/150x200?text=' || title
        WHERE cover_image_url IS NULL;
      `);
      
      console.log('✅ Added cover_image_url column to books table');
    } else {
      console.log('✅ cover_image_url column exists in books table');
    }
    
    // 3. Check user_books table structure
    const checkUserBooksTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_books'
      );
    `);
    
    if (!checkUserBooksTable.rows[0].exists) {
      console.log('❌ user_books table does not exist, creating...');
      await pool.query(`
        CREATE TABLE user_books (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          book_id UUID NOT NULL,
          status VARCHAR(20) DEFAULT 'to_read',
          current_page INTEGER DEFAULT 0,
          favorite BOOLEAN DEFAULT false,
          rating INTEGER,
          review TEXT,
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
        );
      `);
      console.log('✅ user_books table created successfully');
    } else {
      console.log('✅ user_books table exists');
    }
    
    console.log('\n📊 Database structure check completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAndFixTableStructure(); 