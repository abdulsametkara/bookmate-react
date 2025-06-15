import { Book } from '../store/bookSlice';
import Constants from 'expo-constants';

// OpenAI API configuration - Production için environment variables kullan
const OPENAI_API_KEY = Constants.expoConfig?.extra?.openaiApiKey || 'your-openai-api-key-here';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const USE_DEMO_MODE = Constants.expoConfig?.extra?.useDemoMode || true;
const OPENAI_MODEL = Constants.expoConfig?.extra?.openaiModel || 'gpt-3.5-turbo';
const MAX_TOKENS = Constants.expoConfig?.extra?.maxTokens || 1000;
const TEMPERATURE = Constants.expoConfig?.extra?.temperature || 0.7;

// Rate limiting ve retry logic için
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 saniye

export interface AIRecommendation {
  bookTitle: string;
  author: string;
  genre: string;
  reason: string;
  score: number; // 0-100
  description: string;
  coverURL?: string; // Optional cover image URL
}

export interface UserReadingProfile {
  favoriteGenres: string[];
  favoriteAuthors: string[];
  readingPatterns: {
    averagePageCount: number;
    preferredYears: number[];
    completionRate: number;
  };
  personalityInsights: string[];
}

class OpenAIService {
  
  // Rate limiting için request sayısını takip et
  private static requestCount = 0;
  private static lastRequestTime = 0;
  private static readonly REQUEST_LIMIT = 60; // Dakikada maksimum request
  private static readonly TIME_WINDOW = 60 * 1000; // 1 dakika

  // API isteği için retry logic ile güvenli çağrı
  private static async makeOpenAIRequest(
    messages: any[], 
    maxTokens: number = MAX_TOKENS
  ): Promise<any> {
    // Rate limiting kontrolü
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // API key kontrolü
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your-openai-api-key-here') {
      throw new Error('OpenAI API key not configured');
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: OPENAI_MODEL,
            messages,
            max_tokens: maxTokens,
            temperature: TEMPERATURE,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        
        // Response validation
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          throw new Error('Invalid OpenAI response format');
        }

        this.requestCount++;
        this.lastRequestTime = Date.now();
        
        return data;

      } catch (error) {
        lastError = error as Error;
        console.error(`OpenAI request attempt ${attempt} failed:`, error);
        
        // Son deneme değilse bekle
        if (attempt < MAX_RETRIES) {
          await this.delay(RETRY_DELAY * attempt);
        }
      }
    }

    throw lastError || new Error('OpenAI request failed after all retries');
  }

  // Rate limiting kontrolü
  private static checkRateLimit(): boolean {
    const now = Date.now();
    
    // Time window geçtiyse reset et
    if (now - this.lastRequestTime > this.TIME_WINDOW) {
      this.requestCount = 0;
    }
    
    return this.requestCount < this.REQUEST_LIMIT;
  }

  // Delay utility
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Kullanıcının okuma profilini analiz et
  static async analyzeReadingProfile(userBooks: Book[]): Promise<UserReadingProfile> {
    try {
      const completedBooks = userBooks.filter(book => book.status === 'COMPLETED');
      
      if (completedBooks.length < 2 || USE_DEMO_MODE) {
        // Yeterli veri yok veya demo mode, temel analiz yap
        return this.createBasicProfile(userBooks);
      }

      const prompt = this.createAnalysisPrompt(userBooks);
      
      const messages = [
        {
          role: 'system',
          content: 'Sen bir kitap uzmanısın. Kullanıcının okuma geçmişini analiz ederek kişilik profili çıkarıyorsun. Sadece JSON formatında yanıt ver, başka hiçbir metin ekleme.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const data = await this.makeOpenAIRequest(messages, 500);
      const aiResponse = data.choices[0].message.content;
      
      // AI yanıtını parse et
      try {
        const cleanResponse = this.cleanJSONResponse(aiResponse);
        const profile = JSON.parse(cleanResponse);
        return this.validateAndFormatProfile(profile);
      } catch (parseError) {
        console.error('AI response parse error:', parseError);
        return this.createBasicProfile(userBooks);
      }

    } catch (error) {
      console.error('OpenAI analysis error:', error);
      return this.createBasicProfile(userBooks);
    }
  }

  // AI destekli kitap önerileri al
  static async getAIRecommendations(
    userProfile: UserReadingProfile, 
    userBooks: Book[], 
    count: number = 10
  ): Promise<AIRecommendation[]> {
    try {
      if (USE_DEMO_MODE) {
        // Demo mode: simüle edilmiş AI önerileri
        return this.getDemoRecommendations(userProfile, userBooks, count);
      }

      const prompt = this.createRecommendationPrompt(userProfile, userBooks, count);
      
      const messages = [
        {
          role: 'system',
          content: 'Sen profesyonel bir kitap önerisi uzmanısın. Kullanıcının okuma profiline göre kitap önerileri yapıyorsun. Sadece gerçek kitaplar öner ve sadece JSON array formatında yanıt ver, başka hiçbir metin ekleme.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const data = await this.makeOpenAIRequest(messages, MAX_TOKENS);
      const aiResponse = data.choices[0].message.content;
      
      try {
        const cleanResponse = this.cleanJSONResponse(aiResponse);
        const recommendations = JSON.parse(cleanResponse);
        return this.validateRecommendations(recommendations);
      } catch (parseError) {
        console.error('AI recommendations parse error:', parseError);
        return this.getDemoRecommendations(userProfile, userBooks, count);
      }

    } catch (error) {
      console.error('OpenAI recommendations error:', error);
      return this.getDemoRecommendations(userProfile, userBooks, count);
    }
  }

  // JSON response'u temizle
  private static cleanJSONResponse(response: string): string {
    // Markdown code block'ları kaldır
    let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Başındaki ve sonundaki whitespace'leri kaldır
    cleaned = cleaned.trim();
    
    // Eğer response JSON değilse, JSON kısmını bulmaya çalış
    const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
    
    return cleaned;
  }

  // API durumunu kontrol et
  static async checkAPIStatus(): Promise<{ status: 'connected' | 'error' | 'demo', message: string }> {
    if (USE_DEMO_MODE) {
      return { status: 'demo', message: 'Demo mode aktif - gerçek AI kullanılmıyor' };
    }

    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your-openai-api-key-here') {
      return { status: 'error', message: 'OpenAI API key yapılandırılmamış' };
    }

    try {
      const testMessages = [
        {
          role: 'user',
          content: 'Test message'
        }
      ];

      await this.makeOpenAIRequest(testMessages, 10);
      return { status: 'connected', message: 'OpenAI API bağlantısı başarılı' };
    } catch (error) {
      return { status: 'error', message: `API bağlantı hatası: ${(error as Error).message}` };
    }
  }

  // Prompt oluşturma fonksiyonları
  private static createAnalysisPrompt(userBooks: Book[]): string {
    const bookList = userBooks.map(book => 
      `"${book.title}" - ${book.author} (${book.genre}, ${book.status}, ${book.pageCount} sayfa)`
    ).join('\n');

    return `Aşağıdaki kullanıcının okuma geçmişini analiz et:

${bookList}

Lütfen şu formatta JSON yanıt ver:
{
  "favoriteGenres": ["tür1", "tür2", "tür3"],
  "favoriteAuthors": ["yazar1", "yazar2"],
  "readingPatterns": {
    "averagePageCount": 350,
    "preferredYears": [2020, 2019, 2018],
    "completionRate": 85
  },
  "personalityInsights": ["insight1", "insight2", "insight3"]
}

Türkçe analiz yap ve kişilik özelliklerini çıkar.`;
  }

  private static createRecommendationPrompt(
    profile: UserReadingProfile, 
    userBooks: Book[], 
    count: number
  ): string {
    const readBooks = userBooks.map(book => `"${book.title}" - ${book.author}`).join(', ');
    
    return `Kullanıcı profili:
- Favori türler: ${profile.favoriteGenres.join(', ')}
- Favori yazarlar: ${profile.favoriteAuthors.join(', ')}
- Ortalama sayfa sayısı: ${profile.readingPatterns.averagePageCount}
- Kişilik özellikleri: ${profile.personalityInsights.join(', ')}

Okuduğu kitaplar: ${readBooks}

Bu profile göre ${count} kitap öner. Sadece gerçek kitaplar öner ve şu JSON formatında yanıt ver:

[
  {
    "bookTitle": "Kitap Adı",
    "author": "Yazar Adı", 
    "genre": "Tür",
    "reason": "Öneri sebebi",
    "description": "Kitap hakkında kısa açıklama",
    "score": 95
  }
]

Türkçe kitapları da öner ve her önerinin sebebini açıkla.`;
  }

  // Temel profil oluşturma (AI olmadan)
  private static createBasicProfile(userBooks: Book[]): UserReadingProfile {
    const genres = userBooks.map(book => book.genre).filter(Boolean);
    const authors = userBooks.map(book => book.author).filter(Boolean);
    const pageCounts = userBooks.map(book => book.pageCount).filter(count => count > 0);
    
    const genreCounts: Record<string, number> = {};
    const authorCounts: Record<string, number> = {};
    
    genres.forEach(genre => {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    });
    
    authors.forEach(author => {
      authorCounts[author] = (authorCounts[author] || 0) + 1;
    });

    const favoriteGenres = Object.entries(genreCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([genre]) => genre);

    const favoriteAuthors = Object.entries(authorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([author]) => author);

    const averagePageCount = pageCounts.length > 0 
      ? Math.round(pageCounts.reduce((sum, count) => sum + count, 0) / pageCounts.length)
      : 300;

    const completedBooks = userBooks.filter(book => book.status === 'COMPLETED');
    const completionRate = userBooks.length > 0 
      ? Math.round((completedBooks.length / userBooks.length) * 100)
      : 0;

    return {
      favoriteGenres,
      favoriteAuthors,
      readingPatterns: {
        averagePageCount,
        preferredYears: [2023, 2022, 2021],
        completionRate
      },
      personalityInsights: [
        'Çeşitli türleri keşfetmeyi seviyor',
        'Okuma alışkanlığı gelişiyor',
        'Yeni deneyimlere açık'
      ]
    };
  }

  // Demo önerileri (AI simülasyonu)
  private static getDemoRecommendations(
    userProfile: UserReadingProfile, 
    userBooks: Book[], 
    count: number
  ): AIRecommendation[] {
    const demoRecommendations: AIRecommendation[] = [
      {
        bookTitle: 'Körlük',
        author: 'José Saramago',
        genre: 'Edebiyat',
        reason: 'Derin felsefi romanları seviyorsunuz',
        score: 92,
        description: 'Toplumsal eleştiri ve insan doğası üzerine güçlü bir alegori.',
        coverURL: null // Google Books API'den alınacak
      },
      {
        bookTitle: 'Çiçekli Mumyalar',
        author: 'Ufuk Yıldırım',
        genre: 'Türk Edebiyatı',
        reason: 'Çağdaş Türk yazarlarına ilginiz var',
        score: 88,
        description: 'Modern yaşamın absürtlüğünü ele alan özgün bir roman.',
        coverURL: null // Google Books API'den alınacak
      },
      {
        bookTitle: 'Thinking, Fast and Slow',
        author: 'Daniel Kahneman',
        genre: 'Psikoloji',
        reason: 'İnsan davranışları konusunda meraklısınız',
        score: 90,
        description: 'Karar verme süreçleri ve bilişsel önyargılar üzerine Nobel ödüllü çalışma.',
        coverURL: 'https://m.media-amazon.com/images/I/61fdrEuPJwL._AC_UF1000,1000_QL80_.jpg'
      },
      {
        bookTitle: 'Müzede Bir Gece',
        author: 'Ahmet Hamdi Tanpınar',
        genre: 'Türk Edebiyatı',
        reason: 'Türk klasiklerini keşfetmelisiniz',
        score: 87,
        description: 'Zaman, hafıza ve kimlik arayışı üzerine derin bir roman.',
        coverURL: null // Google Books API'den alınacak
      },
      {
        bookTitle: 'Project Hail Mary',
        author: 'Andy Weir',
        genre: 'Bilim Kurgu',
        reason: 'Bilimsel temelli hikayeler hoşunuza gidecek',
        score: 89,
        description: 'Hem bilimsel hem duygusal açıdan etkileyici uzay macerası.',
        coverURL: null // Google Books API'den alınacak
      }
    ];

    // Kullanıcının tercihlerine göre skorları ayarla
    return demoRecommendations.map(rec => {
      let adjustedScore = rec.score;
      
      if (userProfile.favoriteGenres.includes(rec.genre)) {
        adjustedScore += 5;
        rec.reason = `${rec.genre} türünde okumayı seviyorsunuz - ${rec.reason}`;
      }
      
      if (userProfile.favoriteAuthors.includes(rec.author)) {
        adjustedScore += 10;
        rec.reason = `${rec.author}'ın diğer eserlerini de beğenebilirsiniz`;
      }

      return {
        ...rec,
        score: Math.min(100, adjustedScore)
      };
    }).slice(0, count);
  }

  private static validateAndFormatProfile(profile: any): UserReadingProfile {
    return {
      favoriteGenres: Array.isArray(profile.favoriteGenres) ? profile.favoriteGenres.slice(0, 5) : [],
      favoriteAuthors: Array.isArray(profile.favoriteAuthors) ? profile.favoriteAuthors.slice(0, 3) : [],
      readingPatterns: {
        averagePageCount: typeof profile.readingPatterns?.averagePageCount === 'number' 
          ? profile.readingPatterns.averagePageCount : 300,
        preferredYears: Array.isArray(profile.readingPatterns?.preferredYears) 
          ? profile.readingPatterns.preferredYears : [2023, 2022, 2021],
        completionRate: typeof profile.readingPatterns?.completionRate === 'number'
          ? profile.readingPatterns.completionRate : 50
      },
      personalityInsights: Array.isArray(profile.personalityInsights) 
        ? profile.personalityInsights.slice(0, 5) : []
    };
  }

  private static validateRecommendations(recommendations: any[]): AIRecommendation[] {
    if (!Array.isArray(recommendations)) return [];
    
    return recommendations
      .filter(rec => rec.bookTitle && rec.author && rec.reason)
      .map(rec => ({
        bookTitle: rec.bookTitle,
        author: rec.author,
        genre: rec.genre || 'Genel',
        reason: rec.reason,
        score: typeof rec.score === 'number' ? Math.min(100, Math.max(0, rec.score)) : 75,
        description: rec.description || `${rec.author} tarafından yazılmış ${rec.genre} türünde bir eser.`
      }))
      .slice(0, 10);
  }
}

export default OpenAIService; 