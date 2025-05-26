import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// .env dosyasını yükle
dotenv.config();

// Express uygulaması
const app = express();

// Middleware'lar
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ana route
app.get('/', (req, res) => {
  res.json({ message: 'BookMate API çalışıyor' });
});

// Kitaplar için test endpoint'i
app.get('/api/books', (req, res) => {
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

// Server'ı başlat
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
}); 