const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595'
});

async function testTest123() {
  try {
    const email = 'test123@gmail.com';
    
    // Kullanıcıyı veritabanından al
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      console.log('❌ test123@gmail.com kullanıcısı bulunamadı');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('👤 test123@gmail.com bilgileri:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Display Name: ${user.displayName}`);
    console.log(`   Kayıt Tarihi: ${user.createdAt}`);
    
    // Test şifreleri
    const testPasswords = ['123456', 'password', 'test123', 'admin', 'test', '246595', 'qwerty'];
    
    console.log('\n🔐 test123@gmail.com için şifre testleri:');
    for (const testPassword of testPasswords) {
      const isValid = await bcrypt.compare(testPassword, user.password);
      console.log(`   "${testPassword}" -> ${isValid ? '✅ DOĞRU' : '❌ YANLIŞ'}`);
    }
    
    console.log('\n💡 Hangi şifreyi kullandığınızı hatırlıyor musunuz?');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await pool.end();
  }
}

testTest123(); 