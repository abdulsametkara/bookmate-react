import React, { useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, SafeAreaView, ScrollView, Image, Platform, Alert, StatusBar } from 'react-native';
import { 
  Text, 
  Card, 
  Surface, 
  Button, 
  Avatar, 
  IconButton,
  TextInput,
  Chip,
  ActivityIndicator
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/core';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { cardShadow, whiteCardStyle, sectionTitleStyle, statusColors } from '../theme/cardStyles';
import { Book, BookStatus } from '../models';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/theme';
// import { loadBooks, setBooks } from '../store/bookSlice'; // Geçici olarak devre dışı
import AsyncStorage from '@react-native-async-storage/async-storage';
import APIService, { UserBook } from '../utils/apiService';
import { setCurrentUser } from '../store/bookSlice';
import GoogleBooksService from '../services/googleBooksService';

const BookItem = ({ book, onPress, viewMode }: { book: Book; onPress: () => void; viewMode: string }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  // Modern renk kodları
  const getStatusColor = (status: BookStatus) => {
    switch(status) {
      case BookStatus.READING: return '#007AFF'; // Modern mavi
      case BookStatus.COMPLETED: return '#4CAF50'; // Modern yeşil
      case BookStatus.TO_READ: return '#FF6B6B'; // Modern kırmızı/pembe
      default: return '#007AFF';
    }
  };

  const getStatusText = (status: BookStatus) => {
    switch(status) {
      case BookStatus.READING: return 'Okunuyor';
      case BookStatus.COMPLETED: return 'Tamamlandı';
      case BookStatus.TO_READ: return 'Okunacak';
      default: return '';
    }
  };

  const getStatusIcon = (status: BookStatus) => {
    switch(status) {
      case BookStatus.READING: return 'book-open-page-variant';
      case BookStatus.COMPLETED: return 'check-circle';
      case BookStatus.TO_READ: return 'bookmark-outline';
      default: return 'book';
    }
  };

  // Modern tasarım
  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[
        styles.modernBookItem,
        viewMode === 'grid' ? styles.modernBookItemGrid : styles.modernBookItemList
      ]}
    >
      <Surface style={[
        styles.modernBookCard,
        viewMode === 'grid' ? styles.modernBookCardGrid : styles.modernBookCardList
      ]}>
        <View style={[
          styles.modernBookCoverContainer,
          viewMode === 'grid' ? styles.modernBookCoverContainerGrid : styles.modernBookCoverContainerList
        ]}>
          {!imageError ? (
            <Image 
              source={{ uri: book.coverURL }}
              style={styles.modernBookCover}
              resizeMode="cover"
              onLoadStart={() => {
                setImageLoading(true);
                setImageError(false);
              }}
              onLoadEnd={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
          ) : (
            <View style={styles.modernNoCoverPlaceholder}>
              <MaterialCommunityIcons name="book-variant" size={viewMode === 'grid' ? 40 : 30} color="#CCCCCC" />
              <Text style={styles.modernNoCoverText} numberOfLines={2}>{book.title}</Text>
            </View>
          )}
          
          {imageLoading && (
            <View style={styles.modernImageLoadingContainer}>
              <ActivityIndicator animating={true} color={getStatusColor(book.status)} size={24} />
            </View>
          )}
          
          {/* Modern durum göstergesi */}
          <View style={[
            styles.modernStatusBadge, 
            { backgroundColor: getStatusColor(book.status) }
          ]}>
            <MaterialCommunityIcons 
              name={getStatusIcon(book.status)} 
              size={12} 
              color="#fff" 
            />
          </View>
        </View>
        
        <View style={styles.modernBookContent}>
          <View style={styles.modernBookTitleContainer}>
            <Text 
              numberOfLines={viewMode === 'grid' ? 2 : 2} 
              style={styles.modernBookTitle}
            >
              {book.title}
            </Text>
            <Text 
              numberOfLines={1} 
              style={styles.modernBookAuthor}
            >
              {book.author}
            </Text>
          </View>
          
          {(book.status === BookStatus.READING || (book.status as any) === 'READING') && (
            <View style={styles.modernProgressContainer}>
              <View style={styles.modernProgressBarContainer}>
                <View style={styles.modernProgressBackground} />
                <View 
                  style={[
                    styles.modernProgressFill, 
                    { 
                      width: `${Math.min(100, Math.max(0, (book.currentPage / book.pageCount) * 100))}%`,
                      backgroundColor: getStatusColor(book.status)
                    }
                  ]} 
                />
              </View>
              <View style={styles.modernProgressInfo}>
                <Text style={styles.modernProgressText}>
                  <Text style={[styles.modernProgressValue, { color: getStatusColor(book.status) }]}>
                    {book.currentPage || 0}
                  </Text>
                  <Text style={styles.modernProgressTotal}>/{book.pageCount || 0}</Text>
                </Text>
                <Text style={[styles.modernProgressPercent, { color: getStatusColor(book.status) }]}>
                  %{Math.round(Math.min(100, Math.max(0, (book.currentPage / book.pageCount) * 100)) || 0)}
                </Text>
              </View>
            </View>
          )}
          
          {viewMode === 'list' && (
            <View style={styles.modernBookActions}>
              <TouchableOpacity 
                style={[styles.modernActionButton, { backgroundColor: getStatusColor(book.status) }]}
                onPress={onPress}
              >
                <MaterialCommunityIcons 
                  name={getStatusIcon(book.status)} 
                  size={16} 
                  color="#FFFFFF" 
                />
                <Text style={styles.modernActionButtonText}>
                  {book.status === BookStatus.READING ? 'Devam Et' : 
                   book.status === BookStatus.COMPLETED ? 'Tekrar Oku' : 'Okumaya Başla'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Surface>
    </TouchableOpacity>
  );
};

const LibraryScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Hepsi');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [refreshKey, setRefreshKey] = useState(0); // Add this to force refresh
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [isLoadingBooks, setIsLoadingBooks] = useState(false); // Yeni loading state

  const currentUserId = useSelector((state: RootState) => state.books.currentUserId);

  // AsyncStorage'dan kitapları yükle
  const loadBooksFromStorage = async () => {
    if (!currentUserId) return;
    
    try {
      const storageKey = `bookmate_books_${currentUserId}`;
      const booksData = await AsyncStorage.getItem(storageKey);
      
      if (booksData) {
        const storedBooks = JSON.parse(booksData);
        console.log(`📦 Loading ${storedBooks.length} books from AsyncStorage`);
        setBooks(storedBooks);
      }
    } catch (error) {
      console.error('❌ Error loading books from AsyncStorage:', error);
    }
  };

  // Backend API'den kullanıcının kitaplarını yükle
  const loadBooksFromAPI = async (showLoading = false, force = false) => {
    if (!currentUserId) {
      console.log('❌ No current user ID, skipping API call');
      return;
    }

    // Zaten yükleniyor ise skip et
    if (isLoadingBooks && !force) {
      console.log('⏳ Books already loading, skipping...');
      return;
    }

    setIsLoadingBooks(true);
    
    if (showLoading) {
      setIsLoading(true);
    }

    try {
      console.log('🔄 Loading books from API...');
      
      // Check if we have auth token
      const token = await AsyncStorage.getItem('bookmate_auth_token');
      console.log('🔑 Auth token status:', token ? 'Present' : 'Missing');
      
      if (!token) {
        console.log('❌ No auth token found, books will not be synced with backend');
        displayToast('warning', '⚠️ Çevrimdışı modda çalışıyorsunuz');
        
        // Fix: Reset loading state even when there's no token
        setIsLoadingBooks(false);
        if (showLoading) {
          setIsLoading(false);
        }
        return;
      }

      const result = await APIService.getUserBooks();
      console.log('📚 API result status:', result.success ? 'Success' : 'Failed');

      if (result.success && result.books) {
        console.log(`✅ Loaded ${result.books.length} books from API`);
        
        const convertedBooks = result.books.map(convertUserBookToBook);
        setBooks(convertedBooks);
        setLastRefresh(Date.now());
        
        // 🔥 API'den yüklenen kitapları AsyncStorage'a kaydet
        try {
          const storageKey = `bookmate_books_${currentUserId}`;
          await AsyncStorage.setItem(storageKey, JSON.stringify(convertedBooks));
          console.log(`💾 Books saved to AsyncStorage: ${convertedBooks.length} books`);
        } catch (error) {
          console.error('❌ Error saving books to AsyncStorage:', error);
        }
        
        // Show success message only for manual refresh
        if (showLoading) {
          displayToast('success', `📚 ${convertedBooks.length} kitap yüklendi`);
        }
      } else {
        console.log('❌ Failed to load books:', result.message);
        
        // Token geçersiz ise logout yap
        if (result.message && result.message.includes('token')) {
          console.log('🔑 Token geçersiz, logout yapılıyor...');
          
          // AsyncStorage'dan token'ı temizle
          await AsyncStorage.removeItem('bookmate_auth_token');
          await AsyncStorage.removeItem('user');
          await AsyncStorage.removeItem('bookmate_current_session');
          
          // Redux state'i temizle
          dispatch(setCurrentUser(null));
          
          // Login ekranına yönlendir
          Alert.alert(
            'Oturum Süresi Doldu',
            'Güvenliğiniz için oturum süreniz sona erdi. Lütfen tekrar giriş yapın.',
            [
              {
                text: 'Tamam',
                onPress: () => navigation.navigate('Auth')
              }
            ]
          );
          return;
        }
        
        if (showLoading) {
          displayToast('error', `❌ Kitaplar yüklenemedi: ${result.message}`);
        }
      }
    } catch (error) {
      console.error('💥 API Error:', error);
      if (showLoading) {
        displayToast('error', '❌ Bağlantı hatası');
      }
    } finally {
      setIsLoadingBooks(false);
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  // UserBook -> Book dönüştürücü - Progress hesaplamayı düzeltelim
  function convertUserBookToBook(userBook: UserBook): Book {
    const currentPageNum = userBook.current_page || 0;
    const pageCountNum = userBook.page_count || 0;
    const progress = pageCountNum > 0 ? (currentPageNum / pageCountNum) * 100 : 0;
    
    // Status mapping'i daha güvenli yapalım
    let bookStatus: BookStatus;
    const rawStatus = userBook.status?.toLowerCase();
    
    switch (rawStatus) {
      case 'reading':
      case 'READING':
        bookStatus = BookStatus.READING;
        break;
      case 'completed':
      case 'COMPLETED':
      case 'finished':
      case 'FINISHED':
        bookStatus = BookStatus.COMPLETED;
        break;
      case 'to_read': 
      case 'TO_READ':
      case 'want_to_read':
      case 'WANT_TO_READ':
      case 'planned':
      case 'PLANNED':
        bookStatus = BookStatus.TO_READ;
        break;
      default:
        bookStatus = BookStatus.TO_READ;
    }

    const convertedBook: Book = {
      id: userBook.id.toString(),
      title: userBook.title || 'Başlıksız Kitap',
      author: userBook.author || 'Bilinmeyen Yazar',
      description: '',
                  coverURL: userBook.cover_image_url || GoogleBooksService.getFallbackCover(userBook.title || 'Kitap'),
      isbn: '',
      publisher: '',
      pageCount: pageCountNum,
      currentPage: currentPageNum,
      progress: Math.round(Math.min(100, Math.max(0, progress))),
      rating: userBook.rating || 0,
      status: bookStatus,
      createdAt: userBook.createdAt || new Date().toISOString(),
      notes: [],
    };

    console.log(`📊 Book converted: ${convertedBook.title}`, {
      currentPage: convertedBook.currentPage,
      pageCount: convertedBook.pageCount,
      progress: convertedBook.progress,
      status: convertedBook.status
    });

    return convertedBook;
  }

  // Pull to refresh handler
  const handleRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    setIsRefreshing(true);
    try {
      await loadBooksFromAPI(true, true); // Force refresh
    } finally {
      setIsRefreshing(false);
    }
  };

  // Route parametrelerini dinle - optimize edildi
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('👀 LibraryScreen focused');
      
      // Her focus'ta AsyncStorage'dan güncel kitapları yükle
      loadBooksFromStorage();
      
      // BookDetail'den dönen parametreleri kontrol et
      const route = navigation.getState?.()?.routes?.find(r => r.name === 'Library');
      if (route?.params?.shouldRefresh) {
        console.log('🔄 Should refresh from route params');
        handleRefresh();
        
        // Parametreyi temizle
        navigation.setParams({ shouldRefresh: false });
        return; // Don't load again below
      }
      
      // Son yenileme zamanını kontrol et
      const timeSinceLastRefresh = Date.now() - lastRefresh;
      if (timeSinceLastRefresh > 10000) { // 10 saniyeden fazla ise yenile
        console.log('⏰ Last refresh was more than 10 seconds ago, refreshing...');
        loadBooksFromAPI();
      } else {
        console.log('⏰ Recent refresh, skipping API call');
      }
    });

    return unsubscribe;
  }, [navigation, lastRefresh]); // lastRefresh dependency eklendi

  // Component mount olduğunda sadece bir kez yükle
  React.useEffect(() => {
    console.log('🚀 LibraryScreen mounted, currentUserId:', currentUserId);
    if (currentUserId && books.length === 0) { // Sadece books boş ise yükle
      console.log('📚 Loading books on mount');
      loadBooksFromAPI(true);
    }
  }, [currentUserId]); // Sadece currentUserId değiştiğinde

  // Books yüklendiğinde loading state'ini sıfırla
  React.useEffect(() => {
    if (books.length > 0 && isLoading) {
      console.log('📚 Books loaded, resetting loading state');
      setIsLoading(false);
    }
  }, [books.length, isLoading]);

  // Book -> Redux Book dönüştürücü
  function convertBookToRedux(book: Book): any {
    return {
      id: book.id,
      title: book.title,
      author: book.author,
      description: book.description,
      coverURL: book.coverURL,
      isbn: book.isbn,
      publisher: book.publisher,
      pageCount: book.pageCount,
      currentPage: book.currentPage,
      rating: book.rating,
      status: book.status,
      notes: book.notes || [],
    };
  }

  const onChangeSearch = (query) => setSearchQuery(query);

  // Filter books based on search query and active filter - memoize edildi
  const filteredBooks = React.useMemo(() => {
    console.log(`🔍 Filtering books - Total: ${books.length}, Filter: ${activeFilter}, Search: "${searchQuery}"`);
    
    let filtered = books;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(book => 
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (activeFilter !== 'Hepsi') {
      const statusMap = {
        'Okuyor': BookStatus.READING,
        'Tamamlandı': BookStatus.COMPLETED,
        'Okunacak': BookStatus.TO_READ
      };
      const targetStatus = statusMap[activeFilter];
      filtered = filtered.filter(book => {
        // Hem enum hem string karşılaştırması yap
        return book.status === targetStatus || book.status === targetStatus.toString();
      });
    }

    console.log(`🔍 Filtered result: ${filtered.length} books`);
    return filtered;
  }, [books, activeFilter, searchQuery]); // Dependencies

  const goToBookDetail = (bookId) => {
    console.log('📖 LibraryScreen - Navigating to BookDetail with ID:', bookId);
    
    // Backend'den yüklenen kitabı bul
    const book = books.find(b => b.id === bookId);
    console.log('📖 LibraryScreen - Found book:', book ? {
      id: book.id,
      title: book.title,
      author: book.author,
      status: book.status
    } : 'NOT_FOUND');
    
    navigation.navigate('BookDetail', { 
      bookId,
      bookData: book, // Kitap verisini direkt geçir
      onStatusChangeKey: refreshKey, // fonksiyon yerine bir key gönder
      shouldRefreshLibrary: true // Dönüşte refresh sinyali
    });
  };

  // 3D Kitaplık görünümüne geç
  const showLibrary3D = () => {
    console.log('3D Kitaplık görünümü açılıyor...');
    // 3D Kitaplık ekranına geçiş yap
    navigation.navigate('BookShelf3D', { 
      books: filteredBooks // Kütüphanedeki kitapları geçir
    });
  };

  // Stats hesaplaması - memoize edildi
  const stats = React.useMemo(() => {
    const result = {
      total: books.length,
      reading: books.filter(book => {
        const status = book.status as any;
        return status === BookStatus.READING || status === 'READING';
      }).length,
      completed: books.filter(book => {
        const status = book.status as any;
        return status === BookStatus.COMPLETED || status === 'COMPLETED';
      }).length,
      toRead: books.filter(book => {
        const status = book.status as any;
        return status === BookStatus.TO_READ || status === 'TO_READ';
      }).length
    };
    
    console.log('📊 Stats calculated:', result);
    return result;
  }, [books]);

  // Toast display function
  const displayToast = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    console.log(`🍞 Toast: [${type.toUpperCase()}] ${message}`);
    // You can implement actual toast here if you have a toast component
  };

  return (
    <View style={styles.modernContainer}>
      <StatusBar backgroundColor="#007AFF" barStyle="light-content" />
      
      {/* Modern Gradient Header */}
      <SafeAreaView style={styles.modernHeaderSafeArea}>
        <View style={styles.modernHeader}>
          <View style={styles.modernHeaderContent}>
            <Text style={styles.modernHeaderTitle}>Kütüphanem</Text>
            <Text style={styles.modernHeaderSubtitle}>
              {stats.total} kitap • {stats.reading} okunuyor • {stats.completed} tamamlandı
              {isRefreshing && ' • 🔄 Yenileniyor...'}
            </Text>
          </View>
          
          <View style={styles.modernHeaderActions}>
            <TouchableOpacity 
              style={[
                styles.modernHeaderRefreshButton,
                isRefreshing && { backgroundColor: 'rgba(255, 255, 255, 0.4)' }
              ]}
              onPress={handleRefresh}
              disabled={isRefreshing}
            >
              <MaterialCommunityIcons 
                name={isRefreshing ? "loading" : "refresh"} 
                size={20} 
                color="#fff" 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modernHeader3DButton}
              onPress={showLibrary3D}
            >
              <MaterialCommunityIcons name="cube-outline" size={20} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modernHeaderViewButton}
              onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            >
              <MaterialCommunityIcons
                name={viewMode === 'list' ? 'view-grid' : 'format-list-bulleted'}
                size={20}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.modernScrollView}
        contentContainerStyle={styles.modernScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Modern Search Section */}
        <View style={styles.modernSearchSection}>
          <View style={styles.modernSearchContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color="#007AFF" />
            <TextInput
              style={styles.modernSearchInput}
              placeholder="Kitap veya yazar ara..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={onChangeSearch}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Scrollable Compact Statistics Section */}
        <View style={styles.compactStatsSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.compactStatsContainer}
          >
            <View style={styles.compactStatItem}>
              <MaterialCommunityIcons name="book-multiple" size={18} color="#007AFF" />
              <Text style={styles.compactStatValue}>{stats.total}</Text>
              <Text style={styles.compactStatLabel}>Toplam</Text>
            </View>

            <View style={styles.compactStatItem}>
              <MaterialCommunityIcons name="book-open" size={18} color="#FF9500" />
              <Text style={styles.compactStatValue}>{stats.reading}</Text>
              <Text style={styles.compactStatLabel}>Okunuyor</Text>
            </View>

            <View style={styles.compactStatItem}>
              <MaterialCommunityIcons name="check" size={18} color="#4CAF50" />
              <Text style={styles.compactStatValue}>{stats.completed}</Text>
              <Text style={styles.compactStatLabel}>Tamamlandı</Text>
            </View>

            <View style={styles.compactStatItem}>
              <MaterialCommunityIcons name="bookmark" size={18} color="#FF6B6B" />
              <Text style={styles.compactStatValue}>{stats.toRead}</Text>
              <Text style={styles.compactStatLabel}>Okunacak</Text>
            </View>

            <View style={styles.compactStatItem}>
              <MaterialCommunityIcons name="clock" size={18} color="#8B5CF6" />
              <Text style={styles.compactStatValue}>
                {books.filter(book => book.progress > 0 && book.progress < 100).length}
              </Text>
              <Text style={styles.compactStatLabel}>Devam Eden</Text>
            </View>

            <View style={styles.compactStatItem}>
              <MaterialCommunityIcons name="star" size={18} color="#F59E0B" />
              <Text style={styles.compactStatValue}>
                {books.filter(book => book.rating > 0).length}
              </Text>
              <Text style={styles.compactStatLabel}>Puanlandı</Text>
            </View>
          </ScrollView>
        </View>

        {/* Modern Filter Chips */}
        <View style={styles.modernFiltersSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.modernChipContainer}
          >
            {[
              { key: 'Hepsi', label: 'Tümü', icon: 'book-multiple' },
              { key: 'Okuyor', label: 'Okunuyor', icon: 'book-open' },
              { key: 'Tamamlandı', label: 'Tamamlandı', icon: 'check' },
              { key: 'Okunacak', label: 'Okunacak', icon: 'bookmark' }
            ].map((filter) => (
              <TouchableOpacity 
                key={filter.key}
                style={[
                  styles.modernFilterChip, 
                  activeFilter === filter.key && styles.modernFilterChipActive
                ]}
                onPress={() => setActiveFilter(filter.key)}
              >
                <MaterialCommunityIcons 
                  name={filter.icon as any} 
                  size={16} 
                  color={activeFilter === filter.key ? '#fff' : '#007AFF'} 
                />
                <Text style={[
                  styles.modernFilterChipText,
                  activeFilter === filter.key && styles.modernFilterChipTextActive
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Books List/Grid */}
        {isLoading ? (
          <View style={styles.modernLoadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.modernLoadingText}>Kütüphaneniz yükleniyor...</Text>
          </View>
        ) : filteredBooks.length > 0 ? (
          <FlatList
            data={filteredBooks}
            renderItem={({ item }) => (
              <BookItem 
                book={item} 
                onPress={() => goToBookDetail(item.id)} 
                viewMode={viewMode}
              />
            )}
            keyExtractor={(item) => item.id}
            numColumns={viewMode === 'grid' ? 2 : 1}
            key={viewMode} // Force re-render on layout change
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modernBooksList}
            onRefresh={handleRefresh}
            refreshing={isRefreshing}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.modernEmptyState}>
            <View style={styles.modernEmptyIconContainer}>
              <MaterialCommunityIcons name="book-outline" size={64} color="#007AFF" />
            </View>
            <Text style={styles.modernEmptyStateTitle}>
              {searchQuery ? 'Arama sonucu bulunamadı' : 'Kütüphaneniz boş'}
            </Text>
            <Text style={styles.modernEmptyStateSubtitle}>
              {searchQuery 
                ? 'Arama kriterlerinize uygun kitap bulunamadı. Farklı kelimeler deneyin.' 
                : 'Henüz kütüphanenize kitap eklememişsiniz. İlk kitabınızı ekleyerek başlayın!'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity 
                style={styles.modernAddFirstBookButton}
                onPress={() => navigation.navigate('Wishlist')}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
                <Text style={styles.modernAddFirstBookText}>İlk Kitabını Ekle</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  modernContainer: {
    flex: 1,
    backgroundColor: '#007AFF',
  },
  modernHeaderSafeArea: {
    backgroundColor: '#007AFF',
  },
  modernHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: '#007AFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  modernHeaderContent: {
    flex: 1,
  },
  modernHeaderTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  modernHeaderSubtitle: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  modernHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modernHeaderRefreshButton: {
    padding: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  modernHeader3DButton: {
    padding: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  modernHeaderViewButton: {
    padding: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  modernScrollView: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  modernScrollContent: {
    paddingBottom: Spacing.xxl,
  },
  modernSearchSection: {
    padding: Spacing.lg,
  },
  modernSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    gap: Spacing.sm,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modernSearchInput: {
    flex: 1,
    fontSize: FontSizes.md,
    color: '#1F2937',
    fontWeight: '500',
  },
  modernHeroStats: {
    padding: Spacing.lg,
  },
  modernSectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: Spacing.lg,
  },
  modernStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  modernStatCard: {
    backgroundColor: '#fff',
    padding: Spacing.lg,
    borderRadius: 16,
    flex: 1,
    marginHorizontal: Spacing.xs,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modernStatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modernStatValue: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: Spacing.xs,
  },
  modernStatLabel: {
    fontSize: FontSizes.sm,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  modernFiltersSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  modernChipContainer: {
    paddingVertical: Spacing.sm,
  },
  modernFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 20,
    marginRight: Spacing.sm,
    borderWidth: 2,
    borderColor: '#007AFF',
    gap: Spacing.xs,
  },
  modernFilterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  modernFilterChipText: {
    fontSize: FontSizes.sm,
    color: '#007AFF',
    fontWeight: '600',
  },
  modernFilterChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  modernBooksList: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  modernBookItem: {
    marginBottom: Spacing.lg,
  },
  modernBookItemGrid: {
    flex: 0.5,
    marginHorizontal: Spacing.xs,
  },
  modernBookItemList: {
    marginHorizontal: 0,
  },
  modernBookCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modernBookCardGrid: {
    aspectRatio: 0.65,
  },
  modernBookCardList: {
    flexDirection: 'row',
    aspectRatio: 2.5,
  },
  modernBookCoverContainer: {
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  modernBookCoverContainerGrid: {
    flex: 2,
  },
  modernBookCoverContainerList: {
    width: 100,
  },
  modernBookCover: {
    width: '100%',
    height: '100%',
  },
  modernStatusBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  modernBookContent: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  modernBookTitleContainer: {
    marginBottom: Spacing.sm,
  },
  modernBookTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: Spacing.xs,
    lineHeight: FontSizes.md * 1.3,
  },
  modernBookAuthor: {
    fontSize: FontSizes.sm,
    color: '#6B7280',
    fontWeight: '500',
  },
  modernProgressContainer: {
    marginTop: Spacing.sm,
  },
  modernProgressBarContainer: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  modernProgressBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#E5E7EB',
  },
  modernProgressFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 3,
  },
  modernProgressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modernProgressText: {
    fontSize: FontSizes.xs,
  },
  modernProgressValue: {
    fontWeight: '700',
  },
  modernProgressTotal: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
  modernProgressPercent: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
  modernBookActions: {
    marginTop: Spacing.md,
  },
  modernActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    gap: Spacing.xs,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  modernActionButtonText: {
    color: '#fff',
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  modernEmptyState: {
    alignItems: 'center',
    padding: Spacing.xxl,
    backgroundColor: '#fff',
    marginHorizontal: Spacing.lg,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modernEmptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modernEmptyStateTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  modernEmptyStateSubtitle: {
    fontSize: FontSizes.md,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: FontSizes.md * 1.4,
    marginBottom: Spacing.lg,
  },
  modernAddFirstBookButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    elevation: 6,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modernAddFirstBookText: {
    color: '#fff',
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  modernImageLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  modernNoCoverPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: Spacing.md,
  },
  modernNoCoverText: {
    fontSize: FontSizes.xs,
    color: '#9CA3AF',
    marginTop: Spacing.xs,
    textAlign: 'center',
    fontWeight: '500',
  },
  modernLoadingContainer: {
    alignItems: 'center',
    padding: Spacing.xxl,
    backgroundColor: '#fff',
    marginHorizontal: Spacing.lg,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modernLoadingText: {
    color: '#6B7280',
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    fontWeight: '500',
  },
  compactStatsSection: {
    backgroundColor: '#fff',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  compactStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  compactStatItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    minWidth: 80,
  },
  compactStatValue: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: Spacing.xs,
  },
  compactStatLabel: {
    fontSize: FontSizes.xs,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
});

export default LibraryScreen; 