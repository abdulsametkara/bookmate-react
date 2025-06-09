const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595',
  ssl: false,
});

async function checkUser() {
  try {
    console.log('🔍 Checking user: test123@gmail.com');
    
    // Check if user exists
    const result = await pool.query(
      'SELECT id, email, "displayName", "createdAt" FROM users WHERE email = $1',
      ['test123@gmail.com']
    );
    
    if (result.rows.length > 0) {
      console.log('✅ User found:', result.rows[0]);
      
      // Check password (we'll just see if there's a password field)
      const fullResult = await pool.query(
        'SELECT id, email, "displayName", password, "createdAt" FROM users WHERE email = $1',
        ['test123@gmail.com']
      );
      
      console.log('🔑 Password exists:', fullResult.rows[0].password ? 'YES' : 'NO');
      console.log('🔑 Password length:', fullResult.rows[0].password ? fullResult.rows[0].password.length : 0);
      
    } else {
      console.log('❌ User NOT found in database');
      
      // Let's see all users
      const allUsers = await pool.query('SELECT id, email, "displayName" FROM users LIMIT 10');
      console.log('📋 All users in database:', allUsers.rows);
    }
    
  } catch (error) {
    console.error('💥 Database error:', error);
  } finally {
    await pool.end();
  }
}

checkUser(); 