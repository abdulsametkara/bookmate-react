const { Sequelize } = require('sequelize');

console.log('🔧 Direct Connection Test (No .env)');

const sequelize = new Sequelize({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  username: 'postgres',
  password: '246595',
  dialect: 'postgres',
  logging: (msg) => console.log('📊 SQL:', msg),
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

async function testConnection() {
  try {
    console.log('\n⚡ Testing direct database connection...');
    await sequelize.authenticate();
    console.log('✅ PostgreSQL bağlantısı başarılı!');
    
    console.log('\n📋 Database Info:');
    const [results] = await sequelize.query("SELECT version();");
    console.log('Version:', results[0].version);
    
    const [dbResult] = await sequelize.query("SELECT current_database();");
    console.log('Current DB:', dbResult[0].current_database);
    
    console.log('\n🔧 Creating tables if not exists...');
    
    // Users table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        "displayName" VARCHAR(255),
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Books table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS books (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        isbn VARCHAR(255),
        "pageCount" INTEGER DEFAULT 0,
        "currentPage" INTEGER DEFAULT 0,
        status VARCHAR(20) CHECK (status IN ('TO_READ', 'READING', 'COMPLETED', 'PAUSED')) DEFAULT 'TO_READ',
        description TEXT,
        genre VARCHAR(255),
        "publishedYear" INTEGER,
        "coverImageUrl" VARCHAR(255),
        "userId" UUID NOT NULL REFERENCES users(id),
        "startDate" TIMESTAMP,
        "finishDate" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('✅ Tables created successfully!');
    
    // Check tables
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Available Tables:');
    tables.forEach(table => console.log('  📄', table.table_name));
    
    await sequelize.close();
    console.log('\n🔐 Connection closed successfully');
    
  } catch (error) {
    console.error('\n❌ Database connection error:');
    console.error('Type:', error.constructor.name);
    console.error('Message:', error.message);
    console.error('Code:', error.original?.code);
    
    if (error.original) {
      console.error('\n🔍 Original Error Details:');
      console.error('Host:', error.original.address);
      console.error('Port:', error.original.port);
    }
  }
}

testConnection(); 