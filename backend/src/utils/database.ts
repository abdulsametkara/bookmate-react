import { Sequelize } from 'sequelize-typescript';
import config from '../config/config';

// Veritabanı bağlantısını başlat
export const initDatabase = async () => {
  const sequelize = new Sequelize({
    dialect: 'postgres',
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    username: config.db.username,
    password: config.db.password,
    logging: config.nodeEnv === 'development' ? console.log : false,
  });

  try {
    await sequelize.authenticate();
    console.log('Veritabanına başarıyla bağlandı.');
    return sequelize;
  } catch (error) {
    console.error('Veritabanına bağlanırken hata oluştu:', error);
    throw error;
  }
};

// Veritabanı tabloları oluştur veya güncelle
export const syncDatabase = async (sequelize: Sequelize) => {
  try {
    await sequelize.sync({ alter: config.nodeEnv === 'development' });
    console.log('Veritabanı tabloları senkronize edildi.');
  } catch (error) {
    console.error('Veritabanı tabloları senkronize edilirken hata oluştu:', error);
    throw error;
  }
}; 