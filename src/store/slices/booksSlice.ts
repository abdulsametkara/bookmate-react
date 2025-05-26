import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import * as bookService from '../../services/bookService';

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
  selectedBook: Book | null;
  loading: boolean;
  error: string | null;
}

// Async thunks
export const fetchBooks = createAsyncThunk(
  'books/fetchBooks',
  async (_, { rejectWithValue }) => {
    try {
      return await bookService.getBooks();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch books');
    }
  }
);

export const fetchBookById = createAsyncThunk(
  'books/fetchBookById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await bookService.getBookById(id);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch book');
    }
  }
);

export const createBook = createAsyncThunk(
  'books/createBook',
  async (bookData: bookService.BookFormData, { rejectWithValue }) => {
    try {
      return await bookService.addBook(bookData);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create book');
    }
  }
);

export const updateBookAction = createAsyncThunk(
  'books/updateBook',
  async ({ id, bookData }: { id: string; bookData: Partial<Book> }, { rejectWithValue }) => {
    try {
      return await bookService.updateBook(id, bookData);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update book');
    }
  }
);

export const deleteBookAction = createAsyncThunk(
  'books/deleteBook',
  async (id: string, { rejectWithValue }) => {
    try {
      await bookService.deleteBook(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete book');
    }
  }
);

export const updateReadingStatus = createAsyncThunk(
  'books/updateReadingStatus',
  async ({ id, status }: { id: string; status: 'READING' | 'COMPLETED' | 'TO_READ' }, { rejectWithValue }) => {
    try {
      return await bookService.updateReadingStatus(id, status);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update status');
    }
  }
);

export const updateReadingProgress = createAsyncThunk(
  'books/updateReadingProgress',
  async ({ id, currentPage }: { id: string; currentPage: number }, { rejectWithValue }) => {
    try {
      return await bookService.updateReadingProgress(id, currentPage);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update progress');
    }
  }
);

const initialState: BooksState = {
  items: [],
  selectedBook: null,
  loading: false,
  error: null,
};

const booksSlice = createSlice({
  name: 'books',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    clearSelectedBook(state) {
      state.selectedBook = null;
    }
  },
  extraReducers: (builder) => {
    // Fetch Books
    builder
      .addCase(fetchBooks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBooks.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(fetchBooks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Book By Id
    builder
      .addCase(fetchBookById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookById.fulfilled, (state, action) => {
        state.selectedBook = action.payload;
        state.loading = false;
      })
      .addCase(fetchBookById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create Book
    builder
      .addCase(createBook.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBook.fulfilled, (state, action) => {
        state.items.push(action.payload);
        state.loading = false;
      })
      .addCase(createBook.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Book
    builder
      .addCase(updateBookAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBookAction.fulfilled, (state, action) => {
        const index = state.items.findIndex(book => book.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedBook && state.selectedBook.id === action.payload.id) {
          state.selectedBook = action.payload;
        }
        state.loading = false;
      })
      .addCase(updateBookAction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete Book
    builder
      .addCase(deleteBookAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteBookAction.fulfilled, (state, action) => {
        state.items = state.items.filter(book => book.id !== action.payload);
        if (state.selectedBook && state.selectedBook.id === action.payload) {
          state.selectedBook = null;
        }
        state.loading = false;
      })
      .addCase(deleteBookAction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Reading Status
    builder
      .addCase(updateReadingStatus.fulfilled, (state, action) => {
        const index = state.items.findIndex(book => book.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedBook && state.selectedBook.id === action.payload.id) {
          state.selectedBook = action.payload;
        }
      });

    // Update Reading Progress
    builder
      .addCase(updateReadingProgress.fulfilled, (state, action) => {
        const index = state.items.findIndex(book => book.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedBook && state.selectedBook.id === action.payload.id) {
          state.selectedBook = action.payload;
        }
      });
  },
});

export const { clearError, clearSelectedBook } = booksSlice.actions;

export default booksSlice.reducer; 