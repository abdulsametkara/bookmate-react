const axios = require('axios');

async function testSimpleBackend() {
  try {
    console.log('🔍 Veritabanı sütunlarını kontrol ediliyor...');
    const columnsResponse = await axios.get('http://localhost:5001/check-columns');
    console.log('📊 Books tablosu sütunları:', columnsResponse.data.columns);
    
    console.log('\n📚 Test kitap ekleniyor...');
    const bookResponse = await axios.post('http://localhost:5001/test-book', {
      title: 'Test Kitabı API',
      author: 'Test Yazar API',
      isbn: '987654321',
      publisher: 'Test Yayınevi API',
      published_year: 2024,
      page_count: 200,
      genre: 'Test Genre',
      description: 'Test description',
      cover_image_url: 'https://via.placeholder.com/150x200',
      language: 'tr'
    });
    
    console.log('✅ Kitap ekleme sonucu:', bookResponse.data);
    
  } catch (error) {
    console.error('❌ Test hatası:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testSimpleBackend(); 