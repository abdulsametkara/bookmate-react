const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost', 
  database: process.env.DB_NAME || 'bookmate',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function checkRelationshipTypes() {
  try {
    // Check if relationship_types table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'relationship_types'
      );
    `);
    
    console.log('📋 Relationship_types table exists:', tableExists.rows[0].exists);
    
    if (tableExists.rows[0].exists) {
      // Get all relationship types
      const types = await pool.query('SELECT * FROM relationship_types ORDER BY id');
      console.log('\n🔗 Available relationship types:');
      types.rows.forEach(type => {
        console.log(`  - ${type.name} (${type.description})`);
      });
    } else {
      console.log('❌ relationship_types table does not exist!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkRelationshipTypes(); 