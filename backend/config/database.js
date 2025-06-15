require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  // DATABASE_URL varsa onu kullan (Production), yoksa local config (Development)
  connectionString: process.env.DATABASE_URL || undefined,
  // Local development config
  host: process.env.DATABASE_URL ? undefined : (process.env.DB_HOST || 'localhost'),
  port: process.env.DATABASE_URL ? undefined : (process.env.DB_PORT || 5432),
  database: process.env.DATABASE_URL ? undefined : (process.env.DB_NAME || 'bookmate_db'),
  user: process.env.DATABASE_URL ? undefined : (process.env.DB_USER || 'postgres'),
  password: process.env.DATABASE_URL ? undefined : (process.env.DB_PASSWORD || '246595'),
  // Production için SSL gerekli, development için değil
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
});

module.exports = pool; 
 