import { useAppDispatch, useAppSelector } from '../store';
import { 
  setBooks, 
  addBook as addBookToStore, 
  updateBook as updateBookInStore, 
  deleteBook as deleteBookFromStore,
  updateBookStatus as updateBookStatusInStore,
  updateBookProgress as updateBookProgressInStore,
  Book 
} from '../store/bookSlice';
import * as bookService from '../services/bookService';
import * as authService from '../services/authService';

// Backend'den gelen kitabı Redux formatına çevir
const convertBackendBookToRedux = (backendBook: bookService.Book): Book => {
  return {
    id: backendBook.id,
    title: backendBook.title,
    author: backendBook.author,
    coverURL: backendBook.coverImageUrl || '', // Backend: coverImageUrl -> Frontend: coverURL
    pageCount: backendBook.pageCount,
    currentPage: backendBook.currentPage,
    progress: backendBook.progress,
    status: backendBook.status,
    genre: backendBook.genre,
    publishYear: backendBook.publishedYear, // Backend: publishedYear -> Frontend: publishYear
    publisher: undefined, // Backend'de yok
    description: backendBook.description,
    isbn: backendBook.isbn,
    notes: [], // Backend'de ayrı tablo
    createdAt: backendBook.createdAt,
    updatedAt: backendBook.updatedAt,
    userId: backendBook.userId,
    isJointReading: false, // Frontend feature
    startDate: backendBook.startDate,
    isFavorite: false, // Frontend feature
  };
};

// Redux kitabı Backend formatına çevir
const convertReduxBookToBackend = (reduxBook: Book): bookService.BookFormData => {
  return {
    title: reduxBook.title,
    author: reduxBook.author,
    pageCount: reduxBook.pageCount,
    description: reduxBook.description,
    genre: reduxBook.genre,
    publishedYear: reduxBook.publishYear, // Frontend: publishYear -> Backend: publishedYear
    isbn: reduxBook.isbn,
    coverImageUrl: reduxBook.coverURL, // Frontend: coverURL -> Backend: coverImageUrl
  };
};

export const useBackendIntegration = () => {
  const dispatch = useAppDispatch();
  const { currentUserId } = useAppSelector(state => state.books);

  // Backend'den tüm kitapları getir ve Redux'a kaydet
  const fetchBooks = async () => {
    try {
      const backendBooks = await bookService.getBooks();
      const reduxBooks = backendBooks.map(convertBackendBookToRedux);
      dispatch(setBooks(reduxBooks));
      return reduxBooks;
    } catch (error) {
      console.error('Error fetching books from backend:', error);
      throw error;
    }
  };

  // Yeni kitap ekle (Backend + Redux)
  const addBook = async (bookData: Partial<Book>) => {
    try {
      const backendBookData = convertReduxBookToBackend(bookData as Book);
      const backendBook = await bookService.addBook(backendBookData);
      const reduxBook = convertBackendBookToRedux(backendBook);
      
      dispatch(addBookToStore(reduxBook));
      return reduxBook;
    } catch (error) {
      console.error('Error adding book to backend:', error);
      throw error;
    }
  };

  // Kitap güncelle (Backend + Redux)
  const updateBook = async (id: string, updates: Partial<Book>) => {
    try {
      const backendBook = await bookService.updateBook(id, {
        title: updates.title,
        author: updates.author,
        pageCount: updates.pageCount,
        currentPage: updates.currentPage,
        status: updates.status,
        description: updates.description,
        genre: updates.genre,
        publishedYear: updates.publishYear,
        isbn: updates.isbn,
        coverImageUrl: updates.coverURL,
      });
      
      const reduxBook = convertBackendBookToRedux(backendBook);
      dispatch(updateBookInStore(reduxBook));
      return reduxBook;
    } catch (error) {
      console.error('Error updating book in backend:', error);
      throw error;
    }
  };

  // Kitap sil (Backend + Redux)
  const deleteBook = async (id: string) => {
    try {
      await bookService.deleteBook(id);
      dispatch(deleteBookFromStore(id));
    } catch (error) {
      console.error('Error deleting book from backend:', error);
      throw error;
    }
  };

  // Okuma durumunu güncelle (Backend + Redux)
  const updateBookStatus = async (id: string, status: Book['status']) => {
    try {
      const backendBook = await bookService.updateReadingStatus(id, status);
      const reduxBook = convertBackendBookToRedux(backendBook);
      
      dispatch(updateBookStatusInStore({ id, status }));
      dispatch(updateBookInStore(reduxBook)); // Tam güncelleme için
      return reduxBook;
    } catch (error) {
      console.error('Error updating book status in backend:', error);
      throw error;
    }
  };

  // Okuma ilerlemesini güncelle (Backend + Redux)
  const updateBookProgress = async (id: string, currentPage: number) => {
    try {
      // Backend'in özel progress endpoint'ini kullan
      const backendBook = await bookService.updateProgress(id, currentPage);
      const reduxBook = convertBackendBookToRedux(backendBook);
      
      dispatch(updateBookProgressInStore({ 
        id, 
        currentPage: backendBook.currentPage, 
        progress: backendBook.progress 
      }));
      dispatch(updateBookInStore(reduxBook)); // Status değişiklikleri için tam güncelleme
      return reduxBook;
    } catch (error) {
      console.error('Error updating book progress in backend:', error);
      throw error;
    }
  };

  // Belirli kitabı getir
  const getBook = async (id: string) => {
    try {
      const backendBook = await bookService.getBookById(id);
      return convertBackendBookToRedux(backendBook);
    } catch (error) {
      console.error('Error fetching book from backend:', error);
      throw error;
    }
  };

  // Auth işlemleri
  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      // Login başarılıysa kitapları getir
      await fetchBooks();
      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, displayName?: string) => {
    try {
      const response = await authService.register({ email, password, displayName });
      // Register başarılıysa kitapları getir (boş olabilir)
      await fetchBooks();
      return response;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      dispatch(setBooks([])); // Redux'dan kitapları temizle
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const getProfile = async () => {
    try {
      return await authService.getProfile();
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  };

  return {
    // Book operations
    fetchBooks,
    addBook,
    updateBook,
    deleteBook,
    updateBookStatus,
    updateBookProgress,
    getBook,
    
    // Auth operations  
    login,
    register,
    logout,
    getProfile,
    
    // Utility functions
    convertBackendBookToRedux,
    convertReduxBookToBackend,
  };
}; 
 