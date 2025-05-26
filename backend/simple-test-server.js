const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`📩 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
  next();
});

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595', // Re-enable password after MD5 config
  ssl: false,
  connectionTimeoutMillis: 5000,
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully');
    release();
  }
});

// Create users table if not exists
const createUsersTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        "displayName" VARCHAR(255) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table created/verified');
  } catch (error) {
    console.error('Error creating users table:', error);
  }
};

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'BookMate API is running!' });
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    
    console.log('Register request:', { email, displayName });

    // Check if user exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Bu email adresi zaten kullanılıyor' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (email, password, "displayName") VALUES ($1, $2, $3) RETURNING id, email, "displayName", "createdAt"',
      [email, hashedPassword, displayName || email.split('@')[0]]
    );

    const user = result.rows[0];
    console.log('User created:', user);

    // Generate token
    const token = jwt.sign({ id: user.id, email: user.email }, 'secret_key', { expiresIn: '24h' });

    res.status(201).json({
      message: 'Kullanıcı başarıyla oluşturuldu',
      user,
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login request:', { email });

    // Find user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Geçersiz email veya şifre' });
    }

    const user = result.rows[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Geçersiz email veya şifre' });
    }

    // Generate token
    const token = jwt.sign({ id: user.id, email: user.email }, 'secret_key', { expiresIn: '24h' });

    // Remove password from response
    delete user.password;

    res.json({
      message: 'Giriş başarılı',
      user,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start server
app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  await createUsersTable();
}); 