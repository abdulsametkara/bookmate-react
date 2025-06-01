import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

// Reducer'ları import etme
import booksReducer from './bookSlice';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    books: booksReducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Artık tüm Date'ler string olduğu için bu kontrolleri kaldırıyoruz
        ignoredActions: [],
        ignoredActionPaths: [],
        ignoredPaths: [],
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