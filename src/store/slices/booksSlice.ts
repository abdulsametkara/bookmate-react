import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Book {
  id: string;
  title: string;
  author: string;
  coverURL: string;
  genre: string;
  publishYear: number;
  publisher: string;
  pageCount: number;
  currentPage: number;
  progress: number;
  rating: number;
  status: 'READING' | 'COMPLETED' | 'TO_READ';
  description: string;
  notes: Array<{
    id: string;
    content: string;
    page: number;
    date: string;
  }>;
  isSharedWithPartner: boolean;
  lastReadingDate: string;
}

export interface BooksState {
  items: Book[];
  loading: boolean;
  error: string | null;
}

const initialState: BooksState = {
  items: [],
  loading: false,
  error: null,
};

const booksSlice = createSlice({
  name: 'books',
  initialState,
  reducers: {
    setBooks(state, action: PayloadAction<Book[]>) {
      state.items = action.payload;
    },
    addBook(state, action: PayloadAction<Book>) {
      state.items.push(action.payload);
    },
    updateBook(state, action: PayloadAction<Book>) {
      const index = state.items.findIndex(book => book.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    deleteBook(state, action: PayloadAction<string>) {
      state.items = state.items.filter(book => book.id !== action.payload);
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const { 
  setBooks, 
  addBook, 
  updateBook, 
  deleteBook, 
  setLoading, 
  setError 
} = booksSlice.actions;

export default booksSlice.reducer; 