import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Book {
  id: string;
  title: string;
  author: string;
  coverURL: string;
  pageCount: number;
  currentPage: number;
  progress: number;
  status: 'TO_READ' | 'READING' | 'COMPLETED';
  genre?: string;
  publishYear?: number;
  publisher?: string;
  description?: string;
  isbn?: string;
  notes?: any[];
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
  isJointReading?: boolean;
  startDate?: string;
  isFavorite?: boolean;
}

interface BooksState {
  items: Book[];
  loading: boolean;
  currentUserId: string | null;
}

const initialState: BooksState = {
  items: [],
  loading: false,
  currentUserId: null, // Şu an için guest user
};

// AsyncStorage keys - User ID bazlı
const BOOKS_STORAGE_KEY = 'bookmate_books';
const USER_BOOKS_STORAGE_KEY = (userId: string) => `bookmate_books_${userId}`;
const CURRENT_USER_KEY = 'bookmate_current_user';

// AsyncStorage utility functions - User aware
export const saveBooks = async (books: Book[], userId?: string) => {
  try {
    const storageKey = userId ? USER_BOOKS_STORAGE_KEY(userId) : BOOKS_STORAGE_KEY;
    
    // Add userId to each book if provided
    const booksWithUserId = userId ? books.map(book => ({
      ...book,
      userId,
      updatedAt: new Date().toISOString()
    })) : books;
    
    console.log('saveBooks called with:', {
      userId,
      storageKey,
      originalBookCount: books.length,
      finalBookCount: booksWithUserId.length,
      books: booksWithUserId.map(b => ({ id: b.id, title: b.title, userId: b.userId }))
    });
    
    const jsonValue = JSON.stringify(booksWithUserId);
    await AsyncStorage.setItem(storageKey, jsonValue);
    console.log(`Books successfully saved to AsyncStorage for user ${userId || 'guest'}:`, booksWithUserId.length);
  } catch (error) {
    console.error('Error saving books to AsyncStorage:', error);
  }
};

export const loadBooks = async (userId?: string): Promise<Book[]> => {
  try {
    const storageKey = userId ? USER_BOOKS_STORAGE_KEY(userId) : BOOKS_STORAGE_KEY;
    console.log('loadBooks called with:', { userId, storageKey });
    
    const jsonValue = await AsyncStorage.getItem(storageKey);
    console.log('AsyncStorage result:', { storageKey, hasData: !!jsonValue, rawData: jsonValue });
    
    if (jsonValue != null) {
      const books = JSON.parse(jsonValue);
      console.log(`Books loaded from AsyncStorage for user ${userId || 'guest'}:`, {
        count: books.length,
        books: books.map((b: Book) => ({ id: b.id, title: b.title, userId: b.userId }))
      });
      return books;
    }
    
    console.log(`No books found in AsyncStorage for user ${userId || 'guest'}`);
    return [];
  } catch (error) {
    console.error('Error loading books from AsyncStorage:', error);
    return [];
  }
};

export const saveCurrentUser = async (userId: string) => {
  try {
    await AsyncStorage.setItem(CURRENT_USER_KEY, userId);
    console.log('Current user saved:', userId);
  } catch (error) {
    console.error('Error saving current user:', error);
  }
};

export const loadCurrentUser = async (): Promise<string | null> => {
  try {
    const userId = await AsyncStorage.getItem(CURRENT_USER_KEY);
    console.log('Current user loaded:', userId);
    return userId;
  } catch (error) {
    console.error('Error loading current user:', error);
    return null;
  }
};

// Migration function - Mevcut verileri guest user'a taşı
export const migrateToUserBasedStorage = async (): Promise<void> => {
  try {
    const guestUserId = 'guest_user';
    
    // Eski verileri kontrol et
    const oldBooks = await AsyncStorage.getItem(BOOKS_STORAGE_KEY);
    if (oldBooks) {
      const books = JSON.parse(oldBooks);
      
      // Guest user için kaydet
      await saveBooks(books, guestUserId);
      
      // Eski key'i kaldır (opsiyonel)
      // await AsyncStorage.removeItem(BOOKS_STORAGE_KEY);
      
      console.log('Migration completed: Moved books to guest user');
    }
  } catch (error) {
    console.error('Error during migration:', error);
  }
};

const booksSlice = createSlice({
  name: 'books',
  initialState,
  reducers: {
    setCurrentUser: (state, action: PayloadAction<string | null>) => {
      state.currentUserId = action.payload;
      // Async operations should be handled outside of reducers
      // saveCurrentUser will be called from components when needed
    },
    setBooks: (state, action: PayloadAction<Book[]>) => {
      state.items = action.payload;
      // Async operations should be handled outside of reducers
      // saveBooks will be called from components when needed
    },
    addBook: (state, action: PayloadAction<Book>) => {
      const bookWithUser = {
        ...action.payload,
        userId: state.currentUserId || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      state.items.push(bookWithUser);
      // Async operations should be handled outside of reducers
    },
    updateBook: (state, action: PayloadAction<Book>) => {
      const index = state.items.findIndex(book => book.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = {
          ...action.payload,
          userId: state.currentUserId || undefined,
          updatedAt: new Date().toISOString()
        };
        // Async operations should be handled outside of reducers
      }
    },
    deleteBook: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(book => book.id !== action.payload);
      // Async operations should be handled outside of reducers
    },
    updateBookStatus: (state, action: PayloadAction<{ id: string; status: 'TO_READ' | 'READING' | 'COMPLETED' }>) => {
      const book = state.items.find(book => book.id === action.payload.id);
      if (book) {
        book.status = action.payload.status;
        book.updatedAt = new Date().toISOString();
        // Async operations should be handled outside of reducers
      }
    },
    updateBookProgress: (state, action: PayloadAction<{ id: string; currentPage: number; progress: number }>) => {
      const book = state.items.find(book => book.id === action.payload.id);
      if (book) {
        book.currentPage = action.payload.currentPage;
        book.progress = action.payload.progress;
        book.updatedAt = new Date().toISOString();
        // Async operations should be handled outside of reducers
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    clearUserData: (state) => {
      // Only clear Redux state, don't delete user's AsyncStorage data
      // This should only be used for account deletion, not logout
      state.items = [];
      state.currentUserId = null;
    },
  },
});

export const { 
  setCurrentUser,
  setBooks, 
  addBook, 
  updateBook, 
  deleteBook, 
  updateBookStatus, 
  updateBookProgress,
  setLoading,
  clearUserData
} = booksSlice.actions;

export default booksSlice.reducer; 