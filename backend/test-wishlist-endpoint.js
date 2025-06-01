const axios = require('axios');

async function testWishlistEndpoint() {
  try {
    // Önce login yapalım
    console.log('🔐 Login yapılıyor...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'testuser123@gmail.com',
      password: '123456'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login başarılı, token alındı');
    
    // İstek listesi endpoint'ini test et
    console.log('🎯 İstek listesi endpoint test ediliyor...');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // GET /api/user/wishlists
    console.log('📋 GET /api/user/wishlists test ediliyor...');
    try {
      const wishlistResponse = await axios.get('http://localhost:5000/api/user/wishlists', {
        headers
      });
      console.log('✅ İstek listesi GET başarılı:', wishlistResponse.data);
    } catch (error) {
      console.error('❌ İstek listesi GET hatası:');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('URL:', error.config?.url);
    }
    
  } catch (error) {
    console.error('❌ Genel test hatası:', error.response?.data || error.message);
  }
}

testWishlistEndpoint(); 