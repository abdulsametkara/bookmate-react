const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595'
});

async function addCurrentPageToUserBooks() {
  try {
    console.log('🔍 Checking user_books table structure...');
    
    // Check if current_page column exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_books' AND column_name = 'current_page'
    `);
    
    if (checkColumn.rows.length === 0) {
      console.log('➕ Adding current_page column to user_books table...');
      
      await pool.query(`
        ALTER TABLE user_books 
        ADD COLUMN current_page INTEGER DEFAULT 0
      `);
      
      console.log('✅ current_page column added successfully');
    } else {
      console.log('✅ current_page column already exists');
    }
    
    // Show updated table structure
    const columns = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_books'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 user_books table structure:');
    columns.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type}) ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });
    
    // Show sample data
    const sampleData = await pool.query(`
      SELECT ub.id, ub.current_page, ub.status, b.title 
      FROM user_books ub 
      JOIN books b ON ub.book_id = b.id 
      LIMIT 5
    `);
    
    console.log('\n📚 Sample user_books data:');
    sampleData.rows.forEach(row => {
      console.log(`- ${row.title}: current_page=${row.current_page}, status=${row.status}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addCurrentPageToUserBooks(); 