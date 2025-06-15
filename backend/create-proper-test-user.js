const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595',
  ssl: false,
});

async function createProperTestUser() {
  try {
    console.log('🔐 Creating proper test user...');
    
    // Check if test user exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', ['test@bookmate.com']);
    
    if (existing.rows.length > 0) {
      console.log('✅ Test user already exists:', existing.rows[0].id);
      return;
    }
    
    // Hash password properly
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    // Add test user with proper hashed password
    const result = await pool.query(`
      INSERT INTO users (email, "displayName", password, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING id, "displayName", email
    `, ['test@bookmate.com', 'Test User', hashedPassword]);
    
    console.log('✅ Test user created successfully:', result.rows[0]);
    
    // Create a second test user for friend testing
    const existing2 = await pool.query('SELECT id FROM users WHERE email = $1', ['test2@bookmate.com']);
    
    if (existing2.rows.length === 0) {
      const hashedPassword2 = await bcrypt.hash('test123', 10);
      const result2 = await pool.query(`
        INSERT INTO users (email, "displayName", password, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING id, "displayName", email
      `, ['test2@bookmate.com', 'Test User 2', hashedPassword2]);
      
      console.log('✅ Second test user created:', result2.rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
  } finally {
    await pool.end();
  }
}

createProperTestUser(); 