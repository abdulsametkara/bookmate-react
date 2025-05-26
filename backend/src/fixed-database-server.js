const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware'lar
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Hardcoded connection (dotenv problemi için)
const sequelize = new Sequelize({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  username: 'postgres',
  password: '246595',
  dialect: 'postgres',
  logging: false, // SQL loglarını kapat
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// User Model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { len: [6, 100] }
  },
  displayName: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true
});

// Book Model
const Book = sequelize.define('Book', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  author: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isbn: {
    type: DataTypes.STRING,
    allowNull: true
  },
  pageCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  currentPage: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('TO_READ', 'READING', 'COMPLETED', 'PAUSED'),
    allowNull: false,
    defaultValue: 'TO_READ'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  genre: {
    type: DataTypes.STRING,
    allowNull: true
  },
  publishedYear: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  coverImageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  finishDate: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'books',
  timestamps: true
});

// Model ilişkileri
User.hasMany(Book, { foreignKey: 'userId', as: 'books' });
Book.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Şifre hashleme
User.beforeCreate(async (user) => {
  if (user.password) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

User.beforeUpdate(async (user) => {
  if (user.changed('password')) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

// Şifre doğrulama
User.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Progress hesaplama
Book.prototype.getProgress = function() {
  if (this.pageCount === 0) return 0;
  return Math.round((this.currentPage / this.pageCount) * 100);
};

// JWT Functions
const JWT_SECRET = 'bookmate_super_secret_key_2024';
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Auth Middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'Access token gerekli',
        error: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Kullanıcı bulunamadı',
        error: 'User not found'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ 
      message: 'Geçersiz token',
      error: error.message
    });
  }
};

// Swagger konfigürasyonu
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BookMate API - Fixed Database Version',
      version: '2.1.0',
      description: 'PostgreSQL veritabanı ile çalışan tam fonksiyonlu BookMate API'
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
  apis: ['./src/fixed-database-server.js']
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
    message: 'BookMate API - Fixed Database Version',
    version: '2.1.0',
    database: 'PostgreSQL Connected',
    tables: 'users, books'
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
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email ve şifre gerekli' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Bu email zaten kullanılıyor' });
    }

    const user = await User.create({
      email,
      password,
      displayName: displayName || email.split('@')[0]
    });

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
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Giriş başarılı
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email ve şifre gerekli' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Hatalı email veya şifre' });
    }

    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Hatalı email veya şifre' });
    }

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
 *     summary: Belirli kitabı getir
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
 *         description: Kitap getirildi
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
 *               currentPage:
 *                 type: integer
 *               status:
 *                 type: string
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
      message: 'Kitap başarıyla getirildi',
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
    
    if (updateData.status) {
      if (updateData.status === 'READING' && book.status === 'TO_READ') {
        updateData.startDate = new Date();
      } else if (updateData.status === 'COMPLETED' && book.status !== 'COMPLETED') {
        updateData.finishDate = new Date();
        updateData.currentPage = book.pageCount;
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

/**
 * @swagger
 * /api/books/{id}/progress:
 *   patch:
 *     summary: Okuma ilerlemesini güncelle
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
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: İlerleme güncellendi
 */
app.patch('/api/books/:id/progress', authenticateToken, async (req, res) => {
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

    const { currentPage } = req.body;
    
    if (currentPage === undefined || currentPage === null) {
      return res.status(400).json({ message: 'currentPage gerekli' });
    }

    if (currentPage < 0 || currentPage > book.pageCount) {
      return res.status(400).json({ 
        message: `currentPage 0 ile ${book.pageCount} arasında olmalı` 
      });
    }

    const updateData = { currentPage: parseInt(currentPage) };
    
    // Status otomatik güncelleme
    if (currentPage === 0 && book.status !== 'TO_READ') {
      updateData.status = 'TO_READ';
      updateData.startDate = null;
      updateData.finishDate = null;
    } else if (currentPage > 0 && currentPage < book.pageCount && book.status === 'TO_READ') {
      updateData.status = 'READING';
      updateData.startDate = new Date();
    } else if (currentPage >= book.pageCount && book.status !== 'COMPLETED') {
      updateData.status = 'COMPLETED';
      updateData.finishDate = new Date();
      updateData.currentPage = book.pageCount; // Tam sayfa sayısına eşitle
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

const PORT = 5000;

// Server başlatma
const startServer = async () => {
  try {
    console.log('🔌 Veritabanına bağlanılıyor...');
    await sequelize.authenticate();
    console.log('✅ PostgreSQL bağlantısı başarılı!');
    
    console.log('📋 Modeller senkronize ediliyor...');
    await sequelize.sync({ alter: true }); // Tabloları güncelle
    console.log('✅ Tablolar hazır!');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server ${PORT} portunda çalışıyor`);
      console.log(`📚 Swagger UI: http://localhost:${PORT}/api-docs`);
      console.log(`🗄️ Database: PostgreSQL (bookmate_db)`);
      console.log(`📊 Tables: users, books`);
    });
  } catch (error) {
    console.error('❌ Server başlatma hatası:', error);
    process.exit(1);
  }
};

startServer(); 