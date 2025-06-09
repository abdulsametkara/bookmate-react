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

async function resetUserPassword() {
  try {
    console.log('🔄 Resetting password for test123@gmail.com');
    
    const email = 'test123@gmail.com';
    const newPassword = '123456';
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('🔐 New password hash created');
    
    // Update password
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email, "displayName"',
      [hashedPassword, email]
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Password updated successfully for user:', result.rows[0]);
      console.log('📧 Email:', email);
      console.log('🔑 New Password:', newPassword);
    } else {
      console.log('❌ User not found');
    }
    
  } catch (error) {
    console.error('💥 Error resetting password:', error);
  } finally {
    await pool.end();
  }
}

resetUserPassword(); 