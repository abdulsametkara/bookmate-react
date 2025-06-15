import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Text,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { Surface } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/theme';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, getApiUrl, getAuthHeaders } from '../config/api';
import ProgressModal from '../components/ProgressModal';
import CustomToast from '../components/CustomToast';
import GoogleBooksService from '../services/googleBooksService';

interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    pageCount?: number;
    publishedDate?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    publisher?: string;
  };
}

interface WishlistItem {
  id: string;
  user_id: string;
  book_id: string;
  priority: number;
  notes?: string;
  createdAt: string;
  title: string;
  author: string;
  cover_image_url: string;
  page_count: number;
  publisher?: string;
}

interface BackendBook {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  published_year?: number;
  page_count?: number;
  genre?: string;
  description?: string;
  cover_image_url?: string;
  language?: string;
}

const WishlistScreen = () => {
  const navigation = useNavigation();
  const currentUserId = useSelector((state: RootState) => state.books.currentUserId);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GoogleBook[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  // Arama input referansı
  const searchInputRef = React.useRef<TextInput>(null);

  // Animation states
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'progress' | 'status' | 'completion' | 'error' | 'warning' | 'info' | 'loading' | 'delete' | 'favorite' | 'menu' | 'action'>('info');
  const [modalTitle, setModalTitle] = useState('');
  const [modalSubtitle, setModalSubtitle] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [toastMessage, setToastMessage] = useState('');
  
  // Modal aksiyon için state'ler
  const [selectedWishlistId, setSelectedWishlistId] = useState('');
  const [selectedBookTitle, setSelectedBookTitle] = useState('');
  const [selectedBook, setSelectedBook] = useState<GoogleBook | null>(null);
  const [actionType, setActionType] = useState('');

  // Debug modal state changes
  useEffect(() => {
    if (__DEV__) {
      console.log('🎭 WishlistScreen Modal state changed - visible:', modalVisible, 'type:', modalType);
    }
  }, [modalVisible, modalType]);

  // Animation helper functions
  const showModal = (type: typeof modalType, title: string, subtitle: string, actionType?: string) => {
    setModalType(type);
    setModalTitle(title);
    setModalSubtitle(subtitle);
    if (actionType) {
      setActionType(actionType);
    }
    setModalVisible(true);
  };

  const showToast = (type: typeof toastType, message: string) => {
    setToastType(type);
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  // Sayfa yüklendiğinde kullanıcının istek listesini getir
  useEffect(() => {
    if (currentUserId) {
      loadWishlist();
    }
  }, [currentUserId]);

  // Wishlist yüklendiğinde loading state'ini sıfırla
  useEffect(() => {
    if (wishlist.length >= 0 && isLoading) {
      console.log('🎯 Wishlist loaded, resetting loading state');
      setIsLoading(false);
    }
  }, [wishlist.length, isLoading]);

  // Backend API'den istek listesini yükle
  const loadWishlist = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('bookmate_auth_token');
      
      if (!token) {
        showToast('error', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        setIsLoading(false);
        return;
      }

      const apiUrl = getApiUrl('/api/user/wishlists');
      console.log('🎯 WishlistScreen - İstek URL:', apiUrl);
      console.log('🔐 WishlistScreen - Token var:', !!token);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (response.ok) {
        const data = await response.json();
        setWishlist(data);
        console.log('✅ İstek listesi yüklendi:', data.length, 'kitap');
      } else if (response.status === 401) {
        // Token geçersizse logout yap
        console.log('🔑 Token geçersiz, logout yapılıyor...');
        await AsyncStorage.removeItem('bookmate_auth_token');
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('bookmate_current_session');
        showToast('error', 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.');
        // Navigate to auth screen
        setTimeout(() => {
          navigation.navigate('Auth');
        }, 1500);
        return;
      } else {
        const errorData = await response.json();
        console.error('❌ İstek listesi yükleme hatası:', errorData);
        showToast('error', 'İstek listesi yüklenirken bir hata oluştu.');
      }
    } catch (error) {
      console.error('❌ İstek listesi yükleme hatası:', error);
      showToast('error', 'İstek listesi yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google Books API ile arama
  const searchBooks = async (query: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&langRestrict=tr`
      );
      const data = await response.json();
      
      if (data.items) {
        setSearchResults(data.items);
        setShowResults(true);
        console.log('📚 Arama sonuçları:', data.items.length, 'kitap bulundu');
      } else {
        setSearchResults([]);
        showToast('info', 'Aradığınız kitap bulunamadı.');
      }
    } catch (error) {
      console.error('❌ Arama hatası:', error);
      showToast('error', 'Kitap arama sırasında bir hata oluştu.');
    } finally {
      setIsSearching(false);
    }
  };

  // Kitabı backend'e ekle ve sonra istek listesine ekle
  const addToWishlist = async (googleBook: GoogleBook) => {
    try {
      // Show loading toast
      showToast('info', 'Kitap ekleniyor...');
      
      const token = await AsyncStorage.getItem('bookmate_auth_token');
      
      if (!token) {
        showToast('error', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        return;
      }

      // 1. Kitabı kontrol et veya oluştur (yeni endpoint)
      const bookData: Partial<BackendBook> = {
        title: googleBook.volumeInfo.title.replace(/\u0000/g, ''),
        author: (googleBook.volumeInfo.authors?.join(', ') || 'Bilinmeyen Yazar').replace(/\u0000/g, ''),
        isbn: (googleBook.volumeInfo.industryIdentifiers?.[0]?.identifier || '').replace(/\u0000/g, ''),
        publisher: (googleBook.volumeInfo.publisher || '').replace(/\u0000/g, ''),
        published_year: googleBook.volumeInfo.publishedDate ? 
          parseInt(googleBook.volumeInfo.publishedDate.substring(0, 4)) : undefined,
        page_count: googleBook.volumeInfo.pageCount || 0,
        genre: 'Genel',
        description: (googleBook.volumeInfo.description || '').replace(/\u0000/g, ''),
        cover_image_url: (googleBook.volumeInfo.imageLinks?.thumbnail || '').replace(/\u0000/g, ''),
        language: 'tr'
      };

      console.log('📚 Backend\'e kitap ekleniyor:', bookData.title);

      const bookResponse = await fetch(getApiUrl('/api/books/check-or-create'), {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(bookData),
      });

      let bookId: string;

      if (bookResponse.ok) {
        const bookResult = await bookResponse.json();
        bookId = bookResult.book.id;
        
        if (bookResult.isExisting) {
          console.log('✅ Mevcut kitap bulundu, ID:', bookId);
        } else {
          console.log('✅ Yeni kitap oluşturuldu, ID:', bookId);
        }
      } else if (bookResponse.status === 401) {
        // Token geçersizse logout yap
        console.log('🔑 Token geçersiz, logout yapılıyor...');
        await AsyncStorage.removeItem('bookmate_auth_token');
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('bookmate_current_session');
        showToast('error', 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.');
        // Navigate to auth screen
        setTimeout(() => {
          navigation.navigate('Auth');
        }, 1500);
        return;
      } else {
        const errorData = await bookResponse.json();
        console.error('❌ Kitap kontrol/oluşturma hatası:', errorData);
        showToast('error', 'Kitap sisteme eklenirken bir hata oluştu.');
        return;
      }

      // 2. Kitabı istek listesine ekle
      const wishlistData = {
        book_id: bookId,
        priority: 3,
        notes: ''
      };

      console.log('🎯 İstek listesine ekleniyor...');

      const wishlistResponse = await fetch(getApiUrl('/api/user/wishlists'), {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(wishlistData),
      });

      if (wishlistResponse.ok) {
        const wishlistResult = await wishlistResponse.json();
        console.log('✅ İstek listesine eklendi:', wishlistResult);
        
        // Başarılı, listeyiç yeniden yükle
        await loadWishlist();
        
        showToast('success', `"${bookData.title}" istek listenize eklendi.`);
        
        setShowResults(false);
        setSearchQuery('');
      } else {
        const errorData = await wishlistResponse.json();
        console.error('❌ İstek listesi hatası:', errorData);
        showToast('error', errorData.message || 'İstek listesine eklenirken bir hata oluştu.');
      }

    } catch (error) {
      console.error('❌ İstek listesine ekleme hatası:', error);
      showToast('error', 'İstek listesine eklerken bir hata oluştu.');
    }
  };

  // İstek listesinden kaldır
  const removeFromWishlist = async (wishlistId: string, bookTitle: string) => {
    setSelectedWishlistId(wishlistId);
    setSelectedBookTitle(bookTitle);
    setActionType('confirm-remove');
    showModal('warning', 'Kitabı Kaldır', `"${bookTitle}" adlı kitabı istek listenizden kaldırmak istediğinizden emin misiniz?`, 'confirm-remove');
  };

  // Gerçek kaldırma işlemi
  const confirmRemoveFromWishlist = async () => {
    if (!selectedWishlistId) return;
    
    try {
      const token = await AsyncStorage.getItem('bookmate_auth_token');
      
      const response = await fetch(getApiUrl(`/api/user/wishlists/${selectedWishlistId}`), {
        method: 'DELETE',
        headers: getAuthHeaders(token || ''),
      });

      if (response.ok) {
        await loadWishlist();
        showToast('success', 'Kitap istek listenizden kaldırıldı.');
      } else {
        showToast('error', 'Kitap kaldırılırken bir hata oluştu.');
      }
    } catch (error) {
      console.error('❌ Kaldırma hatası:', error);
      showToast('error', 'Kitap kaldırılırken bir hata oluştu.');
    } finally {
      setSelectedWishlistId('');
      setSelectedBookTitle('');
    }
  };

  // Kitabı kütüphaneye ekle ve istek listesinden kaldır
  const addToLibrary = async (wishlistItem: WishlistItem) => {
    try {
      const token = await AsyncStorage.getItem('bookmate_auth_token');
      
      const response = await fetch(getApiUrl('/api/user/books'), {
        method: 'POST',
        headers: getAuthHeaders(token || ''),
        body: JSON.stringify({
          book_id: wishlistItem.book_id,
          status: 'to_read',
          is_favorite: false
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Kütüphaneye eklendi:', result);
        
        // İstek listesini yeniden yükle (otomatik kaldırılmış olacak)
        await loadWishlist();
        
        // Success modal göster
        setTimeout(() => {
          showModal('completion', 'Kütüphaneye Eklendi!', result.message || 'Kitap kütüphanenize eklendi.');
        }, 300);
      } else {
        const errorData = await response.json();
        showToast('error', errorData.message || 'Kütüphaneye eklenirken bir hata oluştu.');
      }
    } catch (error) {
      console.error('❌ Kütüphaneye ekleme hatası:', error);
      showToast('error', 'Kütüphaneye eklerken bir hata oluştu.');
    }
  };

  // Wishlist kitap seçenekleri
  const showWishlistItemOptions = (item: WishlistItem) => {
    setSelectedWishlistId(item.id);
    setSelectedBookTitle(item.title);
    setActionType('menu');
    showModal('menu', item.title, 'Bu kitap için ne yapmak istiyorsunuz?', 'menu');
  };

  // Kitabı istek listesine ekle onay modalı
  const showBookAddModal = (book: GoogleBook) => {
    setSelectedBook(book);
    setActionType('add');
    setModalType('favorite');
    setModalTitle('İstek Listesine Ekle');
    setModalSubtitle(`"${book.volumeInfo.title}" adlı kitabı istek listenize eklemek istiyor musunuz?`);
    setModalVisible(true);
  };

  const showBookOptions = (book: GoogleBook) => {
    setSelectedBook(book);
    showBookAddModal(book);
  };

  // Modal buton aksiyonlarını handle et
  const handleModalAction = (action: string) => {
    setModalVisible(false);
    
    // Modal tipine göre aksiyon al
    setTimeout(() => {
      if (action === 'confirm-remove') {
        confirmRemoveFromWishlist();
      } else if (action === 'add') {
        // Seçilen kitabı istek listesine ekle
        if (selectedBook) {
          addToWishlist(selectedBook);
          setSelectedBook(null);
        }
      } else if (action === 'add-to-library') {
        // Kitabı kütüphaneye ekle onayı
        if (selectedWishlistId) {
          const item = wishlist.find(w => w.id === selectedWishlistId);
          if (item) {
            addToLibrary(item);
          }
        }
      } else if (action === 'edit') {
        // Menu'den düzenle seçeneği
        console.log('Edit action for wishlist item');
      } else if (action === 'delete') {
        // Menu'den kaldır seçeneği
        if (selectedWishlistId && selectedBookTitle) {
          removeFromWishlist(selectedWishlistId, selectedBookTitle);
        }
      } else if (action === 'menu-add-to-library') {
        // Menu'den kütüphaneye ekle seçeneği
        if (selectedWishlistId) {
          const item = wishlist.find(w => w.id === selectedWishlistId);
          if (item) {
            addToLibrary(item);
          }
        }
      }
    }, 100);
  };

  // Manual logout for debugging
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('bookmate_auth_token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('bookmate_current_session');
      showToast('success', 'Çıkış yapıldı. Giriş ekranına yönlendiriliyorsunuz...');
      setTimeout(() => {
        navigation.navigate('Auth');
      }, 1000);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const renderWishlistItem = ({ item }: { item: WishlistItem }) => (
    <TouchableOpacity onPress={() => showWishlistItemOptions(item)}>
      <Surface style={styles.wishlistItem}>
        <View style={styles.bookCover}>
          <Image 
            source={{ uri: item.cover_image_url || GoogleBooksService.getFallbackCover(item.title) }}
            style={styles.bookImage}
          />
        </View>
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.bookAuthor}>{item.author}</Text>
          <Text style={styles.priority}>Öncelik: {item.priority}</Text>
        </View>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => showWishlistItemOptions(item)}
        >
          <MaterialCommunityIcons name="dots-vertical" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </Surface>
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item }: { item: GoogleBook }) => (
    <TouchableOpacity onPress={() => showBookOptions(item)}>
      <Surface style={styles.searchResultItem}>
        <View style={styles.bookCover}>
          <Image 
            source={{ 
              uri: item.volumeInfo.imageLinks?.thumbnail || 
                   GoogleBooksService.getFallbackCover(item.volumeInfo.title)
            }}
            style={styles.bookImage}
          />
        </View>
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle} numberOfLines={2}>{item.volumeInfo.title}</Text>
          <Text style={styles.bookAuthor}>
            {item.volumeInfo.authors?.join(', ') || 'Bilinmeyen Yazar'}
          </Text>
          {item.volumeInfo.publishedDate && (
            <Text style={styles.publishYear}>
              {item.volumeInfo.publishedDate.substring(0, 4)}
            </Text>
          )}
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => showBookAddModal(item)}
        >
          <MaterialCommunityIcons name="plus" size={20} color={Colors.surface} />
        </TouchableOpacity>
      </Surface>
    </TouchableOpacity>
  );

  return (
    <>
      <View style={styles.containerFull}>
        <StatusBar backgroundColor="#007AFF" barStyle="light-content" translucent={false} />
        
        {/* Blue Header */}
        <SafeAreaView style={styles.blueHeaderContainer}>
          <View style={styles.blueHeader}>
            <Text style={styles.blueHeaderTitle}>İstek Listesi</Text>
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <MaterialCommunityIcons name="logout" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        
        <SafeAreaView style={styles.container}>
          {/* Modern Arama Kutusunu Üstte */}
          <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={20} color="#666666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Hangi kitabı arıyorsunuz?"
              placeholderTextColor="#999999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => searchBooks(searchQuery)}
              returnKeyType="search"
              ref={searchInputRef}
            />
            {isSearching && (
              <ActivityIndicator size="small" color={Colors.primary} style={styles.searchLoader} />
            )}
          </View>
        </View>

        {/* Wishlist Items or Empty State */}
        {!showResults && (
          <>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>İstek listeniz yükleniyor...</Text>
              </View>
            ) : wishlist.length > 0 ? (
              <FlatList
                data={wishlist}
                renderItem={renderWishlistItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.booksList}
                onRefresh={loadWishlist}
                refreshing={isLoading}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrapper}>
                  <MaterialCommunityIcons name="heart-outline" size={80} color="#E8EAED" />
                </View>
                <Text style={styles.emptyTitle}>İstek listeniz henüz boş</Text>
                <Text style={styles.emptySubtitle}>
                  Beğendiğiniz kitapları arayarak{'\n'}istek listenize ekleyebilirsiniz
                </Text>
                
                {/* Modern Arama Butonu */}
                <TouchableOpacity 
                  style={styles.searchButton}
                  onPress={() => {
                    // Arama kutusuna focus yap ve yukarı scroll et
                    searchInputRef.current?.focus();
                    setSearchQuery('');
                  }}
                >
                  <MaterialCommunityIcons name="magnify" size={18} color="#ffffff" style={styles.buttonIcon} />
                  <Text style={styles.searchButtonText}>Kitap Ara</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
        </SafeAreaView>
        
        {/* Search Results in Modal Layer */}
        {showResults && (
          <View style={styles.searchResultsOverlay}>
            <View style={styles.searchResultsContainer}>
              <View style={styles.searchResultsHeader}>
                <Text style={styles.searchResultsTitle}>Arama Sonuçları</Text>
                <TouchableOpacity onPress={() => setShowResults(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.searchResultsList}
              />
            </View>
          </View>
        )}
        
        {/* Progress Modal */}
        <ProgressModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          type={modalType}
          title={modalTitle}
          subtitle={modalSubtitle}
          actionType={actionType}
          onAction={handleModalAction}
        />
        
        {/* Custom Toast */}
        <CustomToast
          visible={toastVisible}
          type={toastType}
          message={toastMessage}
          onHide={() => setToastVisible(false)}
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  containerFull: {
    flex: 1,
    backgroundColor: '#007AFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  blueHeaderFull: {
    backgroundColor: '#007AFF',
  },
  blueHeaderContainer: {
    backgroundColor: '#007AFF',
  },
  blueHeader: {
    backgroundColor: '#007AFF',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  blueHeaderTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
  },
  logoutButton: {
    padding: Spacing.sm,
    position: 'absolute',
    right: Spacing.lg,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  searchIcon: {
    marginRight: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
    fontWeight: '400',
  },
  searchLoader: {
    marginLeft: Spacing.sm,
  },
  searchResultsContainer: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    maxHeight: '80%',
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  searchResultsTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  searchResultsList: {
    padding: Spacing.md,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  booksList: {
    padding: Spacing.md,
  },
  wishlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bookCover: {
    width: 60,
    height: 80,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    marginRight: Spacing.md,
  },
  bookImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  bookAuthor: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  publishYear: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  priority: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  menuButton: {
    padding: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    marginTop: -60,
  },
  emptyIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xxl,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonIcon: {
    marginRight: Spacing.sm,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  searchResultsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    paddingHorizontal: Spacing.lg,
  },
});

export default WishlistScreen; 