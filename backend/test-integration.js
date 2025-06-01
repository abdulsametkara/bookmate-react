const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testIntegration() {
  console.log('🧪 Frontend-Backend Integration Test\n');
  
  try {
    // 1. Test Register
    console.log('1️⃣ Testing Register...');
    const registerResponse = await axios.post(`${API_URL}/auth/register`, {
      email: `test${Date.now()}@test.com`,
      password: '123456',
      displayName: 'Test User Integration'
    });
    
    console.log('✅ Register Success:', registerResponse.data.message);
    console.log('👤 User:', registerResponse.data.user.email);
    
    const token = registerResponse.data.token;
    console.log('🔑 Token received:', token.substring(0, 20) + '...\n');
    
    // 2. Test Profile
    console.log('2️⃣ Testing Profile...');
    const profileResponse = await axios.get(`${API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Profile Success:', profileResponse.data.user.displayName);
    console.log('📧 Email:', profileResponse.data.user.email, '\n');
    
    // 3. Test Add Book
    console.log('3️⃣ Testing Add Book...');
    const addBookResponse = await axios.post(`${API_URL}/books`, {
      title: 'Test Integration Book',
      author: 'Integration Author',
      pageCount: 300,
      description: 'Bu kitap frontend-backend entegrasyonu için test ediliyor',
      genre: 'Test'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Add Book Success:', addBookResponse.data.message);
    console.log('📚 Book:', addBookResponse.data.book.title);
    console.log('📊 Progress:', addBookResponse.data.book.progress + '%\n');
    
    const bookId = addBookResponse.data.book.id;
    
    // 4. Test Get Books
    console.log('4️⃣ Testing Get Books...');
    const getBooksResponse = await axios.get(`${API_URL}/books`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Get Books Success:', getBooksResponse.data.books.length, 'kitap bulundu');
    console.log('📖 İlk kitap:', getBooksResponse.data.books[0]?.title, '\n');
    
    // 5. Test Get Single Book
    console.log('5️⃣ Testing Get Single Book...');
    const getBookResponse = await axios.get(`${API_URL}/books/${bookId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Get Book Success:', getBookResponse.data.book.title);
    console.log('📄 Sayfa:', getBookResponse.data.book.currentPage + '/' + getBookResponse.data.book.pageCount, '\n');
    
    // 6. Test Update Progress
    console.log('6️⃣ Testing Update Progress (PATCH)...');
    const updateProgressResponse = await axios.patch(`${API_URL}/books/${bookId}/progress`, {
      currentPage: 150
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Update Progress Success:', updateProgressResponse.data.message);
    console.log('📊 Yeni progress:', updateProgressResponse.data.book.progress + '%');
    console.log('📖 Status:', updateProgressResponse.data.book.status, '\n');
    
    // 7. Test Update Book
    console.log('7️⃣ Testing Update Book (PUT)...');
    const updateBookResponse = await axios.put(`${API_URL}/books/${bookId}`, {
      status: 'COMPLETED',
      currentPage: 300
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Update Book Success:', updateBookResponse.data.message);
    console.log('🏁 Final Status:', updateBookResponse.data.book.status);
    console.log('📊 Final Progress:', updateBookResponse.data.book.progress + '%');
    console.log('📅 Finish Date:', updateBookResponse.data.book.finishDate, '\n');
    
    // 8. Test Delete Book
    console.log('8️⃣ Testing Delete Book...');
    await axios.delete(`${API_URL}/books/${bookId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Delete Book Success: Kitap silindi\n');
    
    console.log('🎉 TÜM TESTLER BAŞARILI!');
    console.log('🔥 Frontend-Backend entegrasyonu hazır!');
    console.log('🚀 React Native uygulamanızı çalıştırabilirsiniz.');
    
  } catch (error) {
    console.error('\n❌ Test Error:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.message || error.message);
    console.error('Endpoint:', error.config?.url);
    
    if (error.response?.status === 500) {
      console.error('\n💡 Server hatası - Backend loglarını kontrol edin');
    } else if (error.response?.status === 401) {
      console.error('\n💡 Auth hatası - Token doğrulaması başarısız');
    }
  }
}

testIntegration(); 
 