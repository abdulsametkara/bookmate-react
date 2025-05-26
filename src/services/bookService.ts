import api from './api';

export interface Book {
  id: string;
  title: string;
  author: string;
  genre?: string;
  publishedYear?: number;
  isbn?: string;
  coverImageUrl?: string;
  pageCount: number;
  currentPage: number;
  progress: number;
  status: 'TO_READ' | 'READING' | 'COMPLETED' | 'PAUSED';
  description?: string;
  userId: string;
  startDate?: string;
  finishDate?: string;
  createdAt: string;
  updatedAt: string;
  isSharedWithPartner?: boolean;
  lastReadingDate?: string;
  notes?: Note[];
}

export interface Note {
  id: string;
  bookId: string;
  content: string;
  page?: number;
  createdAt: string;
}

export interface BookFormData {
  title: string;
  author: string;
  genre?: string;
  publishedYear?: number;
  isbn?: string;
  coverImageUrl?: string;
  pageCount: number;
  description?: string;
}

// Tüm kitapları getir
export const getBooks = async (): Promise<Book[]> => {
  const response = await api.get<{ message: string; books: Book[] }>('/books');
  return response.data.books;
};

// Kitap detayını getir
export const getBookById = async (id: string): Promise<Book> => {
  const response = await api.get<{ message: string; book: Book }>(`/books/${id}`);
  return response.data.book;
};

// Yeni kitap ekle
export const addBook = async (bookData: BookFormData): Promise<Book> => {
  if (!bookData.title || !bookData.author || !bookData.pageCount) {
    throw new Error('Başlık, yazar ve sayfa sayısı gerekli');
  }

  const response = await api.post<{ message: string; book: Book }>('/books', {
    title: bookData.title,
    author: bookData.author,
    pageCount: bookData.pageCount,
    description: bookData.description,
    genre: bookData.genre,
    publishedYear: bookData.publishedYear,
    isbn: bookData.isbn,
    coverImageUrl: bookData.coverImageUrl
  });
  
  return response.data.book;
};

// Kitap güncelle
export const updateBook = async (id: string, bookData: Partial<Book>): Promise<Book> => {
  const response = await api.put<{ message: string; book: Book }>(`/books/${id}`, bookData);
  return response.data.book;
};

// Kitap sil
export const deleteBook = async (id: string): Promise<void> => {
  await api.delete<{ message: string }>(`/books/${id}`);
};

// Okuma durumunu güncelle
export const updateReadingStatus = async (id: string, status: 'TO_READ' | 'READING' | 'COMPLETED' | 'PAUSED'): Promise<Book> => {
  const response = await api.put<{ message: string; book: Book }>(`/books/${id}`, { status });
  return response.data.book;
};

// Okuma ilerlemesini güncelle
export const updateReadingProgress = async (id: string, currentPage: number): Promise<Book> => {
  const response = await api.put<{ message: string; book: Book }>(`/books/${id}`, { currentPage });
  return response.data.book;
};

// Yeni: PATCH endpoint kullanarak progress güncelle (backend'de varsa)
export const updateProgress = async (id: string, currentPage: number): Promise<Book> => {
  try {
    const response = await api.patch<{ message: string; book: Book }>(`/books/${id}/progress`, { currentPage });
    return response.data.book;
  } catch (error) {
    return updateReadingProgress(id, currentPage);
  }
}; 