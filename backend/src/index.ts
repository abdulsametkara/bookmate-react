import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import sequelize from './models';
import config from './config/config';

// Routes
import authRoutes from './routes/authRoutes';
import bookRoutes from './routes/bookRoutes';
import readingSessionRoutes from './routes/readingSessionRoutes';

// Express uygulaması
const app = express();

// Middleware'lar
app.use(cors({
  origin: config.cors.origin,
  credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/reading-sessions', readingSessionRoutes);

// Ana route
app.get('/', (req, res) => {
  res.json({ message: 'BookMate API' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route bulunamadı' });
});

// Veritabanı bağlantısı ve sunucuyu başlat
const startServer = async () => {
  try {
    // Veritabanına bağlan ve tabloları senkronize et
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('Veritabanı bağlantısı başarılı');

    // Sunucuyu başlat
    app.listen(config.port, () => {
      console.log(`Server ${config.port} portunda çalışıyor`);
      console.log(`Ortam: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('Sunucu başlatılırken hata oluştu:', error);
    process.exit(1);
  }
};

startServer(); 