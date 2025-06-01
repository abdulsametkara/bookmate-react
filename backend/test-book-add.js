const axios = require('axios');

async function testBookAdd() {
  try {
    // Önce login yapalım
    console.log('🔐 Login yapılıyor...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'testuser123@gmail.com',
      password: '123456'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login başarılı, token alındı');
    
    // Şimdi kitap ekleyelim
    console.log('📚 Kitap ekleniyor...');
    const bookData = {
      title: 'Test Kitabı',
      author: 'Test Yazar',
      isbn: Math.random().toString().substring(2, 12),
      publisher: 'Test Yayınevi',
      published_year: 2023,
      page_count: 250,
      genre: 'Roman',
      description: 'Bu bir test kitabıdır.',
      cover_image_url: 'https://via.placeholder.com/150x200',
      language: 'tr'
    };
    
    const bookResponse = await axios.post('http://localhost:5000/api/books', bookData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Kitap başarıyla eklendi:', bookResponse.data);
    
  } catch (error) {
    console.error('❌ Hata:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testBookAdd(); 