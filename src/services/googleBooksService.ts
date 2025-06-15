import Constants from 'expo-constants';

const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes';
const OPENLIBRARY_COVERS_API = 'https://covers.openlibrary.org/b';
const OPENLIBRARY_SEARCH_API = 'https://openlibrary.org/search.json';

export interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
      extraLarge?: string;
    };
    categories?: string[];
    publishedDate?: string;
    pageCount?: number;
    description?: string;
  };
}

interface GoogleBooksResponse {
  items?: GoogleBook[];
  totalItems: number;
}

interface OpenLibraryResponse {
  docs: Array<{
    title: string;
    author_name?: string[];
    isbn?: string[];
    cover_i?: number;
    first_publish_year?: number;
    subject?: string[];
  }>;
}

export default class GoogleBooksService {
  /**
   * Search for book covers using OpenLibrary API
   */
  static async getBookCover(title: string, author: string, preferredQuality: 'high' | 'medium' | 'low' = 'high'): Promise<string | null> {
    try {
      console.log(`🔍 Searching cover for: "${title}" by ${author}`);
      
      // First try known covers
      const knownCover = this.getKnownBookCover(title, author);
      if (knownCover) {
        console.log(`✅ Found known cover for "${title}"`);
        return knownCover;
      }
      
      // Try OpenLibrary search
      const openLibraryCover = await this.searchOpenLibraryCover(title, author);
      if (openLibraryCover) {
        console.log(`✅ Found OpenLibrary cover for "${title}"`);
        return openLibraryCover;
      }
      
      // Try Google Books as fallback
      const googleCover = await this.searchGoogleBooksCover(title, author, preferredQuality);
      if (googleCover) {
        console.log(`✅ Found Google Books cover for "${title}"`);
        return googleCover;
      }
      
      console.log(`❌ No cover found for "${title}" by ${author}`);
      return null;
      
    } catch (error) {
      console.log(`ℹ️ Cover search failed for "${title}", will use fallback`);
      return null;
    }
  }

  /**
   * Get OpenLibrary cover specifically (public method for AI recommendations)
   */
  static async getOpenLibraryCover(title: string, author: string): Promise<string | null> {
    return await this.searchOpenLibraryCover(title, author);
  }

  /**
   * Search OpenLibrary for book cover
   */
  private static async searchOpenLibraryCover(title: string, author: string): Promise<string | null> {
    try {
      const query = `title:"${title}" author:"${author}"`.replace(/\s+/g, '+');
      const url = `${OPENLIBRARY_SEARCH_API}?q=${encodeURIComponent(query)}&limit=5&fields=cover_i,isbn,title,author_name`;
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) return null;
      
      const data: OpenLibraryResponse = await response.json();

      for (const book of data.docs) {
        if (book.cover_i) {
          // OpenLibrary cover sizes: S (small), M (medium), L (large)
          return `${OPENLIBRARY_COVERS_API}/id/${book.cover_i}-L.jpg`;
        }
      }
      
      return null;
    } catch (error) {
      console.log('OpenLibrary search error:', error);
      return null;
    }
  }

  /**
   * Search Google Books for cover (fallback)
   */
  private static async searchGoogleBooksCover(title: string, author: string, preferredQuality: string): Promise<string | null> {
    try {
      const query = `intitle:"${title}" inauthor:"${author}"`;
      const books = await this.searchBooks(query, 3);
      
      for (const book of books) {
        const coverUrl = this.selectBestCoverUrl(book.volumeInfo.imageLinks, preferredQuality as any);
        if (coverUrl) {
          return this.enhanceImageUrl(coverUrl);
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Search for books using Google Books API (public access)
   */
  static async searchBooks(query: string, maxResults: number = 10): Promise<GoogleBook[]> {
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `${GOOGLE_BOOKS_API_URL}?q=${encodedQuery}&maxResults=${maxResults}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BookMate-App/1.0',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.log(`⚠️ Google Books API ${response.status} - Public API limit reached, using fallbacks`);
        return [];
      }
      
      const data: GoogleBooksResponse = await response.json();
      return data.items || [];
      
    } catch (error) {
      console.log('ℹ️ Google Books API unavailable, using local covers');
      return [];
    }
  }

  /**
   * Get known book covers with working URLs from OpenLibrary and reliable sources
   */
  private static getKnownBookCover(title: string, author: string): string | null {
    const knownCovers: Record<string, string> = {
      // Turkish Classics with OpenLibrary covers
      'suç ve ceza': 'https://covers.openlibrary.org/b/isbn/9780486454115-L.jpg',
      '1984': 'https://covers.openlibrary.org/b/isbn/9780452284234-L.jpg',
      'sefiller': 'https://covers.openlibrary.org/b/isbn/9780451419439-L.jpg',
      'dune': 'https://covers.openlibrary.org/b/isbn/9780441172719-L.jpg',
      'simyacı': 'https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg',
      'and then there were none': 'https://covers.openlibrary.org/b/isbn/9780062073488-L.jpg',
      'meditations': 'https://covers.openlibrary.org/b/isbn/9780486298238-L.jpg',
      
      // Popular Modern Books
      'sapiens': 'https://covers.openlibrary.org/b/isbn/9780062316095-L.jpg',
      'atomic habits': 'https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg',
      'thinking, fast and slow': 'https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg',
      'clean code': 'https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg',
      'the alchemist': 'https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg',
      'the martian': 'https://covers.openlibrary.org/b/isbn/9780553418026-L.jpg',
      
      // Recent Books
      'educated': 'https://covers.openlibrary.org/b/isbn/9780399590504-L.jpg',
      'the seven husbands of evelyn hugo': 'https://covers.openlibrary.org/b/isbn/9781501161933-L.jpg',
      'project hail mary': 'https://covers.openlibrary.org/b/isbn/9780593135204-L.jpg',
      'the silent patient': 'https://covers.openlibrary.org/b/isbn/9781250301697-L.jpg',
      'the midnight library': 'https://covers.openlibrary.org/b/isbn/9780525559474-L.jpg',
      'klara and the sun': 'https://covers.openlibrary.org/b/isbn/9780593318171-L.jpg',
      
      // Turkish Books
      'müzede bir gece': 'https://covers.openlibrary.org/b/isbn/9789750718533-L.jpg',
      'körlük': 'https://covers.openlibrary.org/b/isbn/9789750823404-L.jpg',
      'çiçekli mumyalar': 'https://covers.openlibrary.org/b/isbn/9789753428071-L.jpg',
      
      // Tech and Finance
      'kişisel finans': 'https://covers.openlibrary.org/b/isbn/9780062312686-L.jpg',
      'javascript': 'https://covers.openlibrary.org/b/isbn/9781491952023-L.jpg',
      'react': 'https://covers.openlibrary.org/b/isbn/9781491954621-L.jpg',
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

  /**
   * Select best cover URL based on quality preference
   */
  private static selectBestCoverUrl(imageLinks: any, preferredQuality: 'high' | 'medium' | 'low'): string | null {
    if (!imageLinks) return null;
    
    const qualityOrder = {
      'high': ['extraLarge', 'large', 'medium', 'small', 'thumbnail', 'smallThumbnail'],
      'medium': ['medium', 'large', 'small', 'extraLarge', 'thumbnail', 'smallThumbnail'],
      'low': ['small', 'thumbnail', 'medium', 'large', 'extraLarge', 'smallThumbnail']
    };
    
    const order = qualityOrder[preferredQuality];
    
    for (const size of order) {
      if (imageLinks[size]) {
        return imageLinks[size];
      }
    }
    
    return null;
  }

  /**
   * Enhance image URL for better quality
   */
  private static enhanceImageUrl(url: string): string {
    let enhancedUrl = url;
    
    // Force HTTPS
    if (enhancedUrl.startsWith('http://')) {
      enhancedUrl = enhancedUrl.replace('http://', 'https://');
    }
    
    // Remove zoom restrictions
    enhancedUrl = enhancedUrl.replace(/&zoom=\d+/g, '');
    
    // Add high resolution parameter for Google Books images
    if (enhancedUrl.includes('googleusercontent.com') || enhancedUrl.includes('googleapis.com')) {
      enhancedUrl += enhancedUrl.includes('?') ? '&s=800' : '?s=800';
    }
    
    return enhancedUrl;
  }

  /**
   * Validate image URL accessibility
   */
  static async validateImageUrl(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Generate simple Base64 placeholder cover (no external dependencies)
   */
  static getFallbackCover(title: string): string {
    // Create a simple colored rectangle with title
    const colors = [
      '#6366F1', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B',
      '#EF4444', '#EC4899', '#84CC16', '#3B82F6', '#8B5A3C'
    ];
    
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = ((hash << 5) - hash + title.charCodeAt(i)) & 0xffffffff;
    }
    
    const colorIndex = Math.abs(hash) % colors.length;
    const color = colors[colorIndex].replace('#', '');
    
    // Use a simple SVG data URL instead of external service
    const svg = `
      <svg width="300" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="300" height="400" fill="#${color}"/>
        <text x="150" y="180" font-family="Arial, sans-serif" font-size="16" font-weight="bold" text-anchor="middle" fill="white">
          📚
        </text>
        <text x="150" y="220" font-family="Arial, sans-serif" font-size="14" text-anchor="middle" fill="white">
          ${title.length > 20 ? title.substring(0, 18) + '...' : title}
        </text>
      </svg>
    `;
    
    const base64 = btoa(unescape(encodeURIComponent(svg)));
    return `data:image/svg+xml;base64,${base64}`;
  }

  /**
   * Search for books by category using OpenLibrary
   */
  static async searchBooksByCategory(category: string, maxResults: number = 5): Promise<GoogleBook[]> {
    try {
      const url = `${OPENLIBRARY_SEARCH_API}?subject=${encodeURIComponent(category)}&limit=${maxResults}&fields=title,author_name,cover_i,first_publish_year,subject`;
      
      const response = await fetch(url);
      if (!response.ok) return [];
      
      const data: OpenLibraryResponse = await response.json();
      
      return data.docs.map((book, index) => ({
        id: `openlibrary_${index}`,
        volumeInfo: {
          title: book.title,
          authors: book.author_name || ['Unknown Author'],
          imageLinks: book.cover_i ? {
            thumbnail: `${OPENLIBRARY_COVERS_API}/id/${book.cover_i}-M.jpg`
          } : undefined,
          publishedDate: book.first_publish_year?.toString(),
          categories: book.subject?.slice(0, 3),
        }
      }));
    } catch (error) {
      console.log('OpenLibrary category search error:', error);
      return [];
    }
  }

  /**
   * Search for recent books using OpenLibrary
   */
  static async searchRecentBooks(year: number = new Date().getFullYear(), maxResults: number = 5): Promise<GoogleBook[]> {
    try {
      const url = `${OPENLIBRARY_SEARCH_API}?q=*&first_publish_year=${year}&limit=${maxResults}&fields=title,author_name,cover_i,first_publish_year,subject&sort=new`;
      
      const response = await fetch(url);
      if (!response.ok) return [];
      
      const data: OpenLibraryResponse = await response.json();
      
      return data.docs.map((book, index) => ({
        id: `openlibrary_new_${index}`,
        volumeInfo: {
          title: book.title,
          authors: book.author_name || ['Unknown Author'],
          imageLinks: book.cover_i ? {
            thumbnail: `${OPENLIBRARY_COVERS_API}/id/${book.cover_i}-M.jpg`
          } : undefined,
          publishedDate: book.first_publish_year?.toString(),
          categories: book.subject?.slice(0, 3),
  }
      }));
    } catch (error) {
      console.log('OpenLibrary recent books search error:', error);
      return [];
    }
  }
} 