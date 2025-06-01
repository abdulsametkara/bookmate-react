import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, getApiUrl, getAuthHeaders } from '../config/api';

export interface BookData {
  id?: string;
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  published_year?: number;
  page_count?: number;
  genre?: string;
  description?: string;
  cover_image_url?: string;
  language?: string;
}

export interface UserBook {
  id: string;
  user_id: string;
  book_id: string;
  status: 'to_read' | 'reading' | 'completed' | 'paused' | 'dropped';
  rating?: number;
  notes?: string;
  is_favorite: boolean;
  start_date?: string;
  finish_date?: string;
  current_page?: number;
  createdAt: string;
  updatedAt: string;
  // Joined fields from books table
  title: string;
  author: string;
  cover_image_url: string;
  page_count: number;
  genre?: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  book_id: string;
  priority: number;
  notes?: string;
  createdAt: string;
  // Joined fields from books table
  title: string;
  author: string;
  cover_image_url: string;
  page_count: number;
  publisher?: string;
}

export interface UserBookStats {
  total: number;
  by_status: {
    [key: string]: {
      count: number;
      avg_rating: string | null;
    };
  };
}

class APIService {
  /**
   * Get authentication token from AsyncStorage
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('bookmate_auth_token');
    } catch (error) {
      console.error('❌ Token retrieval error:', error);
      return null;
    }
  }

  /**
   * Add a book to the books table
   */
  async addBook(bookData: BookData): Promise<{ success: boolean; book?: any; message?: string }> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return { success: false, message: 'Authentication token not found' };
      }

      const response = await fetch(getApiUrl('/api/books'), {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(bookData),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, book: data.book };
      } else {
        return { success: false, message: data.message || 'Failed to add book' };
      }
    } catch (error) {
      console.error('❌ Add book error:', error);
      return { success: false, message: 'Network error occurred' };
    }
  }

  /**
   * Search books from Google Books API
   */
  async searchBooks(query: string): Promise<{ success: boolean; books?: any[]; message?: string }> {
    try {
      if (!query.trim()) {
        return { success: false, message: 'Search query is required' };
      }

      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&langRestrict=tr`
      );
      
      const data = await response.json();

      if (data.items) {
        return { success: true, books: data.items };
      } else {
        return { success: false, message: 'No books found' };
      }
    } catch (error) {
      console.error('❌ Search books error:', error);
      return { success: false, message: 'Search failed' };
    }
  }

  /**
   * Get user's book collection
   */
  async getUserBooks(status?: string, page: number = 1, limit: number = 20): Promise<{ 
    success: boolean; 
    books?: UserBook[]; 
    pagination?: any;
    message?: string;
  }> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return { success: false, message: 'Authentication token not found' };
      }

      let url = `/api/user/books?page=${page}&limit=${limit}`;
      if (status) {
        url += `&status=${status}`;
      }

      const response = await fetch(getApiUrl(url), {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, books: data.books, pagination: data.pagination };
      } else {
        return { success: false, message: data.message || 'Failed to fetch user books' };
      }
    } catch (error) {
      console.error('❌ Get user books error:', error);
      return { success: false, message: 'Failed to fetch books' };
    }
  }

  /**
   * Get user's book statistics
   */
  async getUserBookStats(): Promise<{ success: boolean; stats?: UserBookStats; message?: string }> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return { success: false, message: 'Authentication token not found' };
      }

      const response = await fetch(getApiUrl('/api/user/books/stats'), {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, stats: data };
      } else {
        return { success: false, message: data.message || 'Failed to fetch stats' };
      }
    } catch (error) {
      console.error('❌ Get user book stats error:', error);
      return { success: false, message: 'Failed to fetch stats' };
    }
  }

  /**
   * Add book to user's collection
   */
  async addBookToCollection(
    bookId: string,
    status: string = 'to_read',
    rating?: number,
    notes?: string,
    isFavorite: boolean = false
  ): Promise<{ success: boolean; userBook?: UserBook; message?: string; removedFromWishlist?: boolean }> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return { success: false, message: 'Authentication token not found' };
      }

      const response = await fetch(getApiUrl('/api/user/books'), {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          book_id: bookId,
          status,
          rating,
          notes,
          is_favorite: isFavorite,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        return { 
          success: true, 
          userBook: data.userBook, 
          message: data.message,
          removedFromWishlist: data.removedFromWishlist 
        };
      } else {
        return { success: false, message: data.message || 'Failed to add book to collection' };
      }
    } catch (error) {
      console.error('❌ Add book to collection error:', error);
      return { success: false, message: 'Failed to add book to collection' };
    }
  }

  /**
   * Update user book
   */
  async updateUserBook(
    userBookId: string,
    updates: {
      status?: string;
      rating?: number;
      notes?: string;
      is_favorite?: boolean;
      start_date?: string;
      finish_date?: string;
      current_page?: number;
    }
  ): Promise<{ success: boolean; userBook?: UserBook; message?: string }> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return { success: false, message: 'Authentication token not found' };
      }

      const response = await fetch(getApiUrl(`/api/user/books/${userBookId}`), {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, userBook: data.userBook, message: data.message };
      } else {
        return { success: false, message: data.message || 'Failed to update book' };
      }
    } catch (error) {
      console.error('❌ Update user book error:', error);
      return { success: false, message: 'Failed to update book' };
    }
  }

  /**
   * Remove book from user's collection
   */
  async removeBookFromCollection(userBookId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return { success: false, message: 'Authentication token not found' };
      }

      const response = await fetch(getApiUrl(`/api/user/books/${userBookId}`), {
        method: 'DELETE',
        headers: getAuthHeaders(token),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Failed to remove book' };
      }
    } catch (error) {
      console.error('❌ Remove book from collection error:', error);
      return { success: false, message: 'Failed to remove book' };
    }
  }

  /**
   * Get user's wishlist
   */
  async getWishlist(): Promise<{ success: boolean; wishlist?: WishlistItem[]; message?: string }> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return { success: false, message: 'Authentication token not found' };
      }

      const response = await fetch(getApiUrl('/api/user/wishlists'), {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, wishlist: data };
      } else {
        return { success: false, message: data.message || 'Failed to fetch wishlist' };
      }
    } catch (error) {
      console.error('❌ Get wishlist error:', error);
      return { success: false, message: 'Failed to fetch wishlist' };
    }
  }

  /**
   * Add book to wishlist
   */
  async addToWishlist(
    bookId: string,
    priority: number = 3,
    notes?: string
  ): Promise<{ success: boolean; wishlist?: WishlistItem; message?: string }> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return { success: false, message: 'Authentication token not found' };
      }

      const response = await fetch(getApiUrl('/api/user/wishlists'), {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          book_id: bookId,
          priority,
          notes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, wishlist: data.wishlist, message: data.message };
      } else {
        return { success: false, message: data.message || 'Failed to add to wishlist' };
      }
    } catch (error) {
      console.error('❌ Add to wishlist error:', error);
      return { success: false, message: 'Failed to add to wishlist' };
    }
  }

  /**
   * Remove book from wishlist
   */
  async removeFromWishlist(wishlistId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return { success: false, message: 'Authentication token not found' };
      }

      const response = await fetch(getApiUrl(`/api/user/wishlists/${wishlistId}`), {
        method: 'DELETE',
        headers: getAuthHeaders(token),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Failed to remove from wishlist' };
      }
    } catch (error) {
      console.error('❌ Remove from wishlist error:', error);
      return { success: false, message: 'Failed to remove from wishlist' };
    }
  }

  /**
   * Update wishlist item
   */
  async updateWishlistItem(
    wishlistId: string,
    priority?: number,
    notes?: string
  ): Promise<{ success: boolean; wishlist?: WishlistItem; message?: string }> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return { success: false, message: 'Authentication token not found' };
      }

      const response = await fetch(getApiUrl(`/api/user/wishlists/${wishlistId}`), {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          priority,
          notes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, wishlist: data.wishlist, message: data.message };
      } else {
        return { success: false, message: data.message || 'Failed to update wishlist item' };
      }
    } catch (error) {
      console.error('❌ Update wishlist item error:', error);
      return { success: false, message: 'Failed to update wishlist item' };
    }
  }

  /**
   * Get books by status
   */
  async getBooksByStatus(
    status: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ success: boolean; books?: UserBook[]; pagination?: any; message?: string }> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return { success: false, message: 'Authentication token not found' };
      }

      const response = await fetch(getApiUrl(`/api/user/books/status/${status}?page=${page}&limit=${limit}`), {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, books: data.books, pagination: data.pagination };
      } else {
        return { success: false, message: data.message || 'Failed to fetch books by status' };
      }
    } catch (error) {
      console.error('❌ Get books by status error:', error);
      return { success: false, message: 'Failed to fetch books' };
    }
  }

  /**
   * Get favorite books
   */
  async getFavoriteBooks(): Promise<{ success: boolean; books?: UserBook[]; message?: string }> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return { success: false, message: 'Authentication token not found' };
      }

      const response = await fetch(getApiUrl('/api/user/books/favorites'), {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, books: data };
      } else {
        return { success: false, message: data.message || 'Failed to fetch favorite books' };
      }
    } catch (error) {
      console.error('❌ Get favorite books error:', error);
      return { success: false, message: 'Failed to fetch favorite books' };
    }
  }
}

export default new APIService(); 
 