const axios = require('axios');

async function testReadingStatusUpdate() {
  try {
    console.log('🔐 Login yapılıyor...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'testuser123@gmail.com',
      password: '123456'
    });
    
    const token = loginResponse.data.token;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('✅ Login başarılı');
    
    // 1. Kullanıcının kitaplarını listele
    console.log('\n📚 User books listesi getiriliyor...');
    const booksResponse = await axios.get('http://localhost:5000/api/user/books', { headers });
    console.log('📋 User books:', booksResponse.data.books.length, 'kitap bulundu');
    
    if (booksResponse.data.books.length === 0) {
      console.log('❌ Test için kitap bulunamadı');
      return;
    }
    
    const testBook = booksResponse.data.books[0];
    console.log('🎯 Test kitabı:', testBook.title, 'by', testBook.author);
    console.log('📊 Mevcut durum:', { 
      status: testBook.status, 
      current_page: testBook.current_page,
      page_count: testBook.page_count 
    });
    
    // 2. Kitap durumunu 'reading' olarak güncelle
    console.log('\n🔄 Kitap durumu "reading" olarak güncelleniyor...');
    const statusUpdateResponse = await axios.put(
      `http://localhost:5000/api/user/books/${testBook.id}`, 
      { 
        status: 'reading',
        current_page: 25 // Aynı zamanda sayfa ilerlemesi
      }, 
      { headers }
    );
    
    console.log('✅ Status güncellendi:', statusUpdateResponse.data.userBook);
    
    // 3. Reading status'ündeki kitapları getir
    console.log('\n📖 Reading statusündeki kitaplar getiriliyor...');
    const readingBooksResponse = await axios.get(
      'http://localhost:5000/api/user/books/status/reading', 
      { headers }
    );
    
    console.log('📋 Reading Books:', readingBooksResponse.data.books.length, 'reading kitap');
    readingBooksResponse.data.books.forEach(book => {
      console.log(`- ${book.title}: current_page=${book.current_page}, status=${book.status}`);
    });
    
    // 4. Current page'i daha da ilerlet
    console.log('\n📄 Sayfa ilerlemesi güncelleniyor...');
    const pageUpdateResponse = await axios.put(
      `http://localhost:5000/api/user/books/${testBook.id}`, 
      { current_page: 50 }, 
      { headers }
    );
    
    console.log('✅ Sayfa ilerlemesi güncellendi:', {
      title: pageUpdateResponse.data.userBook.title,
      current_page: pageUpdateResponse.data.userBook.current_page,
      status: pageUpdateResponse.data.userBook.status
    });
    
    console.log('\n🎉 Test tamamlandı!');
    
  } catch (error) {
    console.error('❌ Test hatası:', error.response?.data || error.message);
  }
}

testReadingStatusUpdate(); 