# 📚 BookMate - Couples Reading App

BookMate, çiftlerin birlikte okuma deneyimini geliştiren modern bir React Native uygulamasıdır.

## ✨ Özellikler

### 📖 Kitap Yönetimi
- **Kişisel Kütüphane**: Kullanıcı bazlı kitap koleksiyonu
- **Okuma Durumu Takibi**: Okunacak, Okuyor, Tamamlandı
- **İlerleme Takibi**: Sayfa bazlı okuma ilerlemesi
- **3D Kitaplık Görünümü**: Görsel kitap rafı deneyimi

### ⏱️ Okuma Zamanlayıcı
- **Session Takibi**: Günlük okuma seansları
- **Toplam İstatistikler**: Günlük, haftalık, aylık okuma süreleri
- **AsyncStorage Entegrasyonu**: Kalıcı veri saklama
- **Kitap Bazlı Zamanlama**: Her kitap için ayrı timer

### 🔍 Kitap Keşfi
- **Google Books API**: Gerçek kitap arama
- **İstek Listesi**: Gelecekte okunacak kitaplar
- **Kapak Görselleri**: Yüksek kaliteli kitap kapakları
- **Otomatik Bilgi Çekme**: Yazar, yayın yılı, sayfa sayısı

### 👥 Multi-User Hazırlığı
- **User-Aware Storage**: Kullanıcı bazlı veri yönetimi
- **Guest Mode**: Hesapsız kullanım
- **Migration System**: Veri aktarım sistemi
- **Session Management**: Kullanıcı oturum yönetimi

## 🏗️ Teknik Altyapı

### Frontend Stack
- **React Native** + TypeScript
- **Expo SDK 49+**
- **React Navigation 6**
- **Redux Toolkit** (State Management)
- **React Native Paper** (UI Components)
- **Vector Icons** (MaterialCommunityIcons)

### Data Management
- **AsyncStorage**: Local veri saklama
- **Redux Store**: Global state yönetimi
- **User-Based Storage**: Kullanıcı isolation
- **Migration System**: Veri versiyonlama

### External APIs
- **Google Books API**: Kitap arama
- **Expo Barcode Scanner**: QR/Barcode tarama
- **AsyncStorage**: Persistent storage

## 📱 Ekranlar

### Ana Navigasyon
- **Kütüphane**: Kitap koleksiyonu yönetimi
- **İstek Listesi**: Okuma planları
- **İstatistikler**: Okuma analitikleri
- **Profil**: Kullanıcı ayarları

### Özel Ekranlar
- **BookDetail**: Detaylı kitap bilgisi
- **ReadingTimer**: Okuma zamanlayıcı
- **BookShelf3D**: 3D kitaplık görünümü
- **EditBook**: Kitap düzenleme

## 🎨 Design System

### Tema Sistemi
```typescript
Colors: {
  primary: '#007AFF',
  surface: '#FFFFFF',
  background: '#F8F9FA',
  // ... ve daha fazlası
}

Spacing: {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32
}

BorderRadius: {
  sm: 6, md: 12, lg: 18, full: 9999
}
```

## 📊 Veri Yapısı

### Kitap Modeli
```typescript
interface Book {
  id: string;
  title: string;
  author: string;
  coverURL: string;
  pageCount: number;
  currentPage: number;
  progress: number;
  status: 'TO_READ' | 'READING' | 'COMPLETED';
  userId?: string; // Multi-user support
  // ... diğer alanlar
}
```

### Kullanıcı Modeli
```typescript
interface User {
  id: string;
  email?: string;
  displayName?: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    readingGoal?: number;
    // ... diğer tercihler
  };
}
```

## 🔒 Güvenlik & Gizlilik

### Veri Saklama
- **Local Storage**: AsyncStorage ile güvenli saklama
- **User Isolation**: Kullanıcı bazlı veri ayrımı
- **No External Tracking**: Harici veri toplama yok
- **GDPR Ready**: Gizlilik standartları

### Gelecek Planları
- **Firebase Authentication**: Güvenli giriş sistemi
- **Cloud Sync**: Cihazlar arası senkronizasyon
- **End-to-End Encryption**: Uçtan uca şifreleme
- **Social Features**: Arkadaş sistemi

## 🚀 Kurulum

### Gereksinimler
- Node.js 16+
- Expo CLI
- React Native development environment

### Adımlar
```bash
# Projeyi klonla
git clone [repo-url]

# Bağımlılıkları yükle
npm install

# Expo sunucusunu başlat
npx expo start

# iOS/Android simulator'da çalıştır
npx expo run:ios
npx expo run:android
```

## 📈 Performans

### Optimizasyonlar
- **Lazy Loading**: Dinamik component yükleme
- **Image Caching**: Kapak görseli önbellekleme
- **AsyncStorage Batching**: Toplu veri işlemleri
- **Redux Memoization**: Gereksiz re-render önleme

### Metrics
- **App Size**: ~50MB
- **Cold Start**: <3 saniye
- **Navigation**: <100ms geçiş
- **Data Load**: <500ms AsyncStorage

## 🔮 Gelecek Güncellemeler

### Phase 1: Authentication
- [ ] Firebase Authentication entegrasyonu
- [ ] Email/Password giriş sistemi
- [ ] Social login (Google, Apple)
- [ ] Guest → Registered user migration

### Phase 2: Cloud Features
- [ ] Firebase Firestore entegrasyonu
- [ ] Real-time data sync
- [ ] Offline-first architecture
- [ ] Cross-device synchronization

### Phase 3: Social Features
- [ ] Partner reading system
- [ ] Reading challenges
- [ ] Book recommendations
- [ ] Community features

### Phase 4: Advanced Analytics
- [ ] Reading patterns analysis
- [ ] Goal tracking & achievements
- [ ] Personalized insights
- [ ] Progress visualization

## 🤝 Katkıda Bulunma

Bu proje açık kaynak değildir, ancak öneriler ve geri bildirimler memnuniyetle karşılanır.

## 📄 Lisans

Bu proje özel bir lisans altındadır. Ticari kullanım için izin gereklidir.

---

**BookMate** - Okuma tutkunları için modern bir deneyim 📚✨ 