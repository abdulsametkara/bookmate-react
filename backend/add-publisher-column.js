const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  user: 'postgres',
  password: '246595'
});

async function addPublisherColumn() {
  try {
    console.log('➕ Adding publisher column to books table...');
    
    await pool.query(`
      ALTER TABLE books 
      ADD COLUMN publisher TEXT
    `);
    
    console.log('✅ Publisher column added successfully');
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ Publisher column already exists');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await pool.end();
  }
}

addPublisherColumn(); 