const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  host: 'localhost',
  port: 5432,
  database: 'bookmate_db',
  username: 'postgres',
  password: '246595',
  dialect: 'postgres',
  logging: (msg) => console.log('📊 SQL:', msg)
});

async function clearTables() {
  try {
    console.log('🔌 Veritabanına bağlanılıyor...');
    await sequelize.authenticate();
    console.log('✅ PostgreSQL bağlantısı başarılı!');
    
    console.log('\n🗑️ Mevcut tabloları siliyorum...');
    
    // Books tablosunu sil (foreign key nedeniyle önce)
    await sequelize.query('DROP TABLE IF EXISTS books CASCADE;');
    console.log('❌ Books tablosu silindi');
    
    // Users tablosunu sil
    await sequelize.query('DROP TABLE IF EXISTS users CASCADE;');
    console.log('❌ Users tablosu silindi');
    
    // Enum tiplerini sil
    await sequelize.query('DROP TYPE IF EXISTS enum_books_status CASCADE;');
    console.log('❌ Enum tipi silindi');
    
    console.log('\n✅ Temizlik tamamlandı! Artık server çalıştırabilirsiniz.');
    
    await sequelize.close();
  } catch (error) {
    console.error('\n❌ Temizlik hatası:', error.message);
  }
}

clearTables(); 