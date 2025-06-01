require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bookmate_db',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_password_here',
  dialect: 'postgres',
  logging: console.log, // SQL sorgularını konsola yazdırır
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

module.exports = sequelize; 
 