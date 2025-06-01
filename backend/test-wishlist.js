const http = require('http');

// Test1 kullanıcısı için token alalım (önce login)
async function loginAndTestWishlist() {
  // 1. Login ol ve token al
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

  console.log('🔐 test1 kullanıcısı ile giriş yapılıyor...');

  return new Promise((resolve, reject) => {
    const loginReq = http.request(loginOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', async () => {
        if (res.statusCode === 200) {
          const loginResponse = JSON.parse(data);
          console.log('✅ Giriş başarılı!');
          console.log('Token:', loginResponse.token.substring(0, 20) + '...');
          
          // 2. Kitap ekle
          await addBookAndTestWishlist(loginResponse.token);
          resolve();
        } else {
          console.log('❌ Giriş başarısız:', data);
          reject(new Error('Login failed'));
        }
      });
    });

    loginReq.on('error', (e) => {
      console.error('🚨 Login error:', e.message);
      reject(e);
    });

    loginReq.write(loginData);
    loginReq.end();
  });
}

async function addBookAndTestWishlist(token) {
  // 1. Önce kitap ekle
  const bookData = JSON.stringify({
    title: 'Test Kitabı',
    author: 'Test Yazar',
    isbn: '1234567890',
    publisher: 'Test Yayınevi',
    published_year: 2024,
    page_count: 200,
    genre: 'Test',
    description: 'Test kitabı açıklaması',
    cover_image_url: 'https://via.placeholder.com/300x400?text=Test+Kitabi',
    language: 'tr'
  });

  const bookOptions = {
    hostname: '192.168.1.5',
    port: 5000,
    path: '/api/books',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Content-Length': Buffer.byteLength(bookData)
    }
  };

  console.log('\n📚 Test kitabı ekleniyor...');

  return new Promise((resolve, reject) => {
    const bookReq = http.request(bookOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', async () => {
        if (res.statusCode === 201) {
          const bookResponse = JSON.parse(data);
          console.log('✅ Kitap eklendi:', bookResponse.book.title);
          console.log('Kitap ID:', bookResponse.book.id);
          
          // 3. İstek listesine ekle
          await testWishlistAdd(token, bookResponse.book.id);
          resolve();
        } else {
          console.log('❌ Kitap ekleme başarısız:', data);
          reject(new Error('Book add failed'));
        }
      });
    });

    bookReq.on('error', (e) => {
      console.error('🚨 Book add error:', e.message);
      reject(e);
    });

    bookReq.write(bookData);
    bookReq.end();
  });
}

async function testWishlistAdd(token, bookId) {
  const wishlistData = JSON.stringify({
    book_id: bookId,
    priority: 1,
    notes: 'Test notum'
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

  console.log('\n🎯 İstek listesine ekleniyor...');

  return new Promise((resolve, reject) => {
    const wishlistReq = http.request(wishlistOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 201) {
          const wishlistResponse = JSON.parse(data);
          console.log('✅ İstek listesine eklendi!');
          console.log('Wishlist ID:', wishlistResponse.wishlist.id);
          console.log('\n🎉 Test başarılı! Artık veritabanını kontrol edebilirsiniz.');
          resolve();
        } else {
          console.log('❌ İstek listesine ekleme başarısız:', data);
          reject(new Error('Wishlist add failed'));
        }
      });
    });

    wishlistReq.on('error', (e) => {
      console.error('🚨 Wishlist add error:', e.message);
      reject(e);
    });

    wishlistReq.write(wishlistData);
    wishlistReq.end();
  });
}

// Test'i başlat
loginAndTestWishlist().catch(console.error); 
 