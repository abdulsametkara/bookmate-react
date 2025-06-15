const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 5001; // Farklı port kullan

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595',
  ssl: false,
  connectionTimeoutMillis: 5000,
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('✅ Database connected successfully');
    release();
  }
});

// Test endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Test server is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Test database endpoint
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) as user_count FROM users');
    res.json({
      message: 'Database test successful',
      userCount: result.rows[0].user_count
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      message: 'Database test failed',
      error: error.message
    });
  }
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🧪 Test Server running on port ${port}`);
  console.log(`📚 Test URL: http://localhost:${port}/`);
  console.log(`🔍 Database test: http://localhost:${port}/test-db`);
}); 