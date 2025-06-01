const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595'
});

async function createTestUser() {
  try {
    // Test user data
    const email = 'testuser123@gmail.com';
    const password = '123456';
    const displayName = 'Test User';
    
    console.log(`🔍 Checking if user ${email} already exists...`);
    const checkResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (checkResult.rows.length > 0) {
      console.log(`ℹ️ User ${email} already exists, updating password...`);
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Update user
      await pool.query(
        'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email, "displayName"',
        [hashedPassword, email]
      );
      
      console.log(`✅ User ${email} password updated successfully`);
    } else {
      console.log(`➕ Creating new user ${email}...`);
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Insert user
      const result = await pool.query(
        'INSERT INTO users (email, password, "displayName") VALUES ($1, $2, $3) RETURNING id, email, "displayName"',
        [email, hashedPassword, displayName]
      );
      
      const user = result.rows[0];
      console.log(`✅ User created successfully:`, user);
      
      // Create default user preferences
      await pool.query(
        'INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
        [user.id]
      );
    }
    
    console.log(`\n📝 Test user credentials:`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createTestUser(); 