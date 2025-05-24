# BookMate

BookMate, çiftlerin kitap okuma deneyimlerini paylaşmalarını, okuma alışkanlıklarını takip etmelerini ve 3D kitaplık görselleştirmesi sunmayı amaçlayan bir çift okuma uygulamasıdır.

## Özellikler

- **Kitap Takibi**: Okuduğunuz kitapları ekleyin, ilerlemenizi kaydedin ve okuma alışkanlıklarınızı takip edin.
- **Eş Paylaşımı**: Okuma deneyiminizi sevdiğiniz kişiyle paylaşın.
- **Zamanlayıcı**: Okuma oturumlarınızı zamanlayın ve istatistiklerinizi görün.
- **İstek Listesi**: Okumak istediğiniz kitapları kaydedin.
- **Hedefler**: Okuma hedefleri belirleyin ve ilerlemenizi takip edin.
- **İstatistikler**: Okuma alışkanlıklarınızla ilgili detaylı istatistikler görün.

## Kurulum

1. Depoyu klonlayın:
   
   ```
   git clone https://github.com/yourusername/bookmate-react.git
   cd bookmate-react
   ```

2. Bağımlılıkları yükleyin:
   
   ```
   npm install
   ```

3. Uygulamayı başlatın:
   
   ```
   npm start
   ```

## Teknolojiler

- React Native
- Expo
- TypeScript
- Firebase (Authentication, Firestore, Storage)
- React Navigation

## Ekran Görüntüleri

<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="screen_shots/welcome.png" width="200" alt="Karşılama Ekranı">
  <img src="screen_shots/login.png" width="200" alt="Giriş Ekranı">
  <img src="screen_shots/home.png" width="200" alt="Ana Sayfa">
  <img src="screen_shots/library.png" width="200" alt="Kütüphane">
  <img src="screen_shots/book_detail.png" width="200" alt="Kitap Detayı">
  <img src="screen_shots/timer.png" width="200" alt="Zamanlayıcı">
  <img src="screen_shots/profile.png" width="200" alt="Profil">
</div>

## Proje Yapısı

```
bookmate-react/
├── src/                  # Kaynak kodlar
│   ├── assets/           # Resimler, fontlar ve diğer statik dosyalar
│   ├── components/       # Yeniden kullanılabilir UI bileşenleri
│   ├── hooks/            # Özel React Hooks
│   ├── navigation/       # Navigasyon yapılandırması
│   ├── screens/          # Uygulama ekranları
│   ├── services/         # API ve Firebase servisleri
│   ├── store/            # Redux store ve slice'lar
│   ├── theme/            # Tema dosyaları (renkler, tipografi, aralıklar)
│   ├── types/            # TypeScript tip tanımlamaları
│   └── utils/            # Yardımcı fonksiyonlar
└── App.tsx               # Ana uygulama bileşeni
```

## Katkıda Bulunma

1. Projeyi fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add some amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakın.

## İletişim

Proje Sahibi - [@yourusername](https://twitter.com/yourusername)

Proje Linki: [https://github.com/yourusername/bookmate-react](https://github.com/yourusername/bookmate-react) 