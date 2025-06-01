# BookMate API Endpoints

## 🔐 Authentication
- `POST /api/auth/register` - Kullanıcı kaydı ✅ (Mevcut)
- `POST /api/auth/login` - Kullanıcı girişi ✅ (Mevcut)
- `POST /api/auth/logout` - Kullanıcı çıkışı
- `GET /api/auth/me` - Kullanıcı bilgileri

## 📚 Kitaplar (Books)
- `GET /api/books` - Tüm kitapları listele (arama, filtreleme)
- `GET /api/books/:id` - Kitap detayı
- `POST /api/books` - Yeni kitap ekle
- `PUT /api/books/:id` - Kitap güncelle
- `DELETE /api/books/:id` - Kitap sil
- `GET /api/books/search` - Kitap arama (başlık, yazar)

## 📖 Kullanıcı Kitap Koleksiyonu (User Books)
- `GET /api/user/books` - Kullanıcının kitapları
- `POST /api/user/books` - Kitabı koleksiyona ekle
- `PUT /api/user/books/:id` - Kitap durumunu güncelle
- `DELETE /api/user/books/:id` - Kitabı koleksiyondan çıkar
- `GET /api/user/books/status/:status` - Duruma göre kitaplar (reading, completed, etc.)

## 📝 Okuma Seansları (Reading Sessions)
- `GET /api/user/reading-sessions` - Kullanıcının okuma seansları
- `POST /api/user/reading-sessions/start` - Okuma seansı başlat
- `PUT /api/user/reading-sessions/:id/end` - Okuma seansı bitir
- `GET /api/user/reading-sessions/stats` - Okuma istatistikleri

## ❤️ İstek Listesi (Wishlist)
- `GET /api/user/wishlist` - Kullanıcının istek listesi
- `POST /api/user/wishlist` - İstek listesine ekle
- `DELETE /api/user/wishlist/:id` - İstek listesinden çıkar
- `PUT /api/user/wishlist/:id/priority` - Öncelik güncelle

## ⭐ Kitap Yorumları (Reviews)
- `GET /api/books/:id/reviews` - Kitabın yorumları
- `POST /api/books/:id/reviews` - Yorum ekle
- `PUT /api/reviews/:id` - Yorumu güncelle
- `DELETE /api/reviews/:id` - Yorumu sil
- `GET /api/user/reviews` - Kullanıcının yorumları

## 🎯 Okuma Hedefleri (Reading Goals)
- `GET /api/user/goals` - Kullanıcının hedefleri
- `POST /api/user/goals` - Yeni hedef oluştur
- `PUT /api/user/goals/:id` - Hedef güncelle
- `DELETE /api/user/goals/:id` - Hedef sil
- `GET /api/user/goals/progress` - Hedef ilerleme durumu

## 🏷️ Kategoriler (Categories)
- `GET /api/categories` - Tüm kategoriler
- `GET /api/categories/:id/books` - Kategorideki kitaplar

## ⚙️ Kullanıcı Ayarları (User Preferences)
- `GET /api/user/preferences` - Kullanıcı tercihleri
- `PUT /api/user/preferences` - Tercihleri güncelle

## 📊 İstatistikler (Statistics)
- `GET /api/user/stats/daily` - Günlük istatistikler
- `GET /api/user/stats/weekly` - Haftalık istatistikler
- `GET /api/user/stats/monthly` - Aylık istatistikler
- `GET /api/user/stats/yearly` - Yıllık istatistikler

## 🔍 Arama ve Keşif
- `GET /api/search/books` - Kitap arama
- `GET /api/recommendations` - Kitap önerileri
- `GET /api/trending` - Popüler kitaplar

## 📱 Mobil App Specific
- `GET /api/dashboard` - Ana sayfa verileri
- `GET /api/user/recent-activity` - Son aktiviteler
- `POST /api/user/sync` - Veri senkronizasyonu 
 