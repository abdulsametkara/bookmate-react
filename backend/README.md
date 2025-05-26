# BookMate Backend API

BookMate uygulaması için RESTful API.

## Teknolojiler

- Node.js & Express.js
- TypeScript
- PostgreSQL
- Sequelize ORM
- JWT Authentication

## Kurulum

### Gereksinimler

- Node.js (v14+)
- PostgreSQL

### Adımlar

1. Repoyu klonlayın ve backend klasörüne gidin:

```bash
git clone <repo-url>
cd bookmate-react/backend
```

2. Bağımlılıkları yükleyin:

```bash
npm install
```

3. PostgreSQL'i yükleyin ve bir veritabanı oluşturun:

```sql
CREATE DATABASE bookmate_db;
```

4. `.env` dosyasını oluşturun:

```
PORT=5000
NODE_ENV=development

# PostgreSQL Bağlantı Bilgileri
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bookmate_db
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Token Süresi ve Gizli Anahtar
JWT_SECRET=bookmate_super_secret_key_change_in_production
JWT_EXPIRES_IN=24h

# CORS Ayarları
CORS_ORIGIN=http://localhost:3000
```

5. Veritabanını migrate edin:

```bash
npm run dev
```

İlk çalıştırmada Sequelize ORM tabloları otomatik olarak oluşturacaktır.

## Çalıştırma

### Geliştirme modu

```bash
npm run dev
```

### Üretim modu

```bash
npm run build
npm start
```

## API Endpoints

### Kimlik Doğrulama

- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/login` - Kullanıcı girişi
- `GET /api/auth/profile` - Kullanıcı profili

### Kitaplar

- `GET /api/books` - Tüm kitapları getir
- `GET /api/books/:id` - Belirli bir kitabı getir
- `POST /api/books` - Yeni kitap ekle
- `PUT /api/books/:id` - Kitap güncelle
- `DELETE /api/books/:id` - Kitap sil

### Okuma Seansları

- `GET /api/reading-sessions` - Okuma seanslarını getir
- `POST /api/reading-sessions/start` - Yeni okuma seansı başlat
- `POST /api/reading-sessions/end` - Okuma seansını tamamla

## Lisans

MIT 