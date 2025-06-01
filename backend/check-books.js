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
    console.log('📚 books tablosundaki kitaplar:\n');

    const result = await pool.query('SELECT id, title, author, isbn, publisher FROM books ORDER BY "createdAt" DESC');
    
    console.log(`Toplam kitap sayısı: ${result.rows.length}\n`);
    
    result.rows.forEach((book, index) => {
      console.log(`${index + 1}. ${book.title}`);
      console.log(`   Yazar: ${book.author || 'Belirtilmemiş'}`);
      console.log(`   ISBN: ${book.isbn || 'Yok'}`);
      console.log(`   Yayınevi: ${book.publisher || 'Belirtilmemiş'}`);
      console.log(`   ID: ${book.id}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    pool.end();
  }
}

checkBooks(); 
 