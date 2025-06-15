import { NativeStackScreenProps } from '@react-navigation/native-stack';

// Kendi NavigatorScreenParams türümüzü tanımlayalım
type NavigatorScreenParams<T> = {
  [K in keyof T]: T[K] extends undefined ? undefined : { [P in keyof T[K]]: T[K][P] }
};

// Ana stack navigator parametreleri
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  BookDetail: { bookId: string };
  ReadingTimer: { bookId?: string; sharedSessionId?: string };
  EditBook: { bookId?: string }; // undefined ise yeni kitap
  EditProfile: undefined;
  BookScanner: undefined;
  Wishlist: undefined;
  BookDetailNew: { bookId: string };
  Stats: undefined;
  BookShelf3D: undefined;
  ReadingStatsScreen: undefined;
  BookRecommendations: { 
    category: 'popular' | 'personalized' | 'classics' | 'new';
    title: string;
  };
  // Ortak Okuma Ekranları
  SharedReading: undefined;
  PartnerSearch: undefined;
  FriendRequests: undefined;
  SharedReadingSession: { sessionId: string };
  SharedReadingMessages: { sessionId: string };
  FriendProfile: { friendId: string };
  SharedLibraries: undefined;
  SharedLibraryDetail: { libraryId: string };
  SelectBooksForLibrary: { libraryId: string; onBooksSelected?: () => void };
  CreateSharedLibrary: undefined;
  SharedBookNotes: { libraryId: string; bookId: string };
  StartSharedReading: { partnerId?: string };
};

// Auth stack navigator parametreleri
export type AuthStackParamList = {
  Login: { prefilledEmail?: string } | undefined;
  Register: undefined;
};

// Ana tab navigator parametreleri
export type MainTabParamList = {
  Home: undefined;
  Library: undefined;
  ReadingTimer: undefined;
  Wishlist: undefined;
  Profile: undefined;
};

// Ekran propları için kısaltmalar
export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type AuthStackScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  T
>;

// Kullanım kolaylığı için navigation-specific type'lar
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
} 