/**
 * Test utility for enhanced book cover system
 * Tests Google Books API integration and cover quality
 */

import GoogleBooksService from '../services/googleBooksService';
import RecommendationManager from './recommendationManager';

interface CoverTestResult {
  title: string;
  author: string;
  success: boolean;
  coverURL: string | null;
  quality: 'high' | 'medium' | 'low' | 'fallback';
  responseTime: number;
  error?: string;
}

export class BookCoverTester {
  
  /**
   * Test a batch of books for cover quality
   */
  static async testBookCovers(books: Array<{title: string, author: string}>): Promise<CoverTestResult[]> {
    const results: CoverTestResult[] = [];
    
    console.log(`🧪 Testing covers for ${books.length} books...`);
    
    for (const book of books) {
      const startTime = Date.now();
      
      try {
        const coverURL = await GoogleBooksService.getBookCover(book.title, book.author, 'high');
        const responseTime = Date.now() - startTime;
        
        const quality = this.assessCoverQuality(coverURL);
        
        results.push({
          title: book.title,
          author: book.author,
          success: !!coverURL,
          coverURL,
          quality,
          responseTime
        });
        
        console.log(`✅ ${book.title}: ${quality} quality (${responseTime}ms)`);
        
      } catch (error) {
        const responseTime = Date.now() - startTime;
        
        results.push({
          title: book.title,
          author: book.author,
          success: false,
          coverURL: null,
          quality: 'fallback',
          responseTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        console.error(`❌ ${book.title}: Failed (${responseTime}ms)`, error);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    this.logTestSummary(results);
    return results;
  }
  
  /**
   * Assess cover quality based on URL characteristics
   */
  private static assessCoverQuality(coverURL: string | null): 'high' | 'medium' | 'low' | 'fallback' {
    if (!coverURL) return 'fallback';
    
    if (coverURL.includes('placeholder')) return 'fallback';
    
    // Google Books quality indicators
    if (coverURL.includes('&s=800') || coverURL.includes('extraLarge')) return 'high';
    if (coverURL.includes('large') || coverURL.includes('medium')) return 'medium';
    if (coverURL.includes('thumbnail') || coverURL.includes('small')) return 'low';
    
    // Default for Google Books URLs
    if (coverURL.includes('googleusercontent.com') || coverURL.includes('googleapis.com')) return 'medium';
    
    return 'low';
  }
  
  /**
   * Log comprehensive test summary
   */
  private static logTestSummary(results: CoverTestResult[]) {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = total - successful;
    
    const qualityCounts = {
      high: results.filter(r => r.quality === 'high').length,
      medium: results.filter(r => r.quality === 'medium').length,
      low: results.filter(r => r.quality === 'low').length,
      fallback: results.filter(r => r.quality === 'fallback').length
    };
    
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / total;
    
    console.log('\n📊 BOOK COVER TEST SUMMARY');
    console.log('=' .repeat(50));
    console.log(`📚 Total books tested: ${total}`);
    console.log(`✅ Successful: ${successful} (${(successful/total*100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${failed} (${(failed/total*100).toFixed(1)}%)`);
    console.log(`\n🎨 Quality Distribution:`);
    console.log(`   📸 High quality: ${qualityCounts.high}`);
    console.log(`   🖼️  Medium quality: ${qualityCounts.medium}`);
    console.log(`   🏷️  Low quality: ${qualityCounts.low}`);
    console.log(`   📋 Fallback: ${qualityCounts.fallback}`);
    console.log(`\n⏱️  Average response time: ${avgResponseTime.toFixed(0)}ms`);
    console.log('=' .repeat(50));
  }
  
  /**
   * Test the complete recommendation system
   */
  static async testRecommendationSystem(): Promise<void> {
    console.log('🔄 Testing complete recommendation system...');
    
    try {
      // Initialize covers
      await RecommendationManager.initializeBookCovers();
      
      // Test each category
      const categories = [
        { name: 'Popular', method: () => RecommendationManager.getPopularBooks() },
        { name: 'Classics', method: () => RecommendationManager.getClassicBooks() },
        { name: 'New Releases', method: () => RecommendationManager.getNewReleases() }
      ];
      
      for (const category of categories) {
        console.log(`\n📂 Testing ${category.name} category...`);
        const startTime = Date.now();
        
        const result = await category.method();
        const responseTime = Date.now() - startTime;
        
        const booksWithCovers = result.books.filter(book => 
          book.coverURL && !book.coverURL.includes('placeholder')
        ).length;
        
        console.log(`✅ ${category.name}: ${result.books.length} books, ${booksWithCovers} with real covers (${responseTime}ms)`);
      }
      
    } catch (error) {
      console.error('🚨 Recommendation system test failed:', error);
    }
  }
  
  /**
   * Test specific popular books
   */
  static async testPopularBooks(): Promise<CoverTestResult[]> {
    const popularTestBooks = [
      { title: 'Sapiens', author: 'Yuval Noah Harari' },
      { title: 'Atomic Habits', author: 'James Clear' },
      { title: '1984', author: 'George Orwell' },
      { title: 'The Alchemist', author: 'Paulo Coelho' },
      { title: 'Dune', author: 'Frank Herbert' },
      { title: 'Clean Code', author: 'Robert C. Martin' },
      { title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman' }
    ];
    
    return this.testBookCovers(popularTestBooks);
  }
  
  /**
   * Validate image URLs
   */
  static async validateImageUrls(urls: string[]): Promise<{url: string, valid: boolean, size?: number}[]> {
    const results = [];
    
    for (const url of urls) {
      try {
        const isValid = await GoogleBooksService.validateImageUrl(url);
        results.push({ url, valid: isValid });
        
        if (isValid) {
          console.log(`✅ Valid: ${url.substring(0, 50)}...`);
        } else {
          console.log(`❌ Invalid: ${url.substring(0, 50)}...`);
        }
        
      } catch (error) {
        results.push({ url, valid: false });
        console.log(`🚨 Error validating: ${url.substring(0, 50)}...`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }
}

// Export test functions for use in development
export const runBookCoverTests = async () => {
  console.log('🚀 Starting comprehensive book cover tests...');
  
  // Test popular books
  await BookCoverTester.testPopularBooks();
  
  // Test full recommendation system
  await BookCoverTester.testRecommendationSystem();
  
  console.log('✅ All tests completed!');
};

export default BookCoverTester; 