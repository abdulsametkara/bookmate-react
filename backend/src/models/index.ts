import { Sequelize } from 'sequelize-typescript';
import config from '../config/config';

// Sequelize instance oluştur
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  username: config.db.username,
  password: config.db.password,
  logging: config.nodeEnv === 'development' ? console.log : false,
});

// Models dosyaları burada import edilmek yerine, models[] dizisine modelleri ekleyeceğiz
// Bu şekilde döngüsel bağımlılık sorununu çözeceğiz

// Modelleri içe aktardıktan sonra export et
import User from './User';
import Book from './Book';
import Note from './Note';
import ReadingSession from './ReadingSession';
import Partnership from './Partnership';
import SharedReading from './SharedReading';
import ReadingActivity from './ReadingActivity';
import SharedMessage from './SharedMessage';

// Modelleri ekle
sequelize.addModels([
  User, 
  Book, 
  Note, 
  ReadingSession,
  Partnership,
  SharedReading,
  ReadingActivity,
  SharedMessage
]);

export { 
  User, 
  Book, 
  Note, 
  ReadingSession,
  Partnership,
  SharedReading,
  ReadingActivity,
  SharedMessage
};
export default sequelize; 