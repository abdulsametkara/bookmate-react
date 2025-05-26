const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();

// Middleware'lar
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger konfigürasyonu
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BookMate API',
      version: '1.0.0',
      description: 'BookMate uygulaması için API dokümantasyonu'
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
  apis: ['./src/swagger-server.js'] // Bu dosyada API dokümantasyonu yazacağız
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI endpoint'i
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /:
 *   get:
 *     summary: Ana sayfa
 *     description: API'nin çalışıp çalışmadığını kontrol eder
 *     responses:
 *       200:
 *         description: Başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "BookMate API çalışıyor"
 */
app.get('/', (req, res) => {
  res.json({ message: 'BookMate API çalışıyor' });
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Kullanıcı kaydı
 *     description: Yeni kullanıcı oluşturur
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
 *                 example: "test@example.com"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "123456"
 *               displayName:
 *                 type: string
 *                 example: "Test User"
 *     responses:
 *       201:
 *         description: Kullanıcı başarıyla oluşturuldu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                 token:
 *                   type: string
 *       400:
 *         description: Geçersiz input
 */
app.post('/api/auth/register', (req, res) => {
  console.log('Register request received');
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Request body:', req.body);
  
  try {
    const { email, password, displayName } = req.body;
    
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('DisplayName:', displayName);
    
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ 
        message: 'Email ve şifre gerekli',
        received: {
          email: !!email,
          password: !!password,
          bodyType: typeof req.body
        }
      });
    }
    
    console.log('Registration successful for:', email);
    res.status(201).json({
      message: 'Kullanıcı başarıyla oluşturuldu',
      user: {
        id: '1',
        email,
        displayName: displayName || email.split('@')[0]
      },
      token: 'test_token_12345'
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
 *     description: Kullanıcı giriş yapar
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
 *                 example: "test@example.com"
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Giriş başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                 token:
 *                   type: string
 *       400:
 *         description: Geçersiz input
 */
app.post('/api/auth/login', (req, res) => {
  console.log('Login request received');
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Request body:', req.body);
  console.log('Raw body:', req.rawBody);
  
  try {
    const { email, password } = req.body;
    
    console.log('Email:', email);
    console.log('Password:', password);
    
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ 
        message: 'Email ve şifre gerekli',
        received: {
          email: !!email,
          password: !!password,
          bodyType: typeof req.body
        }
      });
    }
    
    console.log('Login successful for:', email);
    res.status(200).json({
      message: 'Giriş başarılı',
      user: {
        id: '1',
        email,
        displayName: email.split('@')[0]
      },
      token: 'test_token_12345'
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
 *     description: Giriş yapmış kullanıcının profil bilgilerini getir
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil bilgileri
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Yetkilendirme gerekli
 */
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

/**
 * @swagger
 * /api/books:
 *   get:
 *     summary: Kitapları listele
 *     description: Kullanıcının kitaplarını getir
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kitaplar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 books:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       author:
 *                         type: string
 *                       pageCount:
 *                         type: integer
 *                       currentPage:
 *                         type: integer
 *                       progress:
 *                         type: number
 *                       status:
 *                         type: string
 *                         enum: [TO_READ, READING, COMPLETED]
 *       401:
 *         description: Yetkilendirme gerekli
 */
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
  console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
}); 