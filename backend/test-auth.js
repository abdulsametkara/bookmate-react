const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595'
});

async function testAuth() {
  try {
    const email = 'samet@gmail.com';
    
    // Kullanıcıyı veritabanından al
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Kullanıcı bulunamadı');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('👤 Kullanıcı bilgileri:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Display Name: ${user.displayName}`);
    console.log(`   Şifreli Password: ${user.password.substring(0, 20)}...`);
    console.log(`   Kayıt Tarihi: ${user.createdAt}`);
    
    // Test şifreleri
    const testPasswords = ['123456', 'password', 'samet123', 'admin', 'test123', '246595'];
    
    console.log('\n🔐 Şifre testleri:');
    for (const testPassword of testPasswords) {
      const isValid = await bcrypt.compare(testPassword, user.password);
      console.log(`   "${testPassword}" -> ${isValid ? '✅ DOĞRU' : '❌ YANLIŞ'}`);
    }
    
    console.log('\n💡 Hangi şifreyi kullandığınızı hatırlıyor musunuz? Yukarıdaki listeden biriyse görünecek.');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await pool.end();
  }
}

testAuth(); 