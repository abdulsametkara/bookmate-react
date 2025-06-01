const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595'
});

async function fixBooksTable() {
  try {
    console.log('🔧 Checking books table structure...');
    
    // Check if cover_image_url column exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'books' AND column_name = 'cover_image_url'
    `);
    
    if (checkResult.rows.length === 0) {
      console.log('❌ Missing column: cover_image_url column does not exist in books table');
      console.log('➕ Adding cover_image_url column to books table...');
      
      await pool.query(`
        ALTER TABLE books 
        ADD COLUMN cover_image_url TEXT
      `);
      
      console.log('✅ cover_image_url column added successfully');
      
      // Update existing books with placeholder image URLs
      console.log('🖼️ Updating existing books with placeholder image URLs...');
      await pool.query(`
        UPDATE books 
        SET cover_image_url = 'https://via.placeholder.com/150x200?text=' || title
        WHERE cover_image_url IS NULL
      `);
      
      console.log('✅ Existing books updated with placeholder images');
    } else {
      console.log('✅ cover_image_url column already exists in books table');
    }
    
    // Display some sample books with their cover URLs
    const sampleBooks = await pool.query(`
      SELECT id, title, author, cover_image_url 
      FROM books 
      LIMIT 5
    `);
    
    console.log('\n📚 Sample books in database:');
    sampleBooks.rows.forEach(book => {
      console.log(`- ${book.title} by ${book.author} (Cover: ${book.cover_image_url || 'None'})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixBooksTable(); 