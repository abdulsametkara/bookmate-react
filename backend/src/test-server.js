const express = require('express');
const cors = require('cors');

const app = express();

// Middleware'lar
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ana route
app.get('/', (req, res) => {
  res.json({ message: 'BookMate API çalışıyor' });
});

// Auth endpoints
app.post('/api/auth/register', (req, res) => {
  const { email, password, displayName } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email ve şifre gerekli' });
  }
  
  res.status(201).json({
    message: 'Kullanıcı başarıyla oluşturuldu',
    user: {
      id: '1',
      email,
      displayName: displayName || email.split('@')[0]
    },
    token: 'test_token_12345'
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email ve şifre gerekli' });
  }
  
  res.status(200).json({
    message: 'Giriş başarılı',
    user: {
      id: '1',
      email,
      displayName: email.split('@')[0]
    },
    token: 'test_token_12345'
  });
});

app.get('/api/auth/profile', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token required' });
  }
  
  res.status(200).json({
    message: 'Profil bilgileri',
    user: {
      id: '1',
      email: 'test@example.com',
      displayName: 'Test User'
    }
  });
});

// Kitaplar endpoint'i
app.get('/api/books', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token required' });
  }
  
  const books = [
    {
      id: '1',
      title: 'Şeker Portakalı',
      author: 'José Mauro de Vasconcelos',
      pageCount: 182,
      currentPage: 0,
      progress: 0,
      status: 'TO_READ'
    },
    {
      id: '2',
      title: '1984',
      author: 'George Orwell',
      pageCount: 328,
      currentPage: 150,
      progress: 45,
      status: 'READING'
    }
  ];
  
  res.json({ message: 'Kitaplar başarıyla getirildi', books });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route bulunamadı' });
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
}); 