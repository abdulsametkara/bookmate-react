const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost', 
  database: process.env.DB_NAME || 'bookmate',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function addTestUser() {
  try {
    // Check if test user exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', ['test123456@example.com']);
    
    if (existing.rows.length > 0) {
      console.log('✅ Test user already exists:', existing.rows[0].id);
      return;
    }
    
    // Add test user
    const result = await pool.query(`
      INSERT INTO users (email, "displayName", password)
      VALUES ('test123456@example.com', 'Test User 123456', 'hashed_password')
      RETURNING id, "displayName", email
    `);
    
    console.log('✅ Test user created:', result.rows[0]);
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
  } finally {
    await pool.end();
  }
}

addTestUser(); 