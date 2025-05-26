import express from 'express';
import { Sequelize } from 'sequelize-typescript';
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

// Veritabanı bağlantısı
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'bookmate_db',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  logging: console.log,
});

// Server'ı başlat
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Veritabanına bağlan
    await sequelize.authenticate();
    console.log('Veritabanı bağlantısı başarılı');

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