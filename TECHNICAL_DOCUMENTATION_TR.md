# BookMate Teknik Dokümantasyonu

## Mimari Genel Bakış

BookMate, kullanıcı arayüzü, iş mantığı ve veri modelleri arasında net bir ayrım sağlayan MVVM (Model-View-ViewModel) mimari deseni kullanılarak geliştirilmiştir. Uygulama, UI framework için Swift ve SwiftUI, 3D görselleştirme için ise SceneKit kullanılarak geliştirilmiştir.

## Temel Bileşenler

### 1. Modeller

Veri katmanı birkaç anahtar modelden oluşur:

#### Kitap Modeli
```swift
struct Book: Identifiable, Codable, Equatable {
    @DocumentID var id: String?
    var title: String
    var author: String
    var coverURL: URL?
    var isbn: String?
    var pageCount: Int
    var currentPage: Int
    var dateAdded: Date
    var readingStatus: ReadingStatus
    // Ek özellikler
}
```

#### Kullanıcı Modeli
```swift
struct User: Identifiable, Codable {
    var id: String
    var name: String
    var email: String
    var profileImageURL: URL?
    var partnerId: String?
    var partnershipStatus: PartnershipStatus
    // Ek özellikler
}
```

#### Okuma Aktivitesi Modeli
```swift
struct ReadingActivity: Identifiable, Codable {
    var id: String
    var userId: String
    var bookId: String
    var timestamp: Date
    var activityType: ActivityType
    var details: String?
    // Ek özellikler
}
```

### 2. ViewModeller

ViewModeller, Görünümler ve Modeller arasında aracı görevi görür, iş mantığını ve veri dönüşümlerini yönetir:

#### BookViewModel
Kitapları ekleme, güncelleme ve getirme gibi kitapla ilgili işlemleri yönetir. Verileri kalıcı hale getirmek için Firebase ve Core Data servisleriyle iletişim kurar.

#### UserViewModel
Kullanıcı profili yönetimi, partner bağlantıları ve kullanıcı tercihlerini yönetir.

#### Library3DViewModel
3D kütüphane görselleştirmesini yönetir, SceneKit sahnesini oluşturma, kitapları farklı kriterlere göre düzenleme ve 3D ortamla kullanıcı etkileşimlerini yönetme işlevlerini içerir.

### 3. Görünümler

UI katmanı SwiftUI ile oluşturulmuş ve birkaç temel ekrana ayrılmıştır:

#### MainTabView
Ana sekmeleri barındıran ana gezinme konteyneri:
- HomeView
- MyLibraryView
- ReadingTimerView
- BookshelfView (3D)
- CoupleView
- ProfileView

#### Library3DView
Kullanıcının tamamlanmış kitaplarının SceneKit kullanılarak 3D görselleştirmesini sağlar.

#### ReadingTimerView
İstatistik takibi ile odaklanmış bir okuma zamanlayıcısı.

#### BookDetailView
Kitap meta verilerini, okuma ilerlemesini ve notları gösteren detaylı kitap görünümü.

## Veri Akışı

1. **Kullanıcı Kimlik Doğrulaması**:
   - Kullanıcı kimlik bilgileri Firebase Authentication üzerinden doğrulanır
   - Kullanıcı profil verileri Firebase Firestore'da saklanır
   - Kimlik doğrulama durumu AuthViewModel tarafından yönetilir

2. **Kitap Yönetimi**:
   - Kitaplar manuel olarak veya ISBN taraması yoluyla eklenir
   - Kitap meta verileri Google Books API veya Open Library API'dan alınır
   - Kitap verileri yerel olarak Core Data'da saklanır ve Firebase'e senkronize edilir
   - Okuma ilerlemesi güncellemeleri aktivite olaylarını tetikler

3. **Partner Bağlantısı**:
   - Kullanıcılar e-posta yoluyla partner istekleri gönderebilir
   - Kabul edildiğinde, kullanıcılar veritabanında bağlanır
   - Okuma aktiviteleri partnerler arasında gerçek zamanlı olarak paylaşılır

4. **3D Kütüphane Görselleştirmesi**:
   - Tamamlanan kitaplar SceneKit kullanılarak 3D bir kitaplıkta gösterilir
   - Kitaplar farklı kriterlere göre düzenlenebilir (kronolojik, yazar, tür, renk)
   - Kütüphane, daha fazla kitap tamamlandıkça genişler

## Veritabanı Şeması

### Firebase Koleksiyonları

#### users
```
{
  "id": "string",
  "name": "string",
  "email": "string",
  "profileImageURL": "string",
  "partnerId": "string",
  "partnershipStatus": "enum",
  "createdAt": "timestamp",
  "lastActive": "timestamp",
  "readingGoals": { ... }
}
```

#### books
```
{
  "id": "string",
  "userId": "string",
  "title": "string",
  "author": "string",
  "isbn": "string",
  "pageCount": "number",
  "currentPage": "number",
  "dateAdded": "timestamp",
  "dateUpdated": "timestamp",
  "readingStatus": "enum",
  "sharedWithPartner": "boolean"
}
```

#### reading_activities
```
{
  "id": "string",
  "userId": "string",
  "bookId": "string",
  "timestamp": "timestamp",
  "activityType": "enum",
  "details": "string"
}
```

#### reading_sessions
```
{
  "id": "string",
  "userId": "string",
  "bookId": "string",
  "startTime": "timestamp",
  "endTime": "timestamp",
  "duration": "number",
  "pagesRead": "number"
}
```

### Core Data Varlıkları

- BookEntity
- UserEntity
- ReadingSessionEntity
- BookCollectionEntity
- ReadingGoalEntity

## Anahtar Özelliklerin Uygulanması

### 3D Kütüphane

3D kütüphane, SceneKit kullanılarak aşağıdaki bileşenlerle uygulanmıştır:

1. **Library3DModel**: Kitaplık rafları, kitap konumları ve organizasyon mantığı dahil olmak üzere 3D kütüphanenin yapısını temsil eder.

2. **Library3DViewModel**: 3D sahnenin oluşturulması ve güncellenmesini yönetir, kullanıcı etkileşimlerini ve görüntüleme tercihlerini işler.

3. **Library3DView**: SceneKit sahnesini barındıran ve kütüphaneyle etkileşim için UI kontrolleri sağlayan SwiftUI görünümü.

Uygulama şunlara olanak tanır:
- Tamamlanan kitapların sayısına göre dinamik kitaplık rafları oluşturma
- Çoklu organizasyon modları (kronolojik, yazara göre, türe göre, renge göre)
- İnteraktif döndürme ve yakınlaştırma
- Kitap seçimi ve detay görüntüleme

### Okuma Zamanlayıcısı

Okuma zamanlayıcısı özelliği şunları içerir:

1. **ReadingTimerViewModel**: Zamanlayıcı durumunu, seans kaydını ve istatistik hesaplamalarını yönetir.

2. **ReadingTimerView**: Zamanlayıcıyı ayarlamak ve kontrol etmek için UI sağlar, okuma ilerlemesi hakkında görsel geri bildirim verir.

3. **ReadingSessionEntity**: Tamamlanan okuma seanslarını veritabanında saklar.

Özellikler şunları içerir:
- Özelleştirilebilir seans süresi
- Okuma istatistikleri (dakika başına sayfa, harcanan zaman)
- Seans geçmişi ve trendler
- İsteğe bağlı odak modu

### Partner Senkronizasyonu

Partner özellikleri şunlar aracılığıyla uygulanır:

1. **PartnershipService**: Partner bağlantılarını, davetleri ve durum güncellemelerini yönetir.

2. **UserViewModel**: Kullanıcı ilişki yönlerini ve paylaşılan veri izinlerini yönetir.

3. **CoupleView**: Partner aktiviteleri, paylaşılan kitaplar ve öneriler için UI sağlar.

Senkronizasyon süreci:
- Firebase dinleyicileri kullanarak gerçek zamanlı güncellemeler
- Kitap başına yapılandırılabilir paylaşım izinleri
- Partner'ın okuma ilerlemesinin aktivite akışı
- Kitap öneri sistemi

## Güvenlik ve Gizlilik

1. **Kimlik Doğrulama**: E-posta/şifre ve isteğe bağlı sosyal giriş ile Firebase Authentication.

2. **Veri Gizliliği**: 
   - Kullanıcı verileri uygun güvenlik kurallarıyla Firebase'de güvenli bir şekilde saklanır
   - Okuma verileri yalnızca açık partner bağlantılarıyla paylaşılır
   - Gizlilik ayarları, kullanıcıların hangi bilgilerin paylaşılacağını kontrol etmesine olanak tanır

3. **Çevrimdışı Destek**:
   - Core Data çevrimdışı erişim için yerel depolama sağlar
   - Bağlantı geri yüklendiğinde veri senkronizasyonu gerçekleşir

## Performans Değerlendirmeleri

1. **3D Render Optimizasyonu**:
   - Karmaşık kitap modelleri için Detay Seviyesi (LOD) uygulaması
   - Doku sıkıştırma ve önbelleğe alma
   - Kitap kapaklarının ve dokuların tembel yüklenmesi

2. **Veri Yönetimi**:
   - Büyük kitap koleksiyonları için sayfalama
   - Firebase için verimli sorgulama desenleri
   - Veri senkronizasyonu için arka plan işleme

3. **Batarya Kullanımı**:
   - UI güncellemeleri için optimize edilmiş yenileme oranları
   - Verimli arka plan süreçleri
   - Batarya kullanımında azaltılmış ağ işlemleri

## Test Stratejisi

1. **Birim Testleri**:
   - Model doğrulama ve iş mantığı
   - ViewModel durum yönetimi
   - Servis katmanı işlevselliği

2. **UI Testleri**:
   - Kritik kullanıcı akışları
   - Erişilebilirlik uyumluluğu
   - Cihaz uyumluluğu

3. **Performans Testleri**:
   - Büyük koleksiyonlarla 3D kütüphane görüntüleme
   - Zayıf bağlantıyla veri senkronizasyonu
   - Batarya kullanımı izleme

## Dağıtım Hattı

1. **Geliştirme Ortamı**:
   - Xcode ile yerel geliştirme
   - Geliştirme Firebase örneği

2. **Test Ortamı**:
   - TestFlight dağıtımı
   - Hazırlık Firebase örneği

3. **Üretim Ortamı**:
   - App Store dağıtımı
   - Sıkı güvenlik kurallarına sahip üretim Firebase örneği

## Üçüncü Taraf Bağımlılıkları

- **Firebase**: Kimlik Doğrulama, Firestore, Depolama, Analitik
- **SDWebImage**: Verimli görüntü yükleme ve önbelleğe alma
- **CodeScanner**: ISBN barkod tarama işlevselliği
- **Charts**: Okuma istatistikleri için veri görselleştirme
- **Lottie**: Başarılar ve kilometre taşları için animasyon efektleri

## Gelecek Teknik Değerlendirmeler

1. **Ölçeklenebilirlik**:
   - Büyük kullanıcı tabanı için parçalama stratejisi
   - Sık erişilen veriler için önbellek katmanları
   - Büyüyen veri kümeleri için optimize edilmiş sorgu desenleri

2. **Özellik Uzantıları**:
   - Okuma önerileri için makine öğrenimi
   - Gelişmiş 3D deneyim için AR entegrasyonu
   - Partner bağlantıları ötesinde sosyal özellikler

3. **Platform Genişlemesi**:
   - watchOS yardımcı uygulaması
   - Masaüstü okuma için macOS versiyonu
   - iOS ana ekranı için widget desteği

---

*Bu teknik dokümantasyon BookMate geliştirme ekibi tarafından sürdürülmektedir ve uygulama geliştikçe güncellenmelidir.* 