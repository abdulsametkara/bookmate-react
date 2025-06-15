import AsyncStorage from '@react-native-async-storage/async-storage';
import { Book } from '../store/bookSlice';
import UserManager from './userManager';
import ReadingSessionManager from './readingSessionManager';
import OpenAIService, { AIRecommendation, UserReadingProfile } from '../services/openaiService';
import GoogleBooksService from '../services/googleBooksService';

export interface RecommendedBook {
  id: string;
  title: string;
  author: string;
  coverURL: string;
  genre: string;
  pageCount: number;
  publishYear?: number;
  description: string;
  recommendationReason: string;
  score: number; // 0-100 recommendation score
}

export interface CategoryRecommendations {
  category: string;
  books: RecommendedBook[];
  totalCount: number;
}

// Genişletilmiş kitap veritabanı - OpenLibrary URL'leri ile
const BOOK_DATABASE: RecommendedBook[] = [
  // === KLASİKLER ===
  {
    id: 'classic_1',
    title: 'Suç ve Ceza',
    author: 'Fyodor Dostoyevski',
    coverURL: 'https://covers.openlibrary.org/b/isbn/9780486454115-L.jpg',
    genre: 'Klasik Edebiyat',
    pageCount: 671,
    publishYear: 1866,
    description: 'Dostoyevski\'nin en ünlü eserlerinden biri olan Suç ve Ceza, insan psikolojisinin derinliklerine inen büyük bir roman. Raskolnikov\'un suçtan sonraki ruhsal çöküşünü anlatan bu eser, vicdan ve adalet temalarını işler.',
    recommendationReason: 'Dünya edebiyatının başyapıtı',
    score: 95
  },
  {
    id: 'classic_2',
    title: '1984',
    author: 'George Orwell',
    coverURL: 'https://covers.openlibrary.org/b/isbn/9780452284234-L.jpg',
    genre: 'Bilim Kurgu',
    pageCount: 328,
    publishYear: 1949,
    description: 'Orwell\'in distopik geleceği anlattığı bu eser, totaliter rejimleri ve gözetim toplumunu konu alır. Büyük Birader\'in izlediği bir dünyada Winston Smith\'in özgürlük arayışını anlatır.',
    recommendationReason: 'Çağımızın öngörülen klasiği',
    score: 92
  },
  {
    id: 'classic_3',
    title: 'Simyacı',
    author: 'Paulo Coelho',
    coverURL: 'https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg',
    genre: 'Felsefe',
    pageCount: 208,
    publishYear: 1988,
    description: 'Bir çoban çocuğun hayallerinin peşinden gidişini anlatan felsefi roman. Kişisel efsaneyi bulma, hayallerin peşinden gitme ve evrenle uyum içinde yaşama üzerine derin mesajlar verir.',
    recommendationReason: 'Modern klasik felsefe romanı',
    score: 88
  },
  {
    id: 'classic_4',
    title: 'Sefiller',
    author: 'Victor Hugo',
    coverURL: 'https://covers.openlibrary.org/b/isbn/9780451419439-L.jpg',
    genre: 'Klasik Edebiyat',
    pageCount: 1463,
    publishYear: 1862,
    description: 'Hugo\'nun sosyal adaletsizliği anlattığı büyük eseri. Jean Valjean\'ın yaşam mücadelesini merkeze alarak 19. yüzyıl Fransa\'sının toplumsal sorunlarını ele alır.',
    recommendationReason: 'Fransız edebiyatının şaheseri',
    score: 94
  },
  {
    id: 'classic_5',
    title: 'Dune',
    author: 'Frank Herbert',
    coverURL: 'https://covers.openlibrary.org/b/isbn/9780441172719-L.jpg',
    genre: 'Bilim Kurgu',
    pageCount: 688,
    publishYear: 1965,
    description: 'Çöl gezegeni Arrakis\'te geçen bilim kurgu destanı. Paul Atreides\'in gücün, dinin ve siyasetin karmaşık dünyasındaki yolculuğunu anlatır.',
    recommendationReason: 'Bilim kurgu klasiği',
    score: 91
  },
  {
    id: 'classic_6',
    title: 'And Then There Were None',
    author: 'Agatha Christie',
    coverURL: 'https://covers.openlibrary.org/b/isbn/9780062073488-L.jpg',
    genre: 'Polisiye',
    pageCount: 272,
    publishYear: 1939,
    description: 'Christie\'nin en ünlü polisiye romanı. Adada mahsur kalan on kişinin gizemli ölümlerini konu alan bu eser, polisiye edebiyatının başyapıtlarından biri.',
    recommendationReason: 'Polisiye ustası Christie\'den',
    score: 88
  },
  {
    id: 'classic_7',
    title: 'Meditations',
    author: 'Marcus Aurelius',
    coverURL: 'https://covers.openlibrary.org/b/isbn/9780486298238-L.jpg',
    genre: 'Felsefe',
    pageCount: 254,
    publishYear: 180,
    description: 'Roma İmparatoru Marcus Aurelius\'un kişisel düşüncelerini içeren stoic felsefe eseri. İç huzur ve bilgelik arayışında rehber niteliğinde.',
    recommendationReason: 'Antik bilgelik',
    score: 85
  },

  // === POPÜLER KİTAPLAR ===
  {
    id: 'popular_1',
    title: 'Sapiens: A Brief History of Humankind',
    author: 'Yuval Noah Harari',
    coverURL: 'https://covers.openlibrary.org/b/isbn/9780062316095-L.jpg',
    genre: 'Tarih',
    pageCount: 512,
    publishYear: 2011,
    description: 'İnsanlığın 70.000 yıllık serüvenini anlatan, evrimden modern çağa kadar uzanan kapsamlı bir tarih kitabı. Homo sapiens\'in nasıl gezegene hakim olduğunu bilimsel açıdan inceler.',
    recommendationReason: 'En çok okunan tarih kitabı',
    score: 90
  },
  {
    id: 'popular_2',
    title: 'Atomic Habits',
    author: 'James Clear',
    coverURL: 'https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg',
    genre: 'Kişisel Gelişim',
    pageCount: 320,
    publishYear: 2018,
    description: 'Küçük değişikliklerin büyük sonuçlar yaratmasını sağlayan alışkanlık oluşturma rehberi. Davranış değişikliği konusunda bilimsel yaklaşım sunar.',
    recommendationReason: 'Global bestseller',
    score: 87
  },
  {
    id: 'popular_3',
    title: 'The 7 Habits of Highly Effective People',
    author: 'Stephen R. Covey',
    coverURL: 'https://covers.openlibrary.org/b/isbn/9781451639612-L.jpg',
    genre: 'Kişisel Gelişim',
    pageCount: 381,
    publishYear: 1989,
    description: 'Etkili insanların 7 alışkanlığını anlatan bu eser, liderlik ve kişisel gelişim konusunda rehber niteliğindedir.',
    recommendationReason: 'Liderlik klassici',
    score: 86
  },
  {
    id: 'popular_4',
    title: 'Thinking, Fast and Slow',
    author: 'Daniel Kahneman',
    coverURL: 'https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg',
    genre: 'Psikoloji',
    pageCount: 499,
    publishYear: 2011,
    description: 'Nobel ödüllü psikolog Kahneman\'ın insan zihninin nasıl çalıştığını anlattığı eser. Hızlı ve yavaş düşünme sistemlerini bilimsel olarak açıklar.',
    recommendationReason: 'Psikoloji alanında devrim',
    score: 89
  },
  {
    id: 'popular_5',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    coverURL: 'https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg',
    genre: 'Teknoloji',
    pageCount: 464,
    publishYear: 2008,
    description: 'Temiz kod yazma sanatı hakkında kapsamlı rehber. Yazılım geliştiriciler için okunabilir ve sürdürülebilir kod yazma teknikleri.',
    recommendationReason: 'Yazılım profesyonelleri için',
    score: 86
  },
  {
    id: 'popular_6',
    title: 'The Psychology of Money',
    author: 'Morgan Housel',
    coverURL: 'https://covers.openlibrary.org/b/isbn/9780857197689-L.jpg',
    genre: 'Finans',
    pageCount: 256,
    publishYear: 2020,
    description: 'Para ve yatırım kararlarının arkasındaki psikolojik faktörleri inceleyen kitap. Finansal başarı için davranışsal yaklaşımlar sunar.',
    recommendationReason: 'Finans psikolojisi klasiği',
    score: 88
  },

  // === YENİ ÇIKANLAR (2019-2024) ===
  {
    id: 'new_1',
    title: 'It Ends with Us',
    author: 'Colleen Hoover',
    coverURL: 'https://covers.openlibrary.org/b/isbn/9781501110375-L.jpg',
    genre: 'Roman',
    pageCount: 384,
    publishYear: 2022,
    description: 'Aşk, kayıp ve yeniden başlama hakkında güçlü bir hikaye. Aile içi şiddet konusunu hassas bir şekilde ele alan duygusal bir roman.',
    recommendationReason: 'TikTok\'ta viral olan trend roman',
    score: 85
  },
  {
    id: 'new_2',
    title: 'The Seven Husbands of Evelyn Hugo',
    author: 'Taylor Jenkins Reid',
    coverURL: 'https://covers.openlibrary.org/b/isbn/9781501161933-L.jpg',
    genre: 'Roman',
    pageCount: 400,
    publishYear: 2020,
    description: 'Ünlü bir aktrisin yaşam hikayesini anlatan büyüleyici roman. Hollywood\'un altın çağından günümüze uzanan bir aşk ve gizem hikayesi.',
    recommendationReason: 'Yeni nesil bestseller',
    score: 87
  },
  {
    id: 'new_3',
    title: 'Project Hail Mary',
    author: 'Andy Weir',
    coverURL: 'https://covers.openlibrary.org/b/isbn/9780593135204-L.jpg',
    genre: 'Bilim Kurgu',
    pageCount: 496,
    publishYear: 2021,
    description: 'Uzayda tek başına kalan bir astronotun insanlığı kurtarma çabasını anlatan bilim kurgu romanı. The Martian\'ın yazarından yeni bir şaheser.',
    recommendationReason: 'Bilim kurgu severler için',
    score: 88
  },
  {
    id: 'new_4',
    title: 'Klara and the Sun',
    author: 'Kazuo Ishiguro',
    coverURL: 'https://covers.openlibrary.org/b/isbn/9780593318171-L.jpg',
    genre: 'Bilim Kurgu',
    pageCount: 352,
    publishYear: 2021,
    description: 'Nobel ödüllü yazarın yapay zeka ve insanlık üzerine düşündüren eseri. Bir robot arkadaşın gözünden anlatılan dokunaklı hikaye.',
    recommendationReason: 'Nobel yazarının yeni eseri',
    score: 86
  },
  {
    id: 'new_5',
    title: 'The Midnight Library',
    author: 'Matt Haig',
    coverURL: 'https://covers.openlibrary.org/b/isbn/9780525559474-L.jpg',
    genre: 'Roman',
    pageCount: 288,
    publishYear: 2020,
    description: 'Pişmanlıklar ve alternatif yaşamlar üzerine felsefi bir roman. Yaşamın anlamını sorgulatan derin bir hikaye.',
    recommendationReason: 'Felsefi derinlik',
    score: 84
  },
  {
    id: 'new_6',
    title: 'Educated',
    author: 'Tara Westover',
    coverURL: 'https://covers.openlibrary.org/b/isbn/9780399590504-L.jpg',
    genre: 'Biyografi',
    pageCount: 352,
    publishYear: 2019,
    description: 'Yazarın kendi yaşam hikayesini anlattığı etkileyici memoir. Eğitimin gücü ve aile bağları üzerine derin bir anlatı.',
    recommendationReason: 'Gerçek yaşam hikayesi',
    score: 89
  },

  // === TÜR ÇEŞİTLİLİĞİ ===
  {
    id: 'fantasy_1',
    title: 'The Name of the Wind',
    author: 'Patrick Rothfuss',
    coverURL: 'https://covers.openlibrary.org/b/isbn/9780756404079-L.jpg',
    genre: 'Fantastik',
    pageCount: 662,
    publishYear: 2007,
    description: 'Kvothe\'nin efsanevi hikayesini anlatan fantastik roman. Müzik, sihir ve macera dolu bir dünyada geçer.',
    recommendationReason: 'Modern fantasy klasiği',
    score: 90
  },
  {
    id: 'romance_1',
    title: 'The Hating Game',
    author: 'Sally Thorne',
    coverURL: 'https://covers.openlibrary.org/b/isbn/9780062439598-L.jpg',
    genre: 'Romantik',
    pageCount: 384,
    publishYear: 2016,
    description: 'Düşmanken aşık olan iki iş arkadaşının hikayesi. Esprili ve çekici bir romantik komedi.',
    recommendationReason: 'Popüler romantik komedi',
    score: 83
  },
  {
    id: 'history_1',
    title: 'The Guns of August',
    author: 'Barbara Tuchman',
    coverURL: 'https://covers.openlibrary.org/b/isbn/9780345386236-L.jpg',
    genre: 'Tarih',
    pageCount: 511,
    publishYear: 1962,
    description: 'Birinci Dünya Savaşı\'nın başlangıcını anlatan ödüllü tarih kitabı. Savaşın ilk aylarını detaylı bir şekilde inceler.',
    recommendationReason: 'Tarih yazımında klasik',
    score: 87
  },
  {
    id: 'mystery_1',
    title: 'The Silent Patient',
    author: 'Alex Michaelides',
    coverURL: 'https://covers.openlibrary.org/b/isbn/9781250301697-L.jpg',
    genre: 'Gerilim',
    pageCount: 336,
    publishYear: 2019,
    description: 'Kocasını öldürdükten sonra konuşmayı bırakan kadının gizemini çözmeye çalışan psikoterapistin hikayesi.',
    recommendationReason: 'Gerilim ustası',
    score: 86
  },
  {
    id: 'scifi_1',
    title: 'The Martian',
    author: 'Andy Weir',
    coverURL: 'https://covers.openlibrary.org/b/isbn/9780553418026-L.jpg',
    genre: 'Bilim Kurgu',
    pageCount: 369,
    publishYear: 2011,
    description: 'Mars\'ta tek başına kalan astronotun hayatta kalma mücadelesi. Bilim ve mizah dolu eğlenceli bir macera.',
    recommendationReason: 'Bilim kurgu klasiği',
    score: 89
  }
];

// Enhanced book database with API cover loading
let ENHANCED_BOOK_DATABASE: RecommendedBook[] = [...BOOK_DATABASE];
let isLoadingCovers = false;

class RecommendationManager {
  
  // Cache yönetimi için static değişkenler
  private static aiRecommendationsCache: Map<string, {
    recommendations: CategoryRecommendations;
    timestamp: number;
    bookCount: number;
  }> = new Map();
  
  private static readonly CACHE_DURATION = 30 * 60 * 1000; // 30 dakika
  
  // Cache'i temizle
  static clearRecommendationsCache(userId?: string) {
    if (userId) {
      console.log(`🗑️ ${userId} için AI önerileri cache'i temizleniyor...`);
      this.aiRecommendationsCache.delete(userId);
    } else {
      console.log(`🗑️ Tüm AI önerileri cache'i temizleniyor...`);
      this.aiRecommendationsCache.clear();
    }
  }
  
  // Cache'den öneri al
  private static getCachedRecommendations(userId: string, currentBookCount: number): CategoryRecommendations | null {
    const cached = this.aiRecommendationsCache.get(userId);
    
    if (!cached) {
      console.log('📭 Cache boş, yeni öneri gerekiyor...');
      return null;
    }
    
    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION;
    const bookCountChanged = cached.bookCount !== currentBookCount;
    
    if (isExpired) {
      console.log('⏰ Cache süresi dolmuş, yeni öneri gerekiyor...');
      this.aiRecommendationsCache.delete(userId);
      return null;
    }
    
    if (bookCountChanged) {
      console.log(`📚 Kitap sayısı değişti (${cached.bookCount} → ${currentBookCount}), cache temizleniyor...`);
      this.aiRecommendationsCache.delete(userId);
      return null;
    }
    
    console.log(`💾 Cache'den öneri alınıyor...`);
    return cached.recommendations;
  }
  
  // Cache'e öneri kaydet
  private static setCachedRecommendations(userId: string, recommendations: CategoryRecommendations, bookCount: number) {
    console.log(`💾 Cache'e ${recommendations.books.length} öneri kaydediliyor...`);
    this.aiRecommendationsCache.set(userId, {
      recommendations,
      timestamp: Date.now(),
      bookCount
    });
  }
  
  // Popüler kitapları getir
  static async getPopularBooks(limit: number = 8): Promise<CategoryRecommendations> {
    try {
      console.log('🔥 Popüler kitaplar yükleniyor...');
      
      // Use enhanced books with proper covers
      const enhancedBooks = this.getEnhancedBooks();
      
      // Popüler kitaplar: yüksek puan + geniş okuyucu kitlesi
      let popularBooks = enhancedBooks
        .filter(book => 
          book.score >= 85 && 
          ['Tarih', 'Kişisel Gelişim', 'Psikoloji', 'Teknoloji', 'Roman', 'Finans'].includes(book.genre)
        )
        .sort((a, b) => {
          // Önce puan, sonra yayın yılı (yeni olanlar önce)
          if (b.score !== a.score) return b.score - a.score;
          return (b.publishYear || 0) - (a.publishYear || 0);
        });

      // Eğer yeterli kitap yoksa Google Books'tan ek popüler kitaplar ekle
      if (popularBooks.length < limit) {
        console.log(`📚 Google Books'tan ek popüler kitaplar getiriliyor...`);
        try {
          const googleBooks = await this.fetchGoogleBooksPopular(limit - popularBooks.length);
          popularBooks = [...popularBooks, ...googleBooks];
        } catch (googleError) {
          console.log('⚠️ Google Books hatası, sadece yerel kitaplar kullanılıyor');
        }
      }

      const finalBooks = popularBooks.slice(0, limit);
      console.log(`✅ ${finalBooks.length} popüler kitap bulundu`);

      return {
        category: 'Popüler Kitaplar',
        books: finalBooks,
        totalCount: finalBooks.length
      };
    } catch (error) {
      console.error('Error getting popular books:', error);
      return { category: 'Popüler Kitaplar', books: [], totalCount: 0 };
    }
  }

  // Kullanıcıya özel öneriler (AI destekli)
  static async getPersonalizedBooks(userId: string, limit: number = 8): Promise<CategoryRecommendations> {
    try {
      if (!userId || userId === 'guest_user') {
        // Misafir kullanıcı için genel popüler kitaplar
        return this.getPopularBooks(limit);
      }

      // Kullanıcının kitap geçmişini al
      const userBooks = await this.getUserBooks(userId);
      console.log(`👤 Kullanıcı kitap sayısı: ${userBooks.length}`);
      
      // Cache kontrolü
      const cachedRecommendations = this.getCachedRecommendations(userId, userBooks.length);
      if (cachedRecommendations) {
        console.log(`⚡ Cache'den AI önerileri döndürülüyor`);
        return cachedRecommendations;
      }
      
      if (userBooks.length < 1) {
        // Hiç kitap yok, temel algoritmayı kullan
        console.log('📚 Hiç kitap yok, temel algoritma kullanılıyor');
        const basicRecommendations = await this.getBasicPersonalizedBooks(userId, userBooks, limit);
        this.setCachedRecommendations(userId, basicRecommendations, userBooks.length);
        return basicRecommendations;
      }

      try {
        // AI analiz yap
        console.log('🤖 AI analizi başlatılıyor...');
        const userProfile = await OpenAIService.analyzeReadingProfile(userBooks);
        console.log('📊 Kullanıcı profili:', userProfile);
        
        // AI önerileri al
        const aiRecommendations = await OpenAIService.getAIRecommendations(userProfile, userBooks, limit);
        console.log('🎯 AI önerileri:', aiRecommendations.length);

        if (aiRecommendations.length > 0) {
          // AI önerilerini mevcut kitap veritabanından seç - TAMAMEN UYUMLU SİSTEM
          const availableBooks = this.getEnhancedBooks();
          const userGenres = this.extractUserGenres(userBooks);
          const readBookIds = userBooks.map(book => book.id);
          
          // AI'ın önerdiği türleri analiz et
          const aiGenres = [...new Set(aiRecommendations.map(rec => rec.genre))];
          console.log(`🤖 AI önerilen türler: ${aiGenres.join(', ')}`);
          
          // Mevcut kitaplardan AI'ın önerdiği türlerde olanları seç
          let candidateBooks = availableBooks.filter(book => 
            !readBookIds.includes(book.id) && 
            (
              aiGenres.some(aiGenre => book.genre.includes(aiGenre) || aiGenre.includes(book.genre)) ||
              userGenres.some(userGenre => book.genre.includes(userGenre))
            )
          );
          
          // Eğer yeterli kitap yoksa, popüler kitaplardan ekle
          if (candidateBooks.length < limit) {
            const additionalBooks = availableBooks
              .filter(book => 
                !readBookIds.includes(book.id) && 
                !candidateBooks.some(cb => cb.id === book.id) &&
                book.score >= 85
              )
              .sort((a, b) => b.score - a.score);
            
            candidateBooks = [...candidateBooks, ...additionalBooks].slice(0, limit * 2);
          }
          
                     // En iyi eşleşmeleri seç
           const recommendations = candidateBooks
             .map(book => ({
               ...book,
               score: this.calculatePersonalizedScore(book, userGenres, []),
               recommendationReason: `AI Analizi: ${this.getPersonalizedReason(book, userGenres, [])}`
             }))
             .sort((a, b) => b.score - a.score)
             .slice(0, limit);
           
           console.log(`✅ AI tarzı öneriler (mevcut kitaplardan): ${recommendations.map(r => r.title).join(', ')}`);
           
           const finalAiResult = {
             category: 'Size Özel (AI)',
             books: recommendations,
             totalCount: recommendations.length
           };
           
           // Cache'e kaydet
           this.setCachedRecommendations(userId, finalAiResult, userBooks.length);
           
           return finalAiResult;
        } else {
          console.log('⚠️ AI önerisi gelmedi, temel algoritma kullanılıyor');
        }
      } catch (aiError) {
        console.error('❌ AI recommendation error:', aiError);
        console.log('🔄 AI hatası, temel algoritma kullanılıyor');
      }

      // AI başarısız olursa temel algoritmayı kullan
      const basicRecommendations = await this.getBasicPersonalizedBooks(userId, userBooks, limit);
      this.setCachedRecommendations(userId, basicRecommendations, userBooks.length);
      return basicRecommendations;

    } catch (error) {
      console.error('Error getting personalized books:', error);
      return { category: 'Size Özel', books: [], totalCount: 0 };
    }
  }

  // Temel kişiselleştirme algoritması (AI olmadan)
  private static async getBasicPersonalizedBooks(userId: string, userBooks: Book[], limit: number): Promise<CategoryRecommendations> {
    const userGenres = this.extractUserGenres(userBooks);
    const userAuthors = this.extractUserAuthors(userBooks);
    const readBookIds = userBooks.map(book => book.id);

    // Use enhanced books with proper covers
    const enhancedBooks = this.getEnhancedBooks();

    // Öneri algoritması - daha akıllı filtreleme
    let recommendations = enhancedBooks
      .filter(book => !readBookIds.includes(book.id)) // Zaten okuduğu kitapları çıkar
      .map(book => ({
        ...book,
        score: this.calculatePersonalizedScore(book, userGenres, userAuthors)
      }))
      .sort((a, b) => {
        // Önce score, sonra popülerlik
        if (b.score !== a.score) return b.score - a.score;
        return b.publishYear! - a.publishYear!;
      })
      .slice(0, limit);

    // Eğer yeterli kitap yoksa popüler kitaplardan ekle
    if (recommendations.length < limit) {
      const popularBooks = enhancedBooks
        .filter(book => 
          !readBookIds.includes(book.id) && 
          !recommendations.some(rec => rec.id === book.id) &&
          book.score >= 85
        )
        .sort((a, b) => b.score - a.score)
        .slice(0, limit - recommendations.length);
      
      recommendations = [...recommendations, ...popularBooks];
    }

    // Öneri nedenlerini güncelle
    recommendations = recommendations.map(book => ({
      ...book,
      recommendationReason: this.getPersonalizedReason(book, userGenres, userAuthors)
    }));

    // Cache'e kaydet
    this.setCachedRecommendations(userId, {
      category: 'Size Özel',
      books: recommendations,
      totalCount: recommendations.length
    }, userBooks.length);

    return {
      category: 'Size Özel',
      books: recommendations,
      totalCount: recommendations.length
    };
  }

  // Klasik kitapları getir
  static async getClassicBooks(limit: number = 8): Promise<CategoryRecommendations> {
    try {
      console.log('📚 Klasik kitaplar yükleniyor...');
      
      // Use enhanced books with proper covers
      const enhancedBooks = this.getEnhancedBooks();
      
      let classicBooks = enhancedBooks
        .filter(book => 
          book.genre === 'Klasik Edebiyat' || 
          book.genre === 'Felsefe' ||
          book.publishYear! <= 1990 ||
          ['1984', 'Suç ve Ceza', 'Simyacı', 'Sefiller', 'Dune', 'And Then There Were None', 'Meditations'].includes(book.title)
        )
        .sort((a, b) => {
          // Önce puan, sonra klasiklik (eski olanlar önce)
          if (b.score !== a.score) return b.score - a.score;
          return (a.publishYear || 9999) - (b.publishYear || 9999);
        });

      // Eğer yeterli kitap yoksa Google Books'tan ek klasik kitaplar ekle
      if (classicBooks.length < limit) {
        console.log(`📚 Google Books'tan ek klasik kitaplar getiriliyor...`);
        try {
          const googleBooks = await this.fetchGoogleBooksClassics(limit - classicBooks.length);
          classicBooks = [...classicBooks, ...googleBooks];
        } catch (googleError) {
          console.log('⚠️ Google Books hatası, sadece yerel kitaplar kullanılıyor');
        }
      }

      const finalBooks = classicBooks.slice(0, limit);
      console.log(`✅ ${finalBooks.length} klasik kitap bulundu`);

      return {
        category: 'Klasik Eserler',
        books: finalBooks,
        totalCount: finalBooks.length
      };
    } catch (error) {
      console.error('Error getting classic books:', error);
      return { category: 'Klasik Eserler', books: [], totalCount: 0 };
    }
  }

  // Yeni çıkan kitapları getir
  static async getNewReleases(limit: number = 8): Promise<CategoryRecommendations> {
    try {
      console.log('✨ Yeni çıkan kitaplar yükleniyor...');
      
      // Use enhanced books with proper covers
      const enhancedBooks = this.getEnhancedBooks();
      
      const currentYear = new Date().getFullYear();
      let newBooks = enhancedBooks
        .filter(book => book.publishYear! >= currentYear - 6) // Son 6 yıl
        .sort((a, b) => {
          // Önce yayın yılı (yeni olanlar önce), sonra puan
          if (b.publishYear !== a.publishYear) return (b.publishYear || 0) - (a.publishYear || 0);
          return b.score - a.score;
        });

      // Eğer yeterli kitap yoksa Google Books'tan ek yeni kitaplar ekle
      if (newBooks.length < limit) {
        console.log(`📚 Google Books'tan ek yeni kitaplar getiriliyor...`);
        try {
          const googleBooks = await this.fetchGoogleBooksNew(limit - newBooks.length);
          newBooks = [...newBooks, ...googleBooks];
        } catch (googleError) {
          console.log('⚠️ Google Books hatası, sadece yerel kitaplar kullanılıyor');
        }
      }

      const finalBooks = newBooks.slice(0, limit);
      console.log(`✅ ${finalBooks.length} yeni kitap bulundu`);

      return {
        category: 'Yeni Çıkanlar',
        books: finalBooks,
        totalCount: finalBooks.length
      };
    } catch (error) {
      console.error('Error getting new releases:', error);
      return { category: 'Yeni Çıkanlar', books: [], totalCount: 0 };
    }
  }

  // Tüm kategorileri getir
  static async getAllRecommendations(userId: string): Promise<CategoryRecommendations[]> {
    try {
      const [popular, personalized, classics, newReleases] = await Promise.all([
        this.getPopularBooks(6),
        this.getPersonalizedBooks(userId, 6),
        this.getClassicBooks(6),
        this.getNewReleases(6)
      ]);

      return [popular, personalized, classics, newReleases];
    } catch (error) {
      console.error('Error getting all recommendations:', error);
      return [];
    }
  }

  // Yardımcı fonksiyonlar
  private static async getUserBooks(userId: string): Promise<Book[]> {
    try {
      console.log(`🔍 getUserBooks - userId: ${userId}`);
      
      // Doğru storage key'i kullan (user-specific)
      const storageKey = `bookmate_books_${userId}`;
      const booksData = await AsyncStorage.getItem(storageKey);
      
      console.log(`📦 Storage key: ${storageKey}`);
      console.log(`📊 Raw data length: ${booksData?.length || 0}`);
      
      if (booksData) {
        const books = JSON.parse(booksData);
        console.log(`📚 Found ${books.length} books for user ${userId}`);
        return books;
      }
      
      console.log(`📭 No books found for user ${userId}`);
      return [];
    } catch (error) {
      console.error('❌ Error getting user books:', error);
      return [];
    }
  }

  private static extractUserGenres(books: Book[]): string[] {
    const genreCounts: Record<string, number> = {};
    
    books.forEach(book => {
      if (book.genre) {
        genreCounts[book.genre] = (genreCounts[book.genre] || 0) + 1;
      }
    });

    // En çok okunan türleri döndür
    return Object.entries(genreCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([genre]) => genre);
  }

  private static extractUserAuthors(books: Book[]): string[] {
    const authorCounts: Record<string, number> = {};
    
    books.forEach(book => {
      if (book.author) {
        authorCounts[book.author] = (authorCounts[book.author] || 0) + 1;
      }
    });

    // En çok okunan yazarları döndür
    return Object.entries(authorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([author]) => author);
  }

  private static calculatePersonalizedScore(
    book: RecommendedBook, 
    userGenres: string[], 
    userAuthors: string[]
  ): number {
    let score = book.score; // Base score

    // Tür uyumu bonusu
    if (userGenres.includes(book.genre)) {
      score += 15;
    }

    // Yazar uyumu bonusu
    if (userAuthors.includes(book.author)) {
      score += 20;
    }

    // Sayfa sayısı tercihi (kullanıcının ortalama okuma alışkanlığına göre)
    // Bu örnekte orta uzunlukta kitapları tercih ediyor
    if (book.pageCount >= 200 && book.pageCount <= 500) {
      score += 5;
    }

    return Math.min(score, 100); // Max 100
  }

  private static getPersonalizedReason(
    book: RecommendedBook,
    userGenres: string[],
    userAuthors: string[]
  ): string {
    if (userAuthors.includes(book.author)) {
      return `${book.author} yazan diğer kitapları sevdiniz`;
    }
    if (userGenres.includes(book.genre)) {
      return `${book.genre} türünde okumayı seviyorsunuz`;
    }
    return book.recommendationReason;
  }

  // AI önerileri için kitap kapağı URL'i al
  private static getBookCoverURL(title: string, author: string): string {
    // Basit bir hash fonksiyonu ile aynı kitap için aynı resmi döndür
    const hash = (title + author).split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const imageIds = [
      '81QZ3bZjB-L',
      '61NAx5pd6XL', 
      '71aFt4+OTOL',
      '81WcnNQ-TBL',
      '713jIoMO3UL',
      '81wgcld4wxL',
      '81IBfaWNmjL',
      '71Hq-WnLn3L',
      '41SH-SvWPxL',
      '81ym2zbWoAL'
    ];
    
    const index = Math.abs(hash) % imageIds.length;
    return `https://m.media-amazon.com/images/I/${imageIds[index]}._AC_UF1000,1000_QL80_.jpg`;
  }

  // Türe göre tahmini sayfa sayısı
  private static estimatePageCount(genre: string): number {
    const pageRanges: Record<string, [number, number]> = {
      'Roman': [300, 500],
      'Klasik Edebiyat': [400, 800],
      'Bilim Kurgu': [350, 600],
      'Tarih': [400, 600],
      'Kişisel Gelişim': [200, 350],
      'Teknoloji': [250, 400],
      'Felsefe': [300, 500],
      'Polisiye': [250, 400],
      'Genel': [250, 400]
    };

    const range = pageRanges[genre] || pageRanges['Genel'];
    return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
  }

  // Google Books'tan popüler kitaplar getir
  private static async fetchGoogleBooksPopular(count: number): Promise<RecommendedBook[]> {
    try {
      const popularQueries = [
        'bestseller 2024',
        'popular books 2023', 
        'trending books',
        'best fiction 2024',
        'must read books'
      ];

      const randomQuery = popularQueries[Math.floor(Math.random() * popularQueries.length)];
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(randomQuery)}&maxResults=${count}&orderBy=relevance`
      );

      if (!response.ok) return [];

      const data = await response.json();
      if (!data.items) return [];

      const books: RecommendedBook[] = [];
      
      for (const item of data.items.slice(0, count)) {
        try {
          const volumeInfo = item.volumeInfo;
          if (!volumeInfo.title || !volumeInfo.authors) continue;

          const book: RecommendedBook = {
            id: `google_${item.id}`,
            title: volumeInfo.title,
            author: volumeInfo.authors.join(', '),
            coverURL: volumeInfo.imageLinks?.thumbnail || 
                     GoogleBooksService.getFallbackCover(volumeInfo.title),
            genre: this.extractGenreFromCategories(volumeInfo.categories) || 'Roman',
            pageCount: volumeInfo.pageCount || this.estimatePageCount('Roman'),
            publishYear: volumeInfo.publishedDate ? 
              parseInt(volumeInfo.publishedDate.substring(0, 4)) : 2023,
            description: volumeInfo.description || 
              `${volumeInfo.title} adlı bu eser okuyucularına değerli bir deneyim sunuyor.`,
            recommendationReason: 'Dünya çapında popüler',
            score: 85 + Math.floor(Math.random() * 10) // 85-94 arası puan
          };

          books.push(book);
        } catch (bookError) {
          console.log('❌ Google Books kitap işleme hatası:', bookError);
          continue;
        }
      }

      console.log(`✅ Google Books'tan ${books.length} popüler kitap eklendi`);
      return books;

    } catch (error) {
      console.error('❌ Google Books popüler kitaplar hatası:', error);
      return [];
    }
  }

  // Google Books'tan klasik kitaplar getir
  private static async fetchGoogleBooksClassics(count: number): Promise<RecommendedBook[]> {
    try {
      const classicQueries = [
        'classic literature',
        'world classics',
        'timeless books',
        'literature classics',
        'greatest books'
      ];

      const randomQuery = classicQueries[Math.floor(Math.random() * classicQueries.length)];
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(randomQuery)}&maxResults=${count}&orderBy=relevance`
      );

      if (!response.ok) return [];

      const data = await response.json();
      if (!data.items) return [];

      const books: RecommendedBook[] = [];
      
      for (const item of data.items.slice(0, count)) {
        try {
          const volumeInfo = item.volumeInfo;
          if (!volumeInfo.title || !volumeInfo.authors) continue;

          const book: RecommendedBook = {
            id: `google_classic_${item.id}`,
            title: volumeInfo.title,
            author: volumeInfo.authors.join(', '),
            coverURL: volumeInfo.imageLinks?.thumbnail || 
                     GoogleBooksService.getFallbackCover(volumeInfo.title),
            genre: 'Klasik Edebiyat',
            pageCount: volumeInfo.pageCount || this.estimatePageCount('Klasik Edebiyat'),
            publishYear: volumeInfo.publishedDate ? 
              parseInt(volumeInfo.publishedDate.substring(0, 4)) : 1950,
            description: volumeInfo.description || 
              `${volumeInfo.title} edebiyat tarihinin önemli eserlerinden biridir.`,
            recommendationReason: 'Edebiyat klasiği',
            score: 88 + Math.floor(Math.random() * 10) // 88-97 arası puan
          };

          books.push(book);
        } catch (bookError) {
          console.log('❌ Google Books klasik kitap işleme hatası:', bookError);
          continue;
        }
      }

      console.log(`✅ Google Books'tan ${books.length} klasik kitap eklendi`);
      return books;

    } catch (error) {
      console.error('❌ Google Books klasik kitaplar hatası:', error);
      return [];
    }
  }

  // Google Books'tan yeni kitaplar getir
  private static async fetchGoogleBooksNew(count: number): Promise<RecommendedBook[]> {
    try {
      const currentYear = new Date().getFullYear();
      const newQueries = [
        `new books ${currentYear}`,
        `recent releases ${currentYear}`,
        `latest books ${currentYear - 1}`,
        'new fiction 2024',
        'newly published books'
      ];

      const randomQuery = newQueries[Math.floor(Math.random() * newQueries.length)];
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(randomQuery)}&maxResults=${count}&orderBy=newest`
      );

      if (!response.ok) return [];

      const data = await response.json();
      if (!data.items) return [];

      const books: RecommendedBook[] = [];
      
      for (const item of data.items.slice(0, count)) {
        try {
          const volumeInfo = item.volumeInfo;
          if (!volumeInfo.title || !volumeInfo.authors) continue;

          const publishYear = volumeInfo.publishedDate ? 
            parseInt(volumeInfo.publishedDate.substring(0, 4)) : currentYear;

          // Sadece son 6 yıldaki kitapları al
          if (publishYear < currentYear - 6) continue;

          const book: RecommendedBook = {
            id: `google_new_${item.id}`,
            title: volumeInfo.title,
            author: volumeInfo.authors.join(', '),
            coverURL: volumeInfo.imageLinks?.thumbnail || 
                     GoogleBooksService.getFallbackCover(volumeInfo.title),
            genre: this.extractGenreFromCategories(volumeInfo.categories) || 'Roman',
            pageCount: volumeInfo.pageCount || this.estimatePageCount('Roman'),
            publishYear,
            description: volumeInfo.description || 
              `${volumeInfo.title} yeni çıkan eserler arasında dikkat çekiyor.`,
            recommendationReason: 'Yeni çıkan eser',
            score: 82 + Math.floor(Math.random() * 12) // 82-93 arası puan
          };

          books.push(book);
        } catch (bookError) {
          console.log('❌ Google Books yeni kitap işleme hatası:', bookError);
          continue;
        }
      }

      console.log(`✅ Google Books'tan ${books.length} yeni kitap eklendi`);
      return books;

    } catch (error) {
      console.error('❌ Google Books yeni kitaplar hatası:', error);
      return [];
    }
  }

  // Google Books kategorilerinden tür çıkarma
  private static extractGenreFromCategories(categories?: string[]): string | null {
    if (!categories || categories.length === 0) return null;

    const genreMap: Record<string, string> = {
      'Fiction': 'Roman',
      'Science Fiction': 'Bilim Kurgu',
      'Fantasy': 'Fantastik',
      'Mystery': 'Polisiye',
      'Romance': 'Romantik',
      'History': 'Tarih',
      'Biography': 'Biyografi',
      'Self-Help': 'Kişisel Gelişim',
      'Business': 'İş Dünyası',
      'Technology': 'Teknoloji',
      'Philosophy': 'Felsefe',
      'Psychology': 'Psikoloji',
      'Literature': 'Edebiyat'
    };

    for (const category of categories) {
      for (const [key, value] of Object.entries(genreMap)) {
        if (category.includes(key)) {
          return value;
        }
      }
    }

    return null;
  }

  /**
   * Initialize book covers using Google Books API
   * This method should be called once when the app starts
   */
  static async initializeBookCovers(): Promise<void> {
    if (isLoadingCovers) {
      console.log('📚 Kapak yükleme zaten devam ediyor...');
      return;
    }

    try {
      isLoadingCovers = true;
      console.log(`🎨 Initializing book covers...`);
      
      const categories = ['popular', 'classics', 'new', 'personalized'];
      
      for (const category of categories) {
        console.log(`📚 Processing ${category} books...`);
        
        const books = ENHANCED_BOOK_DATABASE.filter(book => book.genre === category);
        if (!books || books.length === 0) continue;
        
        for (let i = 0; i < books.length; i++) {
          const book = books[i];
          
          // Skip if book already has a working cover
          if (book.coverURL && book.coverURL.startsWith('https://covers.openlibrary.org')) {
            console.log(`✅ Book "${book.title}" already has OpenLibrary cover`);
            continue;
          }
          
          try {
            console.log(`🔍 Searching cover for: "${book.title}" by ${book.author}`);
            
            // Get cover from OpenLibrary/Google Books
            const coverUrl = await GoogleBooksService.getBookCover(book.title, book.author, 'high');
            
            if (coverUrl) {
              ENHANCED_BOOK_DATABASE[ENHANCED_BOOK_DATABASE.findIndex(b => b.id === book.id)] = { ...book, coverURL: coverUrl };
              console.log(`✅ Found cover for "${book.title}"`);
            } else {
              // Use fallback SVG cover
              const fallbackCover = GoogleBooksService.getFallbackCover(book.title);
              ENHANCED_BOOK_DATABASE[ENHANCED_BOOK_DATABASE.findIndex(b => b.id === book.id)] = { ...book, coverURL: fallbackCover };
              console.log(`🎨 Using fallback cover for "${book.title}"`);
            }
            
            // Small delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 300));
            
          } catch (error) {
            console.log(`❌ Cover search failed for "${book.title}":`, error);
            // Use fallback SVG cover
            const fallbackCover = GoogleBooksService.getFallbackCover(book.title);
            ENHANCED_BOOK_DATABASE[ENHANCED_BOOK_DATABASE.findIndex(b => b.id === book.id)] = { ...book, coverURL: fallbackCover };
            console.log(`🎨 Using fallback cover for "${book.title}"`);
          }
        }
      }
      
      console.log(`✅ Book cover initialization completed!`);

    } catch (error) {
      console.error('🚨 Kitap kapakları yüklenirken hata:', error);
      
      // Use fallback covers for all books
      ENHANCED_BOOK_DATABASE = BOOK_DATABASE.map(book => ({
        ...book,
        coverURL: GoogleBooksService.getFallbackCover(book.title)
      }));

    } finally {
      isLoadingCovers = false;
    }
  }

  /**
   * Force refresh all book covers
   */
  static async refreshBookCovers(): Promise<void> {
    console.log('🔄 Kitap kapakları yenileniyor...');
    
    // Clear cache
    await AsyncStorage.removeItem('book_covers_cache');
    
    // Reset database
    ENHANCED_BOOK_DATABASE = [...BOOK_DATABASE];
    
    // Reload covers
    await this.initializeBookCovers();
  }

  /**
   * Get books with enhanced covers
   */
  private static getEnhancedBooks(): RecommendedBook[] {
    return BOOK_DATABASE.map(book => {
      // Try to get known cover first
      let coverURL = book.coverURL;
      
      if (!coverURL || coverURL === '') {
        // Use known covers from GoogleBooksService
        const knownCover = this.getKnownCover(book.title);
        if (knownCover) {
          coverURL = knownCover;
        } else {
          // Use SVG fallback instead of external service
          coverURL = GoogleBooksService.getFallbackCover(book.title);
        }
      }
      
      return {
        ...book,
        coverURL
      };
    });
  }

  private static getKnownCover(title: string): string | null {
    const knownCovers: Record<string, string> = {
      // Turkish Classics with OpenLibrary covers
      'suç ve ceza': 'https://covers.openlibrary.org/b/isbn/9780486454115-L.jpg',
      '1984': 'https://covers.openlibrary.org/b/isbn/9780452284234-L.jpg',
      'sefiller': 'https://covers.openlibrary.org/b/isbn/9780451419439-L.jpg',
      'dune': 'https://covers.openlibrary.org/b/isbn/9780441172719-L.jpg',
      'simyacı': 'https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg',
      'and then there were none': 'https://covers.openlibrary.org/b/isbn/9780062073488-L.jpg',
      'meditations': 'https://covers.openlibrary.org/b/isbn/9780486298238-L.jpg',
      
      // Popular Modern Books with OpenLibrary covers
      'sapiens': 'https://covers.openlibrary.org/b/isbn/9780062316095-L.jpg',
      'atomic habits': 'https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg',
      'thinking, fast and slow': 'https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg',
      'clean code': 'https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg',
      'the alchemist': 'https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg',
      'the martian': 'https://covers.openlibrary.org/b/isbn/9780553418026-L.jpg',
      
      // Recent Books with OpenLibrary covers
      'educated': 'https://covers.openlibrary.org/b/isbn/9780399590504-L.jpg',
      'the seven husbands of evelyn hugo': 'https://covers.openlibrary.org/b/isbn/9781501161933-L.jpg',
      'project hail mary': 'https://covers.openlibrary.org/b/isbn/9780593135204-L.jpg',
      'the silent patient': 'https://covers.openlibrary.org/b/isbn/9781250301697-L.jpg',
      'the midnight library': 'https://covers.openlibrary.org/b/isbn/9780525559474-L.jpg',
      'klara and the sun': 'https://covers.openlibrary.org/b/isbn/9780593318171-L.jpg',
      
      // Turkish Books with OpenLibrary covers
      'müzede bir gece': 'https://covers.openlibrary.org/b/isbn/9789750718533-L.jpg',
      'körlük': 'https://covers.openlibrary.org/b/isbn/9789750823404-L.jpg',
      'çiçekli mumyalar': 'https://covers.openlibrary.org/b/isbn/9789753428071-L.jpg',
      
      // Tech and Finance with OpenLibrary covers
      'kişisel finans': 'https://covers.openlibrary.org/b/isbn/9780062312686-L.jpg',
      'javascript': 'https://covers.openlibrary.org/b/isbn/9781491952023-L.jpg',
      'react': 'https://covers.openlibrary.org/b/isbn/9781491954621-L.jpg',
      
      // Additional popular books
      'the psychology of money': 'https://covers.openlibrary.org/b/isbn/9780857197689-L.jpg',
      'the guns of august': 'https://covers.openlibrary.org/b/isbn/9780345476098-L.jpg',
      'the 7 habits of highly effective people': 'https://covers.openlibrary.org/b/isbn/9781982137274-L.jpg'
    };
    
    const searchKey = title.toLowerCase();
    
    // Exact match
    if (knownCovers[searchKey]) {
      return knownCovers[searchKey];
    }
    
    // Partial match
    for (const [key, url] of Object.entries(knownCovers)) {
      if (searchKey.includes(key) || key.includes(searchKey)) {
        return url;
      }
    }
    
    return null;
  }
}

export default RecommendationManager; 