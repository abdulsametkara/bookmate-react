const { Pool } = require('pg');
const http = require('http');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595',
  ssl: false,
});

async function testSimpleWishlist() {
  try {
    // 1. Veritabanından mevcut kitabı al
    const bookResult = await pool.query('SELECT id, title FROM books LIMIT 1');
    if (bookResult.rows.length === 0) {
      console.log('❌ Veritabanında kitap bulunamadı!');
      return;
    }
    
    const book = bookResult.rows[0];
    console.log('📚 Mevcut kitap:', book.title, 'ID:', book.id);

    // 2. test123 kullanıcısıyla login ol
    const loginData = JSON.stringify({
      email: 'test123@gmail.com',
      password: '123456'
    });

    const loginOptions = {
      hostname: '192.168.1.5',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };

    console.log('🔐 test123 ile giriş yapılıyor...');

    const loginPromise = new Promise((resolve, reject) => {
      const loginReq = http.request(loginOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            const loginResponse = JSON.parse(data);
            console.log('✅ Giriş başarılı!');
            resolve(loginResponse.token);
          } else {
            console.log('❌ Giriş başarısız:', data);
            reject(new Error('Login failed'));
          }
        });
      });

      loginReq.on('error', reject);
      loginReq.write(loginData);
      loginReq.end();
    });

    const token = await loginPromise;

    // 3. Kitabı wishlist'e ekle
    const wishlistData = JSON.stringify({
      book_id: book.id,
      priority: 1,
      notes: 'Test notu'
    });

    const wishlistOptions = {
      hostname: '192.168.1.5',
      port: 5000,
      path: '/api/user/wishlists',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(wishlistData)
      }
    };

    console.log('🎯 İstek listesine ekleniyor...');

    const wishlistPromise = new Promise((resolve, reject) => {
      const wishlistReq = http.request(wishlistOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        
        res.on('end', () => {
          console.log(`📡 Status: ${res.statusCode}`);
          console.log('📋 Response:', data);
          
          if (res.statusCode === 201) {
            console.log('✅ İstek listesine eklendi!');
            resolve();
          } else {
            console.log('❌ İstek listesine ekleme başarısız');
            reject(new Error('Wishlist add failed'));
          }
        });
      });

      wishlistReq.on('error', reject);
      wishlistReq.write(wishlistData);
      wishlistReq.end();
    });

    await wishlistPromise;

    // 4. Sonuçları kontrol et
    console.log('\n🔍 Veritabanı kontrol ediliyor...');
    const wishlistCheck = await pool.query('SELECT COUNT(*) as count FROM wishlists');
    console.log('🎯 Wishlist kayıt sayısı:', wishlistCheck.rows[0].count);

  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    pool.end();
  }
}

testSimpleWishlist(); 
 