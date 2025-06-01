const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595'
});

async function fixBooksColumns() {
  try {
    console.log('🔍 Checking books table columns...');
    
    // Get current columns in books table
    const currentColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'books'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Current books table columns:');
    currentColumns.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
    
    // Check for required columns and add if missing
    const requiredColumns = [
      { name: 'publisher', type: 'TEXT' },
      { name: 'page_count', type: 'INTEGER' },
      { name: 'genre', type: 'VARCHAR(100)' },
      { name: 'language', type: 'VARCHAR(10)' },
      { name: 'description', type: 'TEXT' },
      { name: 'cover_image_url', type: 'TEXT' }
    ];
    
    const existingColumnNames = currentColumns.rows.map(col => col.column_name);
    
    for (const column of requiredColumns) {
      if (!existingColumnNames.includes(column.name)) {
        console.log(`➕ Adding missing column: ${column.name} (${column.type})`);
        await pool.query(`
          ALTER TABLE books 
          ADD COLUMN ${column.name} ${column.type}
        `);
        console.log(`✅ Added ${column.name} column`);
      } else {
        console.log(`✅ Column ${column.name} already exists`);
      }
    }
    
    // Check if pageCount exists but page_count doesn't
    if (existingColumnNames.includes('pageCount') && !existingColumnNames.includes('page_count')) {
      console.log('🔄 Found pageCount column, creating page_count alias...');
      await pool.query(`
        ALTER TABLE books 
        ADD COLUMN page_count INTEGER
      `);
      
      // Copy data from pageCount to page_count
      await pool.query(`
        UPDATE books 
        SET page_count = "pageCount" 
        WHERE "pageCount" IS NOT NULL
      `);
      
      console.log('✅ Created page_count column and copied data from pageCount');
    }
    
    // Display updated table structure
    const updatedColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'books'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Updated books table columns:');
    updatedColumns.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
    
    // Show sample books
    const sampleBooks = await pool.query(`
      SELECT id, title, author, publisher, page_count, cover_image_url 
      FROM books 
      LIMIT 3
    `);
    
    console.log('\n📚 Sample books:');
    sampleBooks.rows.forEach(book => {
      console.log(`- ${book.title} by ${book.author} (Publisher: ${book.publisher || 'N/A'}, Pages: ${book.page_count || 'N/A'})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixBooksColumns(); 