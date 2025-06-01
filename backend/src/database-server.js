require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// Database ve modeller
const sequelize = require('../config/database');
const User = require('../models/User');
const Book = require('../models/Book');

// Utils ve middleware
const { generateToken } = require('../utils/jwt');
const authenticateToken = require('../middleware/auth');

const app = express();

// Middleware'lar
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Model ilişkilerini tanımla
User.hasMany(Book, { foreignKey: 'userId', as: 'books' });
Book.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Swagger konfigürasyonu
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BookMate API - Full Database Version',
      version: '2.0.0',
      description: 'PostgreSQL veritabanı ile tam fonksiyonlu BookMate API'
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/database-server.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /:
 *   get:
 *     summary: Ana sayfa
 *     responses:
 *       200:
 *         description: API durumu
 */
app.get('/', (req, res) => {
  res.json({ 
    message: 'BookMate API - Database Version',
    version: '2.0.0',
    database: 'Connected to PostgreSQL'
  });
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Kullanıcı kaydı
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               displayName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Kullanıcı oluşturuldu
 *       400:
 *         description: Hata
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email ve şifre gerekli' });
    }

    // Email zaten var mı kontrolü
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Bu email zaten kullanılıyor' });
    }

    // Kullanıcı oluştur
    const user = await User.create({
      email,
      password,
      displayName: displayName || email.split('@')[0]
    });

    // Token oluştur
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'Kullanıcı başarıyla oluşturuldu',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName
      },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      message: 'Sunucu hatası',
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Kullanıcı girişi
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Giriş başarılı
 *       400:
 *         description: Hatalı bilgiler
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email ve şifre gerekli' });
    }

    // Kullanıcıyı bul
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Hatalı email veya şifre' });
    }

    // Şifreyi doğrula
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Hatalı email veya şifre' });
    }

    // Token oluştur
    const token = generateToken(user.id);

    res.json({
      message: 'Giriş başarılı',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Sunucu hatası',
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Kullanıcı profili
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil bilgileri
 *       401:
 *         description: Yetkilendirme gerekli
 */
app.get('/api/auth/profile', authenticateToken, (req, res) => {
  res.json({
    message: 'Profil bilgileri',
    user: {
      id: req.user.id,
      email: req.user.email,
      displayName: req.user.displayName,
      createdAt: req.user.createdAt
    }
  });
});

/**
 * @swagger
 * /api/books:
 *   get:
 *     summary: Kullanıcının kitaplarını listele
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kitaplar getirildi
 *   post:
 *     summary: Yeni kitap ekle
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - author
 *               - pageCount
 *             properties:
 *               title:
 *                 type: string
 *               author:
 *                 type: string
 *               pageCount:
 *                 type: integer
 *               description:
 *                 type: string
 *               genre:
 *                 type: string
 *               publishedYear:
 *                 type: integer
 *               isbn:
 *                 type: string
 *     responses:
 *       201:
 *         description: Kitap eklendi
 */
app.get('/api/books', authenticateToken, async (req, res) => {
  try {
    const books = await Book.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    // Progress hesapla
    const booksWithProgress = books.map(book => ({
      ...book.toJSON(),
      progress: book.getProgress()
    }));

    res.json({
      message: 'Kitaplar başarıyla getirildi',
      books: booksWithProgress
    });
  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({ 
      message: 'Sunucu hatası',
      error: error.message 
    });
  }
});

app.post('/api/books', authenticateToken, async (req, res) => {
  try {
    const { title, author, pageCount, description, genre, publishedYear, isbn } = req.body;
    
    if (!title || !author || !pageCount) {
      return res.status(400).json({ 
        message: 'Başlık, yazar ve sayfa sayısı gerekli' 
      });
    }

    const book = await Book.create({
      title,
      author,
      pageCount: parseInt(pageCount),
      description,
      genre,
      publishedYear: publishedYear ? parseInt(publishedYear) : null,
      isbn,
      userId: req.user.id
    });

    res.status(201).json({
      message: 'Kitap başarıyla eklendi',
      book: {
        ...book.toJSON(),
        progress: book.getProgress()
      }
    });
  } catch (error) {
    console.error('Add book error:', error);
    res.status(500).json({ 
      message: 'Sunucu hatası',
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/books/{id}:
 *   get:
 *     summary: Kitap detayı
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Kitap detayı
 *   put:
 *     summary: Kitap güncelle
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               author:
 *                 type: string
 *               pageCount:
 *                 type: integer
 *               currentPage:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [TO_READ, READING, COMPLETED, PAUSED]
 *     responses:
 *       200:
 *         description: Kitap güncellendi
 *   delete:
 *     summary: Kitap sil
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Kitap silindi
 */
app.get('/api/books/:id', authenticateToken, async (req, res) => {
  try {
    const book = await Book.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!book) {
      return res.status(404).json({ message: 'Kitap bulunamadı' });
    }

    res.json({
      message: 'Kitap detayı',
      book: {
        ...book.toJSON(),
        progress: book.getProgress()
      }
    });
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({ 
      message: 'Sunucu hatası',
      error: error.message 
    });
  }
});

app.put('/api/books/:id', authenticateToken, async (req, res) => {
  try {
    const book = await Book.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!book) {
      return res.status(404).json({ message: 'Kitap bulunamadı' });
    }

    const updateData = req.body;
    
    // Status değişimlerini takip et
    if (updateData.status) {
      if (updateData.status === 'READING' && book.status === 'TO_READ') {
        updateData.startDate = new Date();
      } else if (updateData.status === 'COMPLETED' && book.status !== 'COMPLETED') {
        updateData.finishDate = new Date();
        updateData.currentPage = book.pageCount; // Kitap tamamlandı
      }
    }

    await book.update(updateData);

    res.json({
      message: 'Kitap başarıyla güncellendi',
      book: {
        ...book.toJSON(),
        progress: book.getProgress()
      }
    });
  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({ 
      message: 'Sunucu hatası',
      error: error.message 
    });
  }
});

app.delete('/api/books/:id', authenticateToken, async (req, res) => {
  try {
    const book = await Book.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!book) {
      return res.status(404).json({ message: 'Kitap bulunamadı' });
    }

    await book.destroy();

    res.json({ message: 'Kitap başarıyla silindi' });
  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({ 
      message: 'Sunucu hatası',
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/books/{id}/progress:
 *   patch:
 *     summary: Okuma ilerlemesi güncelle
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPage
 *             properties:
 *               currentPage:
 *                 type: integer
 *     responses:
 *       200:
 *         description: İlerleme güncellendi
 */
app.patch('/api/books/:id/progress', authenticateToken, async (req, res) => {
  try {
    const { currentPage } = req.body;
    
    if (currentPage === undefined || currentPage < 0) {
      return res.status(400).json({ message: 'Geçerli sayfa numarası gerekli' });
    }

    const book = await Book.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!book) {
      return res.status(404).json({ message: 'Kitap bulunamadı' });
    }

    const updateData = { currentPage: parseInt(currentPage) };

    // Otomatik status güncellemesi
    if (currentPage > 0 && book.status === 'TO_READ') {
      updateData.status = 'READING';
      updateData.startDate = new Date();
    } else if (currentPage >= book.pageCount && book.status !== 'COMPLETED') {
      updateData.status = 'COMPLETED';
      updateData.finishDate = new Date();
      updateData.currentPage = book.pageCount;
    }

    await book.update(updateData);

    res.json({
      message: 'Okuma ilerlemesi güncellendi',
      book: {
        ...book.toJSON(),
        progress: book.getProgress()
      }
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ 
      message: 'Sunucu hatası',
      error: error.message 
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route bulunamadı' });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    message: 'Sunucu hatası',
    error: error.message 
  });
});

const PORT = process.env.PORT || 5000;

// Veritabanı bağlantısını test et ve tabloları oluştur
const startServer = async () => {
  try {
    console.log('Veritabanına bağlanılıyor...');
    await sequelize.authenticate();
    console.log('✅ PostgreSQL bağlantısı başarılı');
    
    console.log('Tablolar oluşturuluyor...');
    await sequelize.sync({ force: false }); // force: true olursa tablolar silinir
    console.log('✅ Tablolar hazır');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server ${PORT} portunda çalışıyor`);
      console.log(`📚 Swagger UI: http://localhost:${PORT}/api-docs`);
      console.log(`🗄️ Database: PostgreSQL (${process.env.DB_NAME || 'bookmate_db'})`);
    });
  } catch (error) {
    console.error('❌ Server başlatma hatası:', error);
    process.exit(1);
  }
};

startServer(); 
 