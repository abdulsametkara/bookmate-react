import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { RootStackParamList } from './types';
import { 
  loadBooks, 
  setBooks, 
  setLoading, 
  setCurrentUser, 
  migrateToUserBasedStorage,
  saveBooks,
  Book 
} from '../store/bookSlice';
import { RootState, useAppDispatch, useAppSelector } from '../store';
import { MOCK_BOOKS } from '../data/mockData';
import { Colors } from '../theme/theme';
import UserManager from '../utils/userManager';

// Import screens
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import BookDetailScreen from '../screens/BookDetailScreen';
import ReadingTimerScreen from '../screens/ReadingTimerScreen';
import EditBookScreen from '../screens/EditBookScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import BookScannerScreen from '../screens/BookScannerScreen';
import ReadingListScreen from '../screens/ReadingListScreen';
import StatsScreen from '../screens/StatsScreen';
import BookShelf3DScreen from '../screens/BookShelf3DScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

// MOCK_BOOKS'u Redux Book formatına çevir
const convertMockBooksToReduxFormat = (mockBooks: any[]): Book[] => {
  return mockBooks.map(book => ({
    id: book.id,
    title: book.title,
    author: book.author,
    coverURL: book.coverURL || '',
    pageCount: book.pageCount || 0,
    currentPage: book.currentPage || 0,
    progress: book.progress || 0,
    status: book.status || 'TO_READ',
    genre: book.genre,
    publishYear: book.publishYear,
    publisher: book.publisher,
    description: book.description,
    isbn: book.isbn,
    notes: book.notes || [],
    createdAt: book.createdAt ? (typeof book.createdAt === 'string' ? book.createdAt : new Date(book.createdAt).toISOString()) : new Date().toISOString(),
    updatedAt: book.updatedAt ? (typeof book.updatedAt === 'string' ? book.updatedAt : new Date(book.updatedAt).toISOString()) : new Date().toISOString(),
    userId: book.userId,
    isJointReading: book.isJointReading || false,
    startDate: book.startDate ? (typeof book.startDate === 'string' ? book.startDate : new Date(book.startDate).toISOString()) : undefined,
    isFavorite: book.isFavorite || false,
  }));
};

const AppNavigator: React.FC = () => {
  const dispatch = useAppDispatch();
  const { currentUserId } = useAppSelector((state: RootState) => state.books);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Authentication state - kullanıcı session'ı var mı kontrol et
  const isAuthenticated = currentUserId !== null;

  // Sadece ilk yüklemede session kontrolü yap
  useEffect(() => {
    if (hasInitialized) return; // Sadece bir kez çalışsın

    const initializeApp = async () => {
      try {
        console.log('Initializing app...');
        dispatch(setLoading(true));
        
        // Migration'ı önce çalıştır
        await migrateToUserBasedStorage();
        
        // Mevcut kullanıcı session'ını kontrol et
        const currentUser = await UserManager.getCurrentUser();
        
        if (currentUser) {
          // Aktif session var
          console.log('Active user session found:', currentUser.id);
          dispatch(setCurrentUser(currentUser.id));
          
          // Kullanıcının kitaplarını yükle
          console.log('About to load books for user:', currentUser.id);
          const storedBooks = await loadBooks(currentUser.id);
          console.log('Loaded books from AsyncStorage:', {
            userId: currentUser.id,
            bookCount: storedBooks.length,
            books: storedBooks.map(b => ({ id: b.id, title: b.title, userId: b.userId }))
          });
          dispatch(setBooks(storedBooks));
          
          // Save books to AsyncStorage after setting Redux state
          await saveBooks(storedBooks, currentUser.id);
        } else {
          // Session yok
          console.log('No active user session found');
          dispatch(setCurrentUser(null));
          dispatch(setBooks([]));
        }
        
        dispatch(setLoading(false));
        setHasInitialized(true);
      } catch (error) {
        console.error('Error initializing app:', error);
        dispatch(setCurrentUser(null));
        dispatch(setBooks([]));
        dispatch(setLoading(false));
        setHasInitialized(true);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [hasInitialized, dispatch]);

  // Session monitoring - periodically check for session changes
  useEffect(() => {
    if (!hasInitialized) return;

    const checkSession = async () => {
      try {
        const currentUser = await UserManager.getCurrentUser();
        const hasSession = currentUser !== null;
        const hasReduxUser = currentUserId !== null;

        // If session state doesn't match Redux state, update Redux
        if (hasSession && !hasReduxUser) {
          // User logged in from another place
          console.log('Session found, updating Redux state');
          dispatch(setCurrentUser(currentUser.id));
          const storedBooks = await loadBooks(currentUser.id);
          dispatch(setBooks(storedBooks));
        } else if (!hasSession && hasReduxUser) {
          // User logged out, clear Redux state
          console.log('Session cleared, updating Redux state');
          dispatch(setCurrentUser(null));
          dispatch(setBooks([]));
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };

    // Check session every 1 second
    const interval = setInterval(checkSession, 1000);

    return () => clearInterval(interval);
  }, [hasInitialized, currentUserId, dispatch]);

  console.log('AppNavigator render - isAuthenticated:', isAuthenticated, 'currentUserId:', currentUserId);

  // Loading state'i göster
  if (isLoading) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background
      }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
      <Stack.Navigator 
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {isAuthenticated ? (
          // Authenticated user screens
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            
            {/* Diğer ekranlar */}
            <Stack.Screen 
              name="BookDetail" 
              component={BookDetailScreen} 
              options={{ 
                headerShown: false, 
              }}
            />
            <Stack.Screen 
              name="ReadingTimer" 
              component={ReadingTimerScreen} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="EditBook" 
              component={EditBookScreen} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="EditProfile" 
              component={EditProfileScreen} 
              options={{ headerShown: true, title: 'Profili Düzenle' }}
            />
            <Stack.Screen 
              name="BookScanner" 
              component={BookScannerScreen} 
              options={{ headerShown: true, title: 'Kitap Tarayıcı' }}
            />
            <Stack.Screen 
              name="ReadingList" 
              component={ReadingListScreen} 
              options={{ headerShown: true, title: 'Okuma Listem' }}
            />
            <Stack.Screen 
              name="Stats" 
              component={StatsScreen} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="BookShelf3D" 
              component={BookShelf3DScreen} 
              options={{ headerShown: false }}
            />
          </>
        ) : (
          // Authentication screens
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
  );
};

export default AppNavigator; 