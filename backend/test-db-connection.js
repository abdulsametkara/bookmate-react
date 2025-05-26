require('dotenv').config();
const { Sequelize } = require('sequelize');

console.log('🔍 Environment Variables Debug:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***HIDDEN***' : 'NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '***HIDDEN***' : 'NOT SET');

console.log('\n🔧 Creating Sequelize Connection...');

const sequelize = new Sequelize({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'bookmate_db',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
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
    console.log('\n⚡ Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ PostgreSQL bağlantısı başarılı!');
    
    console.log('\n📋 Database Info:');
    const [results] = await sequelize.query("SELECT version();");
    console.log('Version:', results[0].version);
    
    const [dbResult] = await sequelize.query("SELECT current_database();");
    console.log('Current DB:', dbResult[0].current_database);
    
    const [userResult] = await sequelize.query("SELECT current_user;");
    console.log('Current User:', userResult[0].current_user);
    
    await sequelize.close();
    console.log('\n🔐 Connection closed successfully');
    
  } catch (error) {
    console.error('\n❌ Database connection error:');
    console.error('Type:', error.constructor.name);
    console.error('Message:', error.message);
    console.error('Code:', error.original?.code);
    console.error('Detail:', error.original?.detail);
    
    if (error.original) {
      console.error('\n🔍 Original Error Details:');
      console.error('Host:', error.original.address);
      console.error('Port:', error.original.port);
      console.error('Database:', error.original.database);
    }
  }
}

testConnection(); 