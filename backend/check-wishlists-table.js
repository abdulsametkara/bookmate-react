const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595'
});

async function checkWishlistsTable() {
  try {
    console.log('🔍 Wishlists tablosunu kontrol ediliyor...');
    
    // Check if wishlists table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'wishlists'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      console.log('✅ Wishlists tablosu mevcut');
      
      // Get table structure
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'wishlists'
        ORDER BY ordinal_position
      `);
      
      console.log('📋 Wishlists tablo yapısı:');
      columns.rows.forEach(col => {
        console.log(`- ${col.column_name} (${col.data_type})`);
      });
      
      // Count records
      const count = await pool.query('SELECT COUNT(*) FROM wishlists');
      console.log(`📊 Wishlists tablosunda ${count.rows[0].count} kayıt var`);
      
    } else {
      console.log('❌ Wishlists tablosu yok, oluşturuluyor...');
      
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
          CONSTRAINT fk_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
          CONSTRAINT unique_user_book UNIQUE(user_id, book_id)
        );
      `);
      
      console.log('✅ Wishlists tablosu oluşturuldu');
    }
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await pool.end();
  }
}

checkWishlistsTable(); 