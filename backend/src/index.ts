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
import partnershipRoutes from './routes/partnershipRoutes';

// Auth controller import
import { checkUsername, register, login, getProfile } from './controllers/authController';

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

// Request debug middleware
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Ana route
app.get('/', (req, res) => {
  res.json({ 
    message: 'BookMate API is running!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/*',
      books: '/api/books/*',
      userBooks: '/api/user/books/*',
      readingSessions: '/api/user/reading-sessions/*',
      wishlists: '/api/user/wishlists/*'
    }
  });
});

// Test route for debugging
app.get('/test', (req, res) => {
  console.log('🧪 Test route called');
  res.json({ message: 'Test endpoint working!' });
});

// Routes - doğru sırada register et
console.log('🛣️ Registering routes...');
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/reading-sessions', readingSessionRoutes);
app.use('/api/partnerships', partnershipRoutes);

console.log('✅ All routes registered successfully');

// 404 handler - en sonda olmalı
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ message: 'Endpoint bulunamadı' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('💥 Server error:', err);
  res.status(500).json({ message: 'Server error' });
});

// Veritabanı bağlantısı ve sunucuyu başlat
const startServer = async () => {
  try {
    // Veritabanına bağlan ve tabloları senkronize et
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('✅ Veritabanı bağlantısı başarılı');

    // Sunucuyu başlat - tüm network interface'lerde dinle
    app.listen(config.port, '0.0.0.0', () => {
      console.log(`🚀 Server ${config.port} portunda çalışıyor (0.0.0.0)`);
      console.log(`🌍 Ortam: ${config.nodeEnv}`);
      console.log(`🏠 Local: http://localhost:${config.port}`);
      console.log(`📱 Network: http://192.168.30.4:${config.port}`);
      console.log(`🤖 Android Emulator: http://10.0.2.2:${config.port}`);
      console.log('🎯 Ready for requests!');
    });
  } catch (error) {
    console.error('💥 Sunucu başlatılırken hata oluştu:', error);
    process.exit(1);
  }
};

startServer(); 