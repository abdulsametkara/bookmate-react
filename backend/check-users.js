const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595'
});

async function checkUsers() {
  try {
    const result = await pool.query('SELECT id, email, "displayName", "createdAt" FROM users ORDER BY "createdAt" DESC LIMIT 10');
    
    console.log('📋 Kayıtlı kullanıcılar:');
    if (result.rows.length === 0) {
      console.log('❌ Hiç kullanıcı bulunamadı');
    } else {
      result.rows.forEach(user => {
        console.log(`- ${user.email} (${user.displayName}) - ${user.createdAt}`);
      });
    }
    
    console.log(`\n📊 Toplam ${result.rows.length} kullanıcı`);
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers(); 
 