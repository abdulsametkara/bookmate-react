const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595',
  ssl: false,
  connectionTimeoutMillis: 5000,
});

async function fixBookPages() {
  console.log('🔧 Fixing book pages and user_books table...');
  
  try {
    // Test database connection
    await pool.connect();
    console.log('✅ Database connected successfully');
    
    // 1. user_books tablosuna current_page kolonu ekle (eğer yoksa)
    console.log('📚 Adding current_page column to user_books...');
    await pool.query(`
      ALTER TABLE user_books 
      ADD COLUMN IF NOT EXISTS current_page INTEGER DEFAULT 0
    `);
    console.log('✅ current_page column added to user_books');
    
    // 2. books tablosundaki pageCount alanını kontrol et ve düzelt
    console.log('📖 Checking pageCount in books table...');
    const booksWithoutPageCount = await pool.query(`
      SELECT id, title, "pageCount" 
      FROM books 
      WHERE "pageCount" IS NULL OR "pageCount" = 0
    `);
    
    console.log(`📊 Found ${booksWithoutPageCount.rows.length} books without page count`);
    
    // 3. Sayfa sayısı olmayan kitaplar için varsayılan değer set et
    for (const book of booksWithoutPageCount.rows) {
      let defaultPageCount = 300; // Varsayılan sayfa sayısı
      
      // Kitap başlığına göre tahmin et
      if (book.title.toLowerCase().includes('harry potter')) {
        defaultPageCount = 400;
      } else if (book.title.toLowerCase().includes('lord of the rings') || 
                 book.title.toLowerCase().includes('hobbit')) {
        defaultPageCount = 500;
      } else if (book.title.toLowerCase().includes('short') || 
                 book.title.toLowerCase().includes('kısa')) {
        defaultPageCount = 150;
      }
      
      await pool.query(`
        UPDATE books 
        SET "pageCount" = $1 
        WHERE id = $2
      `, [defaultPageCount, book.id]);
      
      console.log(`📝 Updated ${book.title}: ${defaultPageCount} pages`);
    }
    
    // 4. user_books tablosundaki total_pages alanını kontrol et
    console.log('📚 Checking user_books current_page values...');
    
    // current_page değeri pageCount'tan büyük olan kayıtları düzelt
    const result = await pool.query(`
      UPDATE user_books 
      SET current_page = LEAST(current_page, (
        SELECT COALESCE("pageCount", 300) 
        FROM books 
        WHERE books.id = user_books.book_id
      ))
      WHERE current_page > (
        SELECT COALESCE("pageCount", 300) 
        FROM books 
        WHERE books.id = user_books.book_id
      )
      RETURNING *
    `);
    
    if (result.rows.length > 0) {
      console.log(`📊 Fixed ${result.rows.length} user book current_page values`);
    }
    
    // 5. İstatistikleri göster
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_books,
        AVG("pageCount") as avg_pages,
        MIN("pageCount") as min_pages,
        MAX("pageCount") as max_pages
      FROM books
    `);
    
    console.log('\n📊 Books statistics:');
    console.log(`  Total books: ${stats.rows[0].total_books}`);
    console.log(`  Average pages: ${Math.round(stats.rows[0].avg_pages)}`);
    console.log(`  Min pages: ${stats.rows[0].min_pages}`);
    console.log(`  Max pages: ${stats.rows[0].max_pages}`);
    
    const userBooksStats = await pool.query(`
      SELECT 
        COUNT(*) as total_user_books,
        COUNT(CASE WHEN current_page > 0 THEN 1 END) as books_with_progress,
        AVG(current_page) as avg_current_page
      FROM user_books
    `);
    
    console.log('\n📚 User books statistics:');
    console.log(`  Total user books: ${userBooksStats.rows[0].total_user_books}`);
    console.log(`  Books with progress: ${userBooksStats.rows[0].books_with_progress}`);
    console.log(`  Average current page: ${Math.round(userBooksStats.rows[0].avg_current_page || 0)}`);
    
    console.log('\n✅ Book pages fix completed!');
    
  } catch (error) {
    console.error('❌ Fix error:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('📦 Database connection closed');
  }
}

// Script çalıştırılırsa
if (require.main === module) {
  fixBookPages();
}

module.exports = { fixBookPages }; 