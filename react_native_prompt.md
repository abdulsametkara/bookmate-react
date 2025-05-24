# BookMate React Native Geliştirme Prompt'u

## Proje Tanımı

BookMate, çiftlerin kitap okuma deneyimini paylaşmalarını sağlayan, okuma alışkanlıklarını takip eden ve 3D kitaplık görselleştirmesi sunan bir mobil uygulamadır. Bu uygulama React Native ile hem iOS hem de Android platformları için geliştirilecektir.

## Teknik Gereksinimler

### Geliştirme Ortamı

- React Native (en güncel LTS sürümü)
- TypeScript
- Firebase (Authentication, Firestore, Storage)
- React Navigation 6+
- State Yönetimi: Redux Toolkit veya MobX

### Mimari Yapı

Aşağıdaki klasör yapısını kullanarak temiz bir mimari oluşturun:

```
/src
  /assets          # Görseller, fontlar ve statik dosyalar
  /components      # Yeniden kullanılabilir UI bileşenleri
  /hooks           # Özel React hooks
  /navigation      # React Navigation yapılandırması
  /screens         # Uygulama ekranları
  /services        # API ve Firebase servisleri
  /store           # State yönetimi (Redux/MobX)
  /theme           # UI teması ve stil sabitleri
  /types           # TypeScript tip tanımlamaları
  /utils           # Yardımcı fonksiyonlar
```

## Ana Özellikler

### 1. Kimlik Doğrulama

- E-posta/şifre ile kayıt ve giriş
- Şifre sıfırlama
- Oturum durumu yönetimi
- Profil bilgisi düzenleme

### 2. Kullanıcı Profili ve Partner Eşleşme

- Profil bilgileri ve resim yükleme
- Partner davet sistemi (e-posta veya kod ile)
- Eşleşme durumu yönetimi
- Kullanıcı tercihleri

### 3. Kitap Kütüphanesi

- Kitap ekleme, düzenleme, silme
- ISBN tarama ile kitap bilgisi alma
- Kitap arama ve filtreleme
- Kitap koleksiyonları oluşturma
- Offline erişim desteği

### 4. Okuma İlerlemesi ve Zamanlayıcı

- Kitap ilerleme takibi (sayfa/yüzde)
- Okuma zamanlayıcısı
- Okuma seansları kaydı ve geçmişi
- Notlar ekleme

### 5. İstatistikler ve Hedefler

- Okuma istatistikleri (günlük/haftalık/aylık/yıllık)
- Okuma hedefleri belirleme ve takip
- Görselleştirmeler (grafikler)
- Partner karşılaştırmaları

### 6. Partner Özellikleri

- Partner aktivite akışı
- Kitap önerileri
- Paylaşılan kitap koleksiyonları

### 7. 3D Kitaplık Görselleştirmesi

- 3D kitaplık görünümü
- Etkileşimli kitap rafları
- Kitapları düzenleme seçenekleri
- Performans optimizasyonları

## UI/UX Gereksinimleri

- Modern ve temiz arayüz
- Koyu/açık tema desteği
- Akıcı animasyonlar ve geçişler
- Erişilebilirlik standartlarına uyum
- Responsive tasarım (farklı ekran boyutları)

## Teknik Zorluklar ve Dikkat Edilmesi Gerekenler

### 3D Kitaplık

- React Three Fiber veya Expo GL kullanarak 3D kitaplık görselleştirmesi
- Düşük performanslı cihazlarda alternatif 2D görünüm
- Bellek kullanımı optimizasyonu
- Gesture kontrolleri (döndürme, yakınlaştırma, seçme)

### Offline Kullanım

- AsyncStorage ile yerel veri saklama
- Firebase offline persistence
- Senkronizasyon çakışma çözümü

### Performans

- Liste görünümlerinde virtualization
- Lazy loading ve code splitting
- Memoization ve render optimizasyonları
- Resim önbelleğe alma

### Güvenlik

- Firebase güvenlik kuralları
- Kullanıcı verisi şifreleme
- Güvenli partner eşleşme

## Test Gereksinimleri

- Jest ile birim testleri
- React Native Testing Library ile bileşen testleri
- E2E testleri (Detox)
- Farklı cihazlarda test

## İlk Sprint Hedefleri

İlk sprint için aşağıdaki görevlere odaklanın:

1. Proje kurulumu ve yapılandırması
2. Temel navigasyon yapısı
3. Firebase entegrasyonu
4. Kimlik doğrulama ekranları (Giriş, Kayıt, Şifre Sıfırlama)
5. Ana ekran taslakları

## Örnek Ekran Akışı

1. Splash Screen
2. Onboarding (ilk kullanım)
3. Auth Flow (Login/Register/ForgotPassword)
4. Main Tab Navigator:
   - Ana Sayfa
   - Kütüphane
   - Okuma Zamanlayıcısı
   - 3D Kitaplık
   - Profil

## Notlar ve Öneriler

- Stil rehberi ve UI bileşenleri için React Native Paper veya UI Kitten kullanılabilir
- SVG ikonları için react-native-svg ve react-native-vector-icons tercih edilebilir
- Formlar için Formik veya React Hook Form kullanılabilir
- Veri doğrulama için Yup veya Zod kullanılabilir
- Animasyonlar için React Native Reanimated tercih edilebilir
- Bildirimler için Firebase Cloud Messaging entegre edilebilir

## Teslimat Beklentileri

- Temiz, okunabilir ve iyi belgelenmiş kod
- Kapsamlı test kapsamı
- Performans optimizasyonları
- Güvenlik önlemleri
- Kullanıcı dostu arayüz
- Hem iOS hem de Android platformlarında sorunsuz çalışma

Bu prompt'u kullanarak BookMate uygulamasının React Native implementasyonuna başlayabilir ve ilk sprintlerde belirtilen özellikleri geliştirebilirsiniz. 