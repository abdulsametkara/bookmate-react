const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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

async function setupSharedReadingTables() {
  console.log('🚀 Setting up shared reading system...');
  
  try {
    // Test database connection
    await pool.connect();
    console.log('✅ Database connected successfully');
    
    // SQL dosyasını oku
    const sqlPath = path.join(__dirname, 'shared-reading-schema.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📖 Reading SQL schema file...');
    
    // SQL komutlarını çalıştır
    await pool.query(sqlContent);
    
    console.log('✅ Shared reading tables created successfully!');
    
    // Veritabanı tabloları kontrolü
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%relationship%' 
      OR table_name LIKE '%shared%' 
      OR table_name LIKE '%badge%' 
      OR table_name LIKE '%challenge%'
      OR table_name LIKE '%notification%'
      ORDER BY table_name
    `);
    
    console.log('📋 Created tables:');
    tables.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    // İlişki türlerini kontrol et
    const relationshipTypes = await pool.query('SELECT * FROM relationship_types ORDER BY name');
    console.log('\n📱 Relationship types:');
    relationshipTypes.rows.forEach(type => {
      console.log(`  ${type.icon} ${type.name} - ${type.description}`);
    });
    
    // Rozetleri kontrol et
    const badges = await pool.query('SELECT * FROM badges ORDER BY name');
    console.log('\n🏆 Available badges:');
    badges.rows.forEach(badge => {
      console.log(`  ${badge.icon} ${badge.name} - ${badge.description}`);
    });
    
    console.log('\n🎉 Shared reading system setup completed!');
    console.log('\n📚 Available API endpoints:');
    console.log('  🔍 GET  /api/shared-reading/search-users/:query');
    console.log('  📤 POST /api/shared-reading/send-friend-request');
    console.log('  📬 GET  /api/shared-reading/friend-requests/incoming');
    console.log('  ✅ POST /api/shared-reading/friend-requests/:requestId/respond');
    console.log('  👥 GET  /api/shared-reading/friends');
    console.log('  📖 POST /api/shared-sessions/start-session');
    console.log('  📊 POST /api/shared-sessions/update-progress');
    console.log('  💬 POST /api/shared-sessions/send-message');
    
  } catch (error) {
    console.error('❌ Setup error:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('📦 Database connection closed');
  }
}

// Script çalıştırılırsa
if (require.main === module) {
  setupSharedReadingTables();
}

module.exports = { setupSharedReadingTables }; 