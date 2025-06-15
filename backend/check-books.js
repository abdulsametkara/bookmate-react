const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595',
  ssl: false,
});

async function checkBooks() {
  try {
    console.log('📊 Checking books table...');
    const booksResult = await pool.query('SELECT id, title, author FROM books ORDER BY "createdAt" DESC LIMIT 5');
    console.log('Books table:', booksResult.rows);
    
    console.log('\n📊 Checking user_books table structure...');
    const userBooksColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_books' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    console.log('User_books columns:', userBooksColumns.rows);
    
    console.log('\n📊 Checking user_books table data...');
    const userBooksResult = await pool.query('SELECT * FROM user_books LIMIT 5');
    console.log('User_books table:', userBooksResult.rows);
    
    console.log('\n📊 Checking specific book ID...');
    const specificBookResult = await pool.query('SELECT * FROM books WHERE id = $1', ['90a04543-0c57-44c4-958f-410fd3939b0f']);
    console.log('Specific book in books table:', specificBookResult.rows);
    
    const specificUserBookResult = await pool.query('SELECT * FROM user_books WHERE id = $1', ['90a04543-0c57-44c4-958f-410fd3939b0f']);
    console.log('Specific book in user_books table:', specificUserBookResult.rows);
    
    if (specificUserBookResult.rows.length > 0) {
      console.log('\n📊 Checking table relationship...');
      const relationshipCheck = await pool.query(`
        SELECT ub.id as user_book_id, ub.book_id, b.id as books_table_id, b.title as books_table_title
        FROM user_books ub
        LEFT JOIN books b ON ub.book_id = b.id
        WHERE ub.id = $1
      `, ['90a04543-0c57-44c4-958f-410fd3939b0f']);
      console.log('Relationship check:', relationshipCheck.rows);
    }

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    pool.end();
  }
}

checkBooks(); 
 