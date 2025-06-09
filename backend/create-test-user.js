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

async function createTestUser() {
  try {
    console.log('🔍 Creating test user: test123@gmail.com');
    
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      ['test123@gmail.com']
    );
    
    if (existingUser.rows.length > 0) {
      console.log('⚠️ User already exists:', existingUser.rows[0]);
      return;
    }
    
    // Hash password
    const password = '123456';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password, "displayName") VALUES ($1, $2, $3) RETURNING id, email, "displayName", "createdAt"',
      ['test123@gmail.com', hashedPassword, 'Test User']
    );
    
    console.log('✅ User created successfully:', result.rows[0]);
    
    // Create default user preferences
    await pool.query(
      'INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
      [result.rows[0].id]
    );
    
    console.log('✅ User preferences created');
    
  } catch (error) {
    console.error('💥 Error creating user:', error);
  } finally {
    await pool.end();
  }
}

createTestUser(); 