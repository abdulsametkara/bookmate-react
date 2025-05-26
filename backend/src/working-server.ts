import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Sequelize } from 'sequelize-typescript';

// .env dosyasını yükle
dotenv.config();

// Express uygulaması
const app = express();

// Middleware'lar
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Veritabanı bağlantısı (basit hali)
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'bookmate_db',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  logging: false,
});

// Ana route
app.get('/', (req, res) => {
  res.json({ message: 'BookMate API çalışıyor' });
});

// Test auth endpoints
app.post('/api/auth/register', (req, res) => {
  const { email, password, displayName } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email ve şifre gerekli' });
  }
  
  // Basit response
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
  
  // Basit response
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
  
  // Test verileri
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

// Server'ı başlat
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Veritabanına bağlanmaya çalış (opsiyonel)
    try {
      await sequelize.authenticate();
      console.log('Veritabanı bağlantısı başarılı');
    } catch (error) {
      console.log('Veritabanına bağlanılamadı, basit modda çalışıyor');
    }

    // Sunucuyu başlat
    app.listen(PORT, () => {
      console.log(`Server ${PORT} portunda çalışıyor`);
    });
  } catch (error) {
    console.error('Sunucu başlatılırken hata oluştu:', error);
    process.exit(1);
  }
};

startServer(); 