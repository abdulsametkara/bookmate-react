import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

// Reducer'ları import etme
import booksReducer from './bookSlice';

export const store = configureStore({
  reducer: {
    books: booksReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Date objelerini string'e çevireceğiz, bu kontrolü esnek hale getirelim
        ignoredActions: [
          'books/setBooks',
          'books/addBook',
          'books/updateBook',
          'books/setCurrentUser'
        ],
        ignoredActionPaths: [
          'payload.createdAt',
          'payload.updatedAt', 
          'payload.startDate',
          'meta.arg',
          'meta.baseQueryMeta'
        ],
        ignoredPaths: [
          'books.items.createdAt',
          'books.items.updatedAt',
          'books.items.startDate'
        ],
      },
    }),
});

// RootState ve AppDispatch tiplerini export et
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Tipleri güçlendirilmiş hook'ları export et
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store; 